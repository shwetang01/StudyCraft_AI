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

import { ingestBook } from '../src/lib/rag/ingestion';

async function main() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  // Check if uploaded pdf exists
  const candidatePdf1 = path.join(process.cwd(), '.storage', 'uploads', `${bookId}.pdf`);
  const candidatePdf2 = path.join(process.cwd(), 'Physics book.pdf');
  const pdfPath = fs.existsSync(candidatePdf1) ? candidatePdf1 : candidatePdf2;

  console.log(`Starting fast ingestion for book ${bookId} using ${pdfPath}...`);
  const startTime = Date.now();

  const summary = await ingestBook({
    bookId,
    pdfPath,
    onProgress: (stage, pct) => {
      console.log(`[${pct}%] ${stage}`);
    },
  });

  console.log('--- INGESTION FINISHED SUCCESSFULLY ---');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch(err => {
  console.error('INGESTION FAILED:', err);
  process.exit(1);
});

