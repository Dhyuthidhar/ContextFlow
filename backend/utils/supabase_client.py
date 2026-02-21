from __future__ import annotations
from typing import Optional
from supabase import create_client, Client
from utils.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


async def get_projects(user_id: str) -> list[dict]:
    client = get_client()
    response = client.table("projects").select("*").eq("user_id", user_id).execute()
    return response.data


async def get_project_by_id(project_id: str) -> Optional[dict]:
    client = get_client()
    response = client.table("projects").select("*").eq("id", project_id).execute()
    return response.data[0] if response.data else None


async def create_project(user_id: str, data: dict) -> dict:
    client = get_client()
    payload = {**data, "user_id": user_id}
    response = client.table("projects").insert(payload).execute()
    return response.data[0]


async def get_documents(project_id: str) -> list[dict]:
    client = get_client()
    response = client.table("documents").select("*").eq("project_id", project_id).execute()
    return response.data


async def create_document(data: dict) -> dict:
    client = get_client()
    response = client.table("documents").insert(data).execute()
    return response.data[0]


async def update_document_analyzed(doc_id: str, analyzed: bool) -> None:
    client = get_client()
    from datetime import datetime, timezone
    payload: dict = {"analyzed": analyzed}
    if analyzed:
        payload["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    client.table("documents").update(payload).eq("id", doc_id).execute()


async def get_principles(
    category: Optional[str],
    source: Optional[str],
    limit: int = 20,
) -> list[dict]:
    client = get_client()
    query = client.table("principles").select("*")
    if category is not None:
        query = query.eq("category", category)
    if source is not None:
        query = query.eq("source", source)
    response = query.limit(limit).execute()
    return response.data


async def create_principle(data: dict) -> dict:
    client = get_client()
    response = client.table("principles").insert(data).execute()
    return response.data[0]


async def update_principle_confidence(
    principle_id: str,
    score: float,
    times_applied: int,
    times_failed: int,
) -> None:
    client = get_client()
    from datetime import datetime, timezone
    client.table("principles").update({
        "confidence_score": score,
        "times_applied": times_applied,
        "times_failed": times_failed,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", principle_id).execute()


async def create_analysis_job(document_id: str) -> dict:
    client = get_client()
    response = client.table("analysis_jobs").insert({
        "document_id": document_id,
        "status": "pending",
    }).execute()
    return response.data[0]


async def update_analysis_job(
    job_id: str,
    status: str,
    principals_created: int = 0,
    error: Optional[str] = None,
) -> None:
    client = get_client()
    from datetime import datetime, timezone
    payload: dict = {"status": status, "principles_created": principals_created}
    if status == "running":
        payload["started_at"] = datetime.now(timezone.utc).isoformat()
    if status in ("completed", "failed"):
        payload["completed_at"] = datetime.now(timezone.utc).isoformat()
    if error is not None:
        payload["error_message"] = error
    client.table("analysis_jobs").update(payload).eq("id", job_id).execute()
