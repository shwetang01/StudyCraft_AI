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

async function inspectChunk356() {
  const { data } = await supabase
    .from('book_chunks')
    .select('*')
    .eq('id', '5414c88c-9a09-4ea6-9466-2c6938ba00e7')
    .single();

  console.log('=== CHUNK 356 (Page 118) ===');
  console.log(data.content);
}

inspectChunk356();

