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

async function checkAll() {
  const { data } = await supabase
    .from('book_figures')
    .select('id, pdf_page_index, printed_page_number, figure_label, storage_path, metadata')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');

  console.log('Total figures in book_figures:', data.length);
  const jpegEmbedded = data.filter(f => f.storage_path?.endsWith('.jpeg') || f.metadata?.source === 'embedded_image');
  const renderedPng = data.filter(f => f.storage_path?.endsWith('.png'));

  console.log('Old embedded JPEGs (with potential color distortion):', jpegEmbedded.length);
  jpegEmbedded.forEach(f => console.log(`  - ${f.figure_label} (p.${f.printed_page_number}, pdf ${f.pdf_page_index}): ${f.storage_path}`));

  console.log('Clean rendered PNGs (true color):', renderedPng.length);
}

checkAll();

