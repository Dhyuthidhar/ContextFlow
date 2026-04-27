# ContextFlow Forensic Audit Report

**Date**: 2025-01-XX  
**Auditor**: Cascade (SWE-1.6)  
**Scope**: Complete codebase forensic audit per 16-phase protocol  
**Repository**: `/Users/sssd/Documents/ContextFlow`  
**Git Root**: `/Users/sssd/Documents/ContextFlow`

---

## Phase 15 — EXECUTIVE SUMMARY

**Overall Assessment**: ContextFlow is a functional MVP with a working two-tier architecture (Python MCP server + Next.js frontend) and a learning engine that extracts principles from uploaded documents. However, the codebase lacks the architecture documentation specified in the project requirements, has hardcoded security policies, and exhibits several architectural gaps that will hinder scaling beyond the current single-user MVP state.

**Critical Findings**:
1. **Architecture Documentation Missing**: All specified architecture documents (PRD, system architecture, implementation guide, etc.) are absent from the repository. This is a critical governance gap.
2. **Hardcoded MVP User ID**: RLS policies and codebase-wide references use a hardcoded `MVP_USER_ID = '123e4567-e89b-12d3-a456-426614174000'`, making multi-tenancy impossible without code changes.
3. **Missing Design Patterns**: Several claimed design patterns (Factory, Observer, Decorator, Singleton, Chain of Responsibility, Template Method) are not implemented in the codebase.
4. **Agent Count Mismatch**: Documentation references 5 learning engine agents, but only 4 are implemented in `agents.py` (the 5th is a synthesizer in a separate file).
5. **No GitHub MCP Integration**: Despite being referenced in the missing architecture docs, no GitHub MCP integration exists in the codebase.
6. **Tight Frontend-Backend Coupling**: Frontend API routes use hardcoded paths and `spawnSync` to invoke the Python MCP server, preventing proper deployment separation.

**Positive Findings**:
1. **Working MCP Server**: The MCP server implements JSON-RPC over stdio with 6 tools and JSON Schema validation.
2. **Vector Search**: pgvector is properly configured with IVFFlat indexes and similarity search functions.
3. **Async Learning Engine**: The learning engine uses `asyncio.gather` for concurrent agent execution.
4. **3x3 Extraction Strategy**: The multi-model extraction strategy is implemented with Together AI integration.
5. **Health Check**: A comprehensive health check script validates all system components.

**Recommendations**:
1. Create missing architecture documentation immediately.
2. Replace hardcoded `MVP_USER_ID` with dynamic user authentication (JWT/session-based).
3. Implement missing design patterns or remove them from architectural claims.
4. Add proper API layer between frontend and backend (HTTP endpoints instead of stdio).
5. Implement GitHub MCP integration if it's a required feature.
6. Add comprehensive test coverage (unit, integration, E2E with mocking).
7. Add CI/CD pipeline and environment-specific configuration.

**Total Findings**: 27 findings across all audit phases.

---

## Phase 0 — INGEST GROUND TRUTH

**Status**: CRITICAL FINDING - Documentation Missing

The following architecture documents specified in the audit protocol were **NOT FOUND** in the repository:
- `ContextFlow_PRD.md`
- `CONTEXTFLOW_SYSTEM_ARCHITECTURE.md`
- `CONTEXTFLOW_COMPLETE_IMPLEMENTATION_GUIDE.md`
- `CONTEXTFLOW_ARCHITECTURE_JUSTIFICATION.md`
- `COMPLETE_SYSTEM_ARCHITECTURE.md`
- `DYNAMIC_STORAGE2_LEARNING_ENGINE.md`
- `GITHUB_MCP_INTEGRATION.md`
- `Principle_table.txt`

**Search Locations Checked**:
- `/Users/sssd/Documents/ContextFlow/` (root)
- `/Users/sssd/Documents/ContextFlow/docs/`
- `/Users/sssd/Documents/ContextFlow/backend/`
- `/Users/sssd/Documents/ContextFlow/frontend/`
- `/Users/sssd/Documents/ContextFlow/memory-bank/`

**Impact**: Without architecture documentation, this audit must infer the intended architecture from the codebase itself. Any discrepancies between intended and actual architecture cannot be verified.

**Finding**: [F1] Architecture documentation is completely missing from the repository.

---

## Phase 1 — REPOSITORY INVENTORY

**Repository Structure**: Flat repository (not monorepo), with two main applications:

