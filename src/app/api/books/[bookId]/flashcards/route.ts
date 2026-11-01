import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { generateBookFlashcards } from '@/lib/rag/bookFlashcards';
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
      const { data, error } = await supabase
        .from('book_flashcards')
        .select('*, book_figures(storage_path, caption, figure_label)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      const cards = (data || []).map((row: any) => {
        let figUrl = null;
        if (row.book_figures?.storage_path) {
          figUrl = row.book_figures.storage_path.startsWith('/')
            ? row.book_figures.storage_path
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-figures/${row.book_figures.storage_path}`;
        }
        return {
          id: row.id,
          front: row.question,
          back: row.answer,
          category: 'Textbook Mastery',
          difficulty: 'medium',
          userStatus: 'learning',
          figureId: row.figure_id,
          figureUrl: figUrl,
          figureCaption: row.book_figures?.figure_label || row.book_figures?.caption,
          citations: row.citations || [],
        };
      });

      return NextResponse.json({ success: true, data: cards });
    }

    const cardsPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'flashcards.json');
    if (fs.existsSync(cardsPath)) {
      const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));
      return NextResponse.json({ success: true, data: cards });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: 'GET_FLASHCARDS_FAILED', message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { topic, cardCount = 6, apiKeyOverride } = body;
    const geminiKey = apiKeyOverride?.gemini;

    let bookInfo = { id: bookId, title: 'Textbook', total_pages: 0 };
    const supabaseConfigured = isSupabaseConfigured();

    if (supabaseConfigured) {
      const supabase = getAdminClient();
      const { data: book, error } = await supabase
        .from('books')
        .select('id, title, total_pages, status')
        .eq('id', bookId)
        .single();

      const bookData = book as any;

      if (error || !bookData) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } },
          { status: 404 }
        );
      }

      bookInfo = {
        id: bookData.id,
        title: bookData.title,
        total_pages: bookData.total_pages,
      };
    } else {
      const metaPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        bookInfo = {
          id: bookId,
          title: meta.title || 'Textbook',
          total_pages: meta.total_pages || 0,
        };
      }
    }

    const flashcards = await generateBookFlashcards({
      book: bookInfo,
      topic: topic || 'key principles',
      cardCount,
      apiKeyOverride: geminiKey,
    });

    return NextResponse.json({
      success: true,
      data: flashcards,
    });
  } catch (err: unknown) {
    console.error('Error generating book flashcards:', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FLASHCARD_GEN_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
