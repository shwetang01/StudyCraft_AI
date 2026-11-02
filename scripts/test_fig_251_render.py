import fitz # PyMuPDF
import os

pdf_path = r"C:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
doc = fitz.open(pdf_path)

# Page index 49 (which is printed page 28)
page = doc[49]
print("Page 49 rect:", page.rect)

# Look for image rects or images on this page
images = page.get_images(full=True)
print("Images on page 49:", images)

for idx, img_info in enumerate(images):
    xref = img_info[0]
    rects = page.get_image_rects(xref)
    print(f"Image {idx} (xref {xref}): rects={rects}")
    base_img = doc.extract_image(xref)
    print(f"Colorspace: {base_img.get('colorspace')}, cs-name: {base_img.get('cs-name')}, ext: {base_img.get('ext')}, size: {base_img.get('width')}x{base_img.get('height')}")
    
    if rects:
        # Render true color pixmap using MuPDF's renderer
        pix = page.get_pixmap(clip=rects[0], dpi=180)
        pix.save(f"test_fig_251_truecolor_{idx}.png")
        print(f"Saved test_fig_251_truecolor_{idx}.png")

doc.close()

