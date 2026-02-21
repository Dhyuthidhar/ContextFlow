from __future__ import annotations

import json
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataclasses import dataclass
from typing import Optional

from openai import AsyncOpenAI

from utils.config import OPENAI_API_KEY, MVP_USER_ID
from utils.supabase_client import get_client, get_projects

logger = logging.getLogger("contextflow")

_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

_FALLBACK_INTENT_KWARGS = dict(
    query_type="general",
    category="other",
    scope="general",
    project_id=None,
    confidence=0.5,
)


@dataclass
class Intent:
    query_type: str
    category: str
    scope: str
    project_id: Optional[str]
    confidence: float


async def classify_intent(
    query: str,
    project_id_hint: Optional[str] = None,
) -> Intent:
    system_prompt = (
        "You are a query classifier for ContextFlow, an engineering knowledge system.\n"
        "Classify the user query and return ONLY valid JSON, no other text."
    )
    user_prompt = f"""Classify this query: "{query}"

Return JSON with exactly these fields:
{{
  "query_type": "pattern|decision|error|lesson|general",
  "category": "auth|payment|api|database|frontend|backend|security|deployment|testing|performance|other",
  "scope": "project_specific|all_projects|general",
  "confidence": 0.0-1.0
}}

Rules:
- query_type "pattern": asks HOW to implement something
- query_type "decision": asks WHICH option to choose
- query_type "error": asks about fixing a problem
- query_type "lesson": asks about past learnings or mistakes
- query_type "general": anything else
- scope "project_specific": mentions a specific project name
- scope "all_projects": asks about patterns across projects
- scope "general": asks for general best practices"""

    try:
        response = await _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = response.choices[0].message.content or ""
        parsed = json.loads(raw)
        intent = Intent(
            query_type=parsed.get("query_type", "general"),
            category=parsed.get("category", "other"),
            scope=parsed.get("scope", "general"),
            project_id=project_id_hint,
            confidence=float(parsed.get("confidence", 0.5)),
        )
        logger.info(
            "classify_intent result: type=%s category=%s scope=%s confidence=%.2f",
            intent.query_type,
            intent.category,
            intent.scope,
            intent.confidence,
        )
        return intent
    except Exception as exc:
        logger.error("classify_intent failed: %s — using fallback", exc)
        return Intent(**_FALLBACK_INTENT_KWARGS)


async def detect_project_from_query(query: str) -> Optional[str]:
    try:
        projects = await get_projects(MVP_USER_ID)
        query_lower = query.lower()
        for project in projects:
            name = project.get("name", "")
            if name and name.lower() in query_lower:
                logger.info("detect_project_from_query: matched project '%s' (%s)", name, project["id"])
                return project["id"]
        return None
    except Exception as exc:
        logger.error("detect_project_from_query failed: %s", exc)
        return None


async def classify_with_project_detection(
    query: str,
    project_id_hint: Optional[str] = None,
) -> Intent:
    if project_id_hint:
        project_id = project_id_hint
    else:
        project_id = await detect_project_from_query(query)

    intent = await classify_intent(query, project_id_hint=project_id)
    return intent
