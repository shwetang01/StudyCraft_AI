import os
import pymupdf as fitz

pdf_path = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
fig_dir = r"c:\Users\Shwetang\Downloads\studyCraft-upgrade\public\extracted_figures\4d702ea1-d284-4f69-9f5f-fc296e80a318"

doc = fitz.open(pdf_path)
print(f"Checking images across {len(doc)} pages...")

# Check page 14 (printed page xiii)
page = doc[14]
imgs = page.get_images()
print(f"Page 14 has {len(imgs)} images")

for idx, img in enumerate(imgs):
    xref = img[0]
    pix = fitz.Pixmap(doc, xref)
    print(f"Image {idx}: xref={xref}, colorspace={pix.colorspace.name}, n={pix.n}, alpha={pix.alpha}")
    # If CMYK (n >= 5 or colorspace is CMYK), convert to RGB
    if pix.n >= 5 or pix.colorspace == fitz.csCMYK:
        print(f"  -> Converting CMYK image {xref} to sRGB...")
        rgb_pix = fitz.Pixmap(fitz.csRGB, pix)
        out_name = os.path.join(fig_dir, f"test_rgb_{idx}.png")
        rgb_pix.save(out_name)
        print(f"  Saved converted RGB to {out_name}")

doc.close()

