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

async function list() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const j = await res.json();
  console.log('--- ALL AVAILABLE MODELS ---');
  for (const m of (j.models || [])) {
    console.log(m.name, 'Methods:', m.supportedGenerationMethods);
  }
}

list().catch(console.error);

