import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

doc = fitz.open('.storage/uploads/4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf')
print("Testing header detection across pages 120-145 (Chapter 5):")

for page_idx in range(120, 145):
    page = doc[page_idx]
    blocks = page.get_text("blocks")
    header_blocks = [b for b in blocks if b[1] < 45 and b[3] <= 55]
    header_texts = [b[4].strip().replace('\n', ' // ') for b in header_blocks]
    print(f"Page {page_idx} (Printed ~{page_idx-21}): Headers = {header_texts}")

