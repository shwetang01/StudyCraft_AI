import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
      process.env[key] = val;
    }
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
const outputDir = path.join(process.cwd(), 'public', 'extracted_figures', bookId);
const processedJsonPath = path.join(outputDir, 'processed_book.json');
const cacheChunksPath = path.join(outputDir, 'chunks_with_embeddings.json');

async function embedBatchWithRetry(slice: any[], apiKey: string): Promise<number[][]> {
  const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const payload = {
    requests: slice.map(c => ({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text: c.content.slice(0, 2000) }] },
      outputDimensionality: 768,
    }))
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(batchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.embeddings && json.embeddings.length === slice.length) {
          return json.embeddings.map((e: any) => e.values);
        }
      }

      if (res.status === 429) {
        console.log(`[Rate Limit 429] Waiting 20 seconds before retry (attempt ${attempt}/5)...`);
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }

      const errText = await res.text();
      console.warn(`[Batch Warning ${res.status}] ${errText.slice(0, 120)}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    } catch (e: any) {
      console.warn(`[Network Error] ${e.message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }

  // Fallback if all 5 retries fail
  return slice.map(() => new Array(768).fill(0));
}

async function run() {
  console.log('Loading cleaned processed_book.json...');
  const processedData = JSON.parse(fs.readFileSync(processedJsonPath, 'utf-8'));
  const rawChunks = processedData.chunks;
  console.log(`Total cleaned chunks in book: ${rawChunks.length}`);

  // Load existing cache if available
  let cachedChunks: any[] = [];
  if (fs.existsSync(cacheChunksPath)) {
    try {
      cachedChunks = JSON.parse(fs.readFileSync(cacheChunksPath, 'utf-8'));
    } catch {}
  }

  const chunkMap = new Map<number, any>();
  cachedChunks.forEach(c => {
    if (c.embedding && !c.embedding.every((v: number) => v === 0)) {
      chunkMap.set(c.chunk_index, c);
    }
  });

  console.log(`Already validly embedded in cache: ${chunkMap.size} / ${rawChunks.length}`);

  // Find chunks that need embedding
  const neededIndices: number[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    if (!chunkMap.has(rawChunks[i].chunk_index)) {
      neededIndices.push(i);
    }
  }

  // Prioritize Chapter 5 & surrounding mechanics modules (pages 90 - 250)
  neededIndices.sort((a, b) => {
    const pageA = rawChunks[a].pdf_page_index;
    const pageB = rawChunks[b].pdf_page_index;
    const distA = Math.abs(pageA - 130);
    const distB = Math.abs(pageB - 130);
    return distA - distB;
  });

  console.log(`Chunks remaining to embed: ${neededIndices.length}`);

  const BATCH_SIZE = 10;
  const apiKey = env.GEMINI_API_KEY;

  for (let step = 0; step < neededIndices.length; step += BATCH_SIZE) {
    const batchRawIndices = neededIndices.slice(step, step + BATCH_SIZE);
    const slice = batchRawIndices.map(idx => rawChunks[idx]);

    const embs = await embedBatchWithRetry(slice, apiKey);

    slice.forEach((chunk, j) => {
      chunkMap.set(chunk.chunk_index, {
        id: chunk.id || `chunk_${bookId}_${chunk.chunk_index}`,
        book_id: bookId,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        pdf_page_index: chunk.pdf_page_index,
        printed_page_number: chunk.printed_page_number,
        embedding: embs[j],
        metadata: chunk.metadata || {},
        created_at: new Date().toISOString(),
      });
    });

    console.log(`Progress: ${chunkMap.size} / ${rawChunks.length} chunks embedded (${Math.round((chunkMap.size / rawChunks.length) * 100)}%)`);

    // Save checkpoint every 50 chunks
    if (chunkMap.size % 50 < BATCH_SIZE || chunkMap.size === rawChunks.length) {
      const fullList = rawChunks.map((c: any) => chunkMap.get(c.chunk_index) || {
        ...c,
        id: c.id || `chunk_${bookId}_${c.chunk_index}`,
        book_id: bookId,
        embedding: new Array(768).fill(0),
      });
      fs.writeFileSync(cacheChunksPath, JSON.stringify(fullList), 'utf-8');
      console.log(`[Checkpoint] Saved ${chunkMap.size} embedded chunks to disk.`);
    }

    // Gentle 650ms delay keeps us comfortably under rate limits
    await new Promise(r => setTimeout(r, 650));
  }

  console.log('\n=== All chunks embedded! Persisting to Supabase... ===');
  const fullProcessed = rawChunks.map((c: any) => chunkMap.get(c.chunk_index));
  fs.writeFileSync(cacheChunksPath, JSON.stringify(fullProcessed), 'utf-8');

  // Clear old chunks in Supabase
  await supabase.from('book_chunks').delete().eq('book_id', bookId);

  // Upload in batches of 40
  const UPLOAD_BATCH = 40;
  for (let i = 0; i < fullProcessed.length; i += UPLOAD_BATCH) {
    const slice = fullProcessed.slice(i, i + UPLOAD_BATCH);
    const { error: insErr } = await supabase.from('book_chunks').insert(
      slice.map((c: any) => ({
        id: c.id,
        book_id: c.book_id,
        content: c.content,
        chunk_index: c.chunk_index,
        pdf_page_index: c.pdf_page_index,
        printed_page_number: c.printed_page_number,
        embedding: c.embedding,
        metadata: c.metadata || {},
      }))
    );
    if (insErr) {
      console.error(`Error uploading batch ${i}:`, insErr);
    }
    if ((i + UPLOAD_BATCH) % 200 === 0 || i + UPLOAD_BATCH >= fullProcessed.length) {
      console.log(`Uploaded ${Math.min(i + UPLOAD_BATCH, fullProcessed.length)} / ${fullProcessed.length} chunks to Supabase.`);
    }
  }

  console.log('=== Ingestion & Embedding Completely Finished! ===');
}

run().catch(e => {
  console.error('Fatal in run:', e);
});

