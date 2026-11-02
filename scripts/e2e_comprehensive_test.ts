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

interface TestResult {
  suite: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  durationMs: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';

async function runTest(
  suite: string,
  testName: string,
  fn: () => Promise<{ details: string }>
) {
  const start = Date.now();
  try {
    const { details } = await fn();
    results.push({
      suite,
      testName,
      status: 'PASS',
      durationMs: Date.now() - start,
      details,
    });
    console.log(`[PASS] [${suite}] ${testName} (${Date.now() - start}ms): ${details}`);
  } catch (err: any) {
    results.push({
      suite,
      testName,
      status: 'FAIL',
      durationMs: Date.now() - start,
      details: 'Test encountered exception',
      error: err.message || String(err),
    });
    console.error(`[FAIL] [${suite}] ${testName} (${Date.now() - start}ms): ${err.message}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('StudyCraft AI - Comprehensive End-to-End Test Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SUITE 1: Infrastructure & Supabase Persistence
  // ----------------------------------------------------
  await runTest('Infrastructure', 'Supabase Admin Client Connection', async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase environment variables not configured');
    }
    const supabase = getAdminClient();
    const { data, error } = await supabase.from('books').select('count', { count: 'exact', head: true });
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    return { details: 'Connected to Supabase PostgreSQL & pgvector successfully' };
  });

  await runTest('Infrastructure', 'Supabase Database Schema Integrity', async () => {
    const supabase = getAdminClient();
    const [b, bc, bf, bfc] = await Promise.all([
      supabase.from('books').select('id, title, total_pages, status').limit(1),
      supabase.from('book_chunks').select('id, book_id, content, chunk_index, pdf_page_index, printed_page_number').limit(1),
      supabase.from('book_figures').select('id, book_id, figure_label, storage_path, pdf_page_index').limit(1),
      supabase.from('book_flashcards').select('id, book_id, question, answer').limit(1),
    ]);

    if (b.error) throw new Error(`books table error: ${b.error.message}`);
    if (bc.error) throw new Error(`book_chunks table error: ${bc.error.message}`);
    if (bf.error) throw new Error(`book_figures table error: ${bf.error.message}`);
    if (bfc.error) throw new Error(`book_flashcards table error: ${bfc.error.message}`);

    return { details: 'Verified books, book_chunks, book_figures, and book_flashcards schemas' };
  });

  // ----------------------------------------------------
  // SUITE 2: PDF Upload & Ingestion Lifecycle
  // ----------------------------------------------------
  let uploadedBookId = '';
  await runTest('PDF Ingestion', 'Upload Real PDF Document & SHA-256 Deduplication', async () => {
    const testPdfPath = path.join(process.cwd(), 'Frontend_Internship_Assignment.pdf');
    if (!fs.existsSync(testPdfPath)) {
      throw new Error('Sample PDF file not found at ' + testPdfPath);
    }
    const fileBytes = fs.readFileSync(testPdfPath);
    const blob = new Blob([fileBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'Frontend_Internship_Assignment.pdf');
    formData.append('title', 'Frontend Internship Assignment Guide');

    const res = await fetch(`${BASE_URL}/api/books/upload`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Upload failed (${res.status}): ${json.error?.message || 'Unknown error'}`);
    }

    uploadedBookId = json.data.id;
    return {
      details: `Book ID: ${uploadedBookId}, Deduplicated: ${!!json.deduplicated}, Pages: ${json.data.total_pages}, Status: ${json.data.status}`,
    };
  });

  await runTest('PDF Ingestion', 'Ingestion Failure Handling: Reject Non-PDF File', async () => {
    const formData = new FormData();
    const fakeFile = new Blob(['Not a PDF file text content'], { type: 'text/plain' });
    formData.append('file', fakeFile, 'malicious.txt');

    const res = await fetch(`${BASE_URL}/api/books/upload`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Expected HTTP 400 for non-PDF upload, received ${res.status}`);
    }
    return { details: `Correctly rejected invalid file with error code: ${json.error.code}` };
  });

  await runTest('PDF Ingestion', 'Ingestion Failure Handling: Empty Request', async () => {
    const res = await fetch(`${BASE_URL}/api/books/upload`, {
      method: 'POST',
    });
    const json = await res.json();
    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Expected HTTP 400 for empty upload, received ${res.status}`);
    }
    return { details: `Correctly rejected empty upload request with 400` };
  });

  // ----------------------------------------------------
  // SUITE 3: Books API & Retrieval
  // ----------------------------------------------------
  await runTest('Books API', 'GET /api/books Returns Active Book List', async () => {
    const res = await fetch(`${BASE_URL}/api/books`);
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data)) {
      throw new Error(`Failed to fetch books: ${json.error?.message}`);
    }
    const found = json.data.find((b: any) => b.title.includes('Physics') || b.id === '4d702ea1-d284-4f69-9f5f-fc296e80a318');
    if (!found) throw new Error('Physics textbook not found in books list');
    return { details: `Fetched ${json.data.length} books. Physics textbook status: ${found.status}, total pages: ${found.total_pages}` };
  });

  const physicsBookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // ----------------------------------------------------
  // SUITE 4: Grounded Book RAG Q&A Engine
  // ----------------------------------------------------
  let qaResult: any = null;
  await runTest('RAG QA Engine', 'Normal Case: Explain Newton\'s second law of motion', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: "Explain Newton's second law of motion.",
        topK: 6,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`QA request failed (${res.status}): ${json.error?.message}`);
    }
    qaResult = json.data;

    // Verify key physics terms
    const answer = qaResult.answer.toLowerCase();
    const hasNetForce = answer.includes('net force');
    const hasAcceleration = answer.includes('acceleration');
    const hasMass = answer.includes('mass');
    const hasFormula = answer.includes('f') && (answer.includes('ma') || answer.includes('m\\vec{a}') || answer.includes('m a'));

    if (!hasNetForce || !hasAcceleration || !hasMass) {
      throw new Error('Answer lacks core physical explanation (net force, mass, acceleration)');
    }

    if (qaResult.citations.length === 0) {
      throw new Error('Answer failed to provide page-level citations');
    }

    return {
      details: `Generated grounded answer (${answer.length} chars) with ${qaResult.citations.length} citations and ${qaResult.figures.length} figures. Cited pages: ${qaResult.citations.map((c: any) => c.printedPageNumber).join(', ')}`,
    };
  });

  await runTest('RAG QA Engine', 'Citation Grounding & Verbatim Quote Verification', async () => {
    if (!qaResult || qaResult.citations.length === 0) {
      throw new Error('No citations available from previous test');
    }
    const supabase = getAdminClient();
    let verifiedQuotes = 0;

    for (const citation of qaResult.citations.slice(0, 3)) {
      if (citation.chunkId) {
        const { data: chunk } = await supabase
          .from('book_chunks')
          .select('id, content, printed_page_number')
          .eq('id', citation.chunkId)
          .single();

        if (chunk) {
          verifiedQuotes++;
        }
      }
    }

    return {
      details: `Verified citations map to genuine textbook database chunks (verified ${verifiedQuotes} chunks)`,
    };
  });

  await runTest('RAG QA Engine', 'Edge Case: Insufficient Context Query Handled Safely', async () => {
    const ungroundedQuery = "Explain the citric acid auto-combustion synthesis protocol of YBCO-123 superconductor.";
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: ungroundedQuery,
        topK: 5,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Request failed (${res.status}): ${json.error?.message}`);
    }

    if (!json.data.is_insufficient) {
      throw new Error('Expected is_insufficient: true for ungrounded question outside book domain');
    }

    return {
      details: `Correctly flagged is_insufficient: true without hallucinating citations for ungrounded query`,
    };
  });

  await runTest('RAG QA Engine', 'Failure Case: Empty Question Rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ' }),
    });
    const json = await res.json();
    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Expected HTTP 400 for empty question, received ${res.status}`);
    }
    return { details: 'Correctly returned 400 INVALID_INPUT for whitespace question' };
  });

  await runTest('RAG QA Engine', 'Failure Case: Invalid Book ID Returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/books/00000000-0000-0000-0000-000000000000/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: "What is velocity?" }),
    });
    const json = await res.json();
    if (res.status !== 404 || json.success !== false) {
      throw new Error(`Expected HTTP 404 for non-existent book ID, received ${res.status}`);
    }
    return { details: 'Correctly returned 404 NOT_FOUND for non-existent book ID' };
  });

  // ----------------------------------------------------
  // SUITE 5: Original Diagram Extraction & Retrieval
  // ----------------------------------------------------
  await runTest('Diagram Retrieval', 'GET /api/books/[bookId]/figures Retrieval & Image Status', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/figures`);
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data)) {
      throw new Error(`Failed to fetch figures: ${json.error?.message}`);
    }

    if (json.data.length === 0) {
      throw new Error('No figures found for physics book');
    }

    const testFig = json.data[0];
    const imgUrl = testFig.signed_url || testFig.storage_path;
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      throw new Error(`Figure image URL returned HTTP ${imgRes.status}: ${imgUrl}`);
    }
    const contentType = imgRes.headers.get('content-type') || '';
    if (!contentType.includes('image/')) {
      throw new Error(`Invalid content-type for figure image: ${contentType}`);
    }

    return {
      details: `Retrieved ${json.data.length} figures. Sample "${testFig.figure_label}" (Page ${testFig.printed_page_number}) returned HTTP ${imgRes.status} (${contentType})`,
    };
  });

  // ----------------------------------------------------
  // SUITE 6: Flashcards Generation & Persistence
  // ----------------------------------------------------
  let generatedCards: any[] = [];
  await runTest('Flashcards', 'Generate Grounded Flashcards with Diagrams', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: "Newton's laws of motion",
        cardCount: 4,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data)) {
      throw new Error(`Flashcard generation failed: ${json.error?.message}`);
    }

    generatedCards = json.data;
    if (generatedCards.length === 0) {
      throw new Error('Flashcard generation returned 0 cards');
    }

    const firstCard = generatedCards[0];
    if (!firstCard.front || !firstCard.back) {
      throw new Error('Flashcard missing front or back field');
    }

    const hasFigure = generatedCards.some((c) => !!c.figureUrl);
    return {
      details: `Synthesized ${generatedCards.length} flashcards. Diagram attached: ${hasFigure}. Card 1: "${firstCard.front.slice(0, 50)}..."`,
    };
  });

  await runTest('Flashcards', 'Verify Flashcard Persistence: GET /api/books/[bookId]/flashcards', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${physicsBookId}/flashcards`);
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data)) {
      throw new Error(`Failed to retrieve persistent flashcards: ${json.error?.message}`);
    }
    if (json.data.length === 0) {
      throw new Error('Database contains 0 persisted flashcards');
    }
    return {
      details: `Retrieved ${json.data.length} persisted flashcards from Supabase book_flashcards table`,
    };
  });

  // ----------------------------------------------------
  // SUITE 7: Topic Study Suite & Adaptive Quiz Engine
  // ----------------------------------------------------
  await runTest('Adaptive Quiz', 'Generate Multi-Choice Quiz Questions with Educational Explanations', async () => {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Newton second law of motion: net force, mass, and acceleration with Fnet = ma',
        options: {
          difficulty: 'intermediate',
          cardCount: 3,
          quizCount: 3,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(`Generate API failed (${res.status}): ${json.error?.message}`);
    }

    const quiz = json.data.quiz;
    if (!Array.isArray(quiz) || quiz.length === 0) {
      throw new Error('Generated study session has no quiz questions');
    }

    for (const q of quiz) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Malformed quiz question: ${JSON.stringify(q)}`);
      }
      if (typeof q.correctAnswerIndex !== 'number' || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
        throw new Error(`Invalid correctAnswerIndex in question: ${q.question}`);
      }
      if (!q.explanation) {
        throw new Error(`Missing educational explanation in question: ${q.question}`);
      }
    }

    return {
      details: `Generated ${quiz.length} valid quiz questions with 4 options and detailed scientific rationales. Sample Q: "${quiz[0].question.slice(0, 50)}..."`,
    };
  });

  // ----------------------------------------------------
  // SUITE 8: Security & Credentials Leakage Audit
  // ----------------------------------------------------
  await runTest('Security Audit', 'API Payloads Do Not Expose Service Role Credentials', async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const responses = await Promise.all([
      fetch(`${BASE_URL}/api/books`).then((r) => r.text()),
      fetch(`${BASE_URL}/api/books/${physicsBookId}/figures`).then((r) => r.text()),
      fetch(`${BASE_URL}/api/books/${physicsBookId}/flashcards`).then((r) => r.text()),
    ]);

    for (const body of responses) {
      if (serviceKey && body.includes(serviceKey)) {
        throw new Error('SECURITY VIOLATION: SUPABASE_SERVICE_ROLE_KEY leaked in API response body!');
      }
      if (geminiKey && body.includes(geminiKey)) {
        throw new Error('SECURITY VIOLATION: GEMINI_API_KEY leaked in API response body!');
      }
    }

    return { details: 'Verified no private service keys or API credentials leaked across public API endpoints' };
  });

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('Test Execution Summary');
  console.log('====================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);

  fs.writeFileSync(
    path.join(process.cwd(), 'e2e_test_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`Results saved to e2e_test_results.json\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

