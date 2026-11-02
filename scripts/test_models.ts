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

const testModels = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-pro-latest'
];

async function test() {
  for (const m of testModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with: "WORKING"' }] }],
        }),
      });
      console.log(`Model ${m}: status ${res.status} in ${Date.now() - start}ms`);
      if (res.ok) {
        const j = await res.json();
        console.log(`  Output:`, j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`  Error:`, (await res.text()).slice(0, 100));
      }
    } catch (e: any) {
      console.log(`Model ${m}: threw ${e.message} in ${Date.now() - start}ms`);
    }
  }
}

test();
