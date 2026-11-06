# ContextFlow V1 Product and Implementation Specification

Status: implementation-ready internal draft
Source date: 6 November 2026
Source document: `ContextFlow_V1_Product_and_Implementation_Spec.docx`
Source SHA-256: `18c8b971957c63de9720d41180c0c037329cbc9e24e4ad8d035dfabb800703dc`

## Purpose

ContextFlow V1 is a narrow internal engineering platform that preserves approved product intent, distinguishes it from implementation evidence, and provides current, authorized context to AI coding agents. OMNIX inventory cancellation is the first validation case.

The OMNIX business rules in this specification are candidate behaviors for evaluation. They are not claims about current implementation, production incidents, live schema, or client-approved requirements.

## Decision summary

| Decision | V1 direction |
|---|---|
| Audience | Company developers only; no external SaaS onboarding |
| Authority | A document owner may create revisions. Changes that supersede approved business rules require CTO approval. Client sign-off remains required where contracts or process require it |
| Source of truth | Versioned documents and explicit decision records with source and approval metadata. Code and tests remain separate evidence |
| First use case | OMNIX cancellation of a work order with reserved or consumed materials |
| Delivery strategy | Inspect and stabilize the existing repository first, then implement the smallest end-to-end capability in bounded PRs |

## 1. Product problem and V1 outcome

Important context is currently scattered across requirements, engineering notes, discussions, code, and AI sessions. An agent can use obsolete material, miss historical decisions, treat inference as verification, or invent behavior when documentation is silent.

Before an agent makes an affected code change, V1 must let it retrieve the latest authorized and approved requirement with its source and version, identify a conflicting proposal, request human clarification or approval, and preserve the resulting decision with traceable history.

## 2. Users and boundaries

Primary users are:

- CTO, acting as approval authority for changes to approved product requirements in this internal workflow
- Document owner
- Developer
- Reviewer or tech lead
- AI coding agent

Boundaries:

- Project access is explicit. An authenticated developer or agent may access only granted projects and documents.
- Cross-client and cross-project leakage is prohibited.
- Client-owned documents may be processed only where contractual authorization permits storage, indexing, and AI-provider sharing.
- V1 excludes enterprise billing, public signup, a full PR guardian, autonomous code editing, live production ingestion, automatic client sign-off, universal notifications, and universal source-control integration.

## 3. Requirements register

| ID | Requirement | Priority and status |
|---|---|---|
| CF-01 | Represent project, user, role, and membership, and enforce access on the server for all reads, writes, and AI tools | P0 defined |
| CF-02 | Upload authorized PDF, Markdown, and text. Add DOCX only after parser support is verified. Preserve source metadata | P0 defined |
| CF-03 | Detect exact duplicates, distinguish potential revisions from similar but distinct documents, and never silently merge or overwrite | P0 defined |
| CF-04 | Use a stable document identity with immutable versions, uploader, owner, timestamp, checksum, status, diff, and replacement relationship | P0 defined |
| CF-05 | An owner may submit a new draft version. A non-owner revision requires CTO authorization before acceptance | P0 defined |
| CF-06 | A proposed change to an approved business rule requires CTO approval even when proposed by the document owner | P0 defined |
| CF-07 | Record proposed, approved, rejected, and superseded decisions with author, approver, reason, sources, relationships, and scope | P0 defined |
| CF-08 | Retrieve approved current context with citations and versions, while separating assumptions, unknowns, code-read evidence, and test-verified evidence | P0 defined |
| CF-09 | Present explicit conflicts across approved decisions, document versions, and implementation observations. A human resolves material ambiguity | P0 defined |
| CF-10 | Provide an agent-facing MCP or supported integration for context retrieval, change inspection, decision proposals, and acknowledgments | P0 proposed API |
| CF-11 | Check task-scoped context at pre-edit and pre-PR gates. Relevant updates pause affected work; irrelevant updates may only notify | P1 defined |
| CF-12 | Notify assigned affected developers and persist required acknowledgments | P1 defined |
| CF-13 | Append important access, revision, approval, retrieval, and acknowledgment events to an audit trail | P0 defined |
| CF-14 | Index engineering lessons by failure pattern, cause, fix, limits, and validation evidence rather than keyword alone | P1 first example |
| CF-15 | Supersede approvals and source versions without erasing them; historical reconstruction must remain possible | P0 defined |

## 4. Primary workflows

### 4.1 Ingestion and versioning

