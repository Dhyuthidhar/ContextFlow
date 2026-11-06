# ADR-001 — Railway-first infrastructure for ContextFlow V1

**Version:** 1.0<br>
**Date:** 2026-11-06<br>
**Status:** **Approved target architecture; implementation and deployment NOT authorized**<br>
**Decision owner:** ContextFlow CTO<br>
**Document owner:** ContextFlow CTO<br>
**Scope:** Internal company developers; ContextFlow V1<br>
**Related sources:** [ContextFlow V1 Product and Implementation Specification](../../product/CONTEXTFLOW_V1_PRODUCT_AND_IMPLEMENTATION_SPEC.md); Codex read-only `ContextFlow V1 infrastructure and cost assessment` (2026-11-06); ContextFlow PR #1 and stacked PR #2.

## 1. Decision

ContextFlow V1's **target** infrastructure will use:

- **Railway** for the Next.js application and Python backend/runtime.
- **Railway PostgreSQL** with a verified compatible **pgvector** image/extension for relational records, source metadata, decisions, RBAC, audit events, and vector retrieval.
- **Railway Buckets** using S3-compatible interfaces for private, immutable source document objects.
- **Google Workspace OIDC** for employee authentication, using a maintained standards-compliant Next.js authentication/session integration. Google manages passwords/MFA; ContextFlow owns its sessions, account approval, roles, and authorization.
- Standard PostgreSQL, S3-compatible storage, and OIDC interfaces to limit lock-in.

**Supabase is not required for the target design.** Its current usage remains part of the existing prototype until a separately approved, tested migration is implemented. **This decision does not authorize resource creation, changes to live infrastructure, code migration, production credential access, database modification, deployment, or merging PRs.**

## 2. Context and reasons

Current code depends on Supabase browser/admin clients, Storage, RPCs, an MVP user ID, and a Python MCP subprocess. There is not yet an implemented human authentication/project-membership boundary. Retaining Supabase would avoid some migration work but would **not** eliminate work on identity, RBAC, or secure agent context.

The company already uses a paid Railway workspace and manually administers Google Workspace. The read-only Codex assessment reported workspace-wide usage of **$133.37** for the current billing period to date and **$181.79** projected, with memory representing **$124.23** of charges to date. Unused plan credit and exact subscription tier were **not verified**. The modeled **gross incremental** V1 spend was ~$11 / ~$18 / ~$30 monthly for 10 / 25 / 50 developers; these are assumptions, **not invoices or performance measurements**, and exclude maintenance labor. Codex estimated roughly **15–22 engineer-days** one-time for Railway + direct OIDC, excluding approvals and live-data migration.

Primary objectives: credible security boundaries, minimal recurring vendor overhead, predictable operating cost, recoverability, portable interfaces, and no premature rewrite of the product.

## 3. Logical target topology

```text
Employee browser ── Google Workspace OIDC ──> Next.js on Railway
                                                │ secure session / actor
                                                ▼
                                        ContextFlow API boundary
                                                │ private service transport
                                                ▼
                                      Python service on Railway
                                        ├─ PostgreSQL + pgvector
                                        ├─ private Railway S3 Bucket
                                        └─ approved external AI APIs (only when needed)

Claude/Codex ── independently authenticated task/agent principal ──> authorized API/MCP boundary
```

**Deployment qualification:** The current Next.js → locally spawned Python MCP bridge is not automatically suitable for two Railway services. Evaluate a supported API/service transport plus separately authenticated MCP integration; do not treat a stdio subprocess as a reachable remote service. Design this contract before deploying two services. Do not expose a raw, unauthenticated MCP endpoint.

## 4. Alternatives considered

| Alternative | Benefit | Cost / risk | Decision |
|---|---|---|---|
| Railway app + Supabase Free Auth/DB/Storage | Least immediate rewrite | Free-tier quotas, pausing/backups, two control planes, Supabase-specific interfaces | Retain as fallback for prototype or migration bridge |
| **Railway app + Postgres/pgvector + Buckets + Google Workspace OIDC** | Existing company infra; portable data/storage standards; one main operations platform | Upfront adapter migration; session security; database backup/restore responsibility | **Approved target** |
| Railway app/data/storage + external managed auth | Reduces identity/session implementation work | Extra provider and potentially recurring auth charges; still need internal RBAC | Contingency if maintained direct OIDC stack cannot meet security gates |
| Firestore/Firebase replacement | Potential no-cost allowances | Material relational/vector migration and authorization redesign | Not selected for V1 |

This choice favors target simplicity **only if the qualification tests pass**. If migration risk or measured total cost proves unfavorable, return to the CTO with a comparison; no automatic switch.

## 5. Non-negotiable boundaries

### Identity and authorization

