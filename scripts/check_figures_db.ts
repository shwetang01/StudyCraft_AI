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
  const { data: figures, error } = await supabase
    .from('book_figures')
    .select('id, pdf_page_index, printed_page_number, figure_label, caption, storage_path')
    .eq('book_id', bookId)
    .limit(20);

  console.log(`Figures in Supabase (${figures?.length}):`);
  for (const f of (figures || [])) {
    console.log(`- ID: ${f.id} | Page: ${f.printed_page_number} | Label: ${f.figure_label} | Path: ${f.storage_path}`);
  }
}

main().catch(console.error);

