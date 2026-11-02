const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function checkModels() {
  const apiKey = env.GEMINI_API_KEY;
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(listUrl);
  const data = await res.json();
  console.log('Available models:');
  const embedModels = data.models?.filter(m => m.name.includes('embed') || m.supportedGenerationMethods?.includes('embedContent'));
  embedModels?.forEach(m => console.log(m.name, m.supportedGenerationMethods));
}

checkModels();

