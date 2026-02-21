from __future__ import annotations

import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from utils.supabase_client import (
    get_client,
    create_analysis_job,
    update_document_analyzed,
    update_analysis_job,
)
from learning_engine.document_router import detect_document_type
from learning_engine.agents import run_agents_for_document
from learning_engine.synthesizer import synthesize_and_store

logger = logging.getLogger("contextflow")


async def fetch_document_content(storage_path: str) -> Optional[str]:
    try:
        client = get_client()
        response = client.storage.from_("documents").download(storage_path)
        return response.decode("utf-8", errors="replace")
    except Exception as exc:
        logger.error("Failed to download %s: %s", storage_path, exc)
        return None


async def process_document(document: dict, job_id: str) -> dict:
    doc_id = document["id"]
    filename = document.get("filename", "")
    storage_path = document.get("storage_path", "")
    project_id = document.get("project_id", "")
    doc_category = document.get("doc_category") or None

    try:
        await update_analysis_job(job_id, status="running")
        logger.info("process_document: starting %s (job=%s)", filename, job_id)

        content = await fetch_document_content(storage_path)
        if content is None:
            await update_analysis_job(job_id, status="failed", error="Failed to download document content")
            return {"job_id": job_id, "status": "failed", "error": "Failed to download content"}

        if doc_category and doc_category in ("prd", "brd", "architecture", "chat", "other"):
            doc_type_map = {"architecture": "technical", "other": "general"}
            doc_type = doc_type_map.get(doc_category, doc_category)
        else:
            doc_type = detect_document_type(filename, content)

        logger.info("process_document: doc_type=%s for %s", doc_type, filename)

        extractions = await run_agents_for_document(content, doc_type, filename)

        summary = await synthesize_and_store(extractions, doc_type, project_id)

        await update_document_analyzed(doc_id, True)
        await update_analysis_job(
            job_id,
            status="completed",
            principals_created=summary["created"] + summary["updated"],
        )

        logger.info(
            "process_document: completed %s — created=%d updated=%d failed=%d",
            filename, summary["created"], summary["updated"], summary["failed"],
        )
        return {
            "job_id": job_id,
            "document_id": doc_id,
            "filename": filename,
            "doc_type": doc_type,
            "status": "completed",
            **summary,
        }

    except Exception as exc:
        logger.error("process_document failed for %s: %s", filename, exc)
        try:
            await update_analysis_job(job_id, status="failed", error=str(exc))
        except Exception:
            pass
        return {"job_id": job_id, "status": "failed", "error": str(exc)}


async def run_learning_engine(project_id: Optional[str] = None) -> dict:
    try:
        client = get_client()

        query = client.table("analysis_jobs").select(
            "id, document_id, status"
        ).eq("status", "pending")

        if project_id:
            pending_response = query.execute()
            pending_jobs = [
                j for j in (pending_response.data or [])
            ]
            doc_ids = [j["document_id"] for j in pending_jobs]
            if doc_ids:
                docs_resp = client.table("documents").select("id, project_id").in_("id", doc_ids).execute()
                project_doc_ids = {
                    d["id"] for d in (docs_resp.data or [])
                    if d.get("project_id") == project_id
                }
                pending_jobs = [j for j in pending_jobs if j["document_id"] in project_doc_ids]
        else:
            pending_response = query.execute()
            pending_jobs = pending_response.data or []

        if not pending_jobs:
            logger.info("run_learning_engine: no pending jobs")
            return {"message": "No pending jobs", "processed": 0}

        logger.info("run_learning_engine: processing %d jobs", len(pending_jobs))

        total_created = 0
        total_updated = 0
        total_failed = 0
        job_results: list[dict] = []

        for job in pending_jobs:
            job_id = job["id"]
            document_id = job["document_id"]

            doc_resp = client.table("documents").select("*").eq("id", document_id).execute()
            if not doc_resp.data:
                logger.warning("run_learning_engine: document %s not found for job %s", document_id, job_id)
                continue

            document = doc_resp.data[0]
            result = await process_document(document, job_id)
            job_results.append(result)

            if result.get("status") == "completed":
                total_created += result.get("created", 0)
                total_updated += result.get("updated", 0)
                total_failed += result.get("failed", 0)

        return {
            "processed": len(job_results),
            "total_created": total_created,
            "total_updated": total_updated,
            "total_failed": total_failed,
            "job_results": job_results,
        }

    except Exception as exc:
        logger.error("run_learning_engine failed: %s", exc)
        return {"error": str(exc), "processed": 0}
