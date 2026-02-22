from __future__ import annotations

import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from utils.embeddings import generate_embedding
from utils.supabase_client import get_client
from utils.config import MVP_USER_ID
from file_processing.extractor import extract_text_from_storage, clean_extracted_text

logger = logging.getLogger("contextflow")


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 100,
) -> list[dict]:
    try:
        paragraphs = text.split("\n\n")
        chunks: list[dict] = []
        chunk_index = 0
        char_offset = 0
        current_content = ""
        current_start = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                char_offset += 2
                continue

            chunk_type = "paragraph"

            if len(current_content) + len(para) + 2 <= chunk_size:
                if current_content:
                    current_content += "\n\n" + para
                else:
                    current_start = char_offset
                    current_content = para
            else:
                if current_content:
                    section_title: Optional[str] = None
                    first_line = current_content.lstrip().split("\n")[0]
                    if first_line.startswith("#"):
                        section_title = first_line.lstrip("#").strip()

                    chunks.append({
                        "content": current_content,
                        "chunk_index": chunk_index,
                        "chunk_type": "header" if section_title else "paragraph",
                        "section_title": section_title,
                        "char_start": current_start,
                        "char_end": current_start + len(current_content),
                    })
                    chunk_index += 1

                    overlap_text = current_content[-overlap:] if len(current_content) > overlap else current_content
                    current_content = overlap_text + "\n\n" + para
                    current_start = current_start + len(current_content) - len(overlap_text)
                else:
                    current_start = char_offset
                    current_content = para

                if len(current_content) > chunk_size:
                    sentences = current_content.split(". ")
                    sub_chunk = ""
                    sub_start = current_start
                    for sentence in sentences:
                        if len(sub_chunk) + len(sentence) + 2 <= chunk_size:
                            sub_chunk = sub_chunk + ". " + sentence if sub_chunk else sentence
                        else:
                            if sub_chunk:
                                chunks.append({
                                    "content": sub_chunk,
                                    "chunk_index": chunk_index,
                                    "chunk_type": chunk_type,
                                    "section_title": None,
                                    "char_start": sub_start,
                                    "char_end": sub_start + len(sub_chunk),
                                })
                                chunk_index += 1
                                sub_start = sub_start + len(sub_chunk) - overlap
                                sub_chunk = sub_chunk[-overlap:] + ". " + sentence if len(sub_chunk) > overlap else sentence
                            else:
                                sub_chunk = sentence
                    if sub_chunk:
                        current_content = sub_chunk
                        current_start = sub_start

            char_offset += len(para) + 2

        if current_content.strip():
            section_title = None
            first_line = current_content.lstrip().split("\n")[0]
            if first_line.startswith("#"):
                section_title = first_line.lstrip("#").strip()
            chunks.append({
                "content": current_content,
                "chunk_index": chunk_index,
                "chunk_type": "header" if section_title else "paragraph",
                "section_title": section_title,
                "char_start": current_start,
                "char_end": current_start + len(current_content),
            })

        logger.info("chunk_text: produced %d chunks from %d chars", len(chunks), len(text))
        return chunks

    except Exception as exc:
        logger.error("chunk_text failed: %s", exc)
        return []


async def process_and_store_chunks(
    document_id: str,
    text: str,
    batch_size: int = 10,
) -> int:
    try:
        chunks = chunk_text(text)
        if not chunks:
            logger.warning("process_and_store_chunks: no chunks produced for document %s", document_id)
            return 0

        client = get_client()
        stored = 0

        for batch_start in range(0, len(chunks), batch_size):
            batch = chunks[batch_start:batch_start + batch_size]

            embeddings = await asyncio.gather(
                *[generate_embedding(c["content"]) for c in batch]
            )

            rows = []
            for chunk, embedding in zip(batch, embeddings):
                if embedding is None:
                    logger.warning("process_and_store_chunks: no embedding for chunk %d", chunk["chunk_index"])
                    continue
                rows.append({
                    "document_id": document_id,
                    "content": chunk["content"],
                    "chunk_index": chunk["chunk_index"],
                    "chunk_type": chunk["chunk_type"],
                    "section_title": chunk.get("section_title"),
                    "token_count": len(chunk["content"]) // 4,
                    "embedding": list(embedding),
                })

            if rows:
                client.table("document_chunks").insert(rows).execute()
                stored += len(rows)

            if stored % 10 == 0 or batch_start + batch_size >= len(chunks):
                logger.info("process_and_store_chunks: stored %d/%d chunks", stored, len(chunks))

            await asyncio.sleep(0.1)

        return stored

    except Exception as exc:
        logger.error("process_and_store_chunks failed for document %s: %s", document_id, exc)
        return 0


async def process_document_file(
    document_id: str,
    storage_path: str,
    filename: str,
    file_type: str,
) -> dict:
    try:
        logger.info("process_document_file: starting %s", filename)

        text = await extract_text_from_storage(storage_path, filename, file_type)
        if not text:
            return {"success": False, "error": "Failed to extract text"}

        cleaned = clean_extracted_text(text)
        logger.info("process_document_file: extracted %d chars from %s", len(cleaned), filename)

        chunk_count = await process_and_store_chunks(document_id, cleaned)

        return {
            "success": True,
            "document_id": document_id,
            "filename": filename,
            "char_count": len(cleaned),
            "chunk_count": chunk_count,
        }

    except Exception as exc:
        logger.error("process_document_file failed for %s: %s", filename, exc)
        return {"success": False, "error": str(exc)}
