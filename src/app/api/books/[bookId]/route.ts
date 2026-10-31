import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';
import { Book } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;

    if (!bookId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Book ID is required' } },
        { status: 400 }
      );
    }

    const supabaseConfigured = isSupabaseConfigured();

    if (supabaseConfigured) {
      const supabase = getAdminClient();
      const { data: book, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error || !book) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } },
          { status: 404 }
        );
      }

      // Get chunk & figure counts
      const { count: chunkCount } = await supabase
        .from('book_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId);

      const { count: figureCount } = await supabase
        .from('book_figures')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId);

      return NextResponse.json({
        success: true,
        data: {
          ...(book as any),
          chunk_count: chunkCount || 0,
          figure_count: figureCount || 0,
        },
      });
    }

    // Local fallback
    const metaPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return NextResponse.json({
        success: true,
        data: meta,
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
        error: { code: 'GET_BOOK_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;

    const supabaseConfigured = isSupabaseConfigured();
    if (supabaseConfigured) {
      const supabase = getAdminClient();

      // Delete from database (cascades chunks, figures, flashcards)
      const { error } = await supabase.from('books').delete().eq('id', bookId);

      if (error) {
        throw new Error(error.message);
      }

      // Cleanup storage objects
      try {
        await supabase.storage.from('books').remove([`${bookId}/original.pdf`]);
      } catch {
        // Ignored
      }
    }

    // Cleanup local files
    const localDir = path.join(LOCAL_STORAGE_DIR, 'books', bookId);
    if (fs.existsSync(localDir)) {
      fs.rmSync(localDir, { recursive: true, force: true });
    }

    const publicFiguresDir = path.join(process.cwd(), 'public', 'extracted_figures', bookId);
    if (fs.existsSync(publicFiguresDir)) {
      fs.rmSync(publicFiguresDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true, message: 'Book deleted successfully.' });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'DELETE_BOOK_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
