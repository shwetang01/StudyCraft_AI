const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function testRanks() {
  const apiKey = env.GEMINI_API_KEY;
  const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));

  const sampleChunks = data.chunks.slice(320, 340); // 20 chunks right around pages 102-111!
  const query = "Explain Newton's second law of motion.";

  // Get query embedding
  const qUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const qRes = await fetch(qUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: query }] },
      outputDimensionality: 768,
    }),
  });
  const qJson = await qRes.json();
  const qEmb = qJson.embedding.values;

  // Embed the chunks with batch size 10
  const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const allEmbs = [];
  const BATCH = 10;
  for (let i = 0; i < sampleChunks.length; i += BATCH) {
    const sl = sampleChunks.slice(i, i + BATCH);
    const bRes = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: sl.map(c => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: c.content.slice(0, 2000) }] },
          outputDimensionality: 768,
        }))
      })
    });
    const bJson = await bRes.json();
    if (!bJson.embeddings) {
      console.log('Error from batch:', bRes.status, JSON.stringify(bJson));
    } else {
      bJson.embeddings.forEach(e => allEmbs.push(e.values));
    }
  }

  const scored = sampleChunks.map((c, i) => ({
    chunk_index: c.chunk_index,
    printed_page_number: c.printed_page_number,
    pdf_page_index: c.pdf_page_index,
    score: cosine(qEmb, allEmbs[i]),
    snippet: c.content.slice(0, 120).replace(/\n/g, ' ')
  })).sort((a, b) => b.score - a.score);

  console.log(`\n=== TOP 10 CHUNKS BY SEMANTIC SIMILARITY FOR "${query}" ===`);
  scored.slice(0, 10).forEach((s, idx) => {
    console.log(`Rank ${idx+1}: Chunk #${s.chunk_index}, Page ${s.printed_page_number} (Score: ${s.score.toFixed(4)}) - ${s.snippet}`);
  });
}

testRanks();
