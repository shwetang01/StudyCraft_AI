import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { getAdminClient } from '../src/lib/supabase/admin';

async function main() {
  const supabase = getAdminClient();
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  const figuresData = JSON.parse(fs.readFileSync('extracted_chapter5_figures.json', 'utf-8'));

  console.log(`Uploading ${figuresData.length} Chapter 5 diagrams to Supabase Storage & DB...`);

  // Deduplicate by filename
  const uniqueFigs = [];
  const seen = new Set();
  for (const f of figuresData) {
    if (!seen.has(f.filename)) {
      seen.add(f.filename);
      uniqueFigs.push(f);
    }
  }

  for (let i = 0; i < uniqueFigs.length; i++) {
    const fig = uniqueFigs[i];
    const fileBuf = fs.readFileSync(fig.file_path);
    
    // Upload image to Supabase storage bucket
    const { error: upErr } = await supabase.storage
      .from('book-figures')
      .upload(`${bookId}/${fig.filename}`, fileBuf, {
        contentType: 'image/png',
        upsert: true,
      });

    if (upErr) {
      console.warn(`Upload error for ${fig.filename}:`, upErr);
    }

    // Insert record into book_figures table
    const { error: dbErr } = await supabase.from('book_figures').insert({
      id: fig.id,
      book_id: bookId,
      pdf_page_index: fig.pdf_page_index,
      printed_page_number: String(fig.printed_page_number),
      figure_label: fig.figure_label,
      caption: fig.caption,
      description: fig.description,
      storage_path: `${bookId}/${fig.filename}`,
      metadata: { width: fig.width, height: fig.height, format: 'png' }
    });

    if (dbErr) {
      console.warn(`DB insert error for ${fig.figure_label}:`, dbErr);
    } else {
      console.log(`[${i+1}/${uniqueFigs.length}] Synced ${fig.figure_label} (Page ${fig.printed_page_number})`);
    }
  }

  console.log('All Chapter 5 diagrams successfully synced to Supabase!');
}

main().catch(console.error);

