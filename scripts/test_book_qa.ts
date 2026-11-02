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
  console.log('Testing Grounded Q&A on 717-page Physics textbook...');
  const query = 'What are Newton\'s laws of motion? Explain with page citations and diagrams.';

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

  console.log('\n================ QUESTION ================');
  console.log(query);
  console.log('================ ANSWER ==================');
  console.log(res.answer);
  console.log('\n================ CITATIONS ===============');
  console.log(JSON.stringify(res.citations, null, 2));
  console.log('\n================ RELEVANT DIAGRAMS =======');
  console.log(JSON.stringify(res.figures, null, 2));
  console.log(`\nTime taken: ${Date.now() - start}ms`);
}

test().catch(console.error);
