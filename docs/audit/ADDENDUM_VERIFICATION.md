# Addendum Verification

**Date**: 2026-04-27
**Verifier**: Claude (Opus 4.7)
**Scope**: Verify line-number and content claims in `docs/audit/CLAUDE_CODE_ACTION_PLAN_ADDENDUM.md` against the actual source.
**Mode**: Read-only. No source files modified.

---

## Step 2 — Prior documents referenced by the addendum

| File | Status |
|---|---|
| `docs/audit/AUDIT_REPORT.md` | ✅ Present (42,776 bytes) |
| `docs/audit/CRITICAL_PATH_TRACES.md` | ✅ Present (60,870 bytes) |
| `docs/audit/CLAUDE_CODE_ACTION_PLAN.md` | ❌ Missing |

The addendum tells the reader to "read this AFTER the action plan," but the action plan it amends does not exist in the repo. Gap noted; not recreated.

---

## Step 3 — Verification of the 16 silent-failure sites

Legend: ✅ claim matches; ⚠️ pattern exists nearby but the cited location is off; ❌ claim does not match the cited location.

| # | File:lines (as claimed) | Match? | Actual code at cited lines (excerpt) |
|---|---|---|---|
| 1 | `backend/mcp_server/tools.py:54-56` | ✅ | `except Exception as exc: logger.error("handle_create_project error: %s", exc); return {"success": False, "error": str(exc)}` |
| 2 | `backend/mcp_server/tools.py:116-118` | ✅ | `except Exception as exc: logger.error("handle_upload_document error: %s", exc); return {"success": False, "error": str(exc)}` |
| 3 | `backend/learning_engine/agents.py:27-29` | ❌ | Lines 27-29 sit inside the `_USER_PATTERN` prompt template string. The pattern-extractor try/except actually lives at **lines 103-105**: `except Exception as exc: logger.error("agent1_extract_patterns failed: %s", exc); return []` |
| 4 | `backend/learning_engine/agents.py:61-63` | ❌ | Lines 61-63 sit inside the `_USER_DECISION` prompt template string. The decision-analyzer try/except actually lives at **lines 115-117**: `except Exception as exc: logger.error("agent2_analyze_decisions failed: %s", exc); return []` |
| 5 | `backend/learning_engine/agents.py:95-97` | ❌ | Lines 95-97 are blank (followed by `agent1_extract_patterns` def at line 96). The lesson-synthesizer try/except actually lives at **lines 127-129**: `except Exception as exc: logger.error("agent3_synthesize_lessons failed: %s", exc); return []` |
| 6 | `backend/learning_engine/agents.py:127-129` | ❌ | Lines 127-129 are the **lesson-synthesizer** except block, not the chat analyzer. The chat-analyzer try/except actually lives at **lines 139-141**: `except Exception as exc: logger.error("agent4_analyze_chat failed: %s", exc); return []` |
| 7 | `backend/learning_engine/engine.py:82-88` | ✅ | `except Exception as exc: logger.error("process_document failed ..."); try: await update_analysis_job(job_id, status="failed", ...) except Exception: pass; return {...}` — outer catch + nested-swallow on the job-update is exactly as described |
| 8 | `backend/learning_engine/synthesizer.py:56-58` | ✅ | `except Exception as exc: logger.error("find_similar_principle failed: %s", exc); return None` |
| 9 | `backend/learning_engine/synthesizer.py:82-84` | ✅ | `except Exception as exc: logger.error("_search_similar_by_embedding failed: %s", exc); return None` |
| 10 | `backend/file_processing/chunker.py:115-117` | ✅ | `except Exception as exc: logger.error("chunk_text failed: %s", exc); return []` |
| 11 | `backend/file_processing/chunker.py:167-169` | ✅ | `except Exception as exc: logger.error("process_and_store_chunks failed for document %s: %s", document_id, exc); return 0` |
| 12 | `backend/orchestrator/intent_classifier.py:93-95` | ✅ | `except Exception as exc: logger.error("classify_intent failed: %s — using fallback", exc); return Intent(**_FALLBACK_INTENT_KWARGS)` |
| 13 | `backend/orchestrator/storage1_query.py:54-56` | ✅ | `except Exception as exc: logger.error("query_storage1 failed: %s", exc); return []` |
| 14 | `backend/orchestrator/storage2_query.py:77-79` | ✅ | `except Exception as exc: logger.error("query_storage2 failed: %s", exc); return []` |
| 15 | `backend/orchestrator/storage2_query.py:110-112` | ⚠️ | Lines 110-112 are a per-task exception handler inside an `asyncio.gather(..., return_exceptions=True)` loop: `if isinstance(result, Exception): logger.error("query_related_categories task failed: %s", result); continue`. This is a silent-failure pattern, but it is not a function-level try/except. The function-level catch for `query_related_categories` is at **lines 119-121**: `except Exception as exc: logger.error("query_related_categories failed: %s", exc); return {}` |
| 16 | `backend/orchestrator/orchestrator.py:106-108` | ✅ | `except Exception as exc: logger.error("orchestrate_query failed: %s", exc); return {"error": str(exc), "success": False, "query": query}` |

