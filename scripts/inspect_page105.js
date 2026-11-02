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

async function inspectPage105() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  const { data: chunks } = await supabase
    .from('book_chunks')
    .select('*')
    .eq('book_id', bookId)
    .in('chunk_index', [326, 327, 328, 329]);

  if (chunks) {
    chunks.forEach(c => {
      console.log(`\n================ CHUNK #${c.chunk_index} (Page ${c.printed_page_number}, PDF ${c.pdf_page_index}) ================`);
      console.log(c.content);
    });
  }
}

inspectPage105();

