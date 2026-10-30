"""
StudyCraft AI - PDF Text Chunking & Original Diagram Extraction Engine
Powered by PyMuPDF (fitz)
"""

import sys
import os
import json
import re
import uuid
import hashlib
from typing import List, Dict, Any, Optional

try:
    import pymupdf as fitz
except ImportError:
    import fitz


def detect_printed_page_number(page: fitz.Page, pdf_page_index: int) -> str:
    """
    Attempts to detect the printed page number from page labels or headers/footers.
    Falls back to str(pdf_page_index + 1).
    """
    label = page.get_label()
    if label and label.strip():
        return label.strip()

    # Search footer / header text
    rect = page.rect
    # Check bottom 10% for standalone digits or Roman numerals
    footer_rect = fitz.Rect(rect.x0, rect.y1 - (rect.height * 0.1), rect.x1, rect.y1)
    footer_text = page.get_text("text", clip=footer_rect).strip()
    match = re.search(r'\b(\d{1,4}|[ivxlcdm]{1,8})\b', footer_text, re.IGNORECASE)
    if match:
        return match.group(1)

    # Check top 8% for header page numbers
    header_rect = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + (rect.height * 0.08))
    header_text = page.get_text("text", clip=header_rect).strip()
    match = re.search(r'\b(\d{1,4})\b', header_text)
    if match:
        return match.group(1)

    return str(pdf_page_index + 1)


def split_text_into_chunks(
    page_text: str,
    pdf_page_index: int,
    printed_page_number: str,
    target_chunk_size: int = 1800,
    overlap_size: int = 250,
    start_chunk_index: int = 0
) -> List[Dict[str, Any]]:
    """
    Splits page text into clean semantic chunks while preserving source page metadata.
    Avoids splitting mid-sentence when possible.
    """
    clean_text = page_text.strip()
    if not clean_text:
        return []

    # Detect potential section headings (lines in all-caps or title case at top)
    lines = clean_text.split('\n')
    section_heading = None
    for line in lines[:3]:
        s = line.strip()
        if len(s) > 3 and len(s) < 80 and (s.isupper() or s.istitle()):
            section_heading = s
            break

    chunks = []
    text_len = len(clean_text)

    if text_len <= target_chunk_size:
        return [{
            "chunk_index": start_chunk_index,
            "content": clean_text,
            "pdf_page_index": pdf_page_index,
            "printed_page_number": printed_page_number,
            "metadata": {
                "section_heading": section_heading,
                "character_count": text_len,
            }
        }]

    # Sentence boundary regex
    sentence_delimiters = re.compile(r'(?<=[.!?])\s+')
    sentences = sentence_delimiters.split(clean_text)

    current_chunk = []
    current_len = 0
    idx = start_chunk_index

    for s in sentences:
        s_len = len(s)
        if current_len + s_len > target_chunk_size and current_chunk:
            chunk_body = " ".join(current_chunk).strip()
            chunks.append({
                "chunk_index": idx,
                "content": chunk_body,
                "pdf_page_index": pdf_page_index,
                "printed_page_number": printed_page_number,
                "metadata": {
                    "section_heading": section_heading,
                    "character_count": len(chunk_body),
                }
            })
            idx += 1

            # Keep overlap: take the last sentence(s) that fit within overlap_size
            overlap = []
            overlap_len = 0
            for prev_s in reversed(current_chunk):
                if overlap_len + len(prev_s) <= overlap_size:
                    overlap.insert(0, prev_s)
                    overlap_len += len(prev_s)
                else:
                    break
            current_chunk = overlap
            current_len = overlap_len

        current_chunk.append(s)
        current_len += s_len

    if current_chunk:
        chunk_body = " ".join(current_chunk).strip()
        if len(chunk_body) > 30:  # Avoid negligible trailing snippets
            chunks.append({
                "chunk_index": idx,
                "content": chunk_body,
                "pdf_page_index": pdf_page_index,
                "printed_page_number": printed_page_number,
                "metadata": {
                    "section_heading": section_heading,
                    "character_count": len(chunk_body),
                }
            })

    return chunks


