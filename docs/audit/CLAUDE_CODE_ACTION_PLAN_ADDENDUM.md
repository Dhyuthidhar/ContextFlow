# ContextFlow — Action Plan Addendum (Post-Trace)

> Source: `docs/audit/CRITICAL_PATH_TRACES.md`
> This addendum updates `CLAUDE_CODE_ACTION_PLAN.md` with three new tasks the trace surfaced and re-orders priority based on what the depth analysis revealed. **Read this AFTER the action plan.**

## What changed

The breadth audit gave us a list of issues. The trace gave us **proof of how those issues actually corrupt data at runtime**. Three new findings emerged from depth analysis that don't appear in the original audit:

1. **Silent-failure inventory** — 19 documented `try/except` sites that catch and continue with corrupted state. This is now the foundational fix.
2. **`analysis_jobs` stuck-state bug** — jobs can sit in `running` indefinitely if any post-update step fails. No reconciliation exists.
3. **Document fan-out has no concurrency cap** — `asyncio.gather` with no semaphore creates rate-limit cascades that the silent-failure pattern then hides.

Three trace findings need correction:
- Path D's keystone is `generate_embedding` (any failure silently truncates results), not `QUERY_EXPANSIONS`.
- Path C's `spawnSync` timeout (295s) is *generous*, not tight. Don't raise it; replace the mechanism.
- The `documents.analyzed` / `analysis_jobs.status` desync produces **duplicate analysis runs**, not skipped ones. Worse than the trace stated.

## Re-prioritized task queue

Items in **bold** are new. Others retain their numbering from `CLAUDE_CODE_ACTION_PLAN.md` but their priority order changes.

| Order | Task | Why this position |
|---|---|---|
| 0 | Move specs into repo | Unblocks every future agentic session. 10 min. |
| **0.5** | **Replace silent-failure pattern (19 sites)** | Foundational — every later fix becomes untestable without this. |
| 1 | Fix 3×3 extraction lie | Now testable because Task 0.5 means failures will surface. |
| **3.5** | **Fix `analysis_jobs` state machine + add reconciliation** | Pair with Task 1 since both touch the learning engine. |
| **7** | **Add semaphore on document & agent fan-out** | Prevents the rate-limit cascade that causes most silent failures. |
| 2 | Replace spawnSync with HTTP API | Now decoupled from agent fixes; can be done in parallel. |
| 3 | Add tenacity retries + token tracking | Final layer of LLM resilience. |
| 4 | Test pyramid fix | Now writes meaningful tests because steps 0.5/1/3.5/7 made the system observable. |
| 5 | Real auth | Pre-launch gate. |
| 6 | Prompt injection isolation | Pre-launch gate. |

---

## TASK 0.5 — Replace the silent-failure pattern (NEW, highest-leverage code task)

**Why first among code changes:** Every other task in the plan needs to know whether it succeeded or failed. Today, 19 catch-and-continue blocks make every subsequent task uninstrumented. Fix this once, and Tasks 1–7 become measurable.

**The 19 sites** (originally 13 from trace Phase 6 "Error swallowing inventory"; expanded after verification):

