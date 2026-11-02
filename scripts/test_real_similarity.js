const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function testRealSimilarity() {
  const apiKey = env.GEMINI_API_KEY;

  // Let's get chunk 326, 327, 356 texts from processed_book.json
  const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));

  const c326 = data.chunks.find(c => c.chunk_index === 326);
  const c327 = data.chunks.find(c => c.chunk_index === 327);
  const c356 = data.chunks.find(c => c.chunk_index === 356);

  const query = "Explain Newton's second law of motion.";

  const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const res = await fetch(batchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        { model: 'models/gemini-embedding-001', content: { parts: [{ text: query }] }, outputDimensionality: 768 },
        { model: 'models/gemini-embedding-001', content: { parts: [{ text: c326.content }] }, outputDimensionality: 768 },
        { model: 'models/gemini-embedding-001', content: { parts: [{ text: c327.content }] }, outputDimensionality: 768 },
        { model: 'models/gemini-embedding-001', content: { parts: [{ text: c356.content }] }, outputDimensionality: 768 },
      ]
    }),
  });

  const json = await res.json();
  const qEmb = json.embeddings[0].values;
  const c326Emb = json.embeddings[1].values;
  const c327Emb = json.embeddings[2].values;
  const c356Emb = json.embeddings[3].values;

  console.log('Query vs Chunk 326 (Page 105 - Fnet = ma definition):', dot(qEmb, c326Emb).toFixed(4));
  console.log('Query vs Chunk 327 (Page 105 - Net force & acceleration):', dot(qEmb, c327Emb).toFixed(4));
  console.log('Query vs Chunk 356 (Page 118 - Box on inclined plane):', dot(qEmb, c356Emb).toFixed(4));
}

testRealSimilarity();

