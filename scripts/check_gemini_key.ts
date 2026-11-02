import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
    }
  }
}

async function checkLive() {
  console.log('Testing Gemini API Key:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'MISSING');

  // Test 1: generateContent (used for Q&A, Flashcards, Chat, Analysis)
  const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
  const genStart = Date.now();
  try {
    const res = await fetch(genUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Respond with: "Gemini is Live!"' }] }],
      }),
    });
    const duration = Date.now() - genStart;
    if (res.ok) {
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`[PASS] Text Generation (gemini-flash-lite-latest): Status ${res.status} in ${duration}ms -> "${reply}"`);
    } else {
      console.log(`[FAIL] Text Generation: Status ${res.status} -> ${(await res.text()).slice(0, 150)}`);
    }
  } catch (err: any) {
    console.log(`[ERROR] Text Generation error:`, err.message);
  }

  // Test 2: embedContent (used for new PDF vector embeddings)
  const embUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const embStart = Date.now();
  try {
    const res = await fetch(embUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: 'Test embedding passage' }] },
        outputDimensionality: 768,
      }),
    });
    const duration = Date.now() - embStart;
    if (res.ok) {
      const data = await res.json();
      console.log(`[PASS] Vector Embeddings (gemini-embedding-001): Status ${res.status} in ${duration}ms (Vector dim: ${data?.embedding?.values?.length})`);
    } else {
      const errText = await res.text();
      let msg = errText;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || errText;
      } catch {}
      console.log(`[NOTICE] Vector Embeddings: Status ${res.status} (${msg.slice(0, 140)}...)`);
    }
  } catch (err: any) {
    console.log(`[ERROR] Vector Embeddings error:`, err.message);
  }
}

checkLive().catch(console.error);

