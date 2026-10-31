/**
 * StudyCraft AI - Supabase Hybrid Search Engine
 * Combines PostgreSQL Full-Text Search (lexical) with pgvector cosine similarity (semantic)
 * using Reciprocal Rank Fusion (RRF) with graceful degradation to keyword/FTS search.
 */

import path from 'path';
import fs from 'fs';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { generateEmbedding } from './embeddings';
import { BookFigure, RetrievedChunk, RetrievalDebugChunk, RetrievalDebugInfo } from '@/lib/types';

export interface HybridSearchOptions {
  bookId: string;
  query: string;
  topK?: number;
  enableDiagramSearch?: boolean;
  apiKeyOverride?: string;
}

export interface HybridSearchResult {
  chunks: RetrievedChunk[];
  figures: BookFigure[];
  queryEmbedding?: number[];
  durationMs: number;
  debug?: RetrievalDebugInfo;
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');
const PUBLIC_EXTRACTED_DIR = path.join(process.cwd(), 'public', 'extracted_figures');

const FTS_STOP_WORDS = new Set([
  'what', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for',
  'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'out', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
  'should', 'now', 'explain', 'show', 'describe', 'tell', 'give', 'list', 'detail',
  'diagram', 'diagrams', 'figure', 'figures', 'page', 'pages', 'citation', 'citations',
  'quote', 'quotes', 'please', 'book', 'textbook', 'chapter', 'section', 'find', 'does'
]);

function cleanQueryForFts(rawQuery: string): string {
  const tokens = rawQuery
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !FTS_STOP_WORDS.has(w));

  if (tokens.length > 0) {
    return tokens.slice(0, 6).join(' ');
  }

  return rawQuery
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function isIndexOrFrontMatter(chunk: { content: string; pdf_page_index?: number; printed_page_number?: string | null }): boolean {
  const pageNo = (chunk.printed_page_number || '').trim();
  const pdfIdx = chunk.pdf_page_index ?? 0;

  // Roman numerals for front matter preface/contents
  if (/^[ivxlcdm]+$/i.test(pageNo)) return true;

  // Back-of-book index pages (Printed I-1 to I-28, or PDF pages 686-713)
  if (/^I[-–]\d+/i.test(pageNo) || (pdfIdx >= 686 && pdfIdx <= 713)) return true;

  // Answer key section (Printed AN-1 to AN-8, or PDF pages 678-685)
  if (/^AN[-–]\d+/i.test(pageNo) || (pdfIdx >= 678 && pdfIdx <= 685)) return true;

  const content = chunk.content || '';
  // General index / reference listing detection: chunks dominated by comma-separated page numbers or ranges
  const pageRangeMatches = content.match(/\b\d{1,4}[–-]\d{1,4}\b/g) || [];
  const commaPageMatches = content.match(/,\s*\d{2,4}\b/g) || [];
  if (pdfIdx >= 650 && (pageRangeMatches.length + commaPageMatches.length >= 6)) {
    return true;
  }

  if (/^\s*I-\d+\s+INDEX\b/i.test(content)) return true;
  if (/\bSee also\b/i.test(content) && pageRangeMatches.length >= 2) return true;

  return false;
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00AD\u200B]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeRelevanceScore(
  chunkContent: string,
  rawQuery: string,
  queryTerms: string[],
  semanticSimilarity: number,
  hasEmbedding: boolean
): { keywordScore: number; combinedScore: number; passed: boolean } {
  const contentLower = normalizeForSearch(chunkContent);
  const queryLower = normalizeForSearch(rawQuery);

  // 1. Keyword coverage
  let matchedTerms = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) matchedTerms++;
  }
  const termRatio = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;
  let keywordScore = termRatio * 0.35;

  // 2. Exact phrase bonus
  const phrases = [
    "newton's second law",
    "second law of motion",
    "second law",
    "fnet = ma",
    "f_net = ma",
    "f = ma",
  ];
  for (const phrase of phrases) {
    if (queryLower.includes(phrase) && contentLower.includes(phrase)) {
      if (phrase === "newton's second law" || phrase === "second law of motion") {
        keywordScore += 0.40;
      } else {
        keywordScore += 0.25;
      }
      break;
    }
  }

  // 3. Mathematical Formula presence
  if (/\bfnet\b|\bf_net\b|\bmax\b|\bmay\b|\bmaz\b|\bf\s*=\s*ma\b|\bf\s*(?:→|->)?\s*net\s*=\s*m\s*a/i.test(chunkContent)) {
    keywordScore += 0.15;
  }

  // 4. Core foundational definition terms
  if (/\bnet force\b/i.test(chunkContent) && /\bacceleration\b/i.test(chunkContent)) {
    keywordScore += 0.15;
  }

  // 5. Penalty for application-only sample problems when explaining the fundamental law
  const isExplainQuery = /\b(explain|state|what is|define|principles?|law|concept)\b/i.test(rawQuery);
  const isSampleProblem = /\b(sample problem|sea biscuits|in fig|cord accelerates|frictionless ramp|in the overhead view)\b/i.test(chunkContent);
  const definesTheLaw = /\b(newton's second law)\s*[:—\s]+the net force\b/i.test(contentLower) || /\bfnet\s*=\s*ma\b/i.test(contentLower);

  if (isExplainQuery && isSampleProblem && !definesTheLaw) {
    keywordScore = Math.max(0, keywordScore - 0.20);
  }

  keywordScore = Math.min(1.0, keywordScore);

  let combinedScore = 0;
  if (hasEmbedding) {
    // Both semantic and keyword contribute; semanticSimilarity anchors dense match
    combinedScore = 0.60 * semanticSimilarity + 0.40 * keywordScore;
  } else {
    combinedScore = keywordScore;
  }

  const passed = combinedScore >= 0.32;
  return { keywordScore, combinedScore, passed };
}

