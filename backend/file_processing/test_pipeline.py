from __future__ import annotations

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from file_processing.extractor import extract_text_from_bytes, clean_extracted_text
from file_processing.chunker import chunk_text, process_document_file
from utils.supabase_client import get_client


async def main() -> None:
    print("=== File Processing Pipeline Tests ===\n")

    md_content = b"# Test Doc\n\nThis is a test paragraph.\n\nAnother paragraph with more content."
    text = await extract_text_from_bytes(md_content, "test.md", "md")
    assert text is not None, "MD extraction failed"
    assert "Test Doc" in text, "MD content missing"
    print("PASS - MD text extraction")

    dirty = "Hello\n\n\n\n\nWorld\r\n"
    clean = clean_extracted_text(dirty)
    assert "\n\n\n" not in clean, "Cleaning failed"
    print("PASS - Text cleaning")

    long_text = "This is a sentence. " * 200
    chunks = chunk_text(long_text, chunk_size=1000, overlap=100)
    assert len(chunks) > 1, "Should produce multiple chunks"
    assert all("content" in c for c in chunks), "Chunks missing content"
    assert all("chunk_index" in c for c in chunks), "Chunks missing index"
    print(f"PASS - Chunking ({len(chunks)} chunks from {len(long_text)} chars)")

    client = get_client()
    response = client.table("document_chunks").select("id").limit(1).execute()
    print(f"PASS - document_chunks table accessible ({len(response.data)} existing chunks)")

    print("\n=== All tests passed ===")


asyncio.run(main())
