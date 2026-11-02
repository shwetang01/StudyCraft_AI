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

async function checkVectorDistance() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  const query = "Explain Newton's second law of motion.";

  const apiKey = env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: query }] },
      outputDimensionality: 768,
    }),
  });

  const json = await response.json();
  const queryEmbedding = json?.embedding?.values;

  // Let's check how many chunks have non-null embedding
  const { count } = await supabase
    .from('book_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .not('embedding', 'is', null);

  console.log('Total chunks with non-null embedding:', count);

  // Let's test a raw SQL or function with dense_results only
  // Let's see what match_book_chunks_hybrid does when p_query_text is empty or not matching
  const { data: denseOnly, error } = await supabase.rpc(
    'match_book_chunks_hybrid',
    {
      p_book_id: bookId,
      p_query_embedding: queryEmbedding,
      p_query_text: 'xyznotextshouldmatchthis123',
      p_match_count: 10,
      p_rrf_k: 60,
    }
  );

  console.log('denseOnly count:', denseOnly?.length, error);
  denseOnly?.forEach(row => {
    console.log(`Chunk #${row.chunk_index}, Page ${row.printed_page_number} (PDF ${row.pdf_page_index}) - DenseRank: ${row.dense_rank}, SparseRank: ${row.sparse_rank}, RRF: ${row.rrf_score}`);
    console.log(`   Snippet: ${row.content.slice(0, 100).replace(/\n/g, ' ')}`);
  });
}

checkVectorDistance();

