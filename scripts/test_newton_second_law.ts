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
  const query = "Explain Newton's second law of motion.";
  console.log('Testing Grounded Q&A for:', query);

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

  console.log('\n================ ANSWER ==================');
  console.log(res.answer);
  console.log('\n================ CITATIONS ===============');
  console.log(JSON.stringify(res.citations, null, 2));
  console.log('\n================ SUPPORTING QUOTES =======');
  console.log(JSON.stringify(res.supporting_quotes, null, 2));
  console.log('\n================ FIGURES =================');
  console.log(JSON.stringify(res.figures, null, 2));
  console.log('\n================ DEBUG INFO ==============');
  console.log('Query embedding present:', res.debug?.has_query_embedding);
  console.log('Evaluated candidates:', res.debug?.total_candidates_evaluated);
  console.log('Chunks evaluated:');
  res.debug?.chunks.forEach((c) => {
    console.log(
      `Chunk ${c.id} | Page ${c.printed_page_number} (pdf ${c.pdf_page_index}) | Sem: ${c.semantic_score.toFixed(3)} | KW: ${c.keyword_score.toFixed(3)} | Comb: ${c.combined_score.toFixed(3)} | Passed: ${c.passed_threshold}`
    );
  });
  console.log(`\nTime taken: ${Date.now() - start}ms`);
}

test().catch(console.error);