| # | File | Line | What it swallows |
|---|---|---|---|
| 1 | `backend/mcp_server/tools.py` | 54-56 | All `create_project` exceptions |
| 2 | `backend/mcp_server/tools.py` | 116-118 | All `handle_upload_document` exceptions |
| 3 | `backend/learning_engine/agents.py` | 103-105 [^v] | Pattern extractor LLM failures (`agent1_extract_patterns`) |
| 4 | `backend/learning_engine/agents.py` | 115-117 [^v] | Decision analyzer LLM failures (`agent2_analyze_decisions`) |
| 5 | `backend/learning_engine/agents.py` | 127-129 [^v] | Lesson synthesizer LLM failures (`agent3_synthesize_lessons`) |
| 6 | `backend/learning_engine/agents.py` | 139-141 [^v] | Chat analyzer LLM failures (`agent4_analyze_chat`) |
| 7 | `backend/learning_engine/engine.py` | 82-88 | Document processing + nested job-update failure |
| 8 | `backend/learning_engine/synthesizer.py` | 56-58 | Embedding failure during similarity search |
| 9 | `backend/learning_engine/synthesizer.py` | 82-84 | Vector search failure |
| 10 | `backend/file_processing/chunker.py` | 115-117 | Chunking failure |
| 11 | `backend/file_processing/chunker.py` | 167-169 | All `process_and_store_chunks` exceptions |
| 12 | `backend/orchestrator/intent_classifier.py` | 93-95 | OpenAI classifier failure (returns fallback) |
| 13 | `backend/orchestrator/storage1_query.py` | 54-56 | Vector search failure |
| 14 | `backend/orchestrator/storage2_query.py` | 77-79 | Vector search failure (primary) |
| 15 | `backend/orchestrator/storage2_query.py` | 110-112 [^v] | Related-category per-task failures dropped via `asyncio.gather(return_exceptions=True)` + `if isinstance(result, Exception): continue` — `grouped` looks complete but is missing failed categories with no signal to the caller |
| 16 | `backend/orchestrator/storage2_query.py` | 119-121 [^v] | Related-category function-level catch-all (`return {}` on any uncaught error in `query_related_categories`) — added on verification, was not in the original list |
| 17 | `backend/orchestrator/orchestrator.py` | 106-108 | Orchestrator-level catch-all |
| 18 | `backend/learning_engine/agents.py` | 170-172 [^v] | Per-agent failures inside `run_agents_for_document`'s `run_agent` closure (`except Exception as exc: logger.error("Agent %s failed: %s", name, exc); return name, []`) — same swallow pattern as sites 3-6, one layer up at the orchestration boundary |
| 19 | `backend/learning_engine/extraction_strategy.py` | 101-103 [^v] | Outer try/except in `extract_with_3x3` that catches **all** errors raised by the per-model gather and returns `[]`. This site **masks sites 3-6**: the agent decorators never see LLM failures because this swallow eats them first. Must be fixed in the same Category B pass as 3-6, or those fixes are theatrical. |

[^v]: Verified against code on 2026-04-27; see `ADDENDUM_VERIFICATION.md`.

(The original trace counted 13. After verification, the agents.py line numbers were re-anchored, the storage2_query site was split into per-task and function-level swallows, the agent-orchestration closure swallow was added, the masking swallow in `extract_with_3x3` was promoted from "background fact" to a numbered site, and the total settled at 19. Use this list.)

**The pattern to apply, in `backend/utils/errors.py` (new file):**

```python
class ContextFlowError(Exception):
    """Base for expected failures we recover from. Always carries correlation_id."""
    def __init__(self, message: str, *, correlation_id: str, recoverable: bool = True):
        super().__init__(message)
        self.correlation_id = correlation_id
        self.recoverable = recoverable

class UpstreamLLMError(ContextFlowError): pass
class StorageError(ContextFlowError): pass
class CorruptedAnalysisError(ContextFlowError):
    """Raised when partial success would write inconsistent state. Always halts the flow."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, recoverable=False, **kwargs)
```

**Three categories of fix, applied to the 19 sites:**

- **Category A — User-facing entry points (sites 1, 2, 17):** Catch `ContextFlowError` → return structured error response with the correlation_id and a user-actionable message. Catch bare `Exception` → log with stack + correlation_id, return 500 with the correlation_id only. Never swallow.

- **Category B — LLM-call and agent-orchestration sites (sites 3-6, 8, 12, 18, 19):** Wrap the LLM call. On rate-limit/timeout/connection error, raise `UpstreamLLMError`. On JSON-parse failure, raise `UpstreamLLMError` with the malformed payload attached. Do not return `[]` or `None` to fake success. Let the caller decide. Site 18 is the orchestration-layer mirror of 3-6: when `run_agents_for_document` collects results, a single agent's `UpstreamLLMError` should propagate (or be aggregated into a `PartialAgentFailure` summary), not be silently mapped to an empty list. Site 19 must be fixed *together with* 3-6, otherwise the agent-level decorators never receive LLM failures.

- **Category C — Mid-pipeline data writes (sites 7, 9, 10, 11, 13, 14, 15, 16):** If a partial-write would leave the system in a corrupt state (e.g. document row exists but no chunks), raise `CorruptedAnalysisError`. Per-job exception handling at `engine.py` should mark that job `failed` with the correlation_id, but **never** mark `documents.analyzed = True` if chunking didn't complete. The current code does this in the wrong order — fix the ordering (`documents.analyzed` should be the *last* write in a successful flow, not before the job-status write). For site 15, also propagate per-task failures from `asyncio.gather` rather than dropping them silently — return a structured `{category: result_or_error}` map so callers can distinguish "no related principles" from "lookup failed."

