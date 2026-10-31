import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import path from 'path';
import fs from 'fs';
import { Book } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.storage');

export async function GET() {
  try {
    const supabaseConfigured = isSupabaseConfigured();

    if (supabaseConfigured) {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    // Local file fallback
    const booksList: Book[] = [];
    const booksDir = path.join(LOCAL_STORAGE_DIR, 'books');
    if (fs.existsSync(booksDir)) {
      const dirs = fs.readdirSync(booksDir);
      for (const d of dirs) {
        const metaPath = path.join(booksDir, d, 'meta.json');
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          booksList.push({
            id: d,
            title: meta.title || 'Textbook',
            storage_path: meta.storage_path || '',
            file_hash: meta.file_hash || '',
            total_pages: meta.total_pages || 0,
            status: meta.status || 'completed',
            created_at: meta.created_at || new Date().toISOString(),
            updated_at: meta.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: booksList });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_BOOKS_FAILED',
          message: (err as Error).message,
        },
      },
      { status: 500 }
    );
  }
}

