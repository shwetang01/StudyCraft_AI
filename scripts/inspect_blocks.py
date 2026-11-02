import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = ".storage/uploads/4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
doc = fitz.open(pdf_path)

page = doc[138] # Page 118 (0-indexed 138)
blocks = page.get_text("blocks")
print(f"Page rect: {page.rect}")
print(f"Total blocks on page 118: {len(blocks)}")
for i, b in enumerate(blocks[:8]):
    rect = fitz.Rect(b[:4])
    text = b[4].strip().replace('\n', ' // ')
    print(f"Block {i}: rect y0={rect.y0:.1f}, y1={rect.y1:.1f} -> {text[:100]}")
