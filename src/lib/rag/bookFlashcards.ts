/**
 * StudyCraft AI - Book-Grounded Flashcard Generator
 * Extends the existing 3D flashcard deck with source page citations
 * and original textbook diagrams.
 */

import { hybridSearch } from './hybridSearch';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { Flashcard, Citation } from '@/lib/types';
import { extractAndRepairJson } from '@/lib/jsonRepair';
import path from 'path';
import fs from 'fs';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

export interface GenerateBookFlashcardsOptions {
  book: {
    id: string;
    title: string;
    total_pages: number;
  };
  topic?: string;
  cardCount?: number;
  apiKeyOverride?: string;
}

export async function generateBookFlashcards(
  options: GenerateBookFlashcardsOptions
): Promise<Flashcard[]> {
  const { book, topic = 'core principles', cardCount = 6, apiKeyOverride } = options;

  const apiKey =
    apiKeyOverride?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    '';

  // 1. Retrieve relevant chunks and figures from book
  const searchRes = await hybridSearch({
    bookId: book.id,
    query: topic || book.title,
    topK: 12,
    enableDiagramSearch: true,
    apiKeyOverride,
  });

  const { chunks, figures } = searchRes;

  if (chunks.length === 0) {
    throw new Error('No chunks found for this book to generate flashcards.');
  }

  // Format context for prompt
  const excerptsText = chunks
    .map((c, i) => `[EXCERPT ${i + 1} | ChunkID: ${c.id} | Page: ${c.printed_page_number || c.pdf_page_index + 1}]\n${c.content}`)
    .join('\n\n');

  const figuresText = figures.length > 0
    ? figures
        .map(
          (f) =>
            `[FIGURE_ID: ${f.id} | Page: ${f.printed_page_number || f.pdf_page_index + 1} | Label: ${f.figure_label || 'Diagram'}]\nDescription: ${f.description || f.caption || ''}`
        )
        .join('\n\n')
    : 'No diagrams available.';

  const prompt = `
You are an expert academic curriculum designer generating active-recall flashcards strictly grounded in this textbook: "${book.title}".

TEXTBOOK EXCERPTS:
${excerptsText}

AVAILABLE TEXTBOOK DIAGRAMS:
${figuresText}

TASK:
Generate ${cardCount} high-yield flashcards.

PRIORITIZE DIAGRAM FLASHCARDS:
Whenever one of the AVAILABLE TEXTBOOK DIAGRAMS is relevant to the excerpt:
1. Make it a DIAGRAM-BASED FLASHCARD.
2. Front: Formulate a clear diagnostic question testing understanding of the diagram, starting with: "Front — [Question testing the diagram's mechanism, forces, or principles]".
   Example: "Front — What is the function of this pulley system and how are the forces balanced?"
3. Back: Provide an authoritative explanation of the diagram starting with: "Back — [Explanation of the mechanism, equations, and principles shown in the diagram]".
4. "figureId": MUST be set to the exact FIGURE_ID of that diagram.
5. "category": The specific concept name (e.g., "Pulley Systems & Tension", "Forces on an Inclined Plane", "Newton's Second Law").
6. "citations": Must include the exact source page number and ChunkID from the excerpts.

For concepts without a diagram, format the front as "Front — [Question]" and back as "Back — [Answer]".

Respond ONLY with valid JSON matching this schema:
{
  "flashcards": [
    {
      "front": "Front — What is the function of ...?",
      "back": "Back — The mechanism functions by ...",
      "category": "Topic Name",
      "difficulty": "medium",
      "figureId": "figure-uuid-or-null",
      "citations": [
        {
          "pdfPageIndex": 0,
          "printedPageNumber": "1",
          "chunkId": "chunk-uuid"
        }
      ]
    }
  ]
}
`;

  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  let rawJson = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          rawJson = text;
          break;
        }
      } else {
        const errText = await response.text();
        console.warn(`Model ${model} returned HTTP ${response.status}:`, errText);
      }
    } catch (err) {
      console.warn(`Flashcard generation with ${model} failed, trying next:`, err);
    }
  }

  const generatedCards: Flashcard[] = [];

  if (rawJson) {
    try {
      const parsed = extractAndRepairJson(rawJson).parsed as any;
      if (Array.isArray(parsed.flashcards)) {
        for (let i = 0; i < parsed.flashcards.length; i++) {
          const item = parsed.flashcards[i];
          const citations: Citation[] = Array.isArray(item.citations)
            ? item.citations.map((c: any) => ({
                pdfPageIndex: typeof c.pdfPageIndex === 'number' ? c.pdfPageIndex : 0,
                printedPageNumber: c.printedPageNumber || String((c.pdfPageIndex || 0) + 1),
                chunkId: c.chunkId,
                sourceBookTitle: book.title,
              }))
            : [
                {
                  pdfPageIndex: chunks[0].pdf_page_index,
                  printedPageNumber: chunks[0].printed_page_number || String(chunks[0].pdf_page_index + 1),
                  sourceBookTitle: book.title,
                },
              ];

          let matchedFigure = item.figureId
            ? figures.find(
                (f) =>
                  f.id === item.figureId ||
                  (f.figure_label && f.figure_label.toLowerCase() === item.figureId.toLowerCase()) ||
                  (f.figure_label && item.figureId.toLowerCase().includes(f.figure_label.toLowerCase()))
              )
            : null;

          // Proximity link if model discussed diagram topic but didn't return exact UUID
          if (!matchedFigure && figures.length > 0 && citations.length > 0) {
            const firstCit = citations[0];
            matchedFigure =
              figures.find((f) => {
                if (firstCit.printedPageNumber && f.printed_page_number === firstCit.printedPageNumber) {
                  return true;
                }
                return Math.abs(f.pdf_page_index - firstCit.pdfPageIndex) <= 1;
              }) || null;
          }

          let frontText = item.front || `Key Concept from ${book.title}`;
          frontText = frontText.replace(/^(front\s*[-—:]\s*)+/i, '').trim();
          frontText = `Front — ${frontText}`;

          let backText = item.back || 'See source text for details.';
          backText = backText.replace(/^(back\s*[-—:]\s*)+/i, '').trim();
          backText = `Back — ${backText}`;

          generatedCards.push({
            id: `book_fc_${book.id}_${i + 1}`,
            front: frontText,
            back: backText,
            category: item.category || book.title.slice(0, 24),
            difficulty: ['easy', 'medium', 'hard'].includes(item.difficulty)
              ? item.difficulty
              : 'medium',
            userStatus: 'learning',
            figureId: matchedFigure ? matchedFigure.id : null,
            figureUrl: matchedFigure ? matchedFigure.signed_url : null,
            figureCaption: matchedFigure ? matchedFigure.figure_label || matchedFigure.caption : null,
            citations,
          });
        }

        // Guarantee at least one diagram-based flashcard when figures exist
        if (figures.length > 0 && !generatedCards.some((c) => c.figureUrl)) {
          const topFig = figures[0];
          if (generatedCards[0]) {
            generatedCards[0].figureId = topFig.id;
            generatedCards[0].figureUrl = topFig.signed_url;
            generatedCards[0].figureCaption = topFig.figure_label || topFig.caption;
            if (topFig.printed_page_number) {
              generatedCards[0].citations = [
                {
                  pdfPageIndex: topFig.pdf_page_index,
                  printedPageNumber: topFig.printed_page_number,
                  sourceBookTitle: book.title,
                },
              ];
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not parse flashcards JSON from model:', err);
    }
  }

  // Fallback if AI didn't return cards
  if (generatedCards.length === 0) {
    chunks.slice(0, cardCount).forEach((chunk, idx) => {
      const pageStr = chunk.printed_page_number || String(chunk.pdf_page_index + 1);
      const attachedFig = idx === 0 && figures.length > 0 ? figures[0] : null;

      generatedCards.push({
        id: `book_fc_${book.id}_${idx + 1}`,
        front: `What foundational principle does "${book.title}" establish on page ${pageStr}?`,
        back: chunk.content.slice(0, 320) + '...',
        category: book.title.slice(0, 24),
        difficulty: idx % 2 === 0 ? 'medium' : 'hard',
        userStatus: 'learning',
        figureId: attachedFig ? attachedFig.id : null,
        figureUrl: attachedFig ? attachedFig.signed_url : null,
        figureCaption: attachedFig ? attachedFig.figure_label || attachedFig.caption : null,
        citations: [
          {
            pdfPageIndex: chunk.pdf_page_index,
            printedPageNumber: pageStr,
            chunkId: chunk.id,
            sourceBookTitle: book.title,
          },
        ],
      });
    });
  }

  // 4. Persist generated flashcards to Supabase (or local store)
  const supabaseConfigured = isSupabaseConfigured();
  if (supabaseConfigured) {
    try {
      const supabase = getAdminClient();
      await supabase.from('book_flashcards').insert(
        generatedCards.map((c) => ({
          book_id: book.id,
          question: c.front,
          answer: c.back,
          figure_id: c.figureId || null,
          source_chunk_ids: (c.citations || [])
            .map((cit) => cit.chunkId)
            .filter((id): id is string => Boolean(id)),
          citations: (c.citations || []) as any,
        }))
      );
    } catch (persistErr) {
      console.warn('Failed to persist book_flashcards to Supabase:', persistErr);
    }
  } else {
    const bookStorageDir = path.join(LOCAL_STORAGE_DIR, 'books', book.id);
    if (!fs.existsSync(bookStorageDir)) fs.mkdirSync(bookStorageDir, { recursive: true });
    fs.writeFileSync(
      path.join(bookStorageDir, 'flashcards.json'),
      JSON.stringify(generatedCards, null, 2),
      'utf-8'
    );
  }

  return generatedCards;
}
