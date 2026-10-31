/**
 * StudyCraft AI - Grounded Book Question Answering Service
 * Uses Google Gemini with strict textbook citations and pedagogical depth.
 * Synthesizes grounded textbook excerpts with expert conceptual reasoning,
 * page citations, verbatim quotes, and original diagram linkages.
 */

import { extractAndRepairJson } from '@/lib/jsonRepair';
import { hybridSearch } from './hybridSearch';
import { Book, BookFigure, BookQAResult, Citation, RetrievedChunk } from '@/lib/types';

export const INSUFFICIENT_EVIDENCE_MESSAGE =
  'The retrieved excerpts from this book do not provide enough information to answer this question reliably.';

export interface AnswerBookQuestionOptions {
  book: Book;
  question: string;
  topK?: number;
  apiKeyOverride?: string;
}

export async function answerBookQuestion(
  options: AnswerBookQuestionOptions
): Promise<BookQAResult> {
  const { book, question, topK = 8, apiKeyOverride } = options;
  const startTime = Date.now();

  const apiKey =
    apiKeyOverride?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    '';

  // 1. Hybrid Search across book chunks and figure captions
  const searchRes = await hybridSearch({
    bookId: book.id,
    query: question,
    topK,
    enableDiagramSearch: true,
    apiKeyOverride,
  });

  const { chunks, figures } = searchRes;

  // If completely empty chunks
  if (!chunks || chunks.length === 0) {
    return {
      question,
      answer: INSUFFICIENT_EVIDENCE_MESSAGE,
      book,
      citations: [],
      supporting_quotes: [],
      figures: [],
      retrieved_chunks: [],
      is_insufficient: true,
      duration_ms: Date.now() - startTime,
      debug: searchRes.debug,
    };
  }

  // 2. Format Context Blocks
  const contextExcerpts = chunks
    .map((c, i) => {
      const pageStr = c.printed_page_number || String(c.pdf_page_index + 1);
      return `[EXCERPT ${i + 1} | ChunkID: ${c.id} | Page: ${pageStr}]\n${c.content}\n`;
    })
    .join('\n');

  const figuresContext =
    figures.length > 0
      ? figures
          .map(
            (f) =>
              `[FIGURE: ${f.id} | Label: ${f.figure_label || 'Figure'} | Page: ${
                f.printed_page_number || f.pdf_page_index + 1
              } | Caption: ${f.caption || 'None'}]\nVisual Description: ${
                f.description || ''
              }`
          )
          .join('\n\n')
      : 'No diagrams detected for this specific passage.';

  // 3. Grounded + Refined LLM Prompt
  const prompt = `
You are StudyCraft AI's Senior Educational Expert & Curriculum Architect.
You are helping a university student master complex concepts from their textbook: "${book.title}".

TEXTBOOK EXCERPTS (Grounded Evidence):
${contextExcerpts}

RELEVANT TEXTBOOK FIGURES / DIAGRAMS:
${figuresContext}

STUDENT QUESTION:
"${question}"

OBJECTIVE & SYNTHESIS RULES:
Deliver a comprehensive, advanced, and refined explanation that combines:
1. DIRECT TEXTBOOK GROUNDING: Anchor your answer in the specific laws, definitions, problem examples, and page numbers provided in the excerpts. Cite page numbers explicitly in parentheses (e.g. "(Page 102)").
2. DEEP PEDAGOGICAL EXPLANATION: Use your own expert scientific knowledge to provide intuitive analogies, detailed step-by-step physical/mathematical reasoning, and clear breakdowns so the student truly understands the underlying mechanics and subtleties.
3. STRUCTURED & REFINED FORMATTING: Structure the response into polished sections using markdown:
   - ### 📌 Executive Summary & Core Concept
   - ### 📖 Textbook Principles & Formulations (with exact page citations)
   - ### 🔬 In-Depth Analysis & Step-by-Step Breakdown (explaining the "why" and "how")
   - ### 🖼️ Visual / Diagram Insights (connecting to diagrams/figures if applicable)
   - ### 💡 Practical Application & Key Takeaways
4. CITATION INTEGRITY: Every time you mention a specific definition, formula, or law from the book, cite the exact page number from the excerpt (e.g. "(Page 105)"). Do NOT invent or hallucinate page numbers not present in the excerpts.
5. MATHEMATICAL & PEDAGOGICAL PRECISION: Format equations with standard notation (e.g. $\\vec{F}_{\\text{net}} = m\\vec{a}$, $F_{\\text{net},x} = m a_x$). Use clean paragraphs and bullet points for ease of reading.
6. VERBATIM QUOTES: Select 1 to 3 key authentic verbatim quotes from the excerpts that anchor the core definitions.
7. DIAGRAM REFERENCING: If the excerpts or figure list include relevant diagrams, reference their ID in "relevantFigureIds" and explain what they demonstrate.
8. INSUFFICIENT CHECK: If the provided excerpts do not explain or define the requested concept, you MUST set "isInsufficient": true and provide an honest note in "answer" stating that the retrieved context is insufficient to answer reliably, rather than hallucinating or generating ungrounded claims.

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "answer": "Polished, in-depth markdown response with clear sections, equations, page citations, and rich conceptual explanations...",
  "citations": [
    {
      "pdfPageIndex": 0,
      "printedPageNumber": "1",
      "chunkId": "string",
      "quote": "verbatim sentence from the excerpt"
    }
  ],
  "supportingQuotes": [
    "verbatim quotation 1",
    "verbatim quotation 2"
  ],
  "relevantFigureIds": ["figure-uuid-if-applicable"],
  "isInsufficient": false
}
`;

  // 4. Call Gemini Model
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  let rawJson = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(18000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25,
            maxOutputTokens: 4096,
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
      }
    } catch (err) {
      console.warn(`Failed model ${model} during QA, trying fallback:`, err);
    }
  }

  // 5. Parse and assemble result
  if (rawJson) {
    try {
      const repaired = extractAndRepairJson(rawJson);
      const data = repaired.parsed as any;

      const relevantFigs: BookFigure[] = [];
      if (Array.isArray(data.relevantFigureIds) && data.relevantFigureIds.length > 0) {
        for (const figId of data.relevantFigureIds) {
          const match = figures.find((f) => f.id === figId);
          if (match && !relevantFigs.some((rf) => rf.id === match.id)) {
            // Filter out front matter Roman numerals
            if (!/^[ivxlcdm]+$/i.test(match.printed_page_number?.trim() || '')) {
              relevantFigs.push(match);
            }
          }
        }
      }

      // If user specifically asked about diagrams and no figure was tagged yet, only include genuine nearby chapter diagrams
      const isDiagramQuery = /\b(diagram|figure|illustration|chart|graph|draw|sketch)\b/i.test(question);
      if (isDiagramQuery && relevantFigs.length === 0 && figures.length > 0) {
        const nearbyFig = figures.find((f) => {
          if (/^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '')) return false;
          return chunks.some((c) => Math.abs(c.pdf_page_index - f.pdf_page_index) <= 12);
        });
        if (nearbyFig) {
          relevantFigs.push(nearbyFig);
        }
      }

      const citations: Citation[] = Array.isArray(data.citations)
        ? data.citations.map((c: any) => ({
            pdfPageIndex: c.pdfPageIndex ?? 0,
            printedPageNumber: String(c.printedPageNumber || '1'),
            chunkId: c.chunkId || '',
            quote: c.quote || '',
            sourceBookTitle: book.title,
          }))
        : [];

      return {
        question,
        answer: data.answer || INSUFFICIENT_EVIDENCE_MESSAGE,
        book,
        citations,
        supporting_quotes: Array.isArray(data.supportingQuotes) ? data.supportingQuotes : [],
        figures: relevantFigs,
        retrieved_chunks: chunks,
        is_insufficient: !!data.isInsufficient,
        duration_ms: Date.now() - startTime,
        debug: searchRes.debug,
      };
    } catch (err) {
      console.error('Failed to parse Gemini QA response:', err, rawJson);
    }
  }

  // Fallback: Assemble simple extractive summary
  const topCitations: Citation[] = chunks.slice(0, 3).map((c) => ({
    pdfPageIndex: c.pdf_page_index,
    printedPageNumber: c.printed_page_number || String(c.pdf_page_index + 1),
    chunkId: c.id,
    quote: c.content.slice(0, 160),
    sourceBookTitle: book.title,
  }));

  return {
    question,
    answer: `According to "${book.title}" (Page ${topCitations[0]?.printedPageNumber || '1'}):\n\n"${chunks[0]?.content.slice(0, 400)}..."`,
    book,
    citations: topCitations,
    supporting_quotes: topCitations.map((c) => c.quote || ''),
    figures: figures.filter((f) => !/^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '')).slice(0, 2),
    retrieved_chunks: chunks,
    is_insufficient: false,
    duration_ms: Date.now() - startTime,
    debug: searchRes.debug,
  };
}
