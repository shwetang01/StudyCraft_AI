import fs from 'fs';

const p = 'public/extracted_figures/4d702ea1-d284-4f69-9f5f-fc296e80a318/processed_book.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
for (const fig of data.figures) {
  if (fig.printed_page_number === 'xiii' || fig.caption?.includes('9.65') || fig.caption?.includes('9.6')) {
    console.log({
      id: fig.id,
      page: fig.printed_page_number,
      pdf_page: fig.pdf_page_index,
      label: fig.figure_label,
      caption: fig.caption,
      filename: fig.filename,
      width: fig.width,
      height: fig.height,
    });
  }
}

