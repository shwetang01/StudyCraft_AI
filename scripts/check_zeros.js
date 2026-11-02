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

async function checkNonZeroEmbeddings() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  const { data, error } = await supabase
    .from('book_chunks')
    .select('id, chunk_index, embedding')
    .eq('book_id', bookId)
    .limit(100);

  let zeroCount = 0;
  let nonZeroCount = 0;

  data?.forEach(d => {
    let arr = [];
    if (typeof d.embedding === 'string') {
      try { arr = JSON.parse(d.embedding); } catch(e){}
    } else if (Array.isArray(d.embedding)) {
      arr = d.embedding;
    }
    const isAllZero = arr.every(x => x === 0);
    if (isAllZero) zeroCount++;
    else nonZeroCount++;
  });

  console.log(`In first 100 chunks: zeroCount = ${zeroCount}, nonZeroCount = ${nonZeroCount}`);
}

checkNonZeroEmbeddings();

