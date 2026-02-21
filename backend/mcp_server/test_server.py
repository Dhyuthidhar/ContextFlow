from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server.server import dispatch, TOOLS


def _pass(label: str, detail: str = "") -> None:
    msg = f"PASS  {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)


def _fail(label: str, detail: str = "") -> None:
    msg = f"FAIL  {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)


async def test_tools_list() -> bool:
    label = "tools/list → 6 tools returned"
    try:
        tools = list(TOOLS.keys())
        expected = {
            "contextflow_query",
            "contextflow_create_project",
            "contextflow_upload_document",
            "contextflow_analyze_project",
            "contextflow_list_projects",
            "contextflow_get_principles",
        }
        if set(tools) == expected and len(tools) == 6:
            _pass(label, f"tools={tools}")
            return True
        _fail(label, f"got {tools}")
        return False
    except Exception as exc:
        _fail(label, str(exc))
        return False


async def test_list_projects() -> bool:
    label = "contextflow_list_projects → success"
    try:
        result = await dispatch("contextflow_list_projects", {})
        if result.get("success") is True and "data" in result:
            data = result["data"]
            _pass(label, f"total={data.get('total', '?')} projects")
            return True
        _fail(label, str(result))
        return False
    except Exception as exc:
        _fail(label, str(exc))
        return False


async def test_get_principles() -> bool:
    label = "contextflow_get_principles limit=5 → success"
    try:
        result = await dispatch("contextflow_get_principles", {"limit": 5})
        if result.get("success") is True and "data" in result:
            data = result["data"]
            principles = data.get("principles", [])
            _pass(label, f"returned {len(principles)} principles")
            return True
        _fail(label, str(result))
        return False
    except Exception as exc:
        _fail(label, str(exc))
        return False


async def run_tests() -> None:
    print("=" * 50)
    print("ContextFlow MCP Dispatcher Tests")
    print("=" * 50)

    results = await asyncio.gather(
        test_tools_list(),
        test_list_projects(),
        test_get_principles(),
    )

    passed = sum(results)
    total = len(results)
    print("=" * 50)
    if passed == total:
        print(f"All {total} tests passed")
    else:
        print(f"{passed}/{total} tests passed — {total - passed} failed")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(run_tests())
