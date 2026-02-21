from __future__ import annotations

import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("contextflow")

_FILENAME_PATTERNS: list[tuple[list[str], str]] = [
    (["prd", "product_req", "requirements"], "prd"),
    (["brd", "business_req"], "brd"),
    (["arch", "architecture", "technical", "design"], "technical"),
    (["chat", "conversation", "history"], "chat"),
]

_CHAT_INDICATORS = ["user:", "assistant:", "claude:", "human:", "error:", "traceback", "fixed by"]
_TECH_INDICATORS = ["def ", "class ", "import ", "function", "database", "api endpoint", "implementation"]
_PRD_INDICATORS = ["user story", "acceptance criteria", "requirements", "as a user", "feature"]

_AGENT_ROUTING: dict[str, list[str]] = {
    "prd": ["decision_analyzer"],
    "brd": ["decision_analyzer"],
    "technical": ["pattern_extractor", "decision_analyzer", "lesson_synthesizer"],
    "chat": ["chat_analyzer", "lesson_synthesizer"],
    "general": ["pattern_extractor", "decision_analyzer", "lesson_synthesizer"],
}


def detect_document_type(filename: str, content: str) -> str:
    filename_lower = filename.lower()
    for keywords, doc_type in _FILENAME_PATTERNS:
        if any(kw in filename_lower for kw in keywords):
            logger.info("detect_document_type: filename match → %s", doc_type)
            return doc_type

    sample = content[:1500].lower()

    chat_hits = sum(1 for indicator in _CHAT_INDICATORS if indicator in sample)
    if chat_hits >= 3:
        logger.info("detect_document_type: content match chat (%d indicators)", chat_hits)
        return "chat"

    tech_hits = sum(1 for indicator in _TECH_INDICATORS if indicator in sample)
    if tech_hits >= 3:
        logger.info("detect_document_type: content match technical (%d indicators)", tech_hits)
        return "technical"

    prd_hits = sum(1 for indicator in _PRD_INDICATORS if indicator in sample)
    if prd_hits >= 2:
        logger.info("detect_document_type: content match prd (%d indicators)", prd_hits)
        return "prd"

    logger.info("detect_document_type: no match → general")
    return "general"


def get_agents_for_doc_type(doc_type: str) -> list[str]:
    agents = _AGENT_ROUTING.get(doc_type, _AGENT_ROUTING["general"])
    logger.info("get_agents_for_doc_type: doc_type=%s agents=%s", doc_type, agents)
    return agents


def prepare_content_for_agent(content: str, max_chars: int = 8000) -> str:
    if len(content) <= max_chars:
        return content
    return content[:6000] + "\n...[truncated]...\n" + content[-2000:]
