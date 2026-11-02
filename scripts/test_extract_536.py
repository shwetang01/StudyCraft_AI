import pymupdf as fitz
import os

pdf_path = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
doc = fitz.open(pdf_path)

# Page 138 (0-indexed) is printed page 117 (Chapter 5, Figure 5.3.6)
page = doc[138]
print("Page label:", page.get_label())

# Search for Figure 5.3.6
results = page.search_for("Figure 5.3.6")
print("Search results for Figure 5.3.6:", results)

if results:
    r = results[0]
    # In physics books, diagram is usually directly above the caption
    # Let's crop a box above the caption
    diagram_rect = fitz.Rect(
        max(30, r.x0 - 50),
        max(50, r.y0 - 250),
        min(page.rect.x1 - 30, r.x1 + 150),
        r.y1 + 40
    )
    pix = page.get_pixmap(clip=diagram_rect, dpi=150)
    out_path = "figure_5_3_6_inclined_plane.png"
    pix.save(out_path)
    print(f"Saved {out_path}: {pix.width}x{pix.height}")

doc.close()

