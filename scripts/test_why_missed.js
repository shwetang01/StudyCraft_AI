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

async function testWhyMissed() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // Let's check chunks 326, 327, 328 in Supabase:
  // Do they have embeddings?
  const { data: chunk326 } = await supabase
    .from('book_chunks')
    .select('id, chunk_index, printed_page_number, pdf_page_index, embedding')
    .eq('book_id', bookId)
    .in('chunk_index', [326, 327, 328]);

  console.log('Chunk 326/327/328 embedding status:');
  chunk326.forEach(c => {
    console.log(`Chunk ${c.chunk_index}: embedding length =`, c.embedding ? (typeof c.embedding === 'string' ? 'string len ' + c.embedding.length : c.embedding.length) : 'NULL');
  });

  // Now let's check FTS rank on chunks 326, 327, 328 vs chunk on page 118
  // What is the FTS search query? "newton second law motion"
  // Let's call match_book_chunks_text with "newton second law motion" and match_count = 50!
  const { data: textMatches } = await supabase.rpc('match_book_chunks_text', {
    p_book_id: bookId,
    p_query_text: 'newton second law motion',
    p_match_count: 50
  });

  console.log('\nText matches for "newton second law motion" (top 50):');
  const found326 = textMatches.findIndex(m => m.chunk_index === 326);
  const found327 = textMatches.findIndex(m => m.chunk_index === 327);
  const found328 = textMatches.findIndex(m => m.chunk_index === 328);
  console.log(`Rank of chunk 326: ${found326 >= 0 ? found326 + 1 : 'NOT IN TOP 50'}`);
  console.log(`Rank of chunk 327: ${found327 >= 0 ? found327 + 1 : 'NOT IN TOP 50'}`);
  console.log(`Rank of chunk 328: ${found328 >= 0 ? found328 + 1 : 'NOT IN TOP 50'}`);

  // Print the top 15 text matches:
  textMatches.slice(0, 15).forEach((m, idx) => {
    console.log(`Rank ${idx+1}: Chunk #${m.chunk_index}, Page ${m.printed_page_number} (PDF ${m.pdf_page_index}) - Preview: ${m.content.slice(0, 80).replace(/\n/g, ' ')}`);
  });
}

testWhyMissed();

