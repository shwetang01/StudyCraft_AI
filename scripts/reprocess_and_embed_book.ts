import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);

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

import { generateBatchEmbeddings } from '../src/lib/rag/embeddings';

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  const pdfPath = path.join(process.cwd(), '.storage', 'uploads', `${bookId}.pdf`);
  const outputDir = path.join(process.cwd(), 'public', 'extracted_figures', bookId);
  const outputJsonPath = path.join(outputDir, 'processed_book.json');
  const cacheChunksPath = path.join(outputDir, 'chunks_with_embeddings.json');

  console.log('=== STEP 1: Re-running PDF Processor with Header Stripping ===');
  const t0 = Date.now();
  await execFileAsync('python', [
    path.join(process.cwd(), 'scripts', 'pdf_processor.py'),
    pdfPath,
    bookId,
    outputDir,
    outputJsonPath,
  ]);
  console.log(`PDF text re-extracted in ${((Date.now() - t0) / 1000).toFixed(1)}s!`);

  const processedData = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
  const rawChunks = processedData.chunks;
  console.log(`Total cleaned chunks: ${rawChunks.length}`);

  // Quick verification of chunk on page 118
  const c118 = rawChunks.find((c: any) => c.printed_page_number === '118');
  if (c118) {
    console.log('Verification: First 150 chars of Page 118 chunk:');
    console.log(JSON.stringify(c118.content.slice(0, 150)));
  }

  console.log('\n=== STEP 2: Generating Vector Embeddings with Gemini ===');
  const chunkTexts = rawChunks.map((c: any) => c.content);
  const tEmbed = Date.now();
  const embeddings = await generateBatchEmbeddings(
    chunkTexts,
    undefined,
    (done, total) => {
      if (done % 150 === 0 || done === total) {
        console.log(`Embeddings progress: ${done}/${total} (${Math.round((done / total) * 100)}%)`);
      }
    }
  );
  console.log(`Embedding generation completed in ${((Date.now() - tEmbed) / 1000).toFixed(1)}s!`);

  // Verify non-zero embeddings
  let zeroCount = 0;
  for (let i = 0; i < embeddings.length; i++) {
    if (!embeddings[i] || embeddings[i].every((v: number) => v === 0)) {
      zeroCount++;
    }
  }
  console.log(`Zero embeddings check: ${zeroCount} / ${embeddings.length} (must be 0)`);

  const processedChunks = rawChunks.map((c: any, idx: number) => ({
    id: c.id || `chunk_${bookId}_${idx}`,
    book_id: bookId,
    content: c.content,
    chunk_index: c.chunk_index,
    pdf_page_index: c.pdf_page_index,
    printed_page_number: c.printed_page_number,
    embedding: embeddings[idx],
    metadata: c.metadata,
    created_at: new Date().toISOString(),
  }));

  // Save to disk
  fs.writeFileSync(cacheChunksPath, JSON.stringify(processedChunks), 'utf-8');
  console.log(`Saved ${processedChunks.length} chunks to disk cache: ${cacheChunksPath}`);

  console.log('\n=== STEP 3: Updating Supabase pgvector Table ===');
  // Clear old chunks
  const delRes = await supabase.from('book_chunks').delete().eq('book_id', bookId);
  console.log('Deleted old chunks:', delRes.error ? delRes.error.message : 'OK');

  const BATCH = 50;
  for (let i = 0; i < processedChunks.length; i += BATCH) {
    const slice = processedChunks.slice(i, i + BATCH);
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
      console.error(`Failed to insert batch ${i}:`, insErr);
    }
    if ((i + BATCH) % 250 === 0 || i + BATCH >= processedChunks.length) {
      console.log(`Supabase upload progress: ${Math.min(i + BATCH, processedChunks.length)} / ${processedChunks.length}`);
    }
  }

  console.log('\n=== REPROCESSING AND RE-EMBEDDING FINISHED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Fatal error in reprocessing:', err);
  process.exit(1);
});

