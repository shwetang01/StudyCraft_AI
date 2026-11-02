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

async function inspect19() {
  const { data } = await supabase
    .from('book_figures')
    .select('*')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318')
    .ilike('storage_path', '%.jpeg');

  console.log(`Found ${data.length} JPEG figures:`);
  fs.writeFileSync('figures_to_fix.json', JSON.stringify(data, null, 2));
  data.forEach((f, i) => {
    console.log(`[${i+1}] ${f.figure_label} (p.${f.printed_page_number}, pdf idx ${f.pdf_page_index}) | xref: ${f.metadata?.xref} | bbox: ${JSON.stringify(f.metadata?.bbox)}`);
  });
}

inspect19();