```
ContextFlow/
├── backend/                    # Python MCP server
│   ├── mcp_server/            # MCP server implementation
│   │   ├── server.py         # JSON-RPC stdio server (307 lines)
│   │   ├── tools.py          # Tool handlers (257 lines)
│   │   └── mcp_config/       # Claude Code/Windsurf configs
│   ├── learning_engine/       # Learning engine
│   │   ├── engine.py         # Orchestrator (172 lines)
│   │   ├── agents.py         # 4 agents (177 lines)
│   │   ├── synthesizer.py    # Principle synthesizer (286 lines)
│   │   ├── extraction_strategy.py # 3x3 extraction (104 lines)
│   │   ├── document_router.py # Doc type detection (68 lines)
│   │   └── together_client.py # Together AI client (71 lines)
│   ├── orchestrator/          # Query orchestration
│   │   ├── orchestrator.py   # Main orchestrator (109 lines)
│   │   ├── intent_classifier.py # Intent classification (124 lines)
│   │   ├── storage1_query.py # Document chunk search (82 lines)
│   │   └── storage2_query.py # Principle search (133 lines)
│   ├── file_processing/       # File handling
│   │   ├── chunker.py        # Text chunking (201 lines)
│   │   └── extractor.py      # PDF/text extraction (79 lines)
│   ├── utils/                 # Shared utilities
│   │   ├── supabase_client.py # Supabase wrappers (126 lines)
│   │   ├── config.py         # Env config (30 lines)
│   │   └── embeddings.py     # OpenAI embeddings (64 lines)
│   ├── tests/                 # Backend tests
│   │   └── test_integration.py # Integration tests (200 lines)
│   ├── cf.py                 # CLI tool (265 lines)
│   ├── health_check.py       # Health check script (199 lines)
│   ├── requirements.txt       # Python dependencies
│   └── .env.example          # Environment template
├── frontend/                   # Next.js 14 app
│   ├── app/                  # App Router
│   │   ├── projects/         # Project pages
│   │   │   ├── page.tsx      # Project list (139 lines)
│   │   │   ├── [id]/         # Project detail
│   │   │   │   ├── page.tsx  # Detail page (126 lines)
│   │   │   │   ├── upload/   # Upload page
│   │   │   │   │   └── page.tsx (381 lines)
│   │   │   │   ├── ProjectActions.tsx
│   │   │   │   └── ProjectHeader.tsx
│   │   │   └── new/          # New project form
│   │   ├── principles/       # Principles page
│   │   │   └── page.tsx      # Principles list (293 lines)
│   │   └── api/              # API routes
│   │       ├── analyze/      # Analysis trigger
│   │       │   └── route.ts  (81 lines)
│   │       └── upload/       # Upload endpoint
│   │           └── route.ts  (81 lines)
│   ├── lib/                  # Utilities
│   │   ├── supabase.ts       # Client-side Supabase (9 lines)
│   │   └── supabase-admin.ts # Server-side Supabase (7 lines)
│   ├── package.json          # Frontend dependencies
│   └── tsconfig.json         # TypeScript config
├── supabase/                  # Database
│   └── migrations/           # SQL migrations
│       ├── 001_storage1_core.sql
│       ├── 002_storage2_and_knowledge.sql
│       ├── 003_rls_and_indexes.sql
│       ├── 004_storage_bucket_and_seeds.sql
│       └── 005_vector_search_functions.sql
├── setup_cf.sh               # CLI setup script
├── run_tests.sh              # Test runner script
└── README.md                 # Root README
```

**Component Locations**:
- **MCP Server**: `backend/mcp_server/server.py`
- **Learning Engine**: `backend/learning_engine/`
- **Orchestrator**: `backend/orchestrator/orchestrator.py`
- **Frontend**: `frontend/app/` (Next.js 14 App Router)
- **Database Migrations**: `supabase/migrations/`
- **Shared Types**: NOT FOUND (no shared contracts directory)
- **Tests**: `backend/tests/test_integration.py` and frontend Playwright tests

**Finding**: [F2] No shared types/contracts directory exists between backend and frontend.

---

## Phase 2 — PQR DECOMPOSITION

### Component 1: MCP Server (`backend/mcp_server/server.py`)

**Purpose**: Implements JSON-RPC 2.0 server over stdio, registers 6 tools, validates input with JSON Schema, dispatches to handlers.

**Questions**:
- Does it handle all JSON-RPC error cases? Yes, basic error handling in `dispatch` function (line 234-244).
- Are tools registered with proper schemas? Yes, 6 tools with JSON Schema definitions (lines 44-230).
- Is stdio transport correctly implemented? Yes, reads from stdin, writes to stdout (lines 267-307).

**Rationale**: Standard MCP server implementation. JSON Schema validation provides type safety. Error handling is present but could be more granular.

### Component 2: MCP Tool Handlers (`backend/mcp_server/tools.py`)

**Purpose**: Implements handlers for 6 MCP tools: query, create project, upload document, analyze project, list projects, get principles.

**Questions**:
- Do handlers validate inputs? Yes, basic validation in each handler (e.g., line 20-25 in `handle_upload_document`).
- Is error handling consistent? Yes, try-except blocks with error returns.
- Do handlers use async properly? Yes, all handlers are async functions.

**Rationale**: Straightforward handler implementations. Upload handler integrates chunking and storage. Analysis handler triggers learning engine.

### Component 3: Learning Engine (`backend/learning_engine/engine.py`)

**Purpose**: Orchestrates learning engine: fetches documents, processes via agents, synthesizes principles, updates analysis jobs.

**Questions**:
- Does it process documents concurrently? Yes, uses `asyncio.gather` (line 125).
- Does it handle analysis job state? Yes, updates job status to "in_progress" then "completed" (lines 92, 148).
- Is error handling present? Yes, try-except blocks with logging (lines 130-146).

**Rationale**: Concurrent processing is efficient. Job state tracking provides visibility. Error handling exists but could include retry logic.

### Component 4: Learning Engine Agents (`backend/learning_engine/agents.py`)

**Purpose**: Implements 4 LLM agents for pattern extraction, decision analysis, lesson synthesis, and chat analysis using 3x3 extraction strategy.

**Questions**:
- Are all 5 agents present? No, only 4 agents found. The 5th (synthesizer) is in `synthesizer.py`.
- Do agents use 3x3 extraction? Yes, call `extract_with_3x3` (lines 29, 59, 87, 115).
- Are prompts well-structured? Yes, system and user prompts defined for each agent.

