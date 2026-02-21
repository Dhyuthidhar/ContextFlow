import asyncio
import logging
from openai import AsyncOpenAI
from utils.config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

_MODEL = "text-embedding-3-small"
_MAX_CHARS = 8000
_BATCH_SIZE = 20
_BATCH_DELAY = 0.1


async def generate_embedding(text: str) -> list[float]:
    truncated = text[:_MAX_CHARS]
    try:
        response = await _client.embeddings.create(model=_MODEL, input=truncated)
        return response.data[0].embedding
    except Exception as exc:
        logger.error("Failed to generate embedding: %s", exc)
        raise


async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    results: list[list[float]] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = [t[:_MAX_CHARS] for t in texts[i : i + _BATCH_SIZE]]
        try:
            response = await _client.embeddings.create(model=_MODEL, input=batch)
            sorted_data = sorted(response.data, key=lambda d: d.index)
            results.extend(d.embedding for d in sorted_data)
        except Exception as exc:
            logger.error("Failed to generate embeddings for batch %d: %s", i // _BATCH_SIZE, exc)
            raise
        if i + _BATCH_SIZE < len(texts):
            await asyncio.sleep(_BATCH_DELAY)
    return results


async def update_principle_embeddings() -> int:
    from utils.supabase_client import get_client

    client = get_client()
    response = client.table("principles").select("id, content").is_("embedding", "null").execute()
    principles: list[dict] = response.data

    if not principles:
        return 0

    texts = [p["content"] for p in principles]
    embeddings = await generate_embeddings_batch(texts)

    updated = 0
    for principle, embedding in zip(principles, embeddings):
        try:
            client.table("principles").update({"embedding": embedding}).eq("id", principle["id"]).execute()
            updated += 1
        except Exception as exc:
            logger.error("Failed to update embedding for principle %s: %s", principle["id"], exc)

    return updated
