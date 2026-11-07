# ContextFlow

ContextFlow is an internal engineering-context prototype. The controlling V1 product scope is captured in [the repository specification](docs/product/CONTEXTFLOW_V1_PRODUCT_AND_IMPLEMENTATION_SPEC.md).

Approved target architecture and planning documents:

- [ADR-001 — Railway-first infrastructure for ContextFlow V1](docs/architecture/adr/ADR-001-railway-first.md)
- [ContextFlow V1 Railway-first implementation plan](docs/planning/CONTEXTFLOW_V1_IMPLEMENTATION_PLAN.md)

These documents describe approved targets and gates. They do not claim that the Railway architecture is implemented or deployed.

## Baseline test suite

The default suite is deterministic: service boundaries are faked and no database or AI provider is contacted.

Prerequisites:

- Python 3.11 or newer with `backend/requirements.txt` installed
- Node.js with `npm ci` completed in `frontend/` for the frontend typecheck

Run the portable suite from any checkout location:

```bash
./run_tests.sh
```

Useful explicit options:

```bash
PYTHON_BIN=/path/to/python3.11 ./run_tests.sh
SKIP_FRONTEND=1 ./run_tests.sh
RUN_LIVE_INTEGRATION=1 ./run_tests.sh
```

`RUN_LIVE_INTEGRATION=1` is intentionally opt-in because it requires configured external services and may consume provider resources. It must not be used against production without separate authorization.

The frontend API routes use the current checkout by default. Set these variables when Python or the backend live elsewhere:

```bash
CONTEXTFLOW_PYTHON=/path/to/venv/bin/python
CONTEXTFLOW_BACKEND_DIR=/path/to/ContextFlow/backend
```

## Current baseline boundary

This baseline proves the existing upload, query-scope forwarding, and MCP JSON-RPC contracts with deterministic fixtures. It does not claim that V1 document identity/versioning, approvals, decision authority, audit lineage, or approved-context retrieval are implemented; those remain later approved PRs.
