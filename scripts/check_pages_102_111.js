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

async function checkPages102To111() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  const { data: chunks, error } = await supabase
    .from('book_chunks')
    .select('id, printed_page_number, pdf_page_index, chunk_index, content')
    .eq('book_id', bookId)
    .gte('pdf_page_index', 122)
    .lte('pdf_page_index', 133)
    .order('pdf_page_index', { ascending: true });

  console.log('Chunks between PDF 122 and 133:', chunks?.length, error);
  if (chunks) {
    chunks.forEach(c => {
      console.log(`PDF Page: ${c.pdf_page_index}, Printed: ${c.printed_page_number}, Chunk #${c.chunk_index}`);
      console.log(`   Preview: ${c.content.slice(0, 150).replace(/\n/g, ' ')}...`);
    });
  }
}

checkPages102To111();

