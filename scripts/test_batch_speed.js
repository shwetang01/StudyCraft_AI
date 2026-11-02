const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testBatchSpeed() {
  const apiKey = env.GEMINI_API_KEY;
  const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));

  const sampleChunks = data.chunks.slice(300, 360); // 60 chunks around Chapter 5!
  console.log(`Testing batch embedding on ${sampleChunks.length} chunks...`);

  const BATCH_SIZE = 15;
  const t0 = Date.now();

  for (let i = 0; i < sampleChunks.length; i += BATCH_SIZE) {
    const slice = sampleChunks.slice(i, i + BATCH_SIZE);
    const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
    const payload = {
      requests: slice.map(c => ({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: c.content.slice(0, 2500) }] },
        outputDimensionality: 768,
      }))
    };
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.log(`Batch ${i} failed:`, res.status, await res.text());
    } else {
      const json = await res.json();
      console.log(`Batch ${i/BATCH_SIZE + 1} succeeded: ${json.embeddings?.length} embeddings returned in ${Date.now() - t0}ms`);
    }
  }

  console.log(`Finished 60 chunks in ${Date.now() - t0}ms!`);
}

testBatchSpeed();

