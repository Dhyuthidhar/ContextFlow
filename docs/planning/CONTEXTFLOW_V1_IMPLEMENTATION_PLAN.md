# ContextFlow V1 — Railway-first detailed implementation plan

**Version:** 1.0<br>
**Prepared:** 2026-11-06<br>
**Decision status:** Approved implementation plan; implementation, provisioning, migration, deployment, and merge require separate approval<br>
**Decision owner:** ContextFlow CTO<br>
**Document owner:** ContextFlow CTO<br>
**Authority:** [ADR-001 target architecture](../architecture/adr/ADR-001-railway-first.md) and the [ContextFlow V1 Product and Implementation Specification](../product/CONTEXTFLOW_V1_PRODUCT_AND_IMPLEMENTATION_SPEC.md)<br>
**Existing work:** PR #1 `codex/contextflow-pr1-baseline` (open, unmerged); stacked PR #2 `codex/contextflow-pr2a-design-system` (open, unmerged). Current checkout has 29 tracked deletions and must remain untouched.

## A. Definition of the V1 outcome

An approved internal company member can sign in using Google Workspace, receive explicit ContextFlow approval and project grants, upload an authorized source document, deduplicate repeated content, propose and approve revision/decision changes through controlled workflows, and retrieve **current, cited, authorized** context in the UI and via an authenticated coding-agent integration. A coding agent checks whether task-relevant context changed before edit/PR submission; OMNIX synthetic/authorized fixtures demonstrate conflict handling and no cross-project data leakage.

V1 **does not** require multi-company SaaS billing, a redesign of the existing dashboard, live production OMNIX modification, blanket replacement of all code, or an always-on AI agent.

## B. Gate 0 — Close baseline and design dependencies

**Prerequisites, not new implementation authorization:**

- Review PR #1, establish whether deterministic tests/typecheck are trustworthy, assess existing security advisories; approve merge separately.
- When PR #1 merges, retarget/rebase stacked PR #2 onto `main`, recheck actual diff, design/keyboard/a11y tests, and lint/dependency findings. Merge separately after review.
- Complete the sequence **PR #1 → PR #2A → authentication → authorization**. Authentication establishes a principal; authorization must deny real product-data access until project membership enforcement is complete.
- Select the **controlling playbook**; reconcile development branch flow with current `main` and the project-specific security gates.
- Record ADR-001 and this plan through the approved documentation PR. Documentation merge remains separately approved and does not authorize implementation.
- Preserve the original dirty checkout and untracked OMNIX SQL.

**Exit:** clean, reproducible baseline; approved visual contracts; documented unresolved security/advisory backlog; agreed next base branch.

## C. Dependency and bounded-PR map

This numbering is a **proposal** for Codex to confirm after the read-only audit. Split work whenever migration/testing/rollback risk warrants smaller PRs.

| Order | Module → Feature | Proposed issues | Deliverable / user journey | Main dependency |
|---|---|---|---|---|
| P0 | Architecture → ADR/contract | CF-INF-01, CF-INF-02 | ADR, current-to-target adapter map, costs, risks, data classification | Gate 0 |
| P1 | Identity → Workspace OIDC | CF-AUTH-01, CF-AUTH-02 | Secure sign-in, session/logout, Owner bootstrap, pending user experience | PR #1 and PR #2A complete; OIDC domain & session contract |
| P2 | Access → Org RBAC + project membership | CF-IAM-01…06 | Approval, roles, project grants, deny by default, audit; role explanations match backend | P1 |
| P3 | Persistence → PostgreSQL portability | CF-DATA-01…03 | Supabase data/RPC uses standard typed Postgres adapters; dual-project isolation | P2 auth contract |
| P4 | Search → pgvector | CF-SEARCH-01…03 | Secure, cited, project-scoped semantic retrieval | P3 + verified extension |
| P5 | Storage → private S3 adapter | CF-STOR-01…03 | Object upload/download with checksums, authorization, immutable IDs | P2/P3 |
| P6 | Documents → identity and versions | CF-DOC-01…06 | Dedupe, owner revision, proposed non-owner revision, diff/history, no active double index | P5 |
| P7 | Decisions → conflicts, approval, audit | CF-DEC-01…05, CF-AUD-01…03 | Owner approval, supersession, provenance and audit history | P2/P6 |
| P8 | Context → approved/current retrieval | CF-CTX-01…05 | Cited current truth, assumptions and unverified findings clearly separated | P4/P7 |
| P9 | Agent → authenticated MCP + freshness | CF-AGT-01…05 | Task-scoped context, pre-edit/pre-PR change checks, acknowledgment | P8 |
| P10 | Reliability/operations → Railway deployment design | CF-OPS-01…04 | IaC draft, sizing, environment separation, health checks, backups, restore plan | P3/P5; live changes separately approved |
| P11 | Validation → synthetic/authorized OMNIX | CF-OMX-01…05 | Observe conflict, approval, stale agent context, denied project B, costs | P6–P9 |

