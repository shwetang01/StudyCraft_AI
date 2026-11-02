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

async function findFiguresNearPage115() {
  const { data } = await supabase
    .from('book_figures')
    .select('id, figure_label, caption, printed_page_number, pdf_page_index, storage_path')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318')
    .gte('pdf_page_index', 130)
    .lte('pdf_page_index', 145);

  console.log('Figures near page 115:', data?.length);
  data?.forEach(f => console.log(`- ${f.figure_label} (p.${f.printed_page_number}): ${f.caption.slice(0, 70)}...`));
}

findFiguresNearPage115();

