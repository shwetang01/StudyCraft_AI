import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;

    const supabaseConfigured = isSupabaseConfigured();

    if (supabaseConfigured) {
      const supabase = getAdminClient();
      const { data: book, error } = await supabase
        .from('books')
        .select('id, title, status, total_pages, error_message, updated_at')
        .eq('id', bookId)
        .single();

      const b = book as any;

      if (error || !b) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } },
          { status: 404 }
        );
      }

      // If processing or completed, count chunks
      let chunkCount = 0;
      let figureCount = 0;

      if (b.status === 'processing' || b.status === 'completed') {
        const { count: cCount } = await supabase
          .from('book_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('book_id', bookId);
        chunkCount = cCount || 0;

        const { count: fCount } = await supabase
          .from('book_figures')
          .select('*', { count: 'exact', head: true })
          .eq('book_id', bookId);
        figureCount = fCount || 0;
      }

      return NextResponse.json({
        success: true,
        data: {
          id: b.id,
          title: b.title,
          status: b.status,
          totalPages: b.total_pages,
          errorMessage: b.error_message,
          chunkCount,
          figureCount,
          updatedAt: b.updated_at,
        },
      });
    }

    // Local fallback
    const metaPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const chunksPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'chunks.json');
      const figuresPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'figures.json');

      const chunkCount = fs.existsSync(chunksPath)
        ? JSON.parse(fs.readFileSync(chunksPath, 'utf-8')).length
        : 0;
      const figureCount = fs.existsSync(figuresPath)
        ? JSON.parse(fs.readFileSync(figuresPath, 'utf-8')).length
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          id: bookId,
          title: meta.title,
          status: meta.status,
          totalPages: meta.total_pages,
          errorMessage: meta.error_message,
          chunkCount,
          figureCount,
          updatedAt: meta.updated_at,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } },
      { status: 404 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'STATUS_CHECK_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
