export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Citation {
  pdfPageIndex: number;
  printedPageNumber?: string | null;
  chunkId?: string;
  quote?: string;
  sourceBookTitle?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: DifficultyLevel;
  userStatus: 'learning' | 'mastered';
  // Book RAG Extensions:
  figureId?: string | null;
  figureUrl?: string | null;
  figureCaption?: string | null;
  citations?: Citation[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  userAnswerIndex?: number;
  // Book RAG Extensions:
  citations?: Citation[];
  figureUrl?: string | null;
}

export interface KeyConcept {
  id: string;
  concept: string;
  summary: string;
  mastered: boolean;
  citation?: Citation;
}

export interface StudySession {
  id: string;
  title: string;
  topic: string;
  summary: string;
  keyConcepts: KeyConcept[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  createdAt: string;
  lastModifiedAt: string;
  bookId?: string;
}

export interface GenerateRequestBody {
  prompt: string;
  options?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    cardCount?: number;
    quizCount?: number;
  };
  simulationMode?: ResilienceSimulationMode;
  apiKeyOverride?: {
    gemini?: string;
    groq?: string;
    openai?: string;
  };
}

export interface RefineRequestBody {
  currentSession: StudySession;
  refinementInstruction: string;
  simulationMode?: ResilienceSimulationMode;
  apiKeyOverride?: {
    gemini?: string;
    groq?: string;
    openai?: string;
  };
}

export type ResilienceSimulationMode =
  | 'none'
  | 'malformed_json'
  | 'schema_mismatch'
  | 'slow_timeout'
  | 'server_500'
  | 'stale_race';

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta: {
    modelUsed: string;
    durationMs: number;
    wasRepaired?: boolean;
    repairNotes?: string[];
  };
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    rawSnippet?: string;
    canAutoRepair?: boolean;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

// ==========================================
// Book-Based RAG & Supabase Persistent Types
// ==========================================

export type BookStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface Book {
  id: string;
  user_id?: string | null;
  title: string;
  storage_path: string;
  file_hash: string;
  total_pages: number;
  status: BookStatus;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookChunk {
  id: string;
  book_id: string;
  content: string;
  chunk_index: number;
  pdf_page_index: number;
  printed_page_number?: string | null;
  embedding?: number[];
  metadata?: {
    sectionHeading?: string;
    characterCount?: number;
    tokenEstimate?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface BookFigure {
  id: string;
  book_id: string;
  pdf_page_index: number;
  printed_page_number?: string | null;
  figure_label?: string | null;
  caption?: string | null;
  description?: string | null;
  storage_path: string;
  signed_url?: string;
  embedding?: number[];
  metadata?: {
    width?: number;
    height?: number;
    bbox?: [number, number, number, number];
    format?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface BookFlashcard {
  id: string;
  book_id: string;
  question: string;
  answer: string;
  figure_id?: string | null;
  figure_url?: string | null;
  source_chunk_ids: string[];
  citations: Citation[];
  created_at: string;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  pdf_page_index: number;
  printed_page_number?: string | null;
  chunk_index: number;
  dense_rank?: number;
  sparse_rank?: number;
  rrf_score: number;
  relevance_score?: number;
  semantic_score?: number;
  keyword_score?: number;
  passed_threshold?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RetrievalDebugChunk {
  id: string;
  chunk_index: number;
  printed_page_number: string;
  pdf_page_index: number;
  semantic_score: number;
  keyword_score: number;
  combined_score: number;
  passed_threshold: boolean;
  snippet: string;
  chunk_text?: string;
}

export interface RetrievalDebugInfo {
  query: string;
  clean_fts_query: string;
  has_query_embedding: boolean;
  total_candidates_evaluated: number;
  chunks: RetrievalDebugChunk[];
}

export interface BookQARequestBody {
  question: string;
  topK?: number;
  enableDiagramSearch?: boolean;
}

export interface BookQAResult {
  question: string;
  answer: string;
  book: {
    id: string;
    title: string;
    total_pages: number;
  };
  citations: Citation[];
  supporting_quotes: string[];
  figures: BookFigure[];
  retrieved_chunks: RetrievedChunk[];
  is_insufficient: boolean;
  duration_ms: number;
  debug?: RetrievalDebugInfo;
}
