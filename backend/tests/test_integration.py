import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MVP_PROJECT_ID = "2e8d2de5-4363-4810-ab8c-ce053a14101f"
MVP_USER_ID = "123e4567-e89b-12d3-a456-426614174000"


# ── TEST 1: Supabase connectivity ──
async def test_supabase_connection():
    try:
        from utils.supabase_client import get_client
        client = get_client()
        response = client.table("projects").select("id").limit(1).execute()
        assert response.data is not None
        print("PASS - Supabase connected")
    except Exception as e:
        print(f"FAIL - test_supabase_connection: {e}")
        raise


# ── TEST 2: Embedding generation ──
async def test_embedding_generation():
    try:
        from utils.embeddings import generate_embedding
        embedding = await generate_embedding("test query for auth patterns")
        assert embedding is not None
        assert len(embedding) == 1536
        print("PASS - Embedding generated (1536 dims)")
    except Exception as e:
        print(f"FAIL - test_embedding_generation: {e}")
        raise


# ── TEST 3: Intent classification ──
async def test_intent_classification():
    try:
        from orchestrator.intent_classifier import classify_intent
        intent = await classify_intent("what auth patterns should I use?")
        assert intent.category in ["auth", "security"]
        assert intent.confidence > 0.5
        print(f"PASS - Intent: type={intent.query_type} category={intent.category}")
    except Exception as e:
        print(f"FAIL - test_intent_classification: {e}")
        raise


# ── TEST 4: Storage 1 query ──
async def test_storage1_query():
    try:
        from orchestrator.storage1_query import query_storage1
        from orchestrator.intent_classifier import classify_intent
        intent = await classify_intent("how should I handle API errors?")
        results = await query_storage1(intent)
        assert isinstance(results, list)
        print(f"PASS - Storage1 returned {len(results)} chunks")
    except Exception as e:
        print(f"FAIL - test_storage1_query: {e}")
        raise


# ── TEST 5: Storage 2 query ──
async def test_storage2_query():
    try:
        from orchestrator.storage2_query import query_storage2
        from orchestrator.intent_classifier import classify_intent
        intent = await classify_intent("how should I handle API errors?")
        results = await query_storage2(intent)
        assert isinstance(results, list)
        assert len(results) > 0
        assert all("content" in r for r in results)
        print(f"PASS - Storage2 returned {len(results)} principles")
    except Exception as e:
        print(f"FAIL - test_storage2_query: {e}")
        raise


# ── TEST 6: Full orchestrator ──
async def test_orchestrator_full():
    try:
        from orchestrator.orchestrator import orchestrate_query
        result = await orchestrate_query(
            query="what auth patterns should I use?",
            project_id=MVP_PROJECT_ID,
        )
        assert "principles" in result
        assert "meta" in result
        assert result["meta"]["storage2_count"] > 0
        print(
            f"PASS - Orchestrator: {result['meta']['storage2_count']} principles, "
            f"{result['meta']['storage1_count']} chunks"
        )
    except Exception as e:
        print(f"FAIL - test_orchestrator_full: {e}")
        raise


# ── TEST 7: MCP tool - contextflow_query ──
async def test_mcp_query_tool():
    try:
        from mcp_server.tools import handle_query
        result = await handle_query({
            "query": "how should I handle API errors?",
            "project_id": MVP_PROJECT_ID,
        })
        assert result["success"] is True
        assert len(result["data"]["principles"]) > 0
        print(f"PASS - MCP query tool: {len(result['data']['principles'])} principles returned")
    except Exception as e:
        print(f"FAIL - test_mcp_query_tool: {e}")
        raise


# ── TEST 8: MCP tool - contextflow_list_projects ──
async def test_mcp_list_projects():
    try:
        from mcp_server.tools import handle_list_projects
        result = await handle_list_projects({})
        assert result["success"] is True
        projects = result["data"]["projects"]
        assert len(projects) > 0
        project_names = [p["name"] for p in projects]
        assert "ContextFlow" in project_names
        print(f"PASS - List projects: {project_names}")
    except Exception as e:
        print(f"FAIL - test_mcp_list_projects: {e}")
        raise


# ── TEST 9: MCP tool - contextflow_get_principles ──
async def test_mcp_get_principles():
    try:
        from mcp_server.tools import handle_get_principles
        result = await handle_get_principles({"limit": 10})
        assert result["success"] is True
        principles = result["data"]["principles"]
        assert len(principles) > 0
        assert all("content" in p for p in principles)
        user_derived = [p for p in principles if p.get("source") == "user_derived"]
        print(
            f"PASS - Get principles: {len(principles)} total, "
            f"{len(user_derived)} user_derived"
        )
    except Exception as e:
        print(f"FAIL - test_mcp_get_principles: {e}")
        raise


# ── TEST 10: File processing pipeline ──
async def test_file_processing():
    try:
        from file_processing.extractor import extract_text_from_bytes
        from file_processing.chunker import chunk_text

        content = b"# Test\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        text = await extract_text_from_bytes(content, "test.md", "md")
        assert text is not None
        assert "First paragraph" in text

        chunks = chunk_text(text, chunk_size=500, overlap=50)
        assert len(chunks) >= 1
        assert all(c["chunk_type"] in ["header", "paragraph", "code", "list"] for c in chunks)
        print(f"PASS - File processing: extracted {len(text)} chars, {len(chunks)} chunks")
    except Exception as e:
        print(f"FAIL - test_file_processing: {e}")
        raise


if __name__ == "__main__":
    import asyncio

    tests = [
        test_supabase_connection,
        test_embedding_generation,
        test_intent_classification,
        test_storage1_query,
        test_storage2_query,
        test_orchestrator_full,
        test_mcp_query_tool,
        test_mcp_list_projects,
        test_mcp_get_principles,
        test_file_processing,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            asyncio.run(test())
            passed += 1
        except Exception as e:
            print(f"FAIL - {test.__name__}: {e}")
            failed += 1

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*40}")