### Inventory gap discovered during Category B execution

While remediating the seven Category B sites in this session, eight additional `except Exception → return safe-default` swallows were surfaced that were **not in the 19-site inventory**. They are mid-pipeline data writes or pure helper failures, not LLM-call sites — Category C scope. Listing them here so the next session has a starting point and the count doesn't drift again.

| File:line | Function | What it swallows |
|---|---|---|
| `backend/learning_engine/synthesizer.py:159` | `store_or_update_principle` | Any failure during the lookup-or-insert flow (similarity search + confidence update + `create_principle`); returns `None`, callers can't distinguish "not stored" from "stored but failed mid-update" |
| `backend/learning_engine/synthesizer.py:220` | `_store_or_update_with_embedding` | Same shape as above for the pre-embedded variant; `None` return masks partial writes |
| `backend/learning_engine/synthesizer.py:248` | `synthesize_and_store` (batch-embedding fallback) | Failure of the batch embedding call; degrades to per-item sequential embedding silently — caller sees a slow successful run instead of a flagged retry |
| `backend/learning_engine/synthesizer.py:268` | `store_single` closure inside `synthesize_and_store` | Per-item store failures; flows into the `failed += 1` counter, but no error detail is preserved for diagnosis |
| `backend/orchestrator/intent_classifier.py:97` | `detect_project_from_query` | Supabase `get_projects` failure; returns `None`, query then proceeds without project scoping (RLS-relevant) |
| `backend/learning_engine/extraction_strategy.py:34` | `parse_json_response` | Malformed LLM output; returns `None`, which `vote_on_extractions` then filters out — produces empty extractions even when the upstream call succeeded |
| `backend/learning_engine/extraction_strategy.py:45` | `vote_on_extractions` | Pure-logic failure on extraction list; should never throw in practice but currently swallows to `[]` |
| `backend/learning_engine/extraction_strategy.py:65` | `merge_model_results` | Pure-logic failure during cross-model merge; swallows to `[]` |

**Status:** Category C scope, to be addressed in Task 0.5 Category C session. Do not fix in the Category B pass.

**Note:** The first 5 rows were surfaced when the Step 4 grep returned non-zero on the original three Category B files. The last 3 rows were surfaced when `extraction_strategy.py` was added to the grep set after fixing site 19. The first three of these (`parse_json_response` especially) should arguably be promoted to Category B in the next session — `parse_json_response` swallows malformed LLM output, which is exactly the JSON-parse failure mode the addendum already places in Category B.

**Definition of done:**
- `grep -rn "except Exception" backend/ | grep -v "raise"` returns ≤ 3 lines (only the 3 user-facing entry points).
- Every catch site has a correlation_id in the log line.
- Unit tests in `tests/unit/test_silent_failures.py` simulate each failure mode and assert it propagates correctly.
- A fresh analysis with deliberately broken Together AI key produces a clear `UpstreamLLMError` in logs and a `failed` job — not a `completed` job with 0 principles.

**Stop for human review.**

---

## TASK 3.5 — Fix `analysis_jobs` state machine (NEW)

**Why now:** The trace found a real bug. A job can be stuck in `running` if Step 20 (`engine.py:63-67`) fails after Step 19 succeeds. Worse, the trace's analysis flipped the desync direction — actually, when `documents.analyzed` is updated *before* the job-status update, a failure between them causes the doc to be skipped on retry while the job sits in `running`. When ordering is reversed (job completes before doc.analyzed), retry causes duplicate analysis. Either way, state diverges.

**Plan:**
1. Wrap the two updates (`documents.analyzed = True` + `analysis_jobs.status = 'completed'`) in a single Postgres transaction. They commit together or not at all. Use Supabase's `rpc('mark_analysis_complete', {...})` pattern with a SQL function in a new migration.
2. Add a `analysis_jobs.heartbeat_at` column. Update it every 30s while a job is `running`. Add a sweeper script (or Postgres scheduled function) that marks jobs `failed` if their heartbeat is older than 10 minutes.
3. Add explicit state machine validation: `pending → running` requires existing row with `status = 'pending'`. `running → completed | failed` requires existing row with `status = 'running'`. Anything else raises `InvalidStateTransition`.
4. Add unit tests: simulate a crash between the two updates, assert state is consistent on next read.

**Definition of done:** Killing the Python process mid-analysis leaves no jobs in `running` after the sweeper runs. No document is `analyzed = True` without a corresponding `completed` job.

