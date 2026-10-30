-- ====================================================================
-- StudyCraft AI: Supabase pgvector RAG & Diagram Retrieval Schema
-- ====================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Storage Buckets (books and book-figures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-figures', 'book-figures', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Books Table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    total_pages INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for file hash lookups (idempotency check)
CREATE INDEX IF NOT EXISTS idx_books_file_hash ON public.books(file_hash);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);

-- 4. Book Chunks Table
-- Vector dimension: 768 (matching Google Gemini gemini-embedding-001 outputDimensionality: 768)
CREATE TABLE IF NOT EXISTS public.book_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    pdf_page_index INTEGER NOT NULL,
    printed_page_number TEXT,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_book_chunk_index UNIQUE (book_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_book_chunks_book_id ON public.book_chunks(book_id);
CREATE INDEX IF NOT EXISTS idx_book_chunks_page ON public.book_chunks(book_id, pdf_page_index);

-- HNSW Vector Index for Cosine Distance Semantic Search
CREATE INDEX IF NOT EXISTS idx_book_chunks_embedding_hnsw 
ON public.book_chunks 
USING hnsw (embedding vector_cosine_ops);

-- GIN Full-Text Search Index for Keyword Retrieval
CREATE INDEX IF NOT EXISTS idx_book_chunks_content_fts 
ON public.book_chunks 
USING gin (to_tsvector('english', content));

-- 5. Book Figures Table (Diagrams, Charts, Illustrations)
CREATE TABLE IF NOT EXISTS public.book_figures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    pdf_page_index INTEGER NOT NULL,
    printed_page_number TEXT,
    figure_label TEXT,
    caption TEXT,
    description TEXT,
    storage_path TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_figures_book_id ON public.book_figures(book_id);
CREATE INDEX IF NOT EXISTS idx_book_figures_page ON public.book_figures(book_id, pdf_page_index);

-- HNSW Vector Index for Figure Description Embeddings
CREATE INDEX IF NOT EXISTS idx_book_figures_embedding_hnsw 
ON public.book_figures 
USING hnsw (embedding vector_cosine_ops);

-- GIN Full-Text Search on Figure Caption & Description
CREATE INDEX IF NOT EXISTS idx_book_figures_text_fts 
ON public.book_figures 
USING gin (to_tsvector('english', coalesce(figure_label, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(description, '')));

-- 6. Book Flashcards Table
CREATE TABLE IF NOT EXISTS public.book_flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    figure_id UUID REFERENCES public.book_figures(id) ON DELETE SET NULL,
    source_chunk_ids UUID[] DEFAULT '{}',
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_flashcards_book_id ON public.book_flashcards(book_id);
CREATE INDEX IF NOT EXISTS idx_book_flashcards_figure_id ON public.book_flashcards(figure_id);

-- ====================================================================
-- Hybrid Search & Diagram Retrieval RPC Functions
-- ====================================================================

-- Function 1: Pure Semantic Vector Search for Chunks
CREATE OR REPLACE FUNCTION public.match_book_chunks_vector(
    p_book_id UUID,
    p_query_embedding vector(768),
    p_match_count INT DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id UUID,
    book_id UUID,
    content TEXT,
    chunk_index INT,
    pdf_page_index INT,
    printed_page_number TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id,
        bc.book_id,
        bc.content,
        bc.chunk_index,
        bc.pdf_page_index,
        bc.printed_page_number,
        (1 - (bc.embedding <=> p_query_embedding))::FLOAT AS similarity,
        bc.metadata
    FROM public.book_chunks bc
    WHERE bc.book_id = p_book_id
      AND (1 - (bc.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY bc.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- Function 2: Full-Text Search for Chunks
CREATE OR REPLACE FUNCTION public.match_book_chunks_text(
    p_book_id UUID,
    p_query_text TEXT,
    p_match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    book_id UUID,
    content TEXT,
    chunk_index INT,
    pdf_page_index INT,
    printed_page_number TEXT,
    rank REAL,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id,
        bc.book_id,
        bc.content,
        bc.chunk_index,
        bc.pdf_page_index,
        bc.printed_page_number,
        ts_rank_cd(to_tsvector('english', bc.content), plainto_tsquery('english', p_query_text)) AS rank,
        bc.metadata
    FROM public.book_chunks bc
    WHERE bc.book_id = p_book_id
      AND to_tsvector('english', bc.content) @@ plainto_tsquery('english', p_query_text)
    ORDER BY rank DESC
    LIMIT p_match_count;
END;
$$;

-- Function 3: Reciprocal Rank Fusion (RRF) Hybrid Search
CREATE OR REPLACE FUNCTION public.match_book_chunks_hybrid(
    p_book_id UUID,
    p_query_embedding vector(768),
    p_query_text TEXT,
    p_match_count INT DEFAULT 10,
    p_rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    id UUID,
    book_id UUID,
    content TEXT,
    chunk_index INT,
    pdf_page_index INT,
    printed_page_number TEXT,
    dense_rank BIGINT,
    sparse_rank BIGINT,
    rrf_score DOUBLE PRECISION,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH dense_results AS (
        SELECT
            bc.id,
            ROW_NUMBER() OVER (ORDER BY bc.embedding <=> p_query_embedding) AS rank
        FROM public.book_chunks bc
        WHERE bc.book_id = p_book_id
          AND bc.embedding IS NOT NULL
        LIMIT 40
    ),
    sparse_results AS (
        SELECT
            bc.id,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(to_tsvector('english', bc.content), plainto_tsquery('english', p_query_text)) DESC
            ) AS rank
        FROM public.book_chunks bc
        WHERE bc.book_id = p_book_id
          AND to_tsvector('english', bc.content) @@ plainto_tsquery('english', p_query_text)
        LIMIT 40
    ),
    combined_scores AS (
        SELECT
            COALESCE(d.id, s.id) AS chunk_id,
            d.rank AS dense_rank,
            s.rank AS sparse_rank,
            (COALESCE(1.0 / (p_rrf_k + d.rank), 0.0) + COALESCE(1.0 / (p_rrf_k + s.rank), 0.0))::DOUBLE PRECISION AS rrf_score
        FROM dense_results d
        FULL OUTER JOIN sparse_results s ON d.id = s.id
    )
    SELECT
        bc.id,
        bc.book_id,
        bc.content,
        bc.chunk_index,
        bc.pdf_page_index,
        bc.printed_page_number,
        cs.dense_rank,
        cs.sparse_rank,
        cs.rrf_score,
        bc.metadata
    FROM combined_scores cs
    JOIN public.book_chunks bc ON bc.id = cs.chunk_id
    ORDER BY cs.rrf_score DESC
    LIMIT p_match_count;
END;
$$;

-- Function 4: Diagram Retrieval by Semantic Similarity
CREATE OR REPLACE FUNCTION public.match_book_figures(
    p_book_id UUID,
    p_query_embedding vector(768),
    p_match_count INT DEFAULT 4,
    p_similarity_threshold FLOAT DEFAULT 0.25
)
RETURNS TABLE (
    id UUID,
    book_id UUID,
    pdf_page_index INT,
    printed_page_number TEXT,
    figure_label TEXT,
    caption TEXT,
    description TEXT,
    storage_path TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bf.id,
        bf.book_id,
        bf.pdf_page_index,
        bf.printed_page_number,
        bf.figure_label,
        bf.caption,
        bf.description,
        bf.storage_path,
        (1 - (bf.embedding <=> p_query_embedding))::FLOAT AS similarity,
        bf.metadata
    FROM public.book_figures bf
    WHERE bf.book_id = p_book_id
      AND bf.embedding IS NOT NULL
      AND (1 - (bf.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY bf.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- ====================================================================
-- Row Level Security (RLS) Policies
-- ====================================================================

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_flashcards ENABLE ROW LEVEL SECURITY;

-- Allow public read access to completed books and contents (for demo/study purposes)
-- or allow access if user is owner or user_id IS NULL (anonymous uploads)
CREATE POLICY "Allow public read access to books"
ON public.books FOR SELECT
USING (true);

CREATE POLICY "Allow users to insert their own books or anonymous"
ON public.books FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow owners to update their books"
ON public.books FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow owners to delete their books"
ON public.books FOR DELETE
USING (user_id IS NULL OR auth.uid() = user_id);

-- Policies for book_chunks
CREATE POLICY "Allow public read access to book_chunks"
ON public.book_chunks FOR SELECT
USING (true);

CREATE POLICY "Allow service_role to manage book_chunks"
ON public.book_chunks FOR ALL
USING (true)
WITH CHECK (true);

-- Policies for book_figures
CREATE POLICY "Allow public read access to book_figures"
ON public.book_figures FOR SELECT
USING (true);

CREATE POLICY "Allow service_role to manage book_figures"
ON public.book_figures FOR ALL
USING (true)
WITH CHECK (true);

-- Policies for book_flashcards
CREATE POLICY "Allow public read access to book_flashcards"
ON public.book_flashcards FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to book_flashcards"
ON public.book_flashcards FOR INSERT
WITH CHECK (true);

-- Storage bucket access policies
CREATE POLICY "Allow authenticated and anonymous download from books"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

CREATE POLICY "Allow upload to books bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'books');

CREATE POLICY "Allow public download from book-figures"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-figures');

CREATE POLICY "Allow upload to book-figures bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-figures');