**Parallelism:** Do not implement P3–P6 while authorization boundaries remain untested. Frontend design components can be consumed incrementally. Architecture tests/migration fixtures can be drafted without live resources. Split P2 into org identity/approval and project/RLS enforcement if needed.

## D. Detailed module contracts and acceptance criteria

### P1 — Google Workspace identity and sessions

**Outcome:** Every human request has a validated, stable principal; unapproved employees cannot enter the dashboard.

**Required contract:** Maintained OIDC/session framework; `sub`-based identity; signed Google `hd` verified against allowlisted Workspace domain; state/nonce/PKCE validation; secure HttpOnly SameSite cookies; CSRF/session-fixation review; logout and session expiry; no public registration; `PENDING/ACTIVE/DISABLED` account state; auditable controlled Owner bootstrap. New employee access can be approved by Owner or Admin; no default project memberships. Workspace revocation delay is addressed by ContextFlow disable and bounded session validity, **not** a claim of instant Google sync.

**Proof:** tampered/expired token rejected; hosted-domain mismatch rejected; verified email domain alone insufficient; unknown employee pending; disabled employee denied even with session; no secrets in browser bundle/logs; CSRF negative tests; isolated callback tests. No silent account auto-deletion.

### P2 — RBAC and authorization, independent of frontend styling

**Outcome:** An actor may access only authorized resources; governance promotions are protected.

**Organization permissions:** Owner, Admin, Member. Admin can approve ordinary employee accounts, assign project access, and *propose* Admin promotion/demotion. **Owner approval is mandatory** before Admin role changes. Owner transfer is a protected separate action. Project roles (Project Admin, Developer, Reviewer) have explicit capabilities; AI agents have separate scoped principals. Owner approves protected product requirement changes, with any required client sign-off tracked separately.

**Proof:** two projects/two users plus agent principals. Check all Next pages/API, Python/MCP, CLI, SQL/vector, object, background job paths. `401` vs `403` correct; no metadata leaks. Project ID substitution denied. Revocation effective next request (bounded session cache). Non-owner DB runtime role; RLS or equivalent verified with real **isolated** PostgreSQL role/session tests. Audit allowed/denied role transitions and no self-approval.

### P3–P4 — PostgreSQL repository and secure vector retrieval

**Outcome:** No active Supabase client/RPC dependency; project filtering and ranking have same explicit authorization contract.

**Work:** Inventory every browser and backend Supabase `.from/.rpc/storage` call; refactor browser direct DB access into authorized server APIs; create parameterized SQL repositories; adapt vector similarity functions without Supabase's `auth.uid()`; preserve source/version and evidence references; migrations incremental, additive where possible. Use a designated non-owner runtime role. Connection pools and actor transaction-local context must not bleed between users; use transaction-scoped claims only through trusted server code.

**Proof:** schema/migration up/down, 2-project cross-scope SQL tests, query rank/provenance correctness, no unscoped fallback, no external Supabase calls, rejected role bypass, no connection actor leakage, existing upload/query/CLI behavior preserved as applicable. Verify selected Railway pgvector PostgreSQL image *before provisioning* via vendor docs; execute against disposable local matching Postgres container first.

