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

async function testMatchVector() {
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

  const { data: vectorData, error: vectorErr } = await supabase.rpc(
    'match_book_chunks_vector',
    {
      p_book_id: bookId,
      p_query_embedding: queryEmbedding,
      p_match_count: 20,
      p_similarity_threshold: 0.0,
    }
  );

  console.log('match_book_chunks_vector result count:', vectorData?.length, vectorErr);
  vectorData?.forEach((row, i) => {
    console.log(`Rank ${i+1}: Chunk #${row.chunk_index}, Page ${row.printed_page_number} (PDF ${row.pdf_page_index}) - Similarity: ${row.similarity?.toFixed(4)}`);
    console.log(`   Snippet: ${row.content.slice(0, 100).replace(/\n/g, ' ')}`);
  });
}

testMatchVector();

