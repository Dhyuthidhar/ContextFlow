from __future__ import annotations

import asyncio
import sys
import types

import cf


def test_cli_query_forwards_project_scope_and_limit(monkeypatch, capsys) -> None:
    calls: list[dict] = []
    module = types.ModuleType("orchestrator.orchestrator")

    async def orchestrate_query(**kwargs):
        calls.append(kwargs)
        return {
            "project_context": [],
            "principles": [],
            "related_context": {},
            "meta": {},
        }

    module.orchestrate_query = orchestrate_query
    monkeypatch.setitem(sys.modules, "orchestrator.orchestrator", module)

    asyncio.run(cf._run("What is approved?", "project-a", "Project A", 6))

    assert calls == [{
        "query": "What is approved?",
        "project_id": "project-a",
        "category_hint": None,
        "limit": 6,
    }]
    assert "Project: Project A" in capsys.readouterr().out