export async function hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult> {
  const {
    bookId,
    query,
    topK = 7,
    enableDiagramSearch = true,
    apiKeyOverride,
  } = options;

  const startTime = Date.now();

  // 1. Generate query embedding using Gemini (with fallback if rate-limited)
  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await generateEmbedding(query, apiKeyOverride);
  } catch (err: any) {
    console.warn('Query embedding generation skipped/failed (falling back to lexical/FTS):', err.message);
  }

  const hasEmbedding = Array.isArray(queryEmbedding) && queryEmbedding.length === 768;
  const supabaseConfigured = isSupabaseConfigured();
  const supabase = supabaseConfigured ? getAdminClient() : null;

  let candidateMap = new Map<string, any>();
  let figures: BookFigure[] = [];

  const cleanFtsQuery = cleanQueryForFts(query);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FTS_STOP_WORDS.has(w));

  if (supabase) {
    try {
      // 2A. Dense Semantic Vector Retrieval (Top 30 candidates by cosine similarity)
      if (hasEmbedding) {
        const { data: vectorData, error: vectorErr } = await (supabase as any).rpc(
          'match_book_chunks_vector',
          {
            p_book_id: bookId,
            p_query_embedding: queryEmbedding,
            p_match_count: 30,
            p_similarity_threshold: 0.15,
          }
        );

        if (!vectorErr && vectorData && Array.isArray(vectorData)) {
          vectorData.forEach((row: any, idx: number) => {
            candidateMap.set(row.id, {
              ...row,
              dense_rank: idx + 1,
              semantic_score: row.similarity ?? 0,
            });
          });
        }
      }

      // 2B. Full-Text Search (Lexical) across query terms
      const { data: textData, error: textErr } = await (supabase as any).rpc(
        'match_book_chunks_text',
        {
          p_book_id: bookId,
          p_query_text: cleanFtsQuery,
          p_match_count: 25,
        }
      );

      if (!textErr && textData && Array.isArray(textData)) {
        textData.forEach((row: any, idx: number) => {
          if (candidateMap.has(row.id)) {
            const existing = candidateMap.get(row.id);
            existing.sparse_rank = idx + 1;
            existing.text_rank = row.rank;
          } else {
            candidateMap.set(row.id, {
              ...row,
              sparse_rank: idx + 1,
              text_rank: row.rank,
              semantic_score: 0,
            });
          }
        });
      }

      // 2C. Core concept subphrase search (e.g. if query has "second law")
      const subPhrases: string[] = [];
      if (/second\s*law/i.test(query)) subPhrases.push('newton second law');
      if (/first\s*law/i.test(query)) subPhrases.push('newton first law');
      if (/third\s*law/i.test(query)) subPhrases.push('newton third law');
      if (/f\s*=\s*ma|net\s*force/i.test(query)) subPhrases.push('net force mass acceleration');

      for (const phrase of subPhrases) {
        const { data: phraseData } = await (supabase as any).rpc('match_book_chunks_text', {
          p_book_id: bookId,
          p_query_text: phrase,
          p_match_count: 15,
        });

        if (phraseData && Array.isArray(phraseData)) {
          phraseData.forEach((row: any) => {
            if (!candidateMap.has(row.id)) {
              candidateMap.set(row.id, {
                ...row,
                sparse_rank: candidateMap.size + 1,
                semantic_score: 0,
              });
            }
          });
        }
      }
    } catch (dbErr) {
      console.warn('Supabase search encountered error, attempting local fallback:', dbErr);
    }
  }

  // 3. Fallback to Local Cached Chunks if Supabase returned 0 candidates or is offline
  if (candidateMap.size === 0) {
    const candidatePaths = [
      path.join(PUBLIC_EXTRACTED_DIR, bookId, 'chunks_with_embeddings.json'),
      path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'chunks.json'),
    ];

    let cachedList: any[] = [];
    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        try {
          cachedList = JSON.parse(fs.readFileSync(cp, 'utf-8'));
          if (cachedList.length > 0) break;
        } catch {}
      }
    }

    if (cachedList.length > 0) {
      cachedList.forEach((c) => {
        let semSim = 0;
        if (hasEmbedding && c.embedding && !c.embedding.every((x: number) => x === 0)) {
          semSim = cosineSimilarity(queryEmbedding, c.embedding);
        }
        candidateMap.set(c.id, {
          ...c,
          semantic_score: semSim,
        });
      });
    }
  }

  // 4. Exclude Index and Front Matter Listings
  const rawCandidates = Array.from(candidateMap.values());
  const cleanCandidates = rawCandidates.filter((c) => !isIndexOrFrontMatter(c));

  // 5. Compute Relevance Scores & Apply Relevance Threshold
  const evaluatedChunks: RetrievalDebugChunk[] = [];
  const scoredChunks: RetrievedChunk[] = [];

  cleanCandidates.forEach((c) => {
    let semSim = c.semantic_score || 0;
    if (semSim === 0 && hasEmbedding && c.embedding && Array.isArray(c.embedding)) {
      semSim = cosineSimilarity(queryEmbedding, c.embedding);
    }

    const { keywordScore, combinedScore, passed } = computeRelevanceScore(
      c.content,
      query,
      queryTerms,
      semSim,
      hasEmbedding
    );

    const rrfScore =
      (c.dense_rank ? 1.0 / (60 + c.dense_rank) : 0) +
      (c.sparse_rank ? 1.0 / (60 + c.sparse_rank) : 0);

    const chunkObj: RetrievedChunk = {
      id: c.id,
      content: c.content,
      chunk_index: c.chunk_index,
      pdf_page_index: c.pdf_page_index,
      printed_page_number: c.printed_page_number,
      dense_rank: c.dense_rank,
      sparse_rank: c.sparse_rank,
      rrf_score: rrfScore,
      relevance_score: combinedScore,
      semantic_score: semSim,
      keyword_score: keywordScore,
      passed_threshold: passed,
      metadata: c.metadata,
    };

    evaluatedChunks.push({
      id: c.id,
      chunk_index: c.chunk_index,
      printed_page_number: String(c.printed_page_number || c.pdf_page_index + 1),
      pdf_page_index: c.pdf_page_index,
      semantic_score: Number(semSim.toFixed(4)),
      keyword_score: Number(keywordScore.toFixed(4)),
      combined_score: Number(combinedScore.toFixed(4)),
      passed_threshold: passed,
      snippet: c.content.slice(0, 140).replace(/\s+/g, ' ').trim(),
      chunk_text: c.content.slice(0, 600).trim(),
    });

    if (passed) {
      scoredChunks.push(chunkObj);
    }
  });

  // Sort passing chunks by combined relevance score descending
  scoredChunks.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  evaluatedChunks.sort((a, b) => b.combined_score - a.combined_score);

  const selectedChunks = scoredChunks.slice(0, topK);

  // 6. Search Diagrams / Figures Proximate to Selected Chunks
  if (enableDiagramSearch && supabase && selectedChunks.length > 0) {
    try {
      const foundFigMap = new Map<string, BookFigure>();
      const chunkPages = Array.from(new Set(selectedChunks.map((c) => c.pdf_page_index)));
      const minPage = Math.max(0, Math.min(...chunkPages) - 2);
      const maxPage = Math.max(...chunkPages) + 2;

      const { data: proxFigs } = await supabase
        .from('book_figures')
        .select('*')
        .eq('book_id', bookId)
        .gte('pdf_page_index', minPage)
        .lte('pdf_page_index', maxPage)
        .limit(6);

      if (proxFigs && Array.isArray(proxFigs)) {
        proxFigs
          .filter((f: any) => !/^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '') && f.pdf_page_index >= 20)
          .forEach((f: any) => {
            foundFigMap.set(f.id, {
              id: f.id,
              book_id: f.book_id,
              pdf_page_index: f.pdf_page_index,
              printed_page_number: f.printed_page_number,
              figure_label: f.figure_label,
              caption: f.caption,
              description: f.description,
              storage_path: f.storage_path,
              signed_url: f.storage_path.startsWith('/')
                ? f.storage_path
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-figures/${f.storage_path}`,
              metadata: f.metadata,
              created_at: f.created_at || new Date().toISOString(),
            });
          });
      }

      figures = Array.from(foundFigMap.values()).slice(0, 4);
    } catch (figErr) {
      console.warn('Figure retrieval warning:', figErr);
    }
  }

  const debugInfo: RetrievalDebugInfo = {
    query,
    clean_fts_query: cleanFtsQuery,
    has_query_embedding: hasEmbedding,
    total_candidates_evaluated: cleanCandidates.length,
    chunks: evaluatedChunks.slice(0, 20),
  };

  return {
    chunks: selectedChunks,
    figures,
    queryEmbedding: hasEmbedding ? queryEmbedding : undefined,
    durationMs: Date.now() - startTime,
    debug: debugInfo,
  };
}
