const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const apiKey = env.GEMINI_API_KEY;

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
  const prompt = `Generate a JSON object with flashcards about physics pulleys and Newton's laws.
Schema:
{
  "flashcards": [
    {
      "front": "Front — Question?",
      "back": "Back — Explanation",
      "category": "Topic",
      "difficulty": "medium",
      "figureId": null,
      "citations": []
    }
  ]
}`;
  console.log('Sending test prompt to Gemini...');
  const t0 = Date.now();
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });
  console.log(`Status: ${resp.status} in ${Date.now() - t0}ms`);
  const json = await resp.json();
  console.log('Result:', JSON.stringify(json).slice(0, 300));
}

testGemini();

