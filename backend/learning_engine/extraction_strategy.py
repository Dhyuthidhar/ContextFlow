from __future__ import annotations

import asyncio
import json
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from learning_engine.together_client import call_model_n_times, ALL_MODELS

logger = logging.getLogger("contextflow")


def parse_json_response(response: Optional[str]) -> Optional[list[dict]]:
    try:
        if response is None:
            return None
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return [result]
        if isinstance(result, list):
            return result
        return None
    except Exception as exc:
        logger.error("parse_json_response failed: %s", exc)
        return None


def vote_on_extractions(extractions: list[Optional[list[dict]]]) -> list[dict]:
    try:
        valid = [e for e in extractions if e is not None]
        if not valid:
            return []
        return max(valid, key=lambda x: len(x))
    except Exception as exc:
        logger.error("vote_on_extractions failed: %s", exc)
        return []


def merge_model_results(results_per_model: dict[str, list[dict]]) -> list[dict]:
    try:
        all_items: list[dict] = []
        seen_prefixes: set[str] = set()

        for model_name, items in results_per_model.items():
            for item in items:
                content = item.get("content", item.get("principle", str(item)))
                prefix = content[:50].lower().strip()
                if prefix not in seen_prefixes:
                    seen_prefixes.add(prefix)
                    item["extracted_by"] = model_name
                    all_items.append(item)

        return all_items
    except Exception as exc:
        logger.error("merge_model_results failed: %s", exc)
        return []


async def extract_with_3x3(
    content: str,
    system_prompt: str,
    user_prompt_template: str,
    models: Optional[list[str]] = None,
    runs_per_model: int = 1,
) -> list[dict]:
    try:
        if models is None:
            models = ALL_MODELS

        user_prompt = user_prompt_template.format(content=content)

        async def run_model(model: str) -> tuple[str, list[dict]]:
            raw_results = await call_model_n_times(
                model=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                n=runs_per_model,
                temperature=0.4,
            )
            parsed = [parse_json_response(r) for r in raw_results]
            best = vote_on_extractions(parsed)
            logger.info("3x3: %s extracted %d items", model.split("/")[-1], len(best))
            return model, best

        pairs = await asyncio.gather(*[run_model(m) for m in models])
        results_per_model: dict[str, list[dict]] = dict(pairs)

        final = merge_model_results(results_per_model)
        logger.info("3x3: final merged result = %d unique items", len(final))
        return final
    except Exception as exc:
        logger.error("extract_with_3x3 failed: %s", exc)
        return []