def find_nearby_caption(page: fitz.Page, target_rect: fitz.Rect) -> Dict[str, Optional[str]]:
    """
    Searches for figure captions immediately below or above an image/diagram.
    Supports 'Figure 1.2', 'Fig. 3', 'FIGURE 4', or descriptions.
    """
    caption_candidates = []
    page_rect = page.rect

    # Search region below the image
    below_rect = fitz.Rect(
        max(page_rect.x0, target_rect.x0 - 40),
        target_rect.y1,
        min(page_rect.x1, target_rect.x1 + 40),
        min(page_rect.y1, target_rect.y1 + 120)
    )
    text_below = page.get_text("text", clip=below_rect).strip()

    # Search region above the image
    above_rect = fitz.Rect(
        max(page_rect.x0, target_rect.x0 - 40),
        max(page_rect.y0, target_rect.y0 - 60),
        min(page_rect.x1, target_rect.x1 + 40),
        target_rect.y0
    )
    text_above = page.get_text("text", clip=above_rect).strip()

    caption_pattern = re.compile(r'((?:Figure|Fig\.?|FIGURE|Diagram|Chart|Illustration)\s*[\d\.\-]+[^\n\.\:]*[\:\.\-]?\s*[^\n]+)', re.IGNORECASE)

    label = None
    caption = None

    if text_below:
        match = caption_pattern.search(text_below)
        if match:
            full_cap = match.group(0).strip()
            caption = full_cap
            label_match = re.match(r'^(?:Figure|Fig\.?|FIGURE)\s*[\d\.\-]+', full_cap, re.IGNORECASE)
            if label_match:
                label = label_match.group(0).strip()
        elif len(text_below) < 200:
            caption = text_below.replace('\n', ' ')

    if not caption and text_above:
        match = caption_pattern.search(text_above)
        if match:
            full_cap = match.group(0).strip()
            caption = full_cap
            label_match = re.match(r'^(?:Figure|Fig\.?|FIGURE)\s*[\d\.\-]+', full_cap, re.IGNORECASE)
            if label_match:
                label = label_match.group(0).strip()

    return {"figure_label": label, "caption": caption}


def extract_figures_from_page(
    doc: fitz.Document,
    page: fitz.Page,
    pdf_page_index: int,
    printed_page_number: str,
    output_dir: str,
    book_id: str
) -> List[Dict[str, Any]]:
    """
    Extracts both embedded raster images and rendered vector graphics/diagrams.
    Saves original image crops to disk.
    """
    figures = []
    seen_hashes = set()

    # 1. Embedded raster images
    image_list = page.get_images(full=True)
    for img_idx, img_info in enumerate(image_list):
        if len(figures) >= 2:
            break
        xref = img_info[0]
        try:
            base_image = doc.extract_image(xref)
        except Exception:
            continue

        if not base_image:
            continue

        image_bytes = base_image.get("image")
        image_ext = base_image.get("ext", "png").lower()
        width = base_image.get("width", 0)
        height = base_image.get("height", 0)

        # Filter out tiny icon-sized artifacts or spacer elements
        if width < 160 or height < 140:
            continue

        # Prevent duplicate images on the same page
        img_hash = hashlib.md5(image_bytes).hexdigest()
        if img_hash in seen_hashes:
            continue
        seen_hashes.add(img_hash)

        # Estimate image bounding box on page and render in true-color sRGB
        img_rects = page.get_image_rects(xref)
        bbox = None
        captions = {"figure_label": None, "caption": None}
        figure_id = str(uuid.uuid4())

        if img_rects:
            r = img_rects[0]
            bbox = [r.x0, r.y0, r.x1, r.y1]
            captions = find_nearby_caption(page, r)
            # Render true-color sRGB pixmap using MuPDF engine to prevent CMYK / ColorTransform inversions
            pix = page.get_pixmap(clip=r, dpi=180)
            filename = f"{book_id}_p{pdf_page_index + 1}_fig_{figure_id[:8]}.png"
            filepath = os.path.join(output_dir, filename)
            pix.save(filepath)
        else:
            filename = f"{book_id}_p{pdf_page_index + 1}_fig_{figure_id[:8]}.{image_ext}"
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "wb") as f:
                f.write(image_bytes)

        figures.append({
            "id": figure_id,
            "book_id": book_id,
            "pdf_page_index": pdf_page_index,
            "printed_page_number": printed_page_number,
            "figure_label": captions["figure_label"] or f"Figure on Page {printed_page_number}",
            "caption": captions["caption"],
            "file_path": filepath,
            "filename": filename,
            "width": width,
            "height": height,
            "metadata": {
                "bbox": bbox,
                "format": image_ext,
                "source": "embedded_image",
                "xref": xref
            }
        })

    # 2. Vector Drawings Detection (only when explicit figure caption is detected)
    drawings = page.get_drawings()
    if drawings and len(drawings) >= 8 and len(figures) == 0:
        rects = [d["rect"] for d in drawings if d["rect"].width > 100 and d["rect"].height > 80]
        if rects:
            union_rect = fitz.Rect(rects[0])
            for r in rects[1:]:
                union_rect.include_rect(r)

            page_rect = page.rect
            if union_rect.width < page_rect.width * 0.95 and union_rect.height < page_rect.height * 0.85:
                captions = find_nearby_caption(page, union_rect)
                # Only capture vector crop if an actual figure caption was found
                if captions["caption"]:
                    figure_id = str(uuid.uuid4())
                    filename = f"{book_id}_p{pdf_page_index + 1}_vector_{figure_id[:8]}.png"
                    filepath = os.path.join(output_dir, filename)

                    pix = page.get_pixmap(clip=union_rect, dpi=150)
                    pix.save(filepath)

                    figures.append({
                        "id": figure_id,
                        "book_id": book_id,
                        "pdf_page_index": pdf_page_index,
                        "printed_page_number": printed_page_number,
                        "figure_label": captions["figure_label"] or f"Diagram on Page {printed_page_number}",
                        "caption": captions["caption"],
                        "file_path": filepath,
                        "filename": filename,
                        "width": pix.width,
                        "height": pix.height,
                        "metadata": {
                            "bbox": [union_rect.x0, union_rect.y0, union_rect.x1, union_rect.y1],
                            "format": "png",
                            "source": "vector_drawing_crop"
                        }
                    })

    return figures


