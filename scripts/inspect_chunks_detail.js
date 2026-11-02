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

async function inspect() {
  const query = "Explain Newton's second law of motion.";
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // Check how cleanQueryForFts processes it:
  const FTS_STOP_WORDS = new Set([
    'what', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for',
    'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'to', 'from', 'up', 'down', 'out', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
    'should', 'now', 'explain', 'show', 'describe', 'tell', 'give', 'list', 'detail',
    'diagram', 'diagrams', 'figure', 'figures', 'page', 'pages', 'citation', 'citations',
    'quote', 'quotes', 'please', 'book', 'textbook', 'chapter', 'section', 'find', 'does'
  ]);
  const tokens = query
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2 && !FTS_STOP_WORDS.has(w));
  const cleanFtsQuery = tokens.slice(0, 6).join(' ');
  console.log('cleanFtsQuery:', cleanFtsQuery);

  // Check text match
  const { data: textData, error: textErr } = await supabase.rpc(
    'match_book_chunks_text',
    {
      p_book_id: bookId,
      p_query_text: cleanFtsQuery,
      p_match_count: 10,
    }
  );
  console.log('textData count:', textData?.length, textErr);
  if (textData) {
    textData.forEach((c, idx) => {
      console.log(`\n[TEXT MATCH ${idx+1}] ID: ${c.id}, Page: ${c.printed_page_number}, PDF Page: ${c.pdf_page_index}`);
      console.log(c.content.slice(0, 200).replace(/\n/g, ' '));
    });
  }

  // Also search for where Newton's second law is ACTUALLY introduced in the book!
  const { data: searchNewton } = await supabase
    .from('book_chunks')
    .select('id, printed_page_number, pdf_page_index, content')
    .eq('book_id', bookId)
    .ilike('content', '%Newton%second law%')
    .limit(10);
  
  console.log('\n=== DIRECT ILIKE SEARCH FOR "Newton%second law" ===');
  console.log('Found chunks:', searchNewton?.length);
  if (searchNewton) {
    searchNewton.forEach((c, idx) => {
      console.log(`\n[DIRECT MATCH ${idx+1}] ID: ${c.id}, Page: ${c.printed_page_number}, PDF Page: ${c.pdf_page_index}`);
      console.log(c.content.slice(0, 300).replace(/\n/g, ' '));
    });
  }
}

inspect();

