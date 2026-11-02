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
  const { data: cards } = await supabase
    .from('book_flashcards')
    .select('id, question, figure_id')
    .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');

  console.log('Existing flashcards in Supabase:', cards?.length || 0);

  // Clear existing flashcards so fresh diagram flashcards are created with real Chapter 5 diagrams
  if (cards && cards.length > 0) {
    const { error } = await supabase
      .from('book_flashcards')
      .delete()
      .eq('book_id', '4d702ea1-d284-4f69-9f5f-fc296e80a318');
    console.log('Cleaned old flashcards:', error || 'Success');
  }
}

main();