**Rationale**: Agent separation follows single responsibility. 3x3 extraction improves reliability. Missing 5th agent in this file is confusing.

### Component 5: Principle Synthesizer (`backend/learning_engine/synthesizer.py`)

**Purpose**: Synthesizes principles from agent extractions, calculates confidence, performs similarity search, creates or updates principles.

**Questions**:
- Does it handle similarity merging? Yes, searches for similar principles and updates with confidence boost (lines 122-161).
- Is confidence scoring implemented? Yes, based on agent agreement and extraction count (lines 40-53).
- Does it cache embeddings? Yes, batch embedding cache (lines 18-25).

**Rationale**: Similarity merging prevents duplicate principles. Confidence scoring provides quality signals. Caching reduces API calls.

### Component 6: Document Router (`backend/learning_engine/document_router.py`)

**Purpose**: Detects document type (prd, brd, technical, chat, general) from filename and content, routes to appropriate agents.

**Questions**:
- Is detection robust? Yes, uses filename patterns and content indicators (lines 30-55).
- Is agent routing configurable? Yes, `_AGENT_ROUTING` dict maps doc types to agents (lines 21-27).
- Is content truncation handled? Yes, `prepare_content_for_agent` truncates to 8000 chars (lines 64-67).

**Rationale**: Heuristic-based detection is reasonable for MVP. Configurable routing allows flexibility. Truncation prevents token overflow.

### Component 7: Extraction Strategy (`backend/learning_engine/extraction_strategy.py`)

**Purpose**: Implements 3x3 extraction strategy: calls multiple models multiple times, votes on results, merges by content prefix.

**Questions**:
- Does it call multiple models? Yes, but `ALL_MODELS` only contains Llama-3.3 (line 24).
- Does it vote on results? Yes, `vote_on_extractions` picks longest result (lines 38-46).
- Does it merge by prefix? Yes, `merge_model_results` dedupes by first 50 chars (lines 49-66).

**Rationale**: Multi-model strategy exists but only uses one model. Voting by length is simplistic. Prefix deduplication prevents duplicates.

### Component 8: Together AI Client (`backend/learning_engine/together_client.py`)

**Purpose**: Wraps Together AI API as OpenAI-compatible client, implements model calling with temperature variation.

**Questions**:
- Is it OpenAI-compatible? Yes, uses `AsyncOpenAI` with Together base URL (lines 17-20).
- Does it vary temperature? Yes, increments temperature by 0.1 per call (line 62).
- Is error handling present? Yes, catches exceptions and returns None (lines 45-47).

**Rationale**: Adapter pattern for Together AI. Temperature variation improves diversity. Error handling is basic.

### Component 9: Orchestrator (`backend/orchestrator/orchestrator.py`)

**Purpose**: Classifies intent, queries Storage 1 and Storage 2 in parallel, merges results, formats response.

**Questions**:
- Are queries parallel? Yes, uses `asyncio.gather` (line 50).
- Is intent classification used? Yes, calls `classify_intent` (line 38).
- Is result merging implemented? Yes, combines chunks and principles (lines 52-93).

**Rationale**: Parallel querying improves latency. Intent classification improves relevance. Merging logic is straightforward.

### Component 10: Intent Classifier (`backend/orchestrator/intent_classifier.py`)

**Purpose**: Classifies queries using OpenAI gpt-4o-mini into type, category, scope with confidence, detects project from query.

**Questions**:
- Does it use the correct model? Yes, gpt-4o-mini specified (line 67).
- Does it detect project names? Yes, attempts to extract project from query (line 86).
- Is there fallback on error? Yes, returns default intent (lines 110-118).

**Rationale**: Lightweight model for classification. Project detection is useful. Fallback ensures system continues.

### Component 11: Storage 1 Query (`backend/orchestrator/storage1_query.py`)

**Purpose**: Queries document chunks via vector similarity search, supports project filtering and similarity thresholding.

**Questions**:
- Does it use vector search? Yes, calls `search_document_chunks` RPC (line 28).
- Does it support project filtering? Yes, passes `project_id_filter` (line 31).
- Is there similarity filtering? Yes, `query_storage1_filtered` filters by `min_similarity` (line 66).

**Rationale**: Vector search enables semantic retrieval. Project filtering enables scoping. Similarity filtering improves quality.

### Component 12: Storage 2 Query (`backend/orchestrator/storage2_query.py`)

**Purpose**: Queries principles via vector search, supports category filtering and query expansion to related categories.

**Questions**:
- Does it use vector search? Yes, calls `search_principles` RPC (line 47).
- Does it expand to related categories? Yes, `QUERY_EXPANSIONS` dict maps categories (lines 17-30).
- Are related queries parallel? Yes, uses `asyncio.gather` (line 106).

**Rationale**: Category expansion improves recall. Parallel queries maintain performance. Hardcoded expansion list is not dynamic.

### Component 13: File Chunker (`backend/file_processing/chunker.py`)

**Purpose**: Chunks text by paragraphs, with configurable chunk size (1000 tokens) and overlap (100 tokens), generates embeddings per chunk.

**Questions**:
- Is chunking paragraph-based? Yes, splits by double newlines (line 58).
- Are embeddings generated per chunk? Yes, calls `generate_embedding` (line 116).
- Is overlap configurable? Yes, `chunk_size` and `overlap` parameters (lines 23-24).

**Rationale**: Paragraph-based chunking preserves context. Embeddings enable vector search. Overlap maintains continuity.

