import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { generateBatchEmbeddings } from '../src/lib/rag/embeddings';

async function test() {
  const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const sample = data.chunks.slice(0, 100).map((c: any) => c.content);
  console.log('Testing 100 chunks from Physics book...');
  const start = Date.now();
  const embs = await generateBatchEmbeddings(sample, undefined, (done, total) => {
    console.log(`Progress: ${done}/${total}`);
  });
  console.log(`Embedded 100 chunks in ${Date.now() - start} ms. Result count: ${embs.length}`);
  console.log('Sample vector 0 dimension:', embs[0]?.length);
}

test().catch(console.error);

