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

async function main() {
  const { data: allFigs } = await supabase
    .from('book_figures')
    .select('id, printed_page_number, pdf_page_index')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');

  const prefaceIds = allFigs
    .filter(f => /^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '') || f.pdf_page_index < 25 || f.printed_page_number === 'C1')
    .map(f => f.id);

  console.log(`Deleting ${prefaceIds.length} preface figures...`);

  const { error } = await supabase
    .from('book_figures')
    .delete()
    .in('id', prefaceIds);

  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Successfully deleted all preface photos! Only genuine chapter diagrams remain.');
  }

  const { count } = await supabase
    .from('book_figures')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');

  console.log('Remaining genuine diagrams in database:', count);
}

main();

