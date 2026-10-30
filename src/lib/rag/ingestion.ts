/**
 * StudyCraft AI - Asynchronous Book Ingestion Pipeline
 * Orchestrates Python PyMuPDF page streaming, Gemini batch embeddings,
 * Vision diagram analysis, and persistent storage in Supabase PostgreSQL + pgvector.
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { generateBatchEmbeddings } from './embeddings';
import { analyzeDiagramWithVision } from './vision';
import { BookChunk, BookFigure } from '@/lib/types';

const execFileAsync = promisify(execFile);

export interface IngestionOptions {
  bookId: string;
  pdfPath: string;
  apiKeyOverride?: string;
  onProgress?: (stage: string, progressPct: number) => void;
}

export interface IngestionSummary {
  bookId: string;
  totalPages: number;
  totalChunks: number;
  totalFigures: number;
  durationMs: number;
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

async function insertWithRetry(
  supabase: any,
  table: string,
  records: any[],
  maxRetries = 4
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.from(table).insert(records);
      if (!error) return;
      if (attempt === maxRetries) {
        throw new Error(error.message || JSON.stringify(error));
      }
      const backoff = 1200 * attempt;
      console.warn(`Supabase insert to ${table} failed (attempt ${attempt}/${maxRetries}). Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw new Error(err.message || String(err));
      }
      const backoff = 1500 * attempt;
      console.warn(`Supabase network error on ${table} (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

export async function ingestBook(options: IngestionOptions): Promise<IngestionSummary> {
  const { bookId, pdfPath, apiKeyOverride, onProgress } = options;
  const startTime = Date.now();

  const supabaseConfigured = isSupabaseConfigured();
  const supabase = supabaseConfigured ? getAdminClient() : null;

  // 1. Mark status as 'processing'
  if (supabase) {
    await supabase
      .from('books')
      .update({ status: 'processing' as const, error_message: null, updated_at: new Date().toISOString() })
      .eq('id', bookId);
  }

  const figuresOutputDir = path.join(process.cwd(), 'public', 'extracted_figures', bookId);
  if (!fs.existsSync(figuresOutputDir)) {
    fs.mkdirSync(figuresOutputDir, { recursive: true });
  }

  const outputJsonPath = path.join(figuresOutputDir, 'processed_book.json');
  const cacheChunksPath = path.join(figuresOutputDir, 'chunks_with_embeddings.json');
  const cacheFiguresPath = path.join(figuresOutputDir, 'figures_with_embeddings.json');
  const pythonScript = path.join(process.cwd(), 'scripts', 'pdf_processor.py');

  try {
    // 2. Run Python PyMuPDF extractor (reuse existing json if already extracted)
    let processedData: any = null;
    if (fs.existsSync(outputJsonPath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
        if (cached && cached.chunks && cached.chunks.length > 0) {
          processedData = cached;
        }
      } catch {
        // re-run if json was corrupted
      }
    }

    if (!processedData) {
      onProgress?.('Extracting text, page boundaries, and figures via PyMuPDF...', 10);
      await execFileAsync('python', [pythonScript, pdfPath, bookId, figuresOutputDir, outputJsonPath]);

      if (!fs.existsSync(outputJsonPath)) {
        throw new Error('PyMuPDF extraction failed: processed_book.json was not generated.');
      }
      processedData = JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
    }

    const { total_pages, chunks: rawChunks, figures: rawFigures } = processedData;

    onProgress?.(`Extracted ${total_pages} pages, ${rawChunks.length} chunks, ${rawFigures.length} figures. Processing diagrams...`, 25);

    // 3. Process Figures: Fast caption assignment & batch figure embedding
    let processedFigures: BookFigure[] = [];

    if (fs.existsSync(cacheFiguresPath)) {
      try {
        processedFigures = JSON.parse(fs.readFileSync(cacheFiguresPath, 'utf-8'));
      } catch {}
    }

    if (processedFigures.length === 0) {
      const figuresToProcess = (rawFigures || []).slice(0, 30);
      let visionCallsCount = 0;

      for (let i = 0; i < figuresToProcess.length; i++) {
        const fig = figuresToProcess[i];
        let visionRes: { label: string; caption: string; description: string };

        // Fast-path: If PyMuPDF already extracted an accurate caption, use it directly (0 sec)
        if (fig.caption && fig.caption.trim().length > 10) {
          visionRes = {
            label: fig.figure_label || `Figure on Page ${fig.printed_page_number}`,
            caption: fig.caption,
            description: fig.caption,
          };
        } else if (visionCallsCount < 3) {
          // Limit vision calls to max 3 small diagrams
          visionCallsCount++;
          visionRes = await analyzeDiagramWithVision(
            fig.file_path,
            fig.caption,
            fig.pdf_page_index,
            apiKeyOverride
          );
        } else {
          visionRes = {
            label: fig.figure_label || `Figure on Page ${fig.printed_page_number}`,
            caption: fig.caption || `Diagram on Page ${fig.printed_page_number}`,
            description: fig.caption || `Technical diagram from page ${fig.printed_page_number}.`,
          };
        }

        let storagePath = `/extracted_figures/${bookId}/${fig.filename}`;
        processedFigures.push({
          id: fig.id,
          book_id: bookId,
          pdf_page_index: fig.pdf_page_index,
          printed_page_number: fig.printed_page_number,
          figure_label: visionRes.label,
          caption: visionRes.caption,
          description: visionRes.description,
          storage_path: storagePath,
          metadata: fig.metadata,
          created_at: new Date().toISOString(),
        });
      }

      // Parallel upload of figure images to Supabase Storage (5 at a time)
      if (supabase && processedFigures.length > 0) {
        const UPLOAD_CONCURRENCY = 5;
        for (let i = 0; i < figuresToProcess.length; i += UPLOAD_CONCURRENCY) {
          const batch = figuresToProcess.slice(i, i + UPLOAD_CONCURRENCY);
          await Promise.all(
            batch.map(async (fig: any, batchIdx: number) => {
              try {
                if (fs.existsSync(fig.file_path)) {
                  const fileBuf = fs.readFileSync(fig.file_path);
                  const uploadRes = await supabase.storage
                    .from('book-figures')
                    .upload(`${bookId}/${fig.filename}`, fileBuf, {
                      contentType: fig.metadata?.format === 'jpg' ? 'image/jpeg' : 'image/png',
                      upsert: true,
                    });
                  if (!uploadRes.error) {
                    processedFigures[i + batchIdx].storage_path = `${bookId}/${fig.filename}`;
                  }
                }
              } catch (err) {
                console.warn(`Figure storage upload warning: ${fig.filename}`);
              }
            })
          );
        }
      }

      // Batch Embeddings for Figures
      if (processedFigures.length > 0) {
        const figureTexts = processedFigures.map(
          (f) => `${f.figure_label}: ${f.caption}. ${f.description}`
        );
        try {
          const figEmbs = await generateBatchEmbeddings(figureTexts, apiKeyOverride);
          for (let i = 0; i < processedFigures.length; i++) {
            if (figEmbs[i]) processedFigures[i].embedding = figEmbs[i];
          }
        } catch (embErr) {
          console.warn('Failed to batch embed figure descriptions:', embErr);
        }
      }

      // Cache figures with embeddings to disk
      try {
        fs.writeFileSync(cacheFiguresPath, JSON.stringify(processedFigures, null, 2), 'utf-8');
      } catch {}
    }

    // 4. Batch Embeddings for Text Chunks (with disk cache check)
    let processedChunks: BookChunk[] = [];
    if (fs.existsSync(cacheChunksPath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheChunksPath, 'utf-8'));
        if (
          Array.isArray(cached) &&
          cached.length === rawChunks.length &&
          cached[0]?.embedding &&
          !cached[0].embedding.every((x: number) => x === 0)
        ) {
          processedChunks = cached;
          onProgress?.(`Loaded ${processedChunks.length} pre-embedded chunks from cache. Persisting to pgvector...`, 75);
        }
      } catch {}
    }

    if (processedChunks.length === 0) {
      onProgress?.('Generating vector embeddings for text chunks...', 35);
      const chunkTexts = rawChunks.map((c: { content: string }) => c.content);
      const chunkEmbeddings = await generateBatchEmbeddings(
        chunkTexts,
        apiKeyOverride,
        (done, total) => {
          onProgress?.(
            `Generating embeddings: ${done}/${total} chunks embedded...`,
            35 + Math.round((done / total) * 40)
          );
        }
      );

      processedChunks = rawChunks.map((c: any, idx: number) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `chunk_${bookId}_${idx}`,
        book_id: bookId,
        content: c.content,
        chunk_index: c.chunk_index,
        pdf_page_index: c.pdf_page_index,
        printed_page_number: c.printed_page_number,
        embedding: chunkEmbeddings[idx],
        metadata: c.metadata,
        created_at: new Date().toISOString(),
      }));

      // Cache embedded chunks to disk so retries are instant!
      try {
        fs.writeFileSync(cacheChunksPath, JSON.stringify(processedChunks), 'utf-8');
      } catch {}
    }

    onProgress?.('Persisting records to Supabase pgvector...', 78);

    // 5. Persist to Supabase Database (or local store if offline)
    if (supabase) {
      // Idempotency: Clear existing chunks/figures for this book before inserting
      await supabase.from('book_chunks').delete().eq('book_id', bookId);
      await supabase.from('book_figures').delete().eq('book_id', bookId);

      // Insert figures
      if (processedFigures.length > 0) {
        await insertWithRetry(
          supabase,
          'book_figures',
          processedFigures.map((f) => ({
            id: f.id,
            book_id: f.book_id,
            pdf_page_index: f.pdf_page_index,
            printed_page_number: f.printed_page_number,
            figure_label: f.figure_label,
            caption: f.caption,
            description: f.description,
            storage_path: f.storage_path,
            embedding: f.embedding,
            metadata: (f.metadata || {}) as any,
          }))
        );
      }

      // Insert chunks in moderate batches of 40 with retry & brief delay
      const INSERT_BATCH_SIZE = 40;
      for (let i = 0; i < processedChunks.length; i += INSERT_BATCH_SIZE) {
        const batch = processedChunks.slice(i, i + INSERT_BATCH_SIZE);
        await insertWithRetry(
          supabase,
          'book_chunks',
          batch.map((c) => ({
            id: c.id,
            book_id: c.book_id,
            content: c.content,
            chunk_index: c.chunk_index,
            pdf_page_index: c.pdf_page_index,
            printed_page_number: c.printed_page_number,
            embedding: c.embedding,
            metadata: (c.metadata || {}) as any,
          }))
        );

        const savedCount = Math.min(i + INSERT_BATCH_SIZE, processedChunks.length);
        onProgress?.(
          `Saved ${savedCount}/${processedChunks.length} chunks into pgvector...`,
          78 + Math.round((savedCount / processedChunks.length) * 20)
        );

        // Gentle pause prevents socket exhaustion and ECONNRESET
        if (i + INSERT_BATCH_SIZE < processedChunks.length) {
          await new Promise((r) => setTimeout(r, 60));
        }
      }

      // Update book status to completed
      await supabase
        .from('books')
        .update({
          status: 'completed' as const,
          total_pages: total_pages,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);
    } else {
      // Local fallback
      const bookStorageDir = path.join(LOCAL_STORAGE_DIR, 'books', bookId);
      if (!fs.existsSync(bookStorageDir)) fs.mkdirSync(bookStorageDir, { recursive: true });
      fs.writeFileSync(
        path.join(bookStorageDir, 'chunks.json'),
        JSON.stringify(processedChunks, null, 2),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(bookStorageDir, 'figures.json'),
        JSON.stringify(processedFigures, null, 2),
        'utf-8'
      );
      fs.writeFileSync(
        path.join(bookStorageDir, 'meta.json'),
        JSON.stringify({ total_pages, status: 'completed' }, null, 2),
        'utf-8'
      );
    }

    onProgress?.('Ingestion completed successfully!', 100);

    return {
      bookId,
      totalPages: total_pages,
      totalChunks: processedChunks.length,
      totalFigures: processedFigures.length,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    console.error('Ingestion pipeline failed:', err);
    if (supabase) {
      await supabase
        .from('books')
        .update({
          status: 'failed' as const,
          error_message: (err as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);
    }
    throw err;
  }
}
