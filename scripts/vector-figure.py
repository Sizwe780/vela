"""Copy a figure region into a native PDF page without rasterizing it."""
from pathlib import Path

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c


def save_vector_region(source, page_index, bounds, destination):
    """Bounds are fractions of the visible page in top-left coordinates."""
    with pdfium.PdfDocument(source) as document:
        page = document[page_index]
        if page.get_rotation() != 0:
            return False
        left, bottom, right, top = page.get_bbox()
        x0, y0, x1, y1 = (max(0, min(1, value)) for value in bounds)
        width, height = right - left, top - bottom
        clip = (left + x0 * width, top - y1 * height, left + x1 * width, top - y0 * height)
        if clip[2] - clip[0] < 4 or clip[3] - clip[1] < 4:
            return False

        # A raster-only image is kept as PNG. Detect native paths, including in forms.
        def overlaps(path):
            x0, y0, x1, y1 = path.get_bounds()
            return x1 >= clip[0] and x0 <= clip[2] and y1 >= clip[1] and y0 <= clip[3]

        if not any(overlaps(path) for path in page.get_objects(filter=[pdfium_c.FPDF_PAGEOBJ_PATH])):
            return False
        # Marker boxes can sit on or just inside figure strokes. Retain a small
        # margin so bounding-box rounding does not cut off those strokes.
        padding = 6
        clip = (max(left, clip[0] - padding), max(bottom, clip[1] - padding),
                min(right, clip[2] + padding), min(top, clip[3] + padding))
        with pdfium.PdfDocument.new() as fragment:
            cropped = fragment.new_page(clip[2] - clip[0], clip[3] - clip[1])
            # Import the page artwork as a form, without page actions or annotations.
            artwork = document.page_as_xobject(page_index, fragment).as_pageobject()
            artwork.set_matrix(pdfium.PdfMatrix().translate(left - clip[0], bottom - clip[1]))
            cropped.insert_obj(artwork)
            cropped.gen_content()
            fragment.save(Path(destination))
        return True
