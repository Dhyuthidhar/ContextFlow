from __future__ import annotations

import asyncio
import copy
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from orchestrator.intent_classifier import Intent
from utils.embeddings import generate_embedding
from utils.config import MVP_USER_ID
from utils.supabase_client import get_client

logger = logging.getLogger("contextflow")

QUERY_EXPANSIONS: dict[str, list[str]] = {
    "auth": ["security", "encryption", "tokens"],
    "payment": ["security", "error_handling", "webhooks"],
    "api": ["error_handling", "rate_limiting", "versioning"],
    "database": ["performance", "security", "migrations"],
    "frontend": ["performance", "accessibility", "testing"],
    "backend": ["error_handling", "monitoring", "caching"],
    "security": ["auth", "encryption", "validation"],
    "deployment": ["monitoring", "security", "ci_cd"],
    "testing": ["performance", "error_handling"],
    "performance": ["database", "caching", "frontend"],
    "error_handling": ["monitoring", "logging"],
    "other": [],
}


async def query_storage2(
    intent: Intent,
    min_confidence: float = 0.5,
    limit: int = 5,
) -> list[dict]:
    try:
        query_text = f"{intent.category} {intent.query_type} best practices"
        embedding = await generate_embedding(query_text)
        if not embedding:
            logger.warning("query_storage2: generate_embedding returned empty for category=%s", intent.category)
            return []

        client = get_client()
        embedding_list = list(embedding)
        response = client.rpc("search_principles", {
            "query_embedding": embedding_list,
            "user_id_filter": MVP_USER_ID,
            "min_confidence": min_confidence,
            "category_filter": intent.category if intent.category != "other" else None,
            "match_count": limit,
        }).execute()
        rows = response.data if response.data else []

        results = [
            {
                "id": row.get("id"),
                "content": row.get("content"),
                "type": row.get("type"),
                "category": row.get("category"),
                "source": row.get("source"),
                "confidence_score": float(row.get("confidence_score", 0.0)),
                "times_applied": row.get("times_applied"),
                "when_to_use": row.get("when_to_use"),
                "when_not_to_use": row.get("when_not_to_use"),
                "reasoning": row.get("reasoning"),
                "tradeoffs": row.get("tradeoffs"),
                "similarity": float(row.get("similarity", 0.0)),
            }
            for row in rows
        ]

        logger.info("query_storage2: category=%s returned %d principles", intent.category, len(results))
        return results

    except Exception as exc:
        logger.error("query_storage2 failed: %s", exc)
        return []


async def _query_single_category(
    intent: Intent,
    category: str,
    limit_per_category: int,
) -> tuple[str, list[dict]]:
    modified = copy.copy(intent)
    modified.category = category
    results = await query_storage2(modified, min_confidence=0.6, limit=limit_per_category)
    return category, results


async def query_related_categories(
    intent: Intent,
    limit_per_category: int = 3,
) -> dict[str, list[dict]]:
    try:
        related_categories = QUERY_EXPANSIONS.get(intent.category, [])[:3]
        if not related_categories:
            return {}

        tasks = [
            _query_single_category(intent, cat, limit_per_category)
            for cat in related_categories
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        grouped: dict[str, list[dict]] = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error("query_related_categories task failed: %s", result)
                continue
            category, principles = result
            if principles:
                grouped[category] = principles

        return grouped

    except Exception as exc:
        logger.error("query_related_categories failed: %s", exc)
        return {}


async def query_storage2_with_expansions(intent: Intent) -> dict:
    try:
        primary_task = query_storage2(intent)
        related_task = query_related_categories(intent)
        primary, related = await asyncio.gather(primary_task, related_task)
        return {"primary": primary, "related": related}
    except Exception as exc:
        logger.error("query_storage2_with_expansions failed: %s", exc)
        return {"primary": [], "related": {}}