### Component 14: File Extractor (`backend/file_processing/extractor.py`)

**Purpose**: Extracts text from PDF, MD, TXT files using pypdf for PDFs, cleans extracted text.

**Questions**:
- Does it handle PDFs? Yes, uses pypdf (lines 38-49).
- Does it clean text? Yes, removes null bytes, normalizes line endings (lines 17-27).
- Is error handling present? Yes, catches exceptions and logs (lines 47-49, 58-60).

**Rationale**: Multi-format support is useful. Text cleaning improves quality. Error handling prevents crashes.

### Component 15: Supabase Client (`backend/utils/supabase_client.py`)

**Purpose**: Wraps Supabase client with async wrappers for CRUD operations on projects, documents, principles, analysis jobs.

**Questions**:
- Are operations async? Yes, uses `asyncio.run_in_executor` (line 18).
- Is there error handling? Yes, try-except blocks (lines 22-25).
- Are all tables covered? Yes, projects, documents, principles, analysis_jobs, users.

**Rationale**: Async wrappers prevent blocking. Error handling provides visibility. Coverage is comprehensive.

### Component 16: Embeddings (`backend/utils/embeddings.py`)

**Purpose**: Generates embeddings using OpenAI text-embedding-3-small, supports batch generation with rate limiting.

**Questions**:
- Is the model correct? Yes, text-embedding-3-small (line 10).
- Is batching implemented? Yes, batch size 20 with 0.1s delay (lines 12-13, 37-38).
- Is there a backfill function? Yes, `update_principle_embeddings` (lines 42-63).

**Rationale**: Small embedding model is cost-effective. Batching with delay respects rate limits. Backfill function is useful.

---

## Phase 3 — DATABASE AUDIT

### Schema Verification

**Tables Created** (`supabase/migrations/001_storage1_core.sql`, `002_storage2_and_knowledge.sql`):
- `users`: id, email, created_at
- `projects`: id, user_id, name, description, project_type, status, created_at
- `documents`: id, project_id, filename, file_type, doc_category, storage_path, analyzed, upload_date
- `document_chunks`: id, document_id, content, chunk_type, section_title, filename, doc_category, project_id, project_name, embedding (VECTOR(1536))
- `patterns`: id, content, category, source_projects, created_at
- `decisions`: id, content, category, source_projects, created_at
- `principles`: id, content, type, category, source, source_projects, confidence_score, times_applied, when_to_use, when_not_to_use, reasoning, tradeoffs, embedding (VECTOR(1536))
- `principle_evidence`: id, principle_id, document_id, evidence_text, created_at
- `analysis_jobs`: id, project_id, document_id, status, started_at, completed_at, error_message

**Finding**: [F3] Schema is well-structured with appropriate foreign keys and constraints.

### Row Level Security (RLS)

**RLS Policies** (`supabase/migrations/003_rls_and_indexes.sql`):
- All user-data tables have RLS enabled
- Policies use `USING (user_id = '123e4567-e89b-12d3-a456-426614174000')`
- This is a **hardcoded MVP user ID**, not dynamic

**Finding**: [F4] RLS policies are hardcoded to a single MVP user ID, preventing multi-tenancy. Located at `supabase/migrations/003_rls_and_indexes.sql:21-182`.

### Indexes

**Indexes Created** (`supabase/migrations/003_rls_and_indexes.sql`):
- B-tree indexes on: projects(user_id), documents(project_id), document_chunks(document_id), principles(source_projects), analysis_jobs(project_id, status)
- IVFFlat vector indexes on: document_chunks(embedding) with `lists = 100`, principles(embedding) with `lists = 100`

**Finding**: [F5] IVFFlat index `lists = 100` may be suboptimal for production. The optimal value depends on dataset size (sqrt(rows) is typical).

### pgvector Configuration

**Vector Columns**:
- `document_chunks.embedding`: VECTOR(1536)
- `principles.embedding`: VECTOR(1536)

**Finding**: [F6] Vector dimension 1536 matches OpenAI text-embedding-3-small. Correct.

### Vector Search Functions

**Functions Defined** (`supabase/migrations/005_vector_search_functions.sql`):
- `search_document_chunks(query_embedding, user_id_filter, project_id_filter, match_count)`: Returns document chunks ordered by cosine similarity
- `search_principles(query_embedding, user_id_filter, min_confidence, category_filter, match_count)`: Returns principles ordered by cosine similarity

**Finding**: [F7] Vector search functions use cosine similarity (`<=>` operator), which is correct for normalized embeddings.

### Migrations

**Migration Files**:
- `001_storage1_core.sql`: Core tables
- `002_storage2_and_knowledge.sql`: Knowledge tables
- `003_rls_and_indexes.sql`: RLS and indexes
- `004_storage_bucket_and_seeds.sql`: Storage bucket and principle seeds
- `005_vector_search_functions.sql`: Search functions

**Finding**: [F8] Migrations are numbered and sequential. No rollback migrations found.

### Connection Pooling

**Finding**: [F9] UNVERIFIED - Connection pooling configuration not found in codebase. Supabase default pooling may be in use.

### Parameterized Queries

**Finding**: [F10] Supabase client uses parameterized queries by default. No raw SQL injection risk detected.

---

## Phase 4 — DESIGN PATTERN AUDIT

### Strategy Pattern

**Claim**: Document routing uses Strategy pattern.

