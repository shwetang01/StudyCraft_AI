import os
import re
import uuid
import pymupdf as fitz

pdf_path = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
fig_dir = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\public\extracted_figures\4d702ea1-d284-4f69-9f5f-fc296e80a318"
os.makedirs(fig_dir, exist_ok=True)

doc = fitz.open(pdf_path)
book_id = "4d702ea1-d284-4f69-9f5f-fc296e80a318"

# Key chapter pages to extract clean diagrams
# Chapter 5: Newton's Laws & Friction & Pulley systems (PDF pages 120-145)
extracted = []

print("Extracting high-yield chapter diagrams...")

for page_idx in range(120, 150):
    page = doc[page_idx]
    printed_page = page.get_label() or str(page_idx + 1)
    text = page.get_text("text")

    # Look for Figure 5.x.x
    matches = re.finditer(r'(Figure\s*5\.[\d\.\-]+[^\n\:\.]+[\:\.]?\s*[^\n]+)', text, re.IGNORECASE)
    for m in matches:
        cap_text = m.group(1).strip()
        label_m = re.match(r'^(Figure\s*5\.[\d\.\-]+)', cap_text, re.IGNORECASE)
        if not label_m:
            continue
        fig_label = label_m.group(1).strip()
        
        # Search position of this caption on page
        rects = page.search_for(fig_label)
        if not rects:
            continue
        
        cap_rect = rects[0]
        # Crop diagram above caption
        diag_rect = fitz.Rect(
            max(35, cap_rect.x0 - 60),
            max(45, cap_rect.y0 - 240),
            min(page.rect.x1 - 35, cap_rect.x1 + 220),
            cap_rect.y1 + 10
        )
        
        if diag_rect.width < 100 or diag_rect.height < 80:
            continue
            
        fig_id = str(uuid.uuid4())
        filename = f"{book_id}_p{page_idx+1}_diagram_{fig_label.replace(' ', '_').replace('.', '_')}.png"
        filepath = os.path.join(fig_dir, filename)
        
        pix = page.get_pixmap(clip=diag_rect, dpi=180) # High-res 180 DPI
        pix.save(filepath)
        
        print(f"Extracted {fig_label} on Page {printed_page}: {filename} ({pix.width}x{pix.height})")
        extracted.append({
            "id": fig_id,
            "book_id": book_id,
            "pdf_page_index": page_idx,
            "printed_page_number": printed_page,
            "figure_label": fig_label,
            "caption": cap_text,
            "description": f"Original textbook diagram for {fig_label} illustrating {cap_text}",
            "file_path": filepath,
            "filename": filename,
            "storage_path": f"{book_id}/{filename}",
            "width": pix.width,
            "height": pix.height
        })

doc.close()
print(f"Total extracted chapter diagrams: {len(extracted)}")

# Save extracted metadata to JSON
import json
with open("extracted_chapter5_figures.json", "w", encoding="utf-8") as f:
    json.dump(extracted, f, indent=2)