def process_pdf(pdf_path: str, book_id: str, output_dir: str) -> Dict[str, Any]:
    """
    Main processing entrypoint.
    Streams pages to handle large books (1,400+ pages) with low memory footprint.
    """
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    all_chunks = []
    all_figures = []
    chunk_counter = 0

    for page_idx in range(total_pages):
        page = doc[page_idx]
        printed_page_no = detect_printed_page_number(page, page_idx)

        # 1. Extract text excluding running header band (y < 44) and running footer band (y > height - 32)
        content_rect = fitz.Rect(
            page.rect.x0,
            page.rect.y0 + 44,
            page.rect.x1,
            page.rect.y1 - 32
        )
        page_text = page.get_text("text", clip=content_rect)
        if page_text and page_text.strip():
            # Clean extraction artifacts: soft hyphens, zero-width spaces, exotic unicode spaces
            page_text = page_text.replace('\xad', '').replace('\u200b', '')
            page_text = re.sub(r'[\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f]', ' ', page_text)
            # Remove repeated page numbers or residual chapter banners at the beginning of the text
            page_text = re.sub(r'^\s*\d{1,4}\s*\n\s*(?:CHAPTER|Module|\d+\.\d+)[^\n]*\n', '', page_text, flags=re.IGNORECASE)
            page_text = re.sub(r'^\s*(?:CHAPTER|Module)\s*[\d\.\-A-Za-z\s—]+\n', '', page_text, flags=re.IGNORECASE)

            page_chunks = split_text_into_chunks(
                page_text=page_text,
                pdf_page_index=page_idx,
                printed_page_number=printed_page_no,
                start_chunk_index=chunk_counter
            )
            all_chunks.extend(page_chunks)
            chunk_counter += len(page_chunks)

        # 2. Extract figures/diagrams (capped at 40 key diagrams per textbook for performance)
        if len(all_figures) < 40:
            page_figures = extract_figures_from_page(
                doc=doc,
                page=page,
                pdf_page_index=page_idx,
                printed_page_number=printed_page_no,
                output_dir=output_dir,
                book_id=book_id
            )
            all_figures.extend(page_figures)

    doc.close()

    return {
        "book_id": book_id,
        "total_pages": total_pages,
        "total_chunks": len(all_chunks),
        "total_figures": len(all_figures),
        "chunks": all_chunks,
        "figures": all_figures
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python pdf_processor.py <pdf_path> <book_id> <output_dir> [output_json_path]")
        sys.exit(1)

    pdf_file = sys.argv[1]
    b_id = sys.argv[2]
    out_dir = sys.argv[3]
    out_json = sys.argv[4] if len(sys.argv) > 4 else os.path.join(out_dir, "processed_book.json")

    try:
        result = process_pdf(pdf_file, b_id, out_dir)
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Processed {result['total_pages']} pages, {result['total_chunks']} chunks, {result['total_figures']} figures.")
        print(f"OUTPUT_JSON:{out_json}")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

