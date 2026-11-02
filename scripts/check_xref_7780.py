import fitz

doc = fitz.open(r"C:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf")
print("PDF Object 7780:", doc.xref_object(7780))

