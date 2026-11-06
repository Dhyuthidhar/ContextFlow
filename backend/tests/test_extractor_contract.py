from __future__ import annotations

import asyncio
import io

import pypdf

from file_processing.extractor import extract_text_from_bytes


def test_patched_pypdf_reads_a_generated_document() -> None:
    buffer = io.BytesIO()
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.write(buffer)

    extracted = asyncio.run(
        extract_text_from_bytes(buffer.getvalue(), "fixture.pdf", "pdf")
    )

    assert extracted == ""
