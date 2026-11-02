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

async function testWhyChunkNotMatched() {
  const { data: chunk326 } = await supabase
    .from('book_chunks')
    .select('id, content')
    .eq('chunk_index', 326)
    .single();

  // Test if it matches tsquery
  // We can call match_book_chunks_text with topK = 1000 and see its rank
  const { data: matches } = await supabase.rpc('match_book_chunks_text', {
    p_book_id: '4d702ea1-d284-4f69-9f5f-fc296e80a318',
    p_query_text: 'newton second law',
    p_match_count: 500,
  });

  const idx326 = matches.findIndex(m => m.id === chunk326.id);
  console.log('Index of chunk 326 in match_book_chunks_text ("newton second law"):', idx326);
  if (idx326 >= 0) {
    console.log('Score of 326:', matches[idx326].rank);
  }

  const { data: chunk327 } = await supabase
    .from('book_chunks')
    .select('id, content')
    .eq('chunk_index', 327)
    .single();
  const idx327 = matches.findIndex(m => m.id === chunk327.id);
  console.log('Index of chunk 327 in match_book_chunks_text ("newton second law"):', idx327);
  if (idx327 >= 0) {
    console.log('Score of 327:', matches[idx327].rank);
  }

  // Print top 5 matches and their scores
  console.log('\nTop 5 matches and scores:');
  matches.slice(0, 5).forEach((m, i) => {
    console.log(`Rank ${i+1}: Chunk #${m.chunk_index}, Page ${m.printed_page_number}, Rank Score: ${m.rank}`);
  });
}

testWhyChunkNotMatched();

