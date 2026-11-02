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
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');
  
  console.log('Total figures in table:', data.length);
  const preface = data.filter(f => /^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '') || f.pdf_page_index < 25);
  console.log('Preface figures:', preface.length);
  preface.forEach(f => console.log(`  - ID: ${f.id}, Page: ${f.printed_page_number}, PDF Idx: ${f.pdf_page_index}, Label: ${f.figure_label}`));

  const chapterFigs = data.filter(f => !(/^[ivxlcdm]+$/i.test(f.printed_page_number?.trim() || '') || f.pdf_page_index < 25));
  console.log('Genuine Chapter Diagrams:', chapterFigs.length);
}

main();

