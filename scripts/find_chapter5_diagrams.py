import pymupdf as fitz
import os

pdf_path = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
doc = fitz.open(pdf_path)

print("Searching Chapter 5 (pages 100 - 130) for diagrams...")
for page_idx in range(95, 140):
    page = doc[page_idx]
    label = page.get_label()
    text = page.get_text("text")
    drawings = page.get_drawings()
    imgs = page.get_images()
    
    # Check for Figure captions in text
    import re
    figs = re.findall(r'(Figure\s*5\.[\d\.\-]+[^\n]+)', text, re.IGNORECASE)
    if figs or imgs:
        print(f"Page {page_idx+1} (Printed: {label}): {len(imgs)} raster images, {len(drawings)} vector drawings, Found figs in text: {figs[:2]}")

doc.close()

