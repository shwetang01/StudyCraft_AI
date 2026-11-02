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
  const { data, error } = await supabase
    .from('book_figures')
    .select('id, printed_page_number, pdf_page_index, figure_label, caption, storage_path')
    .eq('id', '33dd4335-4cbc-4ce4-aaee-aac39fb5d99c');
  console.log('Figure 9.6 in Supabase:', data, error);
}

main();