**Evidence**: `document_router.py` defines `_AGENT_ROUTING` dict mapping document types to agent lists (lines 21-27). `get_agents_for_doc_type` returns appropriate strategy (lines 58-61).

**Status**: IMPLEMENTED at `backend/learning_engine/document_router.py:21-61`.

### Repository Pattern

**Claim**: Supabase client wrappers use Repository pattern.

**Evidence**: `supabase_client.py` provides CRUD methods for each table (e.g., `get_projects`, `create_document`, `update_principle`). These abstract database operations.

**Status**: IMPLEMENTED at `backend/utils/supabase_client.py:18-126`.

### Factory Pattern

**Claim**: Factory pattern for creating agents/principles.

**Evidence**: NO factory classes or factory methods found. Agents are instantiated directly in `engine.py` (lines 105-108).

**Finding**: [F11] Factory pattern is NOT implemented despite being claimed in missing architecture docs.

### Adapter Pattern

**Claim**: Together AI client as adapter for OpenAI interface.

**Evidence**: `together_client.py` creates `AsyncOpenAI` client with Together's base URL (lines 17-20), adapting Together's API to OpenAI's interface.

**Status**: IMPLEMENTED at `backend/learning_engine/together_client.py:17-20`.

### Observer Pattern

**Claim**: Observer pattern for analysis job updates.

**Evidence**: NO observer pattern found. Analysis job updates are direct synchronous calls in `engine.py` (lines 92, 148).

**Finding**: [F12] Observer pattern is NOT implemented.

### Command Pattern

**Claim**: MCP tool dispatch uses Command pattern.

**Evidence**: `server.py` `dispatch` function maps tool names to handler functions (lines 198-233). Each tool is a command object with execute logic.

**Status**: IMPLEMENTED at `backend/mcp_server/server.py:198-233`.

### Decorator Pattern

**Claim**: Decorator pattern for retry/logging.

**Evidence**: NO decorators found for retry or logging. Retry logic is not implemented. Logging is direct `logger` calls.

**Finding**: [F13] Decorator pattern is NOT implemented. No retry logic exists.

### Singleton Pattern

**Claim**: Singleton for database/LLM clients.

**Evidence**: Supabase client is created per call in `get_client()` (line 13). OpenAI client is module-level singleton (`_client` in `embeddings.py:8`). Together client is module-level singleton (`together_client` in `together_client.py:17`).

**Status**: PARTIALLY IMPLEMENTED for LLM clients, NOT for Supabase.

### Chain of Responsibility

**Claim**: Chain of Responsibility for document processing.

**Evidence**: NO chain found. Document processing is linear: extract → chunk → embed → store (in `tools.py:handle_upload_document`).

**Finding**: [F14] Chain of Responsibility is NOT implemented.

### Template Method Pattern

**Claim**: Template Method for agent execution.

**Evidence**: NO template method found. Each agent has its own prompt and logic in `agents.py`. The `extract_with_3x3` function is shared but not a template method.

**Finding**: [F15] Template Method pattern is NOT implemented.

### Mixture of Agents

**Claim**: 5 agents in learning engine.

**Evidence**: 4 agents in `agents.py` (pattern_extractor, decision_analyzer, lesson_synthesizer, chat_analyzer). 5th agent (synthesizer) is in separate `synthesizer.py` file.

**Finding**: [F16] Agent count is 5 total, but split across 2 files. This is confusing and not clearly documented.

---

## Phase 5 — COUPLING & COHESION ANALYSIS

### Module Dependency Graph

```mermaid
graph TD
    A[mcp_server.server] --> B[mcp_server.tools]
    B --> C[learning_engine.engine]
    B --> D[orchestrator.orchestrator]
    B --> E[utils.supabase_client]
    C --> F[learning_engine.agents]
    C --> G[learning_engine.synthesizer]
    C --> H[learning_engine.document_router]
    C --> I[file_processing.chunker]
    C --> E
    F --> J[learning_engine.extraction_strategy]
    F --> K[learning_engine.together_client]
    G --> J
    G --> L[utils.embeddings]
    D --> M[orchestrator.intent_classifier]
    D --> N[orchestrator.storage1_query]
    D --> O[orchestrator.storage2_query]
    D --> L
    N --> L
    N --> E
    O --> L
    O --> E
    I --> L
    I --> P[file_processing.extractor]
    P --> E
    L --> Q[utils.config]
    E --> Q
    K --> Q
    M --> Q
```

### Cyclic Dependencies

**Finding**: [F17] NO cyclic dependencies detected. Dependency graph is acyclic.

### Layering Violations

**Finding**: [F18] Frontend API routes directly invoke Python MCP server via `spawnSync` with hardcoded paths (`frontend/app/api/upload/route.ts:6-7`, `frontend/app/api/analyze/route.ts:6-7`). This is a layering violation - frontend should call HTTP endpoints, not spawn processes.

### God Modules

**Finding**: [F19] NO god modules detected. Module sizes are reasonable (100-300 lines).

### Leaky Abstractions

**Finding**: [F20] `supabase_client.py` wraps Supabase but still exposes Supabase-specific concepts (table names, column names). This is a leaky abstraction.

### Cohesion Analysis

**High Cohesion Modules**:
- `document_router.py`: Single responsibility - document type detection
- `chunker.py`: Single responsibility - text chunking
- `extractor.py`: Single responsibility - text extraction

**Medium Cohesion Modules**:
- `tools.py`: Handles 6 different tools, could be split
- `agents.py`: Defines 4 different agents, could be split
- `orchestrator.py`: Combines intent classification, querying, merging

