import fs from 'fs';
import path from 'path';

// Load .env.local
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
  const { data: books, error } = await supabase.from('books').select('*');
  console.log('--- BOOKS IN SUPABASE ---');
  console.log(JSON.stringify(books, null, 2));
  if (error) console.error('Books query error:', error);

  const { count: chunkCount, error: chunkErr } = await supabase
    .from('book_chunks')
    .select('*', { count: 'exact', head: true });
  console.log('Total chunks in DB:', chunkCount);
  if (chunkErr) console.error('Chunk error:', chunkErr);

  const { count: figCount, error: figErr } = await supabase
    .from('book_figures')
    .select('*', { count: 'exact', head: true });
  console.log('Total figures in DB:', figCount);
  if (figErr) console.error('Figures error:', figErr);
}

main().catch(console.error);
