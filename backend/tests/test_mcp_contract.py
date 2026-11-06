from __future__ import annotations

import asyncio
import json

from mcp_server import server


def run(coro):
    return asyncio.run(coro)


def test_initialize_and_tool_registry_are_stable() -> None:
    initialized = run(server.handle_request({"jsonrpc": "2.0", "id": 1, "method": "initialize"}))
    assert initialized["result"]["protocolVersion"] == "2024-11-05"
    assert initialized["result"]["serverInfo"]["name"] == "contextflow"

    listed = run(server.handle_request({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}))
    tools = {tool["name"]: tool for tool in listed["result"]["tools"]}
    assert set(tools) == {
        "contextflow_query",
        "contextflow_create_project",
        "contextflow_upload_document",
        "contextflow_analyze_project",
        "contextflow_list_projects",
        "contextflow_get_principles",
    }
    assert "doc_category" in tools["contextflow_upload_document"]["inputSchema"]["required"]
    assert tools["contextflow_analyze_project"]["inputSchema"]["properties"]["batch_size"]["minimum"] == 1


def test_tools_call_reports_missing_required_argument_without_loading_services() -> None:
    response = run(server.handle_request({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": "contextflow_query", "arguments": {}},
    }))
    payload = json.loads(response["result"]["content"][0]["text"])
    assert payload == {"error": "Missing required arguments: query", "success": False}


def test_unknown_tool_is_a_structured_failure() -> None:
    result = run(server.dispatch("contextflow_unknown", {}))
    assert result == {"error": "Unknown tool: contextflow_unknown", "success": False}
