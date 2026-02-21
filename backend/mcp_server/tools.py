from __future__ import annotations

import logging
import sys
from typing import Any

from utils.config import MVP_USER_ID
from utils.supabase_client import (
    get_client,
    get_projects,
    create_project,
    get_documents,
    create_document,
    get_principles,
    create_analysis_job,
)

logger = logging.getLogger("contextflow")

_VALID_DOC_CATEGORIES = {"prd", "brd", "architecture", "chat", "other"}
_VALID_FILE_TYPES = {"pdf", "md", "txt"}


def _infer_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext if ext in _VALID_FILE_TYPES else "txt"


async def handle_create_project(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        name = arguments.get("name", "").strip()
        if not name:
            return {"success": False, "error": "Argument 'name' must be a non-empty string"}

        data: dict[str, Any] = {"name": name}
        if "description" in arguments:
            data["description"] = arguments["description"]
        if "project_type" in arguments:
            data["project_type"] = arguments["project_type"]
        if "tech_stack" in arguments:
            data["tech_stack"] = arguments["tech_stack"]
        data["status"] = arguments.get("status", "active")

        project = await create_project(MVP_USER_ID, data)
        return {
            "success": True,
            "data": {
                "project_id": project["id"],
                "name": project["name"],
                "status": project["status"],
                "created_at": project.get("created_at", ""),
            },
        }
    except Exception as exc:
        logger.error("handle_create_project error: %s", exc)
        return {"success": False, "error": str(exc)}


async def handle_upload_document(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        project_id = arguments.get("project_id", "").strip()
        filename = arguments.get("filename", "").strip()
        content = arguments.get("content", "")
        doc_category = arguments.get("doc_category", "other")

        if not project_id:
            return {"success": False, "error": "Argument 'project_id' must be non-empty"}
        if not filename:
            return {"success": False, "error": "Argument 'filename' must be non-empty"}
        if not content:
            return {"success": False, "error": "Argument 'content' must be non-empty"}
        if doc_category not in _VALID_DOC_CATEGORIES:
            return {"success": False, "error": f"'doc_category' must be one of {sorted(_VALID_DOC_CATEGORIES)}"}

        file_type = arguments.get("file_type") or _infer_file_type(filename)
        if file_type not in _VALID_FILE_TYPES:
            file_type = "txt"

        storage_path = f"{project_id}/{filename}"
        content_bytes = content.encode("utf-8")

        client = get_client()
        client.storage.from_("documents").upload(
            path=storage_path,
            file=content_bytes,
            file_options={"content-type": "text/plain"},
        )

        doc_data: dict[str, Any] = {
            "project_id": project_id,
            "filename": filename,
            "file_type": file_type,
            "doc_category": doc_category,
            "storage_path": storage_path,
            "file_size": len(content_bytes),
            "analyzed": False,
        }
        document = await create_document(doc_data)

        return {
            "success": True,
            "data": {
                "document_id": document["id"],
                "filename": document["filename"],
                "storage_path": document["storage_path"],
            },
        }
    except Exception as exc:
        logger.error("handle_upload_document error: %s", exc)
        return {"success": False, "error": str(exc)}


async def handle_analyze_project(arguments: dict[str, Any]) -> dict[str, Any]:
    from learning_engine.engine import run_learning_engine

    try:
        project_id = arguments.get("project_id", "").strip()
        if not project_id:
            return {"success": False, "error": "project_id is required"}

        client = get_client()
        unanalyzed = (
            client.table("documents")
            .select("id")
            .eq("project_id", project_id)
            .eq("analyzed", False)
            .execute()
        )

        if not unanalyzed.data:
            return {
                "success": True,
                "data": {"message": "No unanalyzed documents found", "count": 0},
            }

        for doc in unanalyzed.data:
            await create_analysis_job(doc["id"])

        result = await run_learning_engine(project_id=project_id)

        return {"success": True, "data": result}
    except Exception as exc:
        logger.error("handle_analyze_project error: %s", exc)
        return {"success": False, "error": str(exc)}


async def handle_list_projects(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        status_filter = arguments.get("status")
        projects = await get_projects(MVP_USER_ID)

        if status_filter:
            projects = [p for p in projects if p.get("status") == status_filter]

        client = get_client()
        enriched: list[dict[str, Any]] = []
        for project in projects:
            pid = project["id"]

            doc_resp = client.table("documents").select("id", count="exact").eq("project_id", pid).execute()
            doc_count = doc_resp.count if doc_resp.count is not None else len(doc_resp.data)

            pat_resp = client.table("patterns").select("id", count="exact").eq("project_id", pid).execute()
            pat_count = pat_resp.count if pat_resp.count is not None else len(pat_resp.data)

            enriched.append({
                "id": pid,
                "name": project.get("name"),
                "description": project.get("description"),
                "project_type": project.get("project_type"),
                "status": project.get("status"),
                "tech_stack": project.get("tech_stack"),
                "created_at": project.get("created_at"),
                "document_count": doc_count,
                "pattern_count": pat_count,
            })

        return {"success": True, "data": {"projects": enriched, "total": len(enriched)}}
    except Exception as exc:
        logger.error("handle_list_projects error: %s", exc)
        return {"success": False, "error": str(exc)}


async def handle_get_principles(arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        category = arguments.get("category") or None
        source = arguments.get("source") or None
        min_confidence = float(arguments.get("min_confidence", 0.0))
        limit = int(arguments.get("limit", 20))

        principles = await get_principles(category, source, limit)

        if min_confidence > 0.0:
            principles = [
                p for p in principles
                if float(p.get("confidence_score", 0.0)) >= min_confidence
            ]

        principles.sort(key=lambda p: float(p.get("confidence_score", 0.0)), reverse=True)

        result = [
            {
                "id": p.get("id"),
                "content": p.get("content"),
                "type": p.get("type"),
                "category": p.get("category"),
                "source": p.get("source"),
                "confidence_score": p.get("confidence_score"),
                "times_applied": p.get("times_applied"),
                "when_to_use": p.get("when_to_use"),
                "when_not_to_use": p.get("when_not_to_use"),
            }
            for p in principles
        ]

        return {"success": True, "data": {"principles": result, "total": len(result)}}
    except Exception as exc:
        logger.error("handle_get_principles error: %s", exc)
        return {"success": False, "error": str(exc)}


async def handle_query(arguments: dict[str, Any]) -> dict[str, Any]:
    from orchestrator.orchestrator import orchestrate_query

    query = arguments.get("query", "").strip()
    if not query:
        return {"success": False, "error": "query argument is required and cannot be empty"}

    project_id = arguments.get("project_id") or None
    category = arguments.get("category") or None
    limit = int(arguments.get("limit", 10))

    result = await orchestrate_query(
        query=query,
        project_id=project_id,
        category_hint=category,
        limit=limit,
    )

    if result.get("error"):
        return {"success": False, "error": result["error"]}

    return {"success": True, "data": result}
