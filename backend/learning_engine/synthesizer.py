from __future__ import annotations

import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

import asyncio

from utils.supabase_client import (
    get_client,
    create_principle,
    update_principle_confidence,
)
from utils.embeddings import generate_embedding, generate_embeddings_batch
from utils.config import MVP_USER_ID

logger = logging.getLogger("contextflow")

_DOC_TYPE_BASE_CONFIDENCE: dict[str, float] = {
    "chat": 0.75,
    "technical": 0.70,
    "general": 0.65,
    "prd": 0.60,
    "brd": 0.60,
}


def calculate_initial_confidence(
    extraction_source: str,
    num_models_agreed: int,
    doc_type: str,
) -> float:
    base = _DOC_TYPE_BASE_CONFIDENCE.get(doc_type, 0.65)
    if num_models_agreed >= 3:
        boost = 0.10
    elif num_models_agreed == 2:
        boost = 0.05
    else:
        boost = 0.00
    return min(base + boost, 0.90)


async def find_similar_principle(
    content: str,
    category: str,
    threshold: float = 0.92,
) -> Optional[dict]:
    try:
        embedding = await generate_embedding(content)
        if not embedding:
            return None
        return await _search_similar_by_embedding(embedding, category, threshold)
    except Exception as exc:
        logger.error("find_similar_principle failed: %s", exc)
        return None


async def _search_similar_by_embedding(
    embedding: list[float],
    category: str,
    threshold: float = 0.92,
) -> Optional[dict]:
    try:
        client = get_client()
        response = client.rpc("search_principles", {
            "query_embedding": list(embedding),
            "user_id_filter": MVP_USER_ID,
            "min_confidence": 0.0,
            "category_filter": category if category != "other" else None,
            "match_count": 1,
        }).execute()
        rows = response.data or []
        if not rows:
            return None
        top = rows[0]
        if float(top.get("similarity", 0.0)) >= threshold:
            return top
        return None
    except Exception as exc:
        logger.error("_search_similar_by_embedding failed: %s", exc)
        return None


async def store_or_update_principle(
    item: dict,
    doc_type: str,
    project_id: str,
    num_models_agreed: int = 1,
) -> Optional[str]:
    try:
        content = item.get("content", "").strip()
        category = item.get("category", "other").strip()

        if not content or not category:
            logger.warning("store_or_update_principle: missing content or category, skipping")
            return None

        existing = await find_similar_principle(content, category)

        if existing:
            principle_id = existing["id"]
            current_confidence = float(existing.get("confidence_score", 0.5))
            current_times_applied = int(existing.get("times_applied", 0))

            new_confidence = min(current_confidence + 0.05, 0.95)
            new_times_applied = current_times_applied + 1

            await update_principle_confidence(
                principle_id=principle_id,
                score=new_confidence,
                times_applied=new_times_applied,
                times_failed=0,
            )

            client = get_client()
            existing_row = client.table("principles").select("source_projects").eq("id", principle_id).execute()
            if existing_row.data:
                source_projects = existing_row.data[0].get("source_projects") or []
                if project_id not in source_projects:
                    source_projects.append(project_id)
                    client.table("principles").update({"source_projects": source_projects}).eq("id", principle_id).execute()

            logger.info("Updated existing principle %s", principle_id)
            return "updated"

        embedding = await generate_embedding(content)
        if not embedding:
            logger.warning("store_or_update_principle: failed to generate embedding for content")
            return None

        confidence = calculate_initial_confidence(
            extraction_source=item.get("extracted_by", "unknown"),
            num_models_agreed=num_models_agreed,
            doc_type=doc_type,
        )

        principle_data: dict = {
            "user_id": MVP_USER_ID,
            "content": content,
            "type": item.get("type", "pattern"),
            "category": category,
            "source": "user_derived",
            "confidence_score": confidence,
            "times_applied": 1,
            "reasoning": item.get("reasoning") or None,
            "tradeoffs": item.get("tradeoffs") or None,
            "when_to_use": item.get("when_to_use") or None,
            "when_not_to_use": item.get("when_not_to_use") or None,
            "source_projects": [project_id],
            "embedding": embedding,
        }

        new_principle = await create_principle(principle_data)
        principle_id = new_principle["id"]
        logger.info("Created new principle %s", principle_id)
        return principle_id

    except Exception as exc:
        logger.error("store_or_update_principle failed: %s", exc)
        return None


