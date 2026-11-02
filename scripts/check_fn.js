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

async function checkFunctionDef() {
  // Query pg_proc for match_book_chunks_hybrid definition
  const { data, error } = await supabase.rpc('get_function_def', {});
  console.log('rpc get_function_def:', error);

  // Or check pg_proc directly via SQL / REST if possible:
  // Supabase postgrest doesn't expose system tables by default.
  // But let's test a simple RPC or see if we can create a test RPC.
}

checkFunctionDef();

