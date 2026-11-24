"""One warm Marker/Surya process, JSON-lines jobs, atomic per-page results."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import traceback

adapter = importlib.util.spec_from_file_location("marker_local", Path(__file__).with_name("marker-local.py"))
module = importlib.util.module_from_spec(adapter)
adapter.loader.exec_module(module)
from marker.models import create_model_dict
from marker.converters.pdf import PdfConverter
from marker.output import save_output
from marker.renderers.markdown import MarkdownRenderer
import importlib

save_vector_region = importlib.import_module("vector-figure").save_vector_region


class FigureRenderer(MarkdownRenderer):
    def __init__(self, config):
        super().__init__(config)
        self.regions = {}

    def extract_image(self, document, image_id):
        from marker.settings import settings

        block = document.get_block(image_id)
        page = document.get_page(image_id.page_id)
        x0, y0, x1, y1 = page.polygon.bbox
        x, y, r, b = block.polygon.bbox
        if x1 > x0 and y1 > y0:
            name = f"{image_id.to_path()}.{settings.OUTPUT_IMAGE_FORMAT.lower()}"
            self.regions[name] = ((x - x0) / (x1 - x0), (y - y0) / (y1 - y0),
                                  (r - x0) / (x1 - x0), (b - y0) / (y1 - y0))
        return super().extract_image(document, image_id)

models = create_model_dict()
print("LMS_EVENT " + json.dumps({"type": "ready"}), flush=True)
for line in sys.stdin:
    try:
        job = json.loads(line)
        if job.get("stop"):
            break
        page = int(job["page"])
        dpi = int(job.get("dpi", 144))
        if page < 1 or dpi not in (128, 144, 192):
            raise ValueError("Invalid page or DPI")
        folder = Path(job["output"])
        folder.mkdir(parents=True, exist_ok=True)
        started = time.monotonic()
        config = {"page_range": [page - 1], "mode": "balanced", "force_ocr": True,
                  "ocr_full_page": True, "ocr_inline_math": True, "pdftext_workers": 1,
                  "highres_image_dpi": dpi, "lowres_image_dpi": 96, "use_llm": False}
        converter = PdfConverter(artifact_dict=models, config=config)
        renderer = FigureRenderer(config)
        rendered = renderer(converter.build_document(job["pdf"]))
        save_output(rendered, str(folder), "page")
        # Keep source figure crops: they are content, not decorative placeholders.
        images = []
        for index, (name, picture) in enumerate(rendered.images.items()):
            filename = f"figure-{index}.png"
            picture.convert("RGB").save(folder / filename, format="PNG")
            image = {"reference": name, "file": filename}
            bounds = renderer.regions.get(name)
            if bounds:
                vector = f"figure-{index}.pdf"
                try:
                    if save_vector_region(job["pdf"], page - 1, bounds, folder / vector):
                        image["vector"] = vector
                except Exception:
                    traceback.print_exc(file=sys.stderr)
                    image["vectorError"] = "Unable to create a native PDF crop"
            images.append(image)
        result = {"page": page, "dpi": dpi, "markdown": rendered.markdown,
                  "images": images, "seconds": round(time.monotonic() - started, 3)}
        temporary = folder / "result.json.tmp"
        temporary.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, folder / "result.json")
        print("LMS_EVENT " + json.dumps({"type": "complete", "page": page, "dpi": dpi,
              "seconds": result["seconds"], "result": str(folder / "result.json")}), flush=True)
    except Exception as error:
        traceback.print_exc(file=sys.stderr)
        print("LMS_EVENT " + json.dumps({"type": "error", "error": str(error)[:2000]}), flush=True)
