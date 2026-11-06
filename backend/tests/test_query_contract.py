from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path
from types import SimpleNamespace

from mcp_server import tools


def test_mcp_query_forwards_scope_and_limit(monkeypatch) -> None:
    calls: list[dict] = []
    module = types.ModuleType("orchestrator.orchestrator")

    async def orchestrate_query(**kwargs):
        calls.append(kwargs)
        return {"chunks": [], "principles": [], "meta": {}}

    module.orchestrate_query = orchestrate_query
    monkeypatch.setitem(sys.modules, "orchestrator.orchestrator", module)

    result = asyncio.run(tools.handle_query({
        "query": "What is approved?",
        "project_id": "project-a",
        "category": "backend",
        "limit": 4,
    }))

    assert result["success"] is True
    assert calls == [{
        "query": "What is approved?",
        "project_id": "project-a",
        "category_hint": "backend",
        "limit": 4,
    }]


def test_storage_query_passes_project_scope_to_database_rpc(monkeypatch) -> None:
    from orchestrator import storage1_query

    rpc_calls: list[tuple[str, dict]] = []

    async def fake_embedding(text: str):
        assert text == "backend decision decision"
        return [0.1, 0.2]

    class FakeRPC:
        def execute(self):
            return SimpleNamespace(data=[{
                "id": "chunk-1",
                "content": "Scoped evidence",
                "project_id": "project-a",
                "similarity": 0.91,
            }])

    class FakeClient:
        def rpc(self, name: str, params: dict):
            rpc_calls.append((name, params))
            return FakeRPC()

    monkeypatch.setattr(storage1_query, "generate_embedding", fake_embedding)
    monkeypatch.setattr(storage1_query, "get_client", lambda: FakeClient())
    intent = SimpleNamespace(category="backend", query_type="decision", project_id="project-a")

    result = asyncio.run(storage1_query.query_storage1(intent, limit=7))

    assert result[0]["project_id"] == "project-a"
    assert rpc_calls[0][0] == "search_document_chunks"
    assert rpc_calls[0][1]["user_id_filter"] == storage1_query.MVP_USER_ID
    assert rpc_calls[0][1]["project_id_filter"] == "project-a"
    assert rpc_calls[0][1]["match_count"] == 7


def test_vector_search_sql_enforces_user_and_project_scope() -> None:
    migration = Path(__file__).resolve().parents[2] / "supabase/migrations/005_vector_search_functions.sql"
    sql = migration.read_text()
    assert "AND p.user_id = user_id_filter" in sql
    assert "AND (project_id_filter IS NULL OR p.id = project_id_filter)" in sql
