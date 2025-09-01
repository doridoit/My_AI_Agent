from __future__ import annotations
from typing import Iterable, List, Dict, Tuple
from io import BytesIO

# Prefer PyPDF; fallback to pdfminer.six if unavailable
try:
    from pypdf import PdfReader       # pip install pypdf
    _HAS_PYPDF = True
except Exception:
    PdfReader = None                   # type: ignore
    _HAS_PYPDF = False

try:
    from pdfminer.high_level import extract_text as _pdfminer_extract_text  # pip install pdfminer.six
    _HAS_PDFMINER = True
except Exception:
    _pdfminer_extract_text = None      # type: ignore
    _HAS_PDFMINER = False

def extract_texts(pdfs: Iterable[Tuple[str, bytes]]) -> List[Dict]:
    """
    pdfs: [(filename, raw_bytes), ...]
    return: [{"file": str, "page": int, "text": str}]
    """
    items: List[Dict] = []
    for fname, raw in pdfs:
        if _HAS_PYPDF:
            try:
                reader = PdfReader(BytesIO(raw))
                for i, page in enumerate(reader.pages, start=1):
                    try:
                        txt = page.extract_text() or ""
                    except Exception:
                        txt = ""
                    if txt.strip():
                        items.append({"file": fname, "page": i, "text": txt})
                continue
            except Exception:
                pass
        if _HAS_PDFMINER:
            try:
                full = _pdfminer_extract_text(BytesIO(raw)) or ""
                pages = [p for p in full.split("\f") if p.strip()] or [full]
                for i, txt in enumerate(pages, start=1):
                    if txt.strip():
                        items.append({"file": fname, "page": i, "text": txt})
                continue
            except Exception:
                pass
        # 둘 다 실패 시 skip
        continue
    return items