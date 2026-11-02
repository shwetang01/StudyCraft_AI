import fitz
import json
import os

pdf_path = r"C:\Users\Shwetang\Downloads\studyCraft-upgrade\.storage\uploads\4d702ea1-d284-4f69-9f5f-fc296e80a318.pdf"
doc = fitz.open(pdf_path)

with open("figures_to_fix.json", "r", encoding="utf-8") as f:
    figures = json.load(f)

out_dir = "re_rendered_figures"
os.makedirs(out_dir, exist_ok=True)

results = []

for idx, fig in enumerate(figures):
    page_idx = fig["pdf_page_index"]
    bbox = fig.get("metadata", {}).get("bbox")
    xref = fig.get("metadata", {}).get("xref")
    fig_id = fig["id"]
    
    page = doc[page_idx]
    
    # Preferred rect: from page.get_image_rects(xref) if available, else bbox
    clip_rect = None
    if xref:
        rects = page.get_image_rects(xref)
        if rects:
            clip_rect = rects[0]
            
    if not clip_rect and bbox:
        clip_rect = fitz.Rect(bbox)
        
    if not clip_rect:
        print(f"Skipping {fig_id}: no rect found")
        continue
        
    # Render at high resolution 180 DPI with true sRGB color profiles
    pix = page.get_pixmap(clip=clip_rect, dpi=180)
    out_filename = f"{fig_id}.png"
    out_path = os.path.join(out_dir, out_filename)
    pix.save(out_path)
    
    # Inspect first pixel color to confirm natural sRGB
    sample_pixel = pix.pixel(0, 0)
    print(f"[{idx+1}/{len(figures)}] Rendered {fig.get('figure_label')} (p.{fig.get('printed_page_number')}) -> {out_filename} ({pix.width}x{pix.height}) | top-left pixel: {sample_pixel}")
    
    results.append({
        "id": fig_id,
        "filename": out_filename,
        "local_path": out_path,
        "width": pix.width,
        "height": pix.height,
        "storage_path": f"4d702ea1-d284-4f69-9f5f-fc296e80a318/{fig_id}.png"
    })

with open("re_rendered_results.json", "w") as f:
    json.dump(results, f, indent=2)

doc.close()
print(f"Finished rendering {len(results)} true-color figures!")