async def _store_or_update_with_embedding(
    item: dict,
    embedding: list[float],
    doc_type: str,
    project_id: str,
) -> Optional[str]:
    try:
        content = item.get("content", "").strip()
        category = item.get("category", "other").strip()
        if not content or not category:
            return None

        existing = await _search_similar_by_embedding(embedding, category)

        if existing:
            principle_id = existing["id"]
            current_confidence = float(existing.get("confidence_score", 0.5))
            current_times_applied = int(existing.get("times_applied", 0))
            await update_principle_confidence(
                principle_id=principle_id,
                score=min(current_confidence + 0.05, 0.95),
                times_applied=current_times_applied + 1,
                times_failed=0,
            )
            client = get_client()
            existing_row = client.table("principles").select("source_projects").eq("id", principle_id).execute()
            if existing_row.data:
                source_projects = existing_row.data[0].get("source_projects") or []
                if project_id not in source_projects:
                    source_projects.append(project_id)
                    client.table("principles").update({"source_projects": source_projects}).eq("id", principle_id).execute()
            return "updated"

        confidence = calculate_initial_confidence(
            extraction_source=item.get("extracted_by", "unknown"),
            num_models_agreed=1,
            doc_type=doc_type,
        )
        principle_data: dict = {
            "user_id": MVP_USER_ID,
            "content": content,
            "type": item.get("type", "pattern"),
            "category": category,
            "source": "user_derived",
            "confidence_score": confidence,
            "times_applied": 1,
            "reasoning": item.get("reasoning") or None,
            "tradeoffs": item.get("tradeoffs") or None,
            "when_to_use": item.get("when_to_use") or None,
            "when_not_to_use": item.get("when_not_to_use") or None,
            "source_projects": [project_id],
            "embedding": embedding,
        }
        new_principle = await create_principle(principle_data)
        logger.info("Created new principle %s", new_principle["id"])
        return new_principle["id"]
    except Exception as exc:
        logger.error("_store_or_update_with_embedding failed: %s", exc)
        return None


async def synthesize_and_store(
    all_extractions: dict[str, list[dict]],
    doc_type: str,
    project_id: str,
) -> dict:
    created = 0
    updated = 0
    failed = 0

    all_items: list[dict] = []
    for agent_name, items in all_extractions.items():
        for item in items:
            item["_agent"] = agent_name
            all_items.append(item)

    if not all_items:
        return {"created": 0, "updated": 0, "failed": 0}

    logger.info("Agent 5: synthesizing %d total extractions", len(all_items))

    contents = [item.get("content", "").strip() for item in all_items]
    try:
        embeddings_batch = await generate_embeddings_batch(contents)
    except Exception as exc:
        logger.error("synthesize_and_store: batch embedding failed, falling back to sequential: %s", exc)
        embeddings_batch = None

    async def store_single(i: int) -> Optional[str]:
        item = all_items[i]
        try:
            if embeddings_batch is not None:
                embedding = embeddings_batch[i]
                return await _store_or_update_with_embedding(
                    item=item,
                    embedding=embedding,
                    doc_type=doc_type,
                    project_id=project_id,
                )
            return await store_or_update_principle(
                item=item,
                doc_type=doc_type,
                project_id=project_id,
            )
        except Exception as exc:
            logger.error("store_single failed for item %d: %s", i, exc)
            return None

    results = await asyncio.gather(*[store_single(i) for i in range(len(all_items))], return_exceptions=True)

    for r in results:
        if isinstance(r, Exception) or r is None:
            failed += 1
        elif r == "updated":
            updated += 1
        else:
            created += 1

    logger.info("Agent 5 complete: %d created, %d updated, %d failed", created, updated, failed)
    return {"created": created, "updated": updated, "failed": failed}