- Validate OIDC issuer, audience, signature, expiry, nonce/state/PKCE, verified Workspace hosted-domain (`hd`) claim and `email_verified` where applicable. Use Google's stable `sub` identifier; email is descriptive, not the primary key.
- No public signup; a legitimate Workspace identity is **not** automatic ContextFlow access. Employee onboarding requires prior Owner/Admin approval. Maintain `PENDING`, `ACTIVE`, `DISABLED` and auditable state transitions.
- Organization Owner/Admin/Member and project-specific permissions are distinct. Role explanations in UI must match actual backend capabilities. An Admin may **propose** Admin promotion/demotion; an Owner must approve before it takes effect. Both Owner and Admin can approve ordinary employee accounts. Protected product-rule approval remains Owner-only unless later formally delegated; client sign-off is separate.
- Google Workspace suspension must block access when identity becomes invalid; handle delayed revocation with short-lived sessions, explicit ContextFlow disabling and server-side checks, without automatic deletion of documents/ownership/audit history.
- Agents are explicit principals with scoped grants, revocation, and task attribution; no implicit developer impersonation.

### Database, storage and isolation

- The database's active memberships/permissions are authoritative. Check project grants at **every** page/API/MCP/CLI/job/SQL/vector/object boundary. User-supplied `project_id` is never proof of access.
- Runtime database credentials must be least-privilege, not table owner or `BYPASSRLS`. Verify RLS or an equivalent database-enforced protection using **real isolated Postgres tests**, including cross-project vectors. Any transaction-local actor context must be set exclusively by a trusted server boundary, never accepted as arbitrary client SQL/session state.
- Private bucket, immutable versioned object keys, checksum verification, size/content restrictions, authorized reads, short-lived signed URLs. Object-store state and database metadata require idempotent/reconcilable writes.
- Document ownership permits draft revision; it never silently supersedes an approved product requirement. Similarity suggests a relationship, not automatic document merge. Exact checksums allow dedupe *within authorized scope* while avoiding disclosure of other projects' object existence.

### Security, audit and recovery

- Append-only app-level audit events for important auth, data, decision and agent actions; no access tokens, raw secrets, or unnecessary document content in logs.
- Separate development and production secrets; no production credentials in isolated tests. No public database endpoint by default; confirm provider support for private networking and database images.
- Verify pgvector extension support, update/patch ownership, migration/rollback, backups and PITR compatibility **for the chosen image**, not a generic Railway Postgres claim. Restore a synthetic backup before live use. Retention and RPO/RTO are **not yet approved** (assessment proposed RPO <=15 min / RTO <=4 h).
- Vendor SOC 2 attestations do not certify ContextFlow's own security controls, client-data authorization, or company audit readiness.

### Cost controls

- Treat new Railway usage as fully incremental until billing credit is verified. Measure RAM first; cap and monitor idle services.
- Avoid an extra dedicated vector DB; re-use Postgres/pgvector if testing qualifies it. Use checksum and model-version keyed embedding caches; batch embeddings; index changed chunks only where safe; deterministic filtering before paid model calls; bounded/idempotent jobs; hard spend alerts and per-project usage attribution.
- Review incremental cash, AI API, reliability and engineering labor cost; do not treat a $0 line item as proof of lowest total cost.

## 6. Explicitly deferred decisions / blockers

1. Authoritative Project Standards Playbook version and target PR base (`main` versus any `staging` convention).
2. Actual Railway subscription, unused credits, suitable region and allowed client-data residency.
3. Approved Workspace hosted domain, initial Owner bootstrap and emergency account recovery.
4. Chosen maintained OIDC/session library, session TTL/revocation, and agent credential carriage for active MCP clients.
5. PostgreSQL/pgvector image qualification, ownership of patching, PITR/backup/restore verification, resource sizing.
6. Real Supabase inventory and whether current content needs migration; **never assume empty**.
7. Required client permissions for OMNIX artifacts and external AI subprocessors.
8. Retention/deletion, backup and audit-preservation schedules; RPO/RTO and operational ownership.
9. Current AI-model availability and quality/cost tradeoffs; model price assumptions need revalidation.
10. Frontend/API-to-Python topology and production-safe MCP transport.

## 7. Acceptance conditions for subsequent implementation approval

An implementation proposal must contain a Module → Feature → Task → GitHub Issue → bounded PR map; actor and authorization contract; exact affected files and data paths; migration/backfill and rollback plan; isolated security matrix; cost upper-bound assumptions; evidence from deterministic and **isolated real database** tests; deployment/restore runbook; and clear source-of-truth mapping. No live data exposure or unapproved resource creation.

## 8. Status and consequences

**Approved now:** the target technology selection and production of a detailed design/implementation plan.<br>
**Not approved now:** committing the migration, provisioning, changing credentials, touching live databases, deploying, merging, or migrating data.<br>
**Status remains conditional:** if acceptance criteria materially fail, submit an ADR amendment with evidence and alternatives.
