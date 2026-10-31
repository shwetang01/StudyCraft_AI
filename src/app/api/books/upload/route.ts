import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { ingestBook } from '@/lib/rag/ingestion';
import { Book } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LOCAL_STORAGE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'studycraft_storage')
  : path.join(process.cwd(), '.storage');
const UPLOADS_DIR = path.join(os.tmpdir(), 'studycraft_uploads');

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORM_DATA',
            message: 'Invalid or missing multipart form data.',
          },
        },
        { status: 400 }
      );
    }
    const file = formData.get('file') as File | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'A valid PDF file is required in the upload form.',
          },
        },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only PDF documents (.pdf) are supported.',
          },
        },
        { status: 400 }
      );
    }

    // 1. Read bytes and compute SHA-256 file hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const cleanTitle =
      titleOverride?.trim() ||
      file.name.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').trim() ||
      'Uploaded Textbook';

    const supabaseConfigured = isSupabaseConfigured();
    const supabase = supabaseConfigured ? getAdminClient() : null;

    // 2. Idempotency Check: check if book with this hash is already completed
    if (supabase) {
      const { data: existing } = await supabase
        .from('books')
        .select('*')
        .eq('file_hash', fileHash)
        .eq('status', 'completed')
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing as Book,
          deduplicated: true,
          message: 'Book has already been ingested. Reusing persisted embeddings.',
        });
      }
    } else {
      // Check local storage for idempotency
      const booksDir = path.join(LOCAL_STORAGE_DIR, 'books');
      if (fs.existsSync(booksDir)) {
        for (const dir of fs.readdirSync(booksDir)) {
          const metaPath = path.join(booksDir, dir, 'meta.json');
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (meta.file_hash === fileHash && meta.status === 'completed') {
              return NextResponse.json({
                success: true,
                data: {
                  id: dir,
                  title: meta.title || cleanTitle,
                  storage_path: meta.storage_path,
                  file_hash: fileHash,
                  total_pages: meta.total_pages || 0,
                  status: 'completed',
                  created_at: meta.created_at,
                  updated_at: meta.updated_at,
                } as Book,
                deduplicated: true,
                message: 'Book has already been ingested locally.',
              });
            }
          }
        }
      }
    }

    // 3. Save PDF file
    const bookId = crypto.randomUUID();
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const localPdfPath = path.join(UPLOADS_DIR, `${bookId}.pdf`);
    fs.writeFileSync(localPdfPath, buffer);

    let storagePath = `uploads/${bookId}.pdf`;

    if (supabase) {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(`${bookId}/original.pdf`, buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!uploadError) {
        storagePath = `${bookId}/original.pdf`;
      } else {
        console.warn('Could not upload original PDF to Supabase storage bucket:', uploadError);
      }

      // Create record in books table
      const { data: newBook, error: dbError } = await supabase
        .from('books')
        .insert({
          id: bookId,
          title: cleanTitle,
          storage_path: storagePath,
          file_hash: fileHash,
          total_pages: 0,
          status: 'uploaded' as const,
        })
        .select('*')
        .single();

      if (dbError) {
        throw new Error(`Failed to create book record: ${dbError.message}`);
      }

      // 4. Trigger Ingestion Asynchronously
      ingestBook({
        bookId,
        pdfPath: localPdfPath,
      }).catch((ingestErr) => {
        console.error(`Background ingestion failed for book ${bookId}:`, ingestErr);
      });

      return NextResponse.json(
        {
          success: true,
          data: newBook as Book,
          message: 'PDF uploaded. Ingestion started in background.',
        },
        { status: 201 }
      );
    } else {
      // Local fallback record
      const bookStorageDir = path.join(LOCAL_STORAGE_DIR, 'books', bookId);
      if (!fs.existsSync(bookStorageDir)) fs.mkdirSync(bookStorageDir, { recursive: true });

      const localBook: Book = {
        id: bookId,
        title: cleanTitle,
        storage_path: storagePath,
        file_hash: fileHash,
        total_pages: 0,
        status: 'uploaded',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(bookStorageDir, 'meta.json'),
        JSON.stringify(localBook, null, 2),
        'utf-8'
      );

      // Trigger ingestion asynchronously
      ingestBook({
        bookId,
        pdfPath: localPdfPath,
      }).catch((ingestErr) => {
        console.error(`Background ingestion failed for book ${bookId}:`, ingestErr);
      });

      return NextResponse.json(
        {
          success: true,
          data: localBook,
          message: 'PDF uploaded locally. Ingestion started in background.',
        },
        { status: 201 }
      );
    }
  } catch (err: unknown) {
    console.error('Unhandled error in /api/books/upload:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: (err as Error).message || 'Failed to process and upload book PDF.',
        },
      },
      { status: 500 }
    );
  }
}
