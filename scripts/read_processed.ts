import fs from 'fs';
const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
if (fs.existsSync(p)) {
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  console.log('Book ID:', data.book_id);
  console.log('Pages:', data.total_pages);
  console.log('Chunks:', data.chunks?.length);
  console.log('Figures:', data.figures?.length);
  if (data.figures?.length > 0) {
    console.log('Sample figure 0:', JSON.stringify(data.figures[0], null, 2));
  }
} else {
  console.log('Not found:', p);
}

