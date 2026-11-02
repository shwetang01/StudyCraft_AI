const fs = require('fs');
const chunks = JSON.parse(fs.readFileSync('public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/chunks_with_embeddings.json', 'utf-8'));
const c673 = chunks.find(c => c.pdf_page_index === 694);
if (c673) console.log('c673 content:\n', c673.content.slice(0, 300));
const c690 = chunks.find(c => c.pdf_page_index === 711);
if (c690) console.log('c690 content:\n', c690.content.slice(0, 300));

