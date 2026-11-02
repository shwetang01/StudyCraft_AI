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

async function testTrace() {
  const query = "pulleys and tension in cord";
  // Check text chunks
  const { data: textData } = await supabase.rpc(
    'match_book_chunks_text',
    {
      p_book_id: '4d702ea1-d284-4f69-9f5f-fc296e80a318',
      p_query_text: "pulleys tension cord",
      p_match_count: 5,
    }
  );
  console.log('Direct text match count:', textData?.length);
  textData?.forEach(c => console.log(`  - Page ${c.printed_page_number} (pdf ${c.pdf_page_index}): ${c.content.slice(0, 80)}`));

  // Check figure search
  const { data: figData } = await supabase
    .from('book_figures')
    .select('id, figure_label, caption, printed_page_number, pdf_page_index')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318')
    .or(`caption.ilike.%pulley%,caption.ilike.%tension%,figure_label.ilike.%pulley%`)
    .limit(5);
  console.log('Figure text search:', figData?.length);
  figData?.forEach(f => console.log(`  - ${f.figure_label} (p.${f.printed_page_number}): ${f.caption.slice(0, 60)}`));
}

testTrace();

