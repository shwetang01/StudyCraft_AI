const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function testEmbed() {
  const apiKey = env.GEMINI_API_KEY;
  console.log('Testing single embedding with gemini-embedding-001...');
  const t0 = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: "Newton's second law of motion states that net force equals mass times acceleration." }] },
      outputDimensionality: 768,
    }),
  });
  console.log('Status:', res.status, 'Time:', Date.now() - t0, 'ms');
  const json = await res.json();
  console.log('Values len:', json.embedding?.values?.length);

  // Now test batchEmbedContents with 5 items
  console.log('\nTesting batchEmbedContents with 5 items...');
  const t1 = Date.now();
  const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const batchRes = await fetch(batchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [1, 2, 3, 4, 5].map(i => ({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: `Physics concept test number ${i} force mass acceleration.` }] },
        outputDimensionality: 768,
      }))
    }),
  });
  console.log('Batch Status:', batchRes.status, 'Time:', Date.now() - t1, 'ms');
  const batchJson = await batchRes.json();
  console.log('Batch embeddings returned:', batchJson.embeddings?.length);
}

testEmbed();