---

## TASK 7 — Add semaphores on document and agent fan-out (NEW)

**Why now:** The trace found that `engine.py:136-139` does `asyncio.gather` over all pending jobs with no concurrency cap. For 20 documents × 4 agents = 80 simultaneous Together AI calls. Combined with no retry (Task 3) and silent-swallow (Task 0.5), this is the largest source of silent data loss in the system today.

**Plan:**
1. In `backend/learning_engine/engine.py`, replace `asyncio.gather` with a bounded semaphore: `asyncio.Semaphore(MAX_CONCURRENT_DOCS)` where `MAX_CONCURRENT_DOCS` is read from env (default 3).
2. In `backend/learning_engine/agents.py`, similarly bound the per-document agent concurrency: `asyncio.Semaphore(MAX_CONCURRENT_AGENTS_PER_DOC)` (default 4 — one per agent, sequential not allowed since they're independent).
3. Combine with Task 3's retry decorator: when a 429 is hit, the retry will respect the cap.
4. Add a global rate-limit observer: log `together_calls_in_flight` at each acquisition. Surfaces the cap if it's actually being hit.

**Definition of done:** Analyzing 20 documents produces ≤ `MAX_CONCURRENT_DOCS × MAX_CONCURRENT_AGENTS_PER_DOC` simultaneous Together AI calls, observable in logs. No 429s in normal operation.

---

## TASK 1 — Amendment (3×3 extraction)

Verification on 2026-04-27 found `MODEL_DEEPSEEK` defined but unused at `together_client.py:22`. The wiring was started, not just missing. Either complete it (add `MODEL_DEEPSEEK` to `ALL_MODELS` along with a third model and finish the majority-vote merge in `extraction_strategy.merge_model_results`) or delete the constant. Don't leave dead state.

---

## What the keystone-line analysis tells us about the test plan

The trace named one critical line per flow. Use those as the **first unit tests written under Task 4**:

| Flow | Keystone line | Test to write first |
|---|---|---|
| Path A | `new/page.tsx:54` (MVP_USER_ID) | Mock RLS rejection, assert error surfaces to user |
| Path B | `chunker.py:137-139` (embedding gather) | Mock embedding returning `None` for some, assert flow fails loudly post-Task 0.5 |
| Path C | `extraction_strategy.py:24` (`ALL_MODELS`) | After Task 1: assert all 3 models are called and majority-voting selects the winning cluster |
| Path D | `generate_embedding` call sites (corrected from the trace's QUERY_EXPANSIONS answer) | Mock embedding returning `None`, assert query returns explicit "embedding_unavailable" error not empty results |
| Path E | `principles/page.tsx:73` (PAGE = 1000) | Add server-side filtering and remove client-side fan-out — test the filter, not the pagination |

These five tests, written first, validate that Tasks 0.5 / 1 / 3.5 / 7 actually work. They're the regression net for the whole effort.

---

## What the trace's three open questions deserve as answers

The trace ended with three questions for the human. Here's where each lands now:

1. *"Was 0.92 similarity threshold measured or guessed?"* — Almost certainly guessed. After Task 4 has a benchmarks fixture, run a sweep from 0.85 to 0.97 in 0.01 steps and pick the one that minimizes false-merges + false-duplicates on a labeled set. Until then, 0.92 stays but is documented as `# TODO: empirically tune, see benchmarks/threshold_sweep.py`.

2. *"Did the design intend chunks and principles merged into one response?"* — The architecture doc says they should be. The trace correctly notes this confuses "what's in your docs" vs. "general principles." Adjust the orchestrator response to return them as separate sections with explicit headers, even if a downstream LLM client merges them. Do this as part of Task 2 (HTTP API replacement) — clean break is easier than mid-flight refactor.

3. *"Should the spawnSync timeout be raised?"* — No. The math doesn't support a tight-timeout claim, and Task 2 replaces the mechanism entirely. Don't tune deprecated paths.

---

## When to stop and ship

After Tasks 0, 0.5, 1, 3.5, 7, 2, 3, 4: the system is internally consistent, observable, and testable. **Ship internally and use it for real for two weeks.** Do not start Task 5 (auth) and Task 6 (prompt injection) until you've actually used the post-Task-4 system for two weeks and trusted what comes out of it. Premature auth on a system that still produces wrong principles just hides the wrong principles behind logins.
