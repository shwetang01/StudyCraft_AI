const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

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

async function syncToSupabase() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/chunks_with_embeddings.json';
  if (!fs.existsSync(p)) {
    console.log('No chunks_with_embeddings.json found!');
    return;
  }

  const chunks = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log(`Syncing ${chunks.length} chunks to Supabase...`);

  // Clear existing chunks for this book
  const { error: delErr } = await supabase.from('book_chunks').delete().eq('book_id', bookId);
  console.log('Delete old chunks:', delErr ? delErr.message : 'OK');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const BATCH = 40;
  let successCount = 0;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const { error } = await supabase.from('book_chunks').insert(
      slice.map(c => ({
        id: (c.id && uuidRegex.test(c.id)) ? c.id : crypto.randomUUID(),
        book_id: bookId,
        content: c.content,
        chunk_index: c.chunk_index,
        pdf_page_index: c.pdf_page_index,
        printed_page_number: c.printed_page_number,
        embedding: c.embedding,
        metadata: c.metadata || {},
      }))
    );
    if (error) {
      console.error(`Error on batch ${i}:`, error.message);
    } else {
      successCount += slice.length;
    }
  }

  console.log(`Successfully synced ${successCount} / ${chunks.length} chunks to Supabase!`);
}

syncToSupabase();
