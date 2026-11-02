const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkChapter5() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // Let's find chunks with printed_page_number between 100 and 115, or pdf_page_index around 120-135
  const { data: chunks, error } = await supabase
    .from('book_chunks')
    .select('id, printed_page_number, pdf_page_index, chunk_index, content')
    .eq('book_id', bookId)
    .gte('pdf_page_index', 115)
    .lte('pdf_page_index', 140)
    .order('pdf_page_index', { ascending: true });

  console.log('Found chunks in range:', chunks?.length, error);
  if (chunks) {
    chunks.forEach(c => {
      const firstLine = c.content.split('\n').filter(l => l.trim()).slice(0, 3).join(' | ');
      console.log(`Page: ${c.printed_page_number} (PDF: ${c.pdf_page_index}) [ID: ${c.id}] -> ${firstLine.slice(0, 100)}`);
      if (c.content.toLowerCase().includes('second law')) {
        console.log(`   *** CONTAINS "SECOND LAW" ***:`);
        const idx = c.content.toLowerCase().indexOf('second law');
        console.log(`   Snippet: ` + c.content.slice(Math.max(0, idx - 80), idx + 120).replace(/\n/g, ' '));
      }
    });
  }
}

checkChapter5();

