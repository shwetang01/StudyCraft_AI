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
      const { data, error } = await supabase
        .from('book_figures')
        .select('*')
        .eq('book_id', bookId)
        .order('pdf_page_index', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const figuresWithUrls = ((data as any[]) || []).map((f: any) => ({
        ...f,
        signed_url: f.storage_path.startsWith('/')
          ? f.storage_path
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-figures/${f.storage_path}`,
      }));

      return NextResponse.json({ success: true, data: figuresWithUrls });
    }

    const figuresPath = path.join(LOCAL_STORAGE_DIR, 'books', bookId, 'figures.json');
    if (fs.existsSync(figuresPath)) {
      const figures = JSON.parse(fs.readFileSync(figuresPath, 'utf-8'));
      return NextResponse.json({ success: true, data: figures });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FETCH_FIGURES_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
