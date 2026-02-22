from __future__ import annotations

import io
import logging
import re
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

import pypdf

logger = logging.getLogger("contextflow")


def clean_extracted_text(text: str) -> str:
    try:
        text = text.replace("\x00", "")
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"\n{3,}", "\n\n", text)
        lines = [line for line in text.split("\n") if line.strip()]
        text = "\n".join(lines)
        return text.strip()
    except Exception as exc:
        logger.error("clean_extracted_text failed: %s", exc)
        return text


async def extract_text_from_bytes(
    content_bytes: bytes,
    filename: str,
    file_type: str,
) -> Optional[str]:
    try:
        normalized = file_type.lstrip(".").lower()

        if normalized == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                pages: list[str] = []
                for page in reader.pages:
                    page_text = page.extract_text() or ""
                    pages.append(page_text)
                combined = "\n\n---PAGE BREAK---\n\n".join(pages)
                return clean_extracted_text(combined)
            except Exception as exc:
                logger.error("PDF extraction failed for %s: %s", filename, exc)
                return None

        if normalized in ("md", "txt"):
            text = content_bytes.decode("utf-8", errors="replace")
            return clean_extracted_text(text)

        logger.warning("Unsupported file type: %s", file_type)
        return None

    except Exception as exc:
        logger.error("extract_text_from_bytes failed for %s: %s", filename, exc)
        return None


async def extract_text_from_storage(
    storage_path: str,
    filename: str,
    file_type: str,
) -> Optional[str]:
    try:
        from utils.supabase_client import get_client
        client = get_client()
        file_bytes = client.storage.from_("documents").download(storage_path)
        text = await extract_text_from_bytes(file_bytes, filename, file_type)
        if text:
            logger.info("Extracted %d chars from %s", len(text), filename)
        return text
    except Exception as exc:
        logger.error("extract_text_from_storage failed for %s: %s", storage_path, exc)
        return None
