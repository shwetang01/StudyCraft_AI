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

import { analyzeDiagramWithVision } from '../src/lib/rag/vision';

async function test() {
  const figDir = path.join(process.cwd(), 'public', 'extracted_figures', '4d702ea1-d284-4f69-9f5f-fc296e80a318');
  if (!fs.existsSync(figDir)) {
    console.log('No fig dir');
    return;
  }
  const files = fs.readdirSync(figDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  console.log('Found figures:', files.length);
  if (files.length > 0) {
    const first = path.join(figDir, files[0]);
    console.log('Testing figure:', first, 'size:', fs.statSync(first).size);
    const start = Date.now();
    const res = await analyzeDiagramWithVision(first, null, 1);
    console.log('Result in', Date.now() - start, 'ms:', res);
  }
}

test().catch(console.error);

