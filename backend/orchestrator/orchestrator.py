from __future__ import annotations

import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from orchestrator.intent_classifier import Intent, classify_with_project_detection
from orchestrator.storage1_query import query_storage1_filtered
from orchestrator.storage2_query import query_storage2_with_expansions

logger = logging.getLogger("contextflow")


async def merge_and_format(
    query: str,
    intent: Intent,
    storage1_results: list[dict],
    storage2_primary: list[dict],
    storage2_related: dict[str, list[dict]],
) -> dict:
    project_context = []
    for chunk in sorted(storage1_results, key=lambda c: c.get("similarity", 0.0), reverse=True)[:5]:
        content = chunk.get("content") or ""
        project_context.append({
            "project_name": chunk.get("project_name"),
            "filename": chunk.get("filename"),
            "section": chunk.get("section_title"),
            "content": content[:300],
            "similarity": float(chunk.get("similarity", 0.0)),
            "doc_category": chunk.get("doc_category"),
        })

    principles = []
    for p in sorted(storage2_primary, key=lambda x: float(x.get("confidence_score", 0.0)), reverse=True)[:5]:
        principles.append({
            "content": (p.get("content") or "")[:300],
            "type": p.get("type"),
            "category": p.get("category"),
            "source": p.get("source"),
            "confidence": float(p.get("confidence_score", 0.0)),
            "when_to_use": p.get("when_to_use"),
            "when_not_to_use": p.get("when_not_to_use"),
            "similarity": float(p.get("similarity", 0.0)),
        })

    related_context: dict[str, list[dict]] = {}
    for cat, items in storage2_related.items():
        related_context[cat] = [
            {
                "content": (item.get("content") or "")[:300],
                "confidence": float(item.get("confidence_score", 0.0)),
            }
            for item in items[:2]
        ]

    return {
        "query": query,
        "intent": {
            "type": intent.query_type,
            "category": intent.category,
            "scope": intent.scope,
        },
        "project_context": project_context,
        "principles": principles,
        "related_context": related_context,
        "meta": {
            "storage1_count": len(storage1_results),
            "storage2_count": len(storage2_primary),
            "related_categories": list(storage2_related.keys()),
            "has_project_context": len(project_context) > 0,
            "orchestrator_ready": True,
        },
    }


async def orchestrate_query(
    query: str,
    project_id: Optional[str] = None,
    category_hint: Optional[str] = None,
    limit: int = 10,
) -> dict:
    try:
        intent = await classify_with_project_detection(query, project_id)

        if category_hint and intent.category == "other":
            intent.category = category_hint

        storage1_task = query_storage1_filtered(intent, min_similarity=0.3, limit=limit)
        storage2_task = query_storage2_with_expansions(intent)
        results = await asyncio.gather(storage1_task, storage2_task)

        storage1_results = results[0]
        storage2_data = results[1]

        return await merge_and_format(
            query,
            intent,
            storage1_results,
            storage2_data["primary"],
            storage2_data["related"],
        )
    except Exception as exc:
        logger.error("orchestrate_query failed: %s", exc)
        return {"error": str(exc), "success": False, "query": query}
