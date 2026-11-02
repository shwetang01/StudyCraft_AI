const fs = require('fs');

const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));

console.log('Sample chunks and their first 5 lines:');
[316, 318, 321, 326, 330, 337, 340, 354, 356, 360].forEach(idx => {
  const c = data.chunks.find(x => x.chunk_index === idx);
  if (c) {
    const lines = c.content.split('\n').slice(0, 5);
    console.log(`\n--- Chunk #${idx} (Page ${c.printed_page_number}) ---`);
    lines.forEach((l, i) => console.log(`  [${i}] ${JSON.stringify(l)}`));
  }
});

