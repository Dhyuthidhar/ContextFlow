from __future__ import annotations

import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from orchestrator.intent_classifier import Intent
from utils.embeddings import generate_embedding
from utils.supabase_client import get_client
from utils.config import MVP_USER_ID

logger = logging.getLogger("contextflow")


async def query_storage1(intent: Intent, limit: int = 10) -> list[dict]:
    try:
        query_text = f"{intent.category} {intent.query_type} {intent.query_type}"
        embedding = await generate_embedding(query_text)
        if not embedding:
            logger.warning("query_storage1: generate_embedding returned empty")
            return []

        client = get_client()
        embedding_list = list(embedding)
        response = client.rpc("search_document_chunks", {
            "query_embedding": embedding_list,
            "user_id_filter": MVP_USER_ID,
            "project_id_filter": str(intent.project_id) if intent.project_id else None,
            "match_count": limit,
        }).execute()
        rows = response.data if response.data else []

        results = [
            {
                "id": row.get("id"),
                "content": row.get("content"),
                "chunk_type": row.get("chunk_type"),
                "section_title": row.get("section_title"),
                "filename": row.get("filename"),
                "doc_category": row.get("doc_category"),
                "project_id": row.get("project_id"),
                "project_name": row.get("project_name"),
                "similarity": float(row.get("similarity", 0.0)),
            }
            for row in rows
        ]

        logger.info("query_storage1: returned %d chunks", len(results))
        return results

    except Exception as exc:
        logger.error("query_storage1 failed: %s", exc)
        return []


async def query_storage1_filtered(
    intent: Intent,
    min_similarity: float = 0.3,
    limit: int = 10,
) -> list[dict]:
    try:
        chunks = await query_storage1(intent, limit=limit * 2)
        filtered = [c for c in chunks if c.get("similarity", 0.0) >= min_similarity]
        filtered.sort(key=lambda c: c.get("similarity", 0.0), reverse=True)
        return filtered[:limit]
    except Exception as exc:
        logger.error("query_storage1_filtered failed: %s", exc)
        return []


def group_chunks_by_project(chunks: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for chunk in chunks:
        project_name = chunk.get("project_name") or "unknown"
        grouped.setdefault(project_name, []).append(chunk)
    for project_name in grouped:
        grouped[project_name].sort(key=lambda c: c.get("similarity", 0.0), reverse=True)
    return grouped
