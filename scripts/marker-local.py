"""Pinned Marker 2.1 adapter for forced, local, full-page OCR.

All pages are deliberately classified as needing OCR. This avoids starting an
unnecessary Torch text-quality server; mathematical recognition still runs in
Surya's actual vision model. No PDF text is substituted for OCR output.
"""
import importlib
import os
import sys
from importlib.metadata import version

if version("marker-pdf") != "2.1.0" or version("surya-ocr") != "0.23.0":
    raise SystemExit("Install scripts/requirements-math.txt for this pinned local adapter.")

if __name__ == "__main__" and ("--force_ocr" not in sys.argv or "--disable_ocr" in sys.argv):
    raise SystemExit("This adapter requires forced OCR and cannot disable recognition.")
if __name__ == "__main__" and ("--mode" not in sys.argv or sys.argv[sys.argv.index("--mode") + 1] != "balanced"):
    raise SystemExit("This adapter requires balanced full-page OCR.")

if os.name == "nt":
    # Surya 0.23's POSIX kill(pid, 0) liveness probe sends CTRL_C_EVENT on
    # Windows. Use a process handle, so cleanup cannot interrupt our launcher.
    import ctypes
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel.OpenProcess.restype = wintypes.HANDLE
    kernel.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.TerminateProcess.restype = wintypes.BOOL
    kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel.WaitForSingleObject.restype = wintypes.DWORD
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]

    def stop_owned_process(pid, name):
        handle = kernel.OpenProcess(0x00100001, False, pid)  # synchronize/terminate
        if not handle:
            return
        try:
            kernel.TerminateProcess(handle, 0)
            kernel.WaitForSingleObject(handle, 10000)
        finally:
            kernel.CloseHandle(handle)

    importlib.import_module("surya.inference.backends.spawn")._stop_process = stop_owned_process

from surya.ocr_error.schema import OCRErrorDetectionResult


class ForcedOCRClassifier:
    disable_tqdm = True

    def __call__(self, texts, batch_size=None):
        return OCRErrorDetectionResult(texts=list(texts), labels=["bad"] * len(texts), scores=[1.0] * len(texts))


models = importlib.import_module("marker.models")
models.OCRErrorPredictor = ForcedOCRClassifier
from marker.scripts.convert_single import convert_single_cli

if __name__ == "__main__":
    convert_single_cli()
