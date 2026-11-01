import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { answerBookQuestion } from '@/lib/rag/groundedQA';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;
    const body = await req.json().catch(() => null);

    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'A non-empty natural language question is required.',
          },
        },
        { status: 400 }
      );
    }

    const { question, topK, apiKeyOverride } = body;
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

      if (bookData.status !== 'completed') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'BOOK_NOT_READY',
              message: `This book is currently in status "${bookData.status}". Please wait for ingestion to complete.`,
            },
          },
          { status: 422 }
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

    const result = await answerBookQuestion({
      book: bookInfo as any,
      question: question.trim(),
      topK: topK || 7,
      apiKeyOverride: geminiKey,
    });

    // Do not expose debugging information to normal users in production
    if (process.env.NODE_ENV === 'production' && result.debug) {
      delete result.debug;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    console.error('Error in /api/books/[bookId]/ask:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RAG_QUERY_FAILED',
          message: (err as Error).message || 'Failed to process grounded book question.',
        },
      },
      { status: 500 }
    );
  }
}
