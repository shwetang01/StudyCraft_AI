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

async function checkEmbeddingData() {
  const { data, error } = await supabase
    .from('book_chunks')
    .select('id, chunk_index, embedding')
    .not('embedding', 'is', null)
    .limit(3);

  console.log('Sample chunks with embedding:', error);
  data?.forEach(d => {
    console.log(`Chunk #${d.chunk_index}: typeof embedding = ${typeof d.embedding}, isArray = ${Array.isArray(d.embedding)}`);
    if (typeof d.embedding === 'string') {
      console.log('embedding sample (string):', d.embedding.slice(0, 100));
      try {
        const parsed = JSON.parse(d.embedding);
        console.log('Parsed as JSON length:', parsed.length);
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    } else if (Array.isArray(d.embedding)) {
      console.log('Array length:', d.embedding.length, 'sample:', d.embedding.slice(0, 5));
    }
  });
}

checkEmbeddingData();

