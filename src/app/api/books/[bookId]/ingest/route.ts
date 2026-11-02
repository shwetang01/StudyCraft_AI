import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { ingestBook } from '@/lib/rag/ingestion';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'studycraft_storage')
  : path.join(process.cwd(), '.storage');
const UPLOADS_DIR = path.join(os.tmpdir(), 'studycraft_uploads');

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const apiKeyOverride = body.apiKeyOverride?.gemini;

    const supabaseConfigured = isSupabaseConfigured();
    let pdfPath = path.join(UPLOADS_DIR, `${bookId}.pdf`);

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

      // If local copy doesn't exist, download from Supabase storage
      if (!fs.existsSync(pdfPath)) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('books')
          .download((book as any).storage_path);

        if (downloadError || !fileData) {
          throw new Error(`Failed to download original PDF: ${downloadError?.message}`);
        }

        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const buf = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(pdfPath, buf);
      }
    }

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PDF_FILE_MISSING', message: 'PDF file not found on disk or storage.' },
        },
        { status: 400 }
      );
    }

    // Trigger ingestion in background
    ingestBook({
      bookId,
      pdfPath,
      apiKeyOverride,
    }).catch((err) => {
      console.error(`Manual ingestion retry failed for book ${bookId}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion initiated in background.',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INGESTION_TRIGGER_FAILED', message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