### P5–P6 — S3 storage, document identity and versions

**Outcome:** Upload once; identical content doesn't create active duplicates; revisions retain immutable history.

**Work:** Private S3-compatible adapter; immutable checksum/version object naming; stable logical document ID; immutable version IDs; stored checksum; owner and uploader; exact duplicate detection scoped to the authorized document/project; related/similar documents flagged without auto-merging; revised content creates draft/proposed version with diff; indexing status `PENDING/INDEXING/READY/PARTIAL/FAILED`, retry reconciliation and idempotency; chunks reference immutable version+source location. Protected requirements need independent approval even if uploader owns doc.

**Proof:** same filename different bytes, different filename same bytes, concurrent duplicate upload, failed object/database step, zero extracted chunks, partial indexing retry, source verification, unauthorized signed URL, object never overwritten silently, exact duplicate doesn't re-embed. Storage/bucket existence must never become cross-project information leak.

### P7 — Decision governance and audit

**Outcome:** Human-proposed intent cannot silently overwrite an approved rule.

**Work:** proposed/clarification-needed/conflict/approved/rejected/superseded states; cited source version; approver identity and authority check; mandatory reasoning and effective timestamp; append-only audit records; conflict review and client sign-off separation. Document owner can submit revision but not bypass protected decisions.

**Proof:** unauthorized approval, stale approval, double-click/retry and concurrent approval, self-approval policy, supersession lineage, reconstructed history, immutable audit, redacted logs.

### P8–P9 — Context retrieval and agent freshness

**Outcome:** Agent receives only current and authorized context with evidence types and detects relevant updates.

**Work:** Separate approved requirements, current decisions, pending proposals, code-read inference, test-verified evidence, assumptions and unknowns. Retrieval returns immutable source/version/section citations and context digest. MCP tools (names may vary): `get_context`, `inspect_changes`, `propose_decision`, `acknowledge_update`. Agent acts under explicit principal/grant; no secret exposure or broad default project query. Define client-compatible MCP transport and bounded polling/pre-edit/pre-PR hook checks; do not promise unsolicited always-on notification.

**Proof:** conflicting proposal cannot outrank approved decision; superseded chunk omitted from current context; version citation stable; relevant digest change blocks affected work until reviewed/acknowledged; irrelevant change not blocking; unauthorized cross-project embeddings excluded; agent credential cannot impersonate developer.

### P10–P11 — Operations and end-to-end proof

**Outcome:** Evidence-backed launch readiness and bounded per-user costs, not deployment by assumption.

**Work:** Draft Railway service topology, health/readiness probes, nonsecret config sample, private networking, RAM sizing, separate worker if measured necessary, backup/PITR and restore rehearsal. Confirm pgvector image patching, connection pooling and recovery. Synthetic OMNIX data first; real OMNIX artifacts only after contractual/processing approval. Demonstrate cancel/reservation requirement conflict is classified as candidate or code-read observation, not an already approved client rule.

**Proof:** fully isolated end-to-end journey, manual review, cross-project denial, measurable storage/AI/infrastructure use, real restore evidence before launch, load/cold-start observation, reversal plan.

## E. Costs, resource budgets and validation

Codex's **modeled gross monthly** starting points (10/25/50 developers): **$11/$18/$30** including infra and AI API use; **not verified** and excludes engineering labor. Original assessment notes ±50% confidence, 100 documents per developer, 10 new/revised documents per developer/month, 20 queries/developer/day, ~250 KB average source files and 15 chunks/document. Validate assumptions against a one-week internal pilot.

**Cost gates:**

