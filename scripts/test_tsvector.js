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

async function testTsVector326() {
  const { data: chunk } = await supabase
    .from('book_chunks')
    .select('id, chunk_index, content')
    .eq('chunk_index', 326)
    .single();

  console.log('Chunk 326 text:');
  console.log(chunk.content.slice(0, 300));

  // Let's test if chunk 326 contains 'newton'
  const hasNewton = /newton/i.test(chunk.content);
  const hasSecond = /second/i.test(chunk.content);
  const hasLaw = /law/i.test(chunk.content);
  console.log({ hasNewton, hasSecond, hasLaw });

  // Let's check Chunk 327
  const { data: chunk327 } = await supabase
    .from('book_chunks')
    .select('id, chunk_index, content')
    .eq('chunk_index', 327)
    .single();
  console.log('Chunk 327 text:');
  console.log(chunk327.content.slice(0, 300));
  console.log({
    hasNewton327: /newton/i.test(chunk327.content),
    hasSecond327: /second/i.test(chunk327.content),
    hasLaw327: /law/i.test(chunk327.content)
  });
}

testTsVector326();

