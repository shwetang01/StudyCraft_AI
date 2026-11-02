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

async function testPulleySearch() {
  const { data: pulleyData } = await supabase.rpc(
    'match_book_chunks_text',
    {
      p_book_id: '4d702ea1-d284-4f69-9f5f-fc296e80a318',
      p_query_text: "pulley",
      p_match_count: 5,
    }
  );
  console.log('Pulley chunks matches:', pulleyData?.length);
  if (pulleyData) {
    pulleyData.forEach((c) => console.log(`- Page ${c.printed_page_number} (pdf idx ${c.pdf_page_index}): ${c.content.slice(0, 120)}...`));
  }
}

testPulleySearch();