1. A developer uploads a document into a project they are authorized to access. The server validates identity, file type, file size, and upload permission.
2. The server calculates a content checksum. Exact content already present in the same authorized scope is linked or reused instead of duplicated. An upload-attempt record is retained if audit policy requires it.
3. Changed content for the same logical document creates a draft version attached to a stable document ID and presents a diff. Filename or semantic similarity alone must not establish identity.
4. A document owner may create a revision under the applicable ownership policy. A non-owner revision is routed to the CTO for acceptance.
5. A revision that changes an approved business rule remains proposed until the CTO approves the rule change, even if its document version was otherwise accepted.
6. Only permitted content is indexed. Every extracted segment retains source-version provenance. Superseded-version retrievals are invalidated or excluded from current context.

### 4.2 Intent resolution and approval

1. A user or agent states the intended product outcome.
2. ContextFlow retrieves relevant approved requirements, decisions, lessons, and evidence within the actor's project permissions.
3. It presents supported interpretations, conflicting statements, and missing information.
4. A developer may choose a suggestion or submit another requested outcome with reasoning, constraints, and assumptions.
5. A material ambiguity or conflict blocks the affected implementation decision and requests targeted human clarification.
6. ContextFlow records the proposal, rationale, source versions, and affected journey.
7. The CTO authorizes changes to approved product requirements. Any required external or client sign-off is recorded separately.
8. Approval makes the new decision current, marks replaced decisions historical, notifies affected developers, and records required acknowledgments.

### 4.3 Agent handoff and freshness

1. Before editing affected code, an agent requests a task-scoped context package containing the project, feature, decision IDs, source versions, assumptions, and invariants.
2. The agent reports its proposed implementation plan. A change to approved approach or protected behavior requires developer approval.
3. Before PR creation, and optionally before significant edits, the agent compares its context version with the latest approved version.
4. A relevant update pauses the affected work, provides a diff, and requests review. V1 does not promise real-time push-based pausing where current integrations cannot support it.
5. Agent-returned code and test evidence is marked verified only when supported by executed tests or observed results. Code inspection alone remains code-read evidence.

## 5. OMNIX validation case

The supplied OMNIX inventory audit is read-only code and schema analysis. It did not execute tests or inspect the live production database.

### 5.1 Candidate business rules

These are proposals for evaluation, not existing behavior or client-approved requirements:

- Cancelling before consumption releases unused reservation without increasing physical on-hand stock.
- Cancelling after partial consumption releases only the unused reservation. Consumed quantity is not automatically restored.
- Recovery requires an authorized Factory Manager to approve reusable material and warehouse confirmation of physical receipt before usable inventory increases.
- A recovery idempotency key identifies one operation. The same key and payload returns the prior result; the same key with a conflicting payload is rejected.
- Inventory correction appends a linked, authorized correction and audit record rather than silently rewriting a posted transaction.
- Recovery uniqueness and stock mutation occur in one database transaction using safe stock-mutation semantics.

### 5.2 Experiment success criteria

1. Ingest at least one authorized OMNIX requirement source and the read-only audit as separate evidence classes. Every retrieval cites an exact document version.
2. Uploading the same exact source twice produces one logical content instance and no duplicate active index results.
3. Uploading a revised requirement creates a draft version and diff while preserving the prior approved version for history.
4. Record the proposed cancellation rule and flag disagreement with audit-observed implementation without presenting static analysis as executed proof.
5. An unapproved conflict cannot replace an approved rule in agent context. CTO approval changes the effective decision version.
6. An authorized Codex or Claude tool session can retrieve context and demonstrate freshness detection and acknowledgment. An unauthorized cross-project read is rejected.
7. Deterministic tests cover duplicate upload, revision permissions, decision authorization, retrieval provenance, context freshness, and audit records.

### 5.3 Existing audit observations and required classification

| Code-read observation | V1 treatment |
|---|---|
| Stock appears represented by `inventory.available_qty`, `inventory.allocated_qty`, and generated `free_qty` | Preserve actual names in context; do not substitute conceptual names automatically |
| Work-order cancellation changes status but reportedly does not release reservation | Present as code-read evidence and a potential conflict with the candidate rule |
| Stock planning reportedly uses pre-transaction reads and absolute allocation writes without observed row locking | Present race impact as inferred risk, not a proven incident |
| Consumption is reportedly product-scoped and occurs on operation completion; errors may be swallowed | Do not propose a release fix without checking cross-order and partial-consumption effects |
| Documents reportedly refer to material structures absent from the inspected schema; tests were not found | Preserve the disagreement and keep live database state unknown |

