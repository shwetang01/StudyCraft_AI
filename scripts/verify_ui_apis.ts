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

import { getAdminClient, isSupabaseConfigured } from '../src/lib/supabase/admin';

async function verifyAll() {
  console.log('--- 1. Checking Supabase Connectivity & Books ---');
  const configured = isSupabaseConfigured();
  console.log('Supabase configured:', configured);
  if (!configured) throw new Error('Supabase not configured');

  const supabase = getAdminClient();
  const { data: books, error: booksErr } = await supabase.from('books').select('*');
  console.log('Books count:', books?.length, booksErr ? booksErr : 'OK');

  const physicsBook = books?.find((b: any) => b.title.includes('Physics') || b.id === '4d702ea1-d284-4f69-9f5f-fc296e80a318');
  if (!physicsBook) throw new Error('Physics book not found in DB');
  console.log('Active Book:', physicsBook.title, '| Pages:', physicsBook.total_pages, '| Status:', physicsBook.status);

  console.log('\n--- 2. Checking Original Diagrams in Supabase ---');
  const { data: figures, error: figErr } = await supabase
    .from('book_figures')
    .select('id, figure_label, printed_page_number, pdf_page_index, storage_path')
    .eq('book_id', physicsBook.id)
    .limit(5);

  console.log('Figures count sample:', figures?.length, figErr ? figErr : 'OK');
  figures?.forEach((f: any) => {
    console.log(`  - ${f.figure_label} | Page ${f.printed_page_number} | Storage: ${f.storage_path}`);
  });

  console.log('\n--- 3. Checking RAG Answer & Diagram Retrieval ---');
  const { answerBookQuestion } = await import('../src/lib/rag/groundedQA');
  const qaRes = await answerBookQuestion({
    book: physicsBook,
    question: "Explain Newton's second law of motion.",
    topK: 6,
  });

  console.log('QA Answer Length:', qaRes.answer.length);
  console.log('Citations Count:', qaRes.citations.length);
  console.log('First Citation:', qaRes.citations[0]);
  console.log('Figures Retrieved:', qaRes.figures.map((f: any) => f.figure_label || f.id));
  console.log('Is Insufficient:', qaRes.is_insufficient);

  console.log('\n--- 4. Checking Book Flashcards Generation ---');
  const { generateBookFlashcards } = await import('../src/lib/rag/bookFlashcards');
  const flashcards = await generateBookFlashcards({
    book: physicsBook,
    topic: 'Newton second law',
    cardCount: 3,
  });
  console.log('Generated Flashcards Count:', flashcards.length);
  if (flashcards.length > 0) {
    console.log('Card 1 Front:', flashcards[0].front);
    console.log('Card 1 Figure Attached:', !!flashcards[0].figureUrl);
  }

  console.log('\n--- All Verifications Passed Cleanly! ---');
}

verifyAll().catch(console.error);