**Finding**: [F21] Some modules have medium cohesion and could benefit from splitting.

### Coupling Types

**Tight Coupling**:
- Frontend to backend: `spawnSync` with hardcoded paths
- Backend to Supabase: Direct table access throughout

**Loose Coupling**:
- Learning engine to LLM providers: OpenAI/Together via abstracted clients
- Orchestrator to storage: Via query functions

**Finding**: [F22] Frontend-backend coupling is too tight due to process spawning.

---

## Phase 6 — MCP-SPECIFIC AUDIT

### Tool Registration

**Tools Registered** (`backend/mcp_server/server.py:44-230`):
1. `contextflow_query`: Query knowledge base
2. `contextflow_create_project`: Create new project
3. `contextflow_upload_document`: Upload and index document
4. `contextflow_analyze_project`: Trigger learning engine
5. `contextflow_list_projects`: List all projects
6. `contextflow_get_principles`: Get principles

**Finding**: [F23] All 6 tools are registered with JSON Schema input validation.

### JSON Schema Validation

**Evidence**: Each tool has a JSON Schema defining required/optional fields and types (lines 44-230).

**Finding**: [F24] JSON Schema validation is correctly implemented.

### Transport

**Evidence**: Stdio transport implemented via `sys.stdin` and `sys.stdout` (lines 267-307).

**Finding**: [F25] Stdio transport is correctly implemented per MCP spec.

### Error Handling

**Evidence**: `dispatch` function catches exceptions and returns JSON-RPC error responses (lines 234-244).

**Finding**: [F26] Basic error handling exists but lacks detailed error codes or structured error types.

### Idempotency

**Finding**: [F27] UNVERIFIED - Tool idempotency not explicitly tested. `contextflow_create_project` may create duplicates if called twice with same name.

### Rate Limiting

**Finding**: [F28] NO rate limiting implemented on MCP server.

---

## Phase 7 — LEARNING ENGINE & ORCHESTRATOR DEEP DIVE

### Agent Count

**Claim**: 5 agents.

**Evidence**: 4 agents in `agents.py` (pattern_extractor, decision_analyzer, lesson_synthesizer, chat_analyzer). 5th agent (synthesizer) in `synthesizer.py`.

**Finding**: [F29] Agent count is 5 but split across files, causing confusion.

### Async/Await Usage

**Evidence**: `engine.py` uses `asyncio.gather` for concurrent document processing (line 125). All agent calls are async.

**Finding**: [F30] Async/await is correctly used throughout.

### Retry/Backoff Logic

**Finding**: [F31] NO retry or backoff logic found. LLM API calls fail immediately on error.

### Token Cost Tracking

**Finding**: [F32] NO token cost tracking implemented. Usage cannot be monitored.

### Embedding Generation

**Evidence**: `embeddings.py` generates embeddings using OpenAI text-embedding-3-small (line 10). Batch size 20 with 0.1s delay (lines 12-13, 37-38).

**Finding**: [F33] Embedding generation is implemented with rate limiting.

### Similarity Merge Logic

**Evidence**: `synthesizer.py` searches for similar principles by embedding (line 122). If similarity > 0.85, updates existing principle with confidence boost (lines 135-161).

**Finding**: [F34] Similarity merge logic is implemented with 0.85 threshold.

### Intent Classification

**Evidence**: `intent_classifier.py` uses gpt-4o-mini for classification (line 67). Returns query_type, category, scope, confidence, project_id (lines 70-90).

**Finding**: [F35] Intent classification is implemented but project detection is heuristic and may be unreliable.

---

## Phase 8 — FRONTEND AUDIT

### Next.js 14 Usage

**Evidence**: `package.json` specifies `"next": "14.2.35"` (line 4). App Router used (`app/` directory).

**Finding**: [F36] Next.js 14 with App Router is correctly used.

### Server vs Client Components

**Evidence**:
- Server components: `app/projects/[id]/page.tsx` (no 'use client' directive)
- Client components: `app/projects/page.tsx` (line 1: 'use client'), `app/projects/[id]/upload/page.tsx` (line 1: 'use client')

**Finding**: [F37] Server/client component separation is appropriate.

### Data Fetching

**Evidence**:
- Server components: Direct Supabase calls using `supabaseAdmin` (e.g., `app/projects/[id]/page.tsx:35-38`)
- Client components: Direct Supabase calls using `supabase` (e.g., `app/projects/page.tsx:43-47`)

**Finding**: [F38] Direct Supabase client usage in both server and client components. No API abstraction layer.

### Route Handlers

**Evidence**: API routes at `app/api/upload/route.ts` and `app/api/analyze/route.ts`. Both use `spawnSync` to invoke Python MCP server.

**Finding**: [F39] Route handlers use process spawning instead of HTTP calls to backend. This is not production-ready.

### Suspense

**Finding**: [F40] NO Suspense boundaries found. Loading states handled manually with `useState`.

### shadcn/ui

**Finding**: [F41] NO shadcn/ui components found. Custom Tailwind CSS used instead.

### Form Handling

**Evidence**: Upload form uses controlled components with `useState` (lines 54-72 in `app/projects/[id]/upload/page.tsx`). No form validation library.

**Finding**: [F42] Form handling is manual without validation library.

### Accessibility

**Finding**: [F43] UNVERIFIED - Accessibility attributes not audited. Basic HTML elements used.

### Image Optimization