## 6. Minimal logical domain model

This is a logical model, not a prescribed migration design. Existing Supabase primitives and service boundaries must be inspected before migrations are designed.

| Entity | Minimum fields or invariant |
|---|---|
| ProjectMembership | `project_id`, `principal_id`, role, active state; consulted by every retrieval and mutation |
| Document | Stable ID, project, logical identity, owner, classification, current approved version ID |
| DocumentVersion | Document ID, ordinal, checksum, object path, uploader, status, creation time, replacement link; bytes are immutable |
| SourceReference | Document version, location or chunk, quotation or pointer, provenance |
| Decision | Scope, statement, rationale, proposer, approver, status, approval time, supersession link, sources |
| Conflict | Subject, references, classification, resolution status, assigned reviewer |
| AgentContextSnapshot | Task reference, principal, source-version IDs, decision IDs, generation time, digest |
| Notification or Acknowledgment | Recipient, change ID, relevance, delivery time, acknowledgment time |
| AuditEvent | Actor, action, target, event time, request ID, before and after identifiers, tamper-resistant persistence strategy |

Concurrent writes require server-side authorization, database constraints, and transactions. Client-side filtering is never an authorization boundary.

## 7. Security and client-data handling

- Internal-only operation is not a compliance exemption.
- Client agreements must permit processing, indexing, and third-party AI sharing before client-owned material is ingested.
- Enforce least privilege at project and document level across APIs, MCP, vector retrieval, and storage paths.
- Never expose service-role credentials to browsers or agents.
- Encrypt transport and storage, keep secrets outside source control, and separate development and production credentials.
- Prevent or redact uploaded secrets where practical.
- Log access and decisions without unnecessarily logging confidential content.
- Define retention, deletion, and audit-preservation requirements with the appropriate compliance owner.
- Treat model output as untrusted interpretation. AI may propose changes but cannot authorize them.
- This specification does not assert SOC 2 compliance.

## 8. Bounded implementation order

### PR 1 Stable baseline and tests

Recover only approved baseline code, prove upload and query contracts, and establish deterministic fixtures and tests.

### PR 2 Document identity and versioning

Implement exact-checksum deduplication, stable logical documents, immutable draft versions, diffs, history, ownership, and CTO permission checks.

### PR 3 Decisions and authority

Implement proposed, approved, rejected, and superseded decisions, CTO approval for changes to approved requirements, append-only audit history, and conflict presentation.

### PR 4 Approved-context retrieval

Return project-scoped current decisions with cited source versions and evidence classifications through supported agent integration. Never return a cross-project snippet.

### PR 5 OMNIX demonstration

Ingest authorized OMNIX sources and the read-only audit as separate evidence classes. Demonstrate the cancellation conflict, clarification and approval, current agent context, acknowledgment, and tests.

## 9. Definition of done and V1 release gate

- Every indexed assertion links to a document version and exact relevant location.
- Approved and unapproved content is distinguishable.
- An exact duplicate does not create a new logical document or duplicate active index result.
- A revision does not destroy historical versions.
- Only an authorized actor can approve requirement supersession; document ownership alone is insufficient.
- Cross-project document, decision, vector, and MCP access controls have automated tests.
- Conflict and version staleness are visible before an agent continues affected work.
- Automated backend and API tests plus one human-observed OMNIX walkthrough have recorded evidence.
- Storage, RLS, secrets, and logging receive a security review.
- Production migration, deployment, merge, or live client-data ingestion requires explicit approval.

## 10. Unresolved decisions

Do not invent these in code:

- Whether existing authentication and project membership can be reused
- Logical-document identity beyond exact checksum
- Notification transport and real-time agent hooks; begin with checkpoint APIs where live events are unavailable
- Boundary between client-approved requirements and internally approved engineering decisions
- File formats and limits beyond current PDF, Markdown, and text support
- Document-owner transfer after departure
- Live OMNIX schema and role permissions
- Which Project Standards and Engineering Playbook version is authoritative

## 11. Engineering-work organization

Until the company identifies the controlling playbook version, V1 work follows the documented organizational convention without importing unsupported architecture:

```text
Module → Feature → Task → GitHub Issue
```

Each feature requires a testable Definition of Done. Engineering owns implementation details after inspecting the actual repository. Departures from the agreed process or product scope must be explicit and reasoned.
