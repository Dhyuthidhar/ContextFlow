from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force unbuffered stdout — critical for MCP stdio transport
sys.stdout.reconfigure(line_buffering=True)

import asyncio
import json
import logging
from typing import Any, Optional

from utils.config import LOG_LEVEL
from mcp_server.tools import (
    handle_query,
    handle_create_project,
    handle_upload_document,
    handle_analyze_project,
    handle_list_projects,
    handle_get_principles,
)

# Logging — stderr only
_handler = logging.StreamHandler(sys.stderr)
_handler.setFormatter(logging.Formatter("[CONTEXTFLOW] %(levelname)s %(message)s"))
logger = logging.getLogger("contextflow")
logger.addHandler(_handler)
logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
logger.propagate = False

# Tool registry
TOOLS: dict[str, dict[str, Any]] = {
    "contextflow_query": {
        "handler": handle_query,
        "schema": {
            "name": "contextflow_query",
            "description": "Query ContextFlow for engineering context, patterns and principles relevant to your current task",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Your question about engineering patterns, decisions, or project context",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Optional: specific project UUID to scope the query",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional: hint the category - auth, payment, api, database, frontend, backend, security, deployment, testing, performance",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return (default 10)",
                    },
                },
                "required": ["query"],
            },
        },
    },
    "contextflow_create_project": {
        "handler": handle_create_project,
        "schema": {
            "name": "contextflow_create_project",
            "description": "Create a new project in ContextFlow",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Project name",
                    },
                    "description": {
                        "type": "string",
                        "description": "Project description",
                    },
                    "project_type": {
                        "type": "string",
                        "enum": ["web_app", "mobile", "saas", "api", "library", "other"],
                        "description": "Type of project",
                    },
                    "tech_stack": {
                        "type": "string",
                        "description": "Technologies used in the project",
                    },
                },
                "required": ["name"],
            },
        },
    },
    "contextflow_upload_document": {
        "handler": handle_upload_document,
        "schema": {
            "name": "contextflow_upload_document",
            "description": "Upload a document to a project for analysis",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "ID of the project to upload to",
                    },
                    "filename": {
                        "type": "string",
                        "description": "Name of the file",
                    },
                    "content": {
                        "type": "string",
                        "description": "Text content of the document",
                    },
                    "file_type": {
                        "type": "string",
                        "enum": ["pdf", "md", "txt"],
                        "description": "File type",
                    },
                    "doc_category": {
                        "type": "string",
                        "enum": ["prd", "brd", "architecture", "chat", "other"],
                        "description": "Document category",
                    },
                },
                "required": ["project_id", "filename", "content", "file_type"],
            },
        },
    },
    "contextflow_analyze_project": {
        "handler": handle_analyze_project,
        "schema": {
            "name": "contextflow_analyze_project",
            "description": "Trigger the learning engine to analyze all unprocessed documents in a project",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "ID of the project to analyze",
                    },
                },
                "required": ["project_id"],
            },
        },
    },
    "contextflow_list_projects": {
        "handler": handle_list_projects,
        "schema": {
            "name": "contextflow_list_projects",
            "description": "List all projects in ContextFlow",
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    "contextflow_get_principles": {
        "handler": handle_get_principles,
        "schema": {
            "name": "contextflow_get_principles",
            "description": "Get engineering principles from Storage 2, optionally filtered by category",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional category filter (e.g. auth, payment, api, database, frontend, security, deployment, error_handling, testing, performance)",
                    },
                    "source": {
                        "type": "string",
                        "enum": ["generic", "user_derived"],
                        "description": "Optional source filter",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of principles to return (default 20)",
                    },
                },
                "required": [],
            },
        },
    },
}


async def dispatch(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    if tool_name not in TOOLS:
        return {"error": f"Unknown tool: {tool_name}", "success": False}

    entry = TOOLS[tool_name]
    schema = entry["schema"]["inputSchema"]
    required = schema.get("required", [])

    missing = [field for field in required if field not in arguments]
    if missing:
        return {"error": f"Missing required arguments: {', '.join(missing)}", "success": False}

    try:
        result = await entry["handler"](arguments)
        return result
    except Exception as exc:
        logger.error("Tool %s raised exception: %s", tool_name, exc)
        return {"error": str(exc), "success": False}


def _make_response(request_id: Optional[Any], result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def _make_error(request_id: Optional[Any], code: int, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": code, "message": message},
    }


async def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params") or {}

    logger.info("→ %s id=%s", method, request_id)

    if method == "initialize":
        return _make_response(request_id, {
            "protocolVersion": "2024-11-05",
            "serverInfo": {"name": "contextflow", "version": "1.0.0"},
            "capabilities": {"tools": {}},
        })

    if method == "tools/list":
        tools_list = [entry["schema"] for entry in TOOLS.values()]
        return _make_response(request_id, {"tools": tools_list})

    if method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments") or {}
        result = await dispatch(tool_name, arguments)
        return _make_response(request_id, {
            "content": [{"type": "text", "text": json.dumps(result, indent=2)}],
        })

    return _make_error(request_id, -32601, f"Method not found: {method}")


async def main() -> None:
    logger.info("ContextFlow MCP server starting (stdio)")

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                logger.info("stdin closed — shutting down")
                break

            raw = line.strip()
            if not raw:
                continue

            logger.debug("RAW IN: %s", raw)

            try:
                request = json.loads(raw)
            except json.JSONDecodeError as exc:
                response = _make_error(None, -32700, f"Parse error: {exc}")
                _write(response)
                continue

            response = await handle_request(request)
            _write(response)

        except Exception as exc:
            logger.error("Unhandled error in main loop: %s", exc)


def _write(response: dict[str, Any]) -> None:
    line = json.dumps(response, separators=(",", ":"))
    logger.debug("RAW OUT: %s", line)
    print(line, flush=True)


if __name__ == "__main__":
    asyncio.run(main())
