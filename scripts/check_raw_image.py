import fitz
from PIL import Image
import io

doc = fitz.open(r"C:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf")
base_img = doc.extract_image(7780)
raw_bytes = base_img["image"]
im_raw = Image.open(io.BytesIO(raw_bytes))
print("Raw image format:", im_raw.format, "size:", im_raw.size, "mode:", im_raw.mode)
pixels_raw = list(im_raw.getdata())
print("Raw corner pixel [0]:", pixels_raw[0])
print("Raw middle pixel:", pixels_raw[len(pixels_raw)//2])

