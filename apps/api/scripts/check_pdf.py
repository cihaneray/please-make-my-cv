"""Run from apps/api: uv run python scripts/check_pdf.py."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.exporters.pdf_exporter import render_pdf
from app.schemas.resume import ResumeDocument

if __name__ == "__main__":
    content = render_pdf(ResumeDocument())
    assert content.startswith(b"%PDF-")
    print(f"PDF browser works: {len(content)} bytes generated.")
