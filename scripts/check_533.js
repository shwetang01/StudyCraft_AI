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

async function checkFig533() {
  const { data } = await supabase
    .from('book_figures')
    .select('id, figure_label, caption, printed_page_number, pdf_page_index, storage_path')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318')
    .ilike('figure_label', '%5.3.3%');
  console.log('Figure 5.3.3:', data);
}

checkFig533();

