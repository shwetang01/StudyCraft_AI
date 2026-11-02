const fs = require('fs');
const figs = JSON.parse(fs.readFileSync('extracted_chapter5_figures.json', 'utf8'));
console.log('Total Chapter 5 figures:', figs.length);
console.log('Sample pages and labels:');
figs.slice(0, 10).forEach(f => {
  console.log(`- ${f.figure_label} (p.${f.printed_page_number}, pdf idx ${f.pdf_page_index}): ${f.caption.slice(0, 50)}...`);
});