**Summary of 16 sites:** 11 ✅, 4 ❌, 1 ⚠️.

**Note on the ❌ sites (3-6):** the silent-failure pattern *does exist* in `agents.py` for all four agents (`agent1_extract_patterns`, `agent2_analyze_decisions`, `agent3_synthesize_lessons`, `agent4_analyze_chat`), just at different line numbers than the addendum cites. The line numbers appear shifted by ~76 lines, consistent with the prompt templates having been added to the top of the file after the addendum's source data was collected. The intent of the table is correct; the line citations are stale.

---

## Step 4 — Three additional claims

### Claim A: `backend/learning_engine/engine.py:136-139` contains an unbounded `asyncio.gather` over pending jobs

**Match: ✅**

Actual code at lines 136-139:

```python
raw_results = await asyncio.gather(
    *[process_single_job(j) for j in pending_jobs],
    return_exceptions=True,
)
```

No semaphore, no chunking, no concurrency cap. Every pending job is dispatched simultaneously. Confirmed.

### Claim B: In the analyze flow, `documents.analyzed` is written *before* `analysis_jobs.status`

**Match: ✅**

In `backend/learning_engine/engine.py`, inside `process_document`:

- Line 62: `await update_document_analyzed(doc_id, True)` — runs first
- Lines 63-67: `await update_analysis_job(job_id, status="completed", principals_created=...)` — runs second

The order matches the addendum's corrected description: `documents.analyzed = True` is written before the job-status update. A crash between them leaves the document marked analyzed while the job sits in `running`.

The addendum's prescription ("`documents.analyzed` should be the *last* write in a successful flow, not before the job-status write") therefore inverts the current ordering, as intended.

### Claim C: `backend/learning_engine/extraction_strategy.py:24` contains `ALL_MODELS` with a single model in the list

**Match: ❌ (file:line wrong; content claim correct, in a different file)**

Actual code at `extraction_strategy.py:24`:

```python
cleaned = cleaned.split("\n", 1)[-1]
```

This is unrelated parse-cleanup logic inside `parse_json_response`. `ALL_MODELS` is **not defined** in `extraction_strategy.py` — it is only *imported* at line 12 (`from learning_engine.together_client import call_model_n_times, ALL_MODELS`) and *used* at line 78 (`models = ALL_MODELS`).

`ALL_MODELS` is **defined** in `backend/learning_engine/together_client.py:24`:

```python
MODEL_DEEPSEEK = "deepseek-ai/DeepSeek-V3"
MODEL_LLAMA = "meta-llama/Llama-3.3-70B-Instruct-Turbo"
ALL_MODELS = [MODEL_LLAMA]
```

So the *content* of the claim — `ALL_MODELS` is a single-element list containing only Llama — is **true**. But the file path in the keystone-line table is wrong. The addendum should cite `together_client.py:24` (or `extraction_strategy.py:78` if the keystone is the *use* site).

---

## Aggregate verdict

The addendum's *claims about behavior* are largely correct: 11 of 16 silent-failure citations match exactly; the 4 ❌ in `agents.py` describe real code, just at moved line numbers; the 1 ⚠️ in `storage2_query.py:110-112` is a silent-failure pattern but a different mechanism than the addendum implies; and 2 of 3 additional claims hold verbatim.

The single content error worth noting before acting on the addendum:

- **Task 0.5 / keystone table**: the line numbers for sites 3-6 (`agents.py:27-29`, `61-63`, `95-97`, `127-129`) are off by ~76 lines and one row maps to the wrong agent (site 6's "chat analyzer" is actually the lesson synthesizer at the line range cited). Update to: site 3 → `agents.py:103-105`; site 4 → `agents.py:115-117`; site 5 → `agents.py:127-129`; site 6 → `agents.py:139-141`.
- **Path C keystone**: should cite `backend/learning_engine/together_client.py:24` (definition) rather than `extraction_strategy.py:24`.

Neither error invalidates the addendum's prioritization or task structure. They are citation drift, not factual errors about the system's behavior.