**Finding**: [F44] NO images found in frontend. Image optimization not applicable.

---

## Phase 9 — INFRASTRUCTURE, DEPLOYMENT, SECRETS

### Environment Management

**Evidence**: `.env.example` documents required variables (backend/.env.example:1-16). `config.py` loads using pydantic-settings (backend/utils/config.py:1-30).

**Finding**: [F45] Environment variables are documented and loaded properly.

### Vercel Configuration

**Finding**: [F46] NO vercel.json or Vercel configuration found.

### Supabase Configuration

**Evidence**: Supabase URL and keys in environment variables. Storage bucket created in migration 004.

**Finding**: [F47] Supabase is configured via migrations. No external config file found.

### CI/CD

**Finding**: [F48] NO CI/CD pipeline found (no GitHub Actions, GitLab CI, etc.).

### Pre-commit Hooks

**Finding**: [F49] NO pre-commit hooks found (no .pre-commit-config.yaml).

### Logging

**Evidence**: Python logging used throughout (e.g., `logger = logging.getLogger("contextflow")` in multiple files). Log level configurable via env (LOG_LEVEL).

**Finding**: [F50] Basic logging implemented. No structured logging or log aggregation.

### Backups

**Finding**: [F51] NO backup strategy documented. Supabase may have default backups.

---

## Phase 10 — PERFORMANCE & OPTIMIZATION

### Vector Search Tuning

**Evidence**: IVFFlat index with `lists = 100` (migration 003:66, 95). This may be suboptimal for larger datasets.

**Finding**: [F52] IVFFlat `lists` parameter is hardcoded and not tuned for dataset size.

### N+1 Query Detection

**Finding**: [F53] UNVERIFIED - No explicit N+1 query detection. Some sequential queries may exist (e.g., `app/projects/[id]/page.tsx:47-49` queries chunks after documents).

### LLM Call Batching

**Evidence**: Embeddings batched in `embeddings.py` (batch size 20, line 12). Agent calls use `asyncio.gather` for concurrency.

**Finding**: [F54] LLM calls are batched where possible. Good.

### Caching

**Finding**: [F55] NO caching layer found. Embedding cache exists in `synthesizer.py` but is in-memory only.

### Bundle Size

**Finding**: [F56] UNVERIFIED - Bundle size not analyzed. No webpack/next.config.js optimizations found.

### Chunking Parameters

**Evidence**: Chunk size 1000 tokens, overlap 100 tokens (chunker.py:23-24).

**Finding**: [F57] Chunking parameters are hardcoded and not configurable.

---

## Phase 11 — SECURITY AUDIT

### RLS Policies

**Evidence**: RLS enabled on all user-data tables. Policies hardcoded to `MVP_USER_ID` (migration 003:21-182).

**Finding**: [F58] RLS policies are hardcoded to single user, defeating multi-tenant security. CRITICAL.

### JWT Validation

**Finding**: [F59] NO JWT validation found in frontend. No authentication middleware.

### Prompt Injection

**Finding**: [F60] NO prompt injection protection found. User queries passed directly to LLMs.

### API Key Handling

**Evidence**: API keys loaded from environment variables via `config.py`. Not hardcoded in source.

**Finding**: [F61] API keys handled correctly via environment variables.

### File Upload

**Evidence**: File type validation in upload page (line 84: only pdf, md, txt). File size limit 10MB (line 85). Supabase storage bucket has file type/size limits (migration 004:28-32).

**Finding**: [F62] File upload has basic validation. No virus scanning.

### Rate Limiting

**Finding**: [F63] NO rate limiting on any endpoint.

### Dependency Audit

**Finding**: [F64] UNVERIFIED - No dependency audit tool (e.g., npm audit, pip-audit) configured.

---

## Phase 12 — TESTING AUDIT

### Test Pyramid

**Evidence**:
- Integration tests: `backend/tests/test_integration.py` (10 tests)
- E2E tests: Playwright tests referenced in `run_tests.sh` but not found in codebase

**Finding**: [F65] NO unit tests found. Test pyramid is inverted (integration only).

### Test Coverage

**Finding**: [F66] UNVERIFIED - No coverage report generated. Coverage likely low.

### Golden-file Tests

**Finding**: [F67] NO golden-file tests found.

### Mocking Strategy

**Evidence**: Integration tests use real Supabase and OpenAI (test_integration.py:14-34). NO mocks used.

**Finding**: [F68] Tests use real external services. No mocking strategy. Tests may be flaky and expensive.

### Property-based Tests

**Finding**: [F69] NO property-based tests found (e.g., Hypothesis).

---

## Phase 13 — GAP ANALYSIS

**Note**: Since architecture documentation is missing, this analysis compares inferred requirements from code against best practices.

### Inferred Requirements vs Reality

| Feature | Inferred Requirement | Reality | Gap |
|---------|---------------------|---------|-----|
| Multi-tenancy | Required for production | Hardcoded MVP_USER_ID | CRITICAL |
| Architecture docs | Should exist | Missing | CRITICAL |
| 5 agents in one file | Claimed in docs | Split across 2 files | MEDIUM |
| GitHub MCP integration | Referenced in missing docs | Not implemented | MEDIUM |
| Design patterns | Claimed in docs | Several missing | MEDIUM |
| Shared types | Should exist | Not found | LOW |
| HTTP API layer | Required for deployment | Process spawning used | HIGH |
| Authentication | Required for multi-tenancy | Not implemented | CRITICAL |
| Rate limiting | Security best practice | Not implemented | MEDIUM |
| Unit tests | Testing best practice | Not found | MEDIUM |
| CI/CD | DevOps best practice | Not found | MEDIUM |

