import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { generateBookFlashcards } from '../src/lib/rag/bookFlashcards';

async function test() {
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';
  console.log('Generating Book Flashcards for Physics book...');
  const start = Date.now();
  const cards = await generateBookFlashcards({
    book: {
      id: bookId,
      title: 'Physics book',
      total_pages: 717,
    },
    topic: "Newton's laws and ramp forces",
    cardCount: 4,
  });

  console.log(`\nGenerated ${cards.length} flashcards in ${Date.now() - start}ms:`);
  console.log(JSON.stringify(cards, null, 2));
}

test().catch(console.error);
