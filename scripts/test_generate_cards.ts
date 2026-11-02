import { generateBookFlashcards } from '../src/lib/rag/bookFlashcards';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

async function run() {
  const cards = await generateBookFlashcards({
    book: {
      id: '4d702ea1-d284-4f69-9f5f-fc296e80a318',
      title: 'Physics book',
      total_pages: 717,
    },
    topic: 'pulley, cord tension, and blocks in motion',
    cardCount: 4,
  });

  console.log('Generated Cards count:', cards.length);
  cards.forEach((c, idx) => {
    console.log(`\n--- Card ${idx + 1} ---`);
    console.log('Front:', c.front);
    console.log('Back:', c.back);
    console.log('Category:', c.category);
    console.log('Page:', c.citations?.[0]?.printedPageNumber);
    console.log('Figure ID:', c.figureId);
    console.log('Figure Label/Caption:', c.figureCaption);
    console.log('Figure URL:', c.figureUrl);
  });
}

run();

