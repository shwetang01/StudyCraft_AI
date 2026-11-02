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

async function testTsQueryVariants() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // Test 1: plainto_tsquery with 'newton second law' (without 'motion'!)
  const { data: res1 } = await supabase.rpc('match_book_chunks_text', {
    p_book_id: bookId,
    p_query_text: 'newton second law',
    p_match_count: 10,
  });

  console.log('\n=== MATCH FOR "newton second law" (without motion) ===');
  res1?.forEach((r, idx) => {
    console.log(`Rank ${idx+1}: Chunk #${r.chunk_index}, Page ${r.printed_page_number} (PDF ${r.pdf_page_index}) - Preview: ${r.content.slice(0, 100).replace(/\n/g, ' ')}`);
  });
}

testTsQueryVariants();

