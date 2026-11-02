const fs = require('fs');
const chunks = JSON.parse(fs.readFileSync('public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/chunks_with_embeddings.json', 'utf-8'));

for (let i = 650; i < 717; i++) {
  const c = chunks.find(x => x.pdf_page_index === i);
  if (c) {
    const isIndexPattern = (c.content.match(/\d{1,4}[–-]\d{1,4}/g) || []).length >= 5 ||
      (c.content.match(/,\s*\d{2,4}\b/g) || []).length >= 5;
    console.log(`PDF Page ${i} (Printed ${c.printed_page_number}): isIndex=${isIndexPattern}, snippet: ${c.content.slice(0, 60).replace(/\n/g, ' ')}`);
  }
}

