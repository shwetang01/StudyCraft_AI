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

import { answerBookQuestion } from '../src/lib/rag/groundedQA';

async function test() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  const query = "Explain the exact synthesis procedure of high-temperature superconductor YBCO-123 using sol-gel citric acid auto-combustion.";
  console.log('Testing Grounded Q&A for ungrounded question:', query);

  const start = Date.now();
  const res = await answerBookQuestion({
    book: {
      id: bookId,
      title: 'Physics book',
      total_pages: 717,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'completed',
      file_hash: 'abc',
      storage_path: 'path',
    },
    question: query,
    topK: 6,
  });

  console.log('\n================ IS INSUFFICIENT? ========');
  console.log(res.is_insufficient);
  console.log('================ ANSWER ==================');
  console.log(res.answer);
  console.log(`\nTime taken: ${Date.now() - start}ms`);
}

test().catch(console.error);