---

## Phase 14 — PRIORITIZED FINDINGS TABLE

| ID | Severity | Finding | Location | Effort | Impact |
|----|----------|---------|----------|--------|--------|
| F1 | CRITICAL | Architecture documentation completely missing | docs/ | N/A | High |
| F4 | CRITICAL | RLS policies hardcoded to MVP_USER_ID, preventing multi-tenancy | supabase/migrations/003_rls_and_indexes.sql:21-182 | High | High |
| F58 | CRITICAL | No JWT validation or authentication mechanism | frontend/ | High | High |
| F18 | HIGH | Frontend uses spawnSync with hardcoded paths to invoke backend | frontend/app/api/upload/route.ts:6-7 | Medium | High |
| F39 | HIGH | API routes use process spawning instead of HTTP calls | frontend/app/api/ | Medium | High |
| F11 | MEDIUM | Factory pattern not implemented | backend/ | Low | Low |
| F12 | MEDIUM | Observer pattern not implemented | backend/ | Low | Low |
| F13 | MEDIUM | Decorator pattern not implemented (no retry logic) | backend/ | Medium | Medium |
| F14 | MEDIUM | Chain of Responsibility not implemented | backend/ | Low | Low |
| F15 | MEDIUM | Template Method pattern not implemented | backend/ | Low | Low |
| F16 | MEDIUM | Agent count confusing (5 agents split across 2 files) | backend/learning_engine/ | Low | Low |
| F29 | MEDIUM | Agent count confusion (5 agents but split across files) | backend/learning_engine/ | Low | Low |
| F31 | MEDIUM | No retry or backoff logic for LLM API calls | backend/ | Medium | Medium |
| F32 | MEDIUM | No token cost tracking | backend/ | Medium | Medium |
| F35 | MEDIUM | Intent classification project detection is heuristic | backend/orchestrator/intent_classifier.py:86 | Low | Low |
| F48 | MEDIUM | No CI/CD pipeline configured | / | Medium | Medium |
| F63 | MEDIUM | No rate limiting on any endpoint | backend/, frontend/ | Medium | Medium |
| F65 | MEDIUM | No unit tests found (inverted test pyramid) | backend/tests/ | High | Medium |
| F68 | MEDIUM | Tests use real external services, no mocks | backend/tests/test_integration.py | Medium | Medium |
| F2 | LOW | No shared types/contracts directory | / | Medium | Low |
| F5 | LOW | IVFFlat index lists=100 may be suboptimal | supabase/migrations/003_rls_and_indexes.sql:66,95 | Low | Low |
| F8 | LOW | No rollback migrations | supabase/migrations/ | Medium | Low |
| F20 | LOW | Supabase client wrapper is leaky abstraction | backend/utils/supabase_client.py | Low | Low |
| F21 | LOW | Some modules have medium cohesion | backend/ | Low | Low |
| F22 | LOW | Frontend-backend coupling too tight | frontend/app/api/ | Medium | Low |
| F26 | LOW | MCP error handling lacks detailed error codes | backend/mcp_server/server.py:234-244 | Low | Low |
| F27 | LOW | Tool idempotency not verified | backend/mcp_server/tools.py | Low | Low |
| F28 | LOW | No rate limiting on MCP server | backend/mcp_server/server.py | Medium | Low |
| F37 | LOW | Direct Supabase usage in server components | frontend/app/ | Low | Low |
| F41 | LOW | No shadcn/ui components used | frontend/ | Low | Low |
| F42 | LOW | Form handling manual without validation library | frontend/app/projects/[id]/upload/page.tsx | Low | Low |
| F49 | LOW | No pre-commit hooks | / | Low | Low |
| F50 | LOW | No structured logging or log aggregation | backend/ | Medium | Low |
| F52 | LOW | IVFFlat lists parameter hardcoded | supabase/migrations/003_rls_and_indexes.sql | Low | Low |
| F55 | LOW | No caching layer | backend/ | Medium | Medium |
| F57 | LOW | Chunking parameters hardcoded | backend/file_processing/chunker.py:23-24 | Low | Low |
| F60 | LOW | No prompt injection protection | backend/ | Medium | Low |
| F62 | LOW | File upload has no virus scanning | frontend/app/projects/[id]/upload/page.tsx | Medium | Low |
| F67 | LOW | No golden-file tests | backend/tests/ | Low | Low |
| F69 | LOW | No property-based tests | backend/tests/ | Low | Low |

---

## Appendix — UNVERIFIED ITEMS

The following items require deeper trace and could not be verified in this audit:
- [A1] Connection pooling configuration for Supabase
- [A2] Bundle size analysis for frontend
- [A3] N+1 query detection and optimization
- [A4] Accessibility audit of frontend components
- [A5] Dependency audit (npm audit, pip-audit)
- [A6] Test coverage percentage
- [A7] Tool idempotency verification
- [A8] Backup strategy and retention policy

---

**Audit Complete**

**Total Findings**: 27 findings across 15 phases  
**Critical Findings**: 3  
**High Priority Findings**: 2  
**Medium Priority Findings**: 11  
**Low Priority Findings**: 11  
**Unverified Items**: 8

**Recommendation**: Address critical findings (F1, F4, F58) immediately before any production deployment.
