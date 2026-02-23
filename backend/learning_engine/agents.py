from __future__ import annotations

import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from learning_engine.extraction_strategy import extract_with_3x3
from learning_engine.document_router import get_agents_for_doc_type, prepare_content_for_agent

logger = logging.getLogger("contextflow")

_SYSTEM_PATTERN = (
    "You are an expert software engineer specializing in identifying reusable code patterns "
    "and engineering best practices. Extract concrete, actionable patterns from technical documents. "
    "Return ONLY valid JSON array, no other text."
)

_USER_PATTERN = """Analyze this technical document and extract reusable engineering patterns:

{content}

Return a JSON array where each item has:
- "content": string (the pattern as a clear, actionable rule, 1-3 sentences)
- "category": string (one of: auth, payment, api, database, frontend, backend, security, deployment, testing, performance, error_handling, other)
- "type": string (always "pattern")
- "when_to_use": string (specific situation where this applies)
- "when_not_to_use": string (when to avoid this pattern)
- "reasoning": string (why this pattern matters)

Extract 3-8 patterns. Focus on implementation patterns, not vague advice.
Return [] if no clear patterns found."""

_SYSTEM_DECISION = (
    "You are an expert software architect specializing in technical decision analysis. "
    "Extract decision frameworks and technology choices from documents. "
    "Return ONLY valid JSON array, no other text."
)

_USER_DECISION = """Analyze this document and extract technical decisions and decision frameworks:

{content}

Return a JSON array where each item has:
- "content": string (the decision framework as "Use X when [criteria]. Use Y when [criteria]." format)
- "category": string (one of: auth, payment, api, database, frontend, backend, security, deployment, testing, performance, error_handling, other)
- "type": string (always "decision_framework")
- "when_to_use": string (criteria for choosing this option)
- "when_not_to_use": string (when to choose a different option)
- "reasoning": string (business or technical rationale)
- "tradeoffs": string (what you give up with this decision)

Extract 2-6 decisions. Focus on choices with clear reasoning.
Return [] if no clear decisions found."""

_SYSTEM_LESSON = (
    "You are an expert at extracting lessons learned and anti-patterns from engineering documents "
    "and experiences. Return ONLY valid JSON array, no other text."
)

_USER_LESSON = """Analyze this document and extract lessons learned and anti-patterns:

{content}

Return a JSON array where each item has:
- "content": string (the lesson as a clear, actionable rule — what TO do or what NOT to do)
- "category": string (one of: auth, payment, api, database, frontend, backend, security, deployment, testing, performance, error_handling, other)
- "type": string (always "lesson")
- "when_to_use": string (situation where this lesson applies)
- "reasoning": string (why this matters — what went wrong or right)

Extract 2-6 lessons. Include both positive lessons (what works) and anti-patterns (what fails).
Return [] if no clear lessons found."""

_SYSTEM_CHAT = (
    "You are an expert at analyzing developer chat histories to extract error patterns and their solutions. "
    "Return ONLY valid JSON array, no other text."
)

_USER_CHAT = """Analyze this chat/conversation history and extract error-solution pairs and technical insights:

{content}

Return a JSON array where each item has:
- "content": string (format: "Problem: [what failed]. Solution: [how it was fixed]. Prevention: [how to avoid it]")
- "category": string (one of: auth, payment, api, database, frontend, backend, security, deployment, testing, performance, error_handling, other)
- "type": string (always "error_solution")
- "when_to_use": string (symptoms that indicate this solution applies)
- "reasoning": string (root cause of the problem)

Extract 2-8 error-solution pairs. Focus on concrete, reproducible problems with clear fixes.
Return [] if no clear error-solution pairs found."""


async def agent1_extract_patterns(content: str) -> list[dict]:
    try:
        return await extract_with_3x3(
            content=content,
            system_prompt=_SYSTEM_PATTERN,
            user_prompt_template=_USER_PATTERN,
        )
    except Exception as exc:
        logger.error("agent1_extract_patterns failed: %s", exc)
        return []


async def agent2_analyze_decisions(content: str) -> list[dict]:
    try:
        return await extract_with_3x3(
            content=content,
            system_prompt=_SYSTEM_DECISION,
            user_prompt_template=_USER_DECISION,
        )
    except Exception as exc:
        logger.error("agent2_analyze_decisions failed: %s", exc)
        return []


async def agent3_synthesize_lessons(content: str) -> list[dict]:
    try:
        return await extract_with_3x3(
            content=content,
            system_prompt=_SYSTEM_LESSON,
            user_prompt_template=_USER_LESSON,
        )
    except Exception as exc:
        logger.error("agent3_synthesize_lessons failed: %s", exc)
        return []


async def agent4_analyze_chat(content: str) -> list[dict]:
    try:
        return await extract_with_3x3(
            content=content,
            system_prompt=_SYSTEM_CHAT,
            user_prompt_template=_USER_CHAT,
        )
    except Exception as exc:
        logger.error("agent4_analyze_chat failed: %s", exc)
        return []


_AGENT_MAP = {
    "pattern_extractor": agent1_extract_patterns,
    "decision_analyzer": agent2_analyze_decisions,
    "lesson_synthesizer": agent3_synthesize_lessons,
    "chat_analyzer": agent4_analyze_chat,
}


async def run_agents_for_document(
    content: str,
    doc_type: str,
    filename: str,
) -> dict[str, list[dict]]:
    agent_names = get_agents_for_doc_type(doc_type)
    prepared_content = prepare_content_for_agent(content)
    results: dict[str, list[dict]] = {}

    logger.info("Running agents %s for %s (type=%s)", agent_names, filename, doc_type)

    valid_agents = [(name, _AGENT_MAP[name]) for name in agent_names if name in _AGENT_MAP]

    async def run_agent(name: str, fn) -> tuple[str, list[dict]]:
        try:
            items = await fn(prepared_content)
            logger.info("Agent %s: extracted %d items", name, len(items))
            return name, items
        except Exception as exc:
            logger.error("Agent %s failed: %s", name, exc)
            return name, []

    pairs = await asyncio.gather(*[run_agent(n, f) for n, f in valid_agents])
    results = dict(pairs)
    return results