1. Verify actual Railway plan and unused included credits; never net off unknown credits.
2. Inventory memory use of existing projects; workspace cost is primarily RAM-driven.
3. Set a proposed **incremental** monthly budget and alert thresholds for CTO approval before provisioning (no arbitrary commitment here).
4. Quantify memory, vCPU, volume, backups, service egress, bucket object storage, model tokens, and idle cost separately.
5. SHA-256 exact dedupe; model-versioned embeddings; safe reuse of unchanged chunks; batched embeddings; SQL before model calls; no retried duplicate paid jobs; bounded background concurrency; per-project request/cost instrumentation.
6. Re-estimate after measured load and compare cash + maintenance burden with keeping Supabase.

**Do not optimize away** confidential-data isolation, audit, restore capability, required context provenance, or permission checks.

## F. Migration methodology — design only at this stage

1. **Inventory:** determine all existing Supabase projects, tables/functions/RLS/storage objects, dependency versions, indices and data volumes **without using live credentials until separately authorized**. Distinguish blank prototype from populated project.
2. **Contract freeze:** establish schema/API/identity/storage contracts and expected retrieval outputs; make deterministic fixtures.
3. **Portable adapters:** introduce SQL/S3 ports with compatibility tests on synthetic data, retaining existing behavior behind isolated branches.
4. **Local target:** disposable matching Postgres+pgvector, fake/test S3, migrations, seeded dual-project identities, secure query tests.
5. **Rehearsal:** approved synthetic export/import and rollback, verify row/object/vector counts and content SHA-256, test failure halfway, restore backup.
6. **Cutover proposal:** only after live-data inventory and data-processing permission; document downtime, change freeze, reversible source-of-truth switch, checkpoints and rollback.
7. **Separate approvals:** provisioning, live credentials, copy of customer data, production migration, deployment, and merge are distinct explicit gates.

## G. Review and delivery discipline

For **every PR** include: outcome, current vs expected behavior, authoritative state, full affected journey (UI→API→service→DB/storage), threat model, preserved invariants, assumptions/unknowns, exact acceptance cases, tests run and outputs, backward compatibility, migration/down plan, projected incremental spend and rollback. Require no live service calls in deterministic tests. Respect inherited app behavior and the Playbook's Module → Feature → Task → GitHub Issue organization.

**Mandatory sequencing of approvals:**

- CTO review: approve contract and bounded PR scope **before implementation**.
- Code review: inspect diff, run/inspect evidence; **merge separately approved**.
- Infrastructure/security review: **provision separately approved**.
- Deployment and migration: **separately approved**.

## H. Next Codex request — planning only

```text
ContextFlow V1 target architecture ADR-001 is approved for design:
Railway Next.js/Python, Railway PostgreSQL with pgvector, Railway S3-compatible Buckets, and Google Workspace OIDC. No live infra or code migration is authorized.

Read ADR-001, the V1 product specification, the authoritative playbook once CTO confirms it, the current Supabase dependency audit, and PR #1/#2 status. Produce a bounded technical design for the FIRST implementation slice (Google OIDC and account approval), including actual repo paths, actor/session and onboarding contracts, maintained auth-library comparison, initial Owner bootstrap, security tests, current/target sequence diagrams, rough engineering effort, and rollback. Explicitly leave project/RLS authorization for the next security slice, but prevent any real data access while that boundary is incomplete. Also update the PR dependency graph and identify technical decisions that still require CTO approval.

Planning only: no code edits, GitHub changes, merges, infrastructure provisioning, package installation, new credentials, database connections, migrations, deployment or real data access. Return for CTO approval.
```

## I. Open decisions needing explicit owner input

- Authoritative playbook variant and Git base convention.
- Google Workspace allowed hosted domain and bootstrap Owner identity; avoid embedding identifying email addresses in public documents.
- Maintained Google OIDC/session library and mechanism for MCP/CLI service principals.
- Confirm exact project role capabilities and delegation.
- Railway region, qualified pgvector image, backups/restore and acceptable RPO/RTO.
- Whether existing Supabase has any state requiring preservation.
- Approval to process actual OMNIX data; model-provider data handling terms.
- Monthly incremental budget and alert thresholds.

**Current status:** ADR and implementation plan approved as target documentation; no code, migration, provisioning or deployment is performed or authorized by these documents.
