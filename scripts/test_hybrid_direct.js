const { hybridSearch } = require('./src/lib/rag/hybridSearch');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

async function runTest() {
  const res = await hybridSearch({
    bookId: '4d702ea1-d284-4f69-9f5f-fc296e80a318',
    query: 'pulley and cord tension in physics',
    topK: 6,
    enableDiagramSearch: true,
  });

  console.log('HybridSearch Results:');
  console.log('Chunks:', res.chunks.length);
  res.chunks.forEach((c, idx) => {
    console.log(`  [${idx}] Page ${c.printed_page_number} (pdf ${c.pdf_page_index}): ${c.content.slice(0, 80).replace(/\n/g, ' ')}...`);
  });

  console.log('Figures:', res.figures.length);
  res.figures.forEach((f, idx) => {
    console.log(`  [${idx}] ${f.figure_label} on Page ${f.printed_page_number} (pdf ${f.pdf_page_index}): ${f.signed_url}`);
  });
}

runTest();

