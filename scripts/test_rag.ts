/**
 * End-to-end Verification Script for StudyCraft AI RAG & Diagram Retrieval
 */

import fs from 'fs';
import path from 'path';

// Load .env.local for standalone CLI runner
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  }
}

import { ingestBook } from '../src/lib/rag/ingestion';
import { answerBookQuestion } from '../src/lib/rag/groundedQA';
import { generateBookFlashcards } from '../src/lib/rag/bookFlashcards';

import crypto from 'crypto';
import { getAdminClient } from '../src/lib/supabase/admin';

async function main() {
  console.log('=== Step 1: Testing Book Ingestion ===');
  const bookId = crypto.randomUUID();
  const pdfPath = path.resolve('Frontend_Internship_Assignment.pdf');

  // Insert initial book record in Supabase
  const supabase = getAdminClient();
  await supabase.from('books').insert({
    id: bookId,
    title: 'Frontend Internship Assignment Guide',
    storage_path: `uploads/${bookId}.pdf`,
    file_hash: crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex'),
    total_pages: 0,
    status: 'uploaded',
  });

  console.log(`Ingesting PDF for Book ID (${bookId}): ${pdfPath}`);
  const summary = await ingestBook({
    bookId,
    pdfPath,
    onProgress: (stage, pct) => {
      console.log(`[${pct}%] ${stage}`);
    },
  });

  console.log('Ingestion Summary:', summary);

  console.log('\n=== Step 2: Testing Grounded Question Answering ===');
  const book = {
    id: bookId,
    title: 'Frontend Internship Assignment Guide',
    total_pages: summary.totalPages,
  };

  const question = 'What are the main evaluation areas and their percentage weights?';
  console.log(`Question: "${question}"`);

  const qaResult = await answerBookQuestion({
    book: book as any,
    question,
    topK: 5,
  });

  console.log('\nGrounded Answer:\n', qaResult.answer);
  console.log('\nCitations:', qaResult.citations);
  console.log('\nSupporting Quotes:', qaResult.supporting_quotes);

  console.log('\n=== Step 3: Testing Grounded Flashcard Generation ===');
  const cards = await generateBookFlashcards({
    book,
    topic: 'evaluation criteria and tech stack',
    cardCount: 4,
  });

  console.log(`Generated ${cards.length} book flashcards:`);
  cards.forEach((c, i) => {
    console.log(`\nCard ${i + 1}:`);
    console.log(`Front: ${c.front}`);
    console.log(`Back: ${c.back}`);
    console.log(`Page: ${c.citations?.[0]?.printedPageNumber || c.citations?.[0]?.pdfPageIndex}`);
    if (c.figureUrl) console.log(`Attached Figure: ${c.figureUrl}`);
  });

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
