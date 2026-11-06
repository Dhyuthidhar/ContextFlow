# PR 1 Remediation Record

**Owner:** ContextFlow Engineering

**Status:** Implemented on `codex/contextflow-pr1-baseline`; pending CTO review and merge approval

**Baseline:** `4b27fb7b26b72e3169ced75a57177f1489e9d0f9`

**Scope:** CI, inherited lint remediation, dependency security, and offline test configuration only

## Outcome

PR 1 now has repeatable GitHub Actions gates for the Python 3.11 deterministic contracts, Python and npm dependency audits, frontend typecheck, zero-warning lint, a normal Next.js production build, and repository secret scanning. The workflow does not use `--no-lint`, live service credentials, external AI calls, migrations, or deployments.

## Dependency security decisions

- Next.js was upgraded from unsupported `14.2.35` to the supported security backport `15.5.29`. The application retains React 18, which is supported by this Next.js release. Dynamic page and route parameters were updated for the Next.js 15 asynchronous parameter contract.
- Next.js pins an older compatible PostCSS release internally. The lockfile uses npm's documented override mechanism to resolve all PostCSS consumers to patched `8.5.32`; the normal production build verifies this combination.
- Non-breaking npm audit fixes upgraded vulnerable transitive `nanoid`, `source-map-js`, and `ws` packages. The production dependency audit reports zero vulnerabilities.
- Six moderate development-only `minimatch` findings remain under the inherited ESLint/TypeScript parser toolchain. They are not included in the production dependency graph and are not invoked on untrusted application input. Resolving them requires a separate ESLint toolchain migration; CI reports them and blocks any high or critical finding.
- Unused direct dependency `crewai==0.5.0` was removed. No repository source imports CrewAI; its transitive LangChain/LangSmith graph accounted for most Python findings.
- Reachable PDF parsing was upgraded from `pypdf==4.1.0` to patched `6.21.4`. `python-dotenv`, `pytest`, and `pytest-asyncio` were also upgraded to patched compatible versions. The strict Python audit reports no known vulnerabilities.

## Compatibility and regression controls

- Existing upload validation, zero-chunk partial-failure reporting, MCP schemas, project-scoped query forwarding, and Python subprocess behavior were not changed.
- Lint fixes replace untyped JSON values with narrow response shapes and correct the upload drop callback dependency. They do not alter response fields or control flow.
- Tests inject a non-secret `utils.config` module before application imports. This removes credential-shaped environment constants while retaining the production configuration interface and the deterministic network block.
- The inherited Playwright suite requires live Supabase data and includes a project-creation mutation. It is intentionally not a CI gate under PR 1's offline/no-live-data boundary.

## Verification commands

Run from the repository root unless a working directory is shown:

```bash
PYTHON_BIN=/path/to/python3.11 SKIP_FRONTEND=1 ./run_tests.sh
/path/to/python3.11 -m pip check
/path/to/python3.11 -m pip_audit -r backend/requirements.txt --strict
cd frontend && npm ci
cd frontend && npm audit --omit=dev --audit-level=high
cd frontend && npm audit --audit-level=high
cd frontend && npm run typecheck
cd frontend && npm run lint
cd frontend && npm run build
```

The build requires non-secret placeholder values for the four build-time environment variables shown in the CI workflow. These values are used only to validate compilation and static generation; no service call is made during the build.

## Remaining limitations

- The deterministic suite covers 14 offline contracts. Ten live integration tests and the inherited live-data Playwright suite remain opt-in and were not executed.
- Supabase and AI provider integration behavior is not proven by this PR because access to live services is outside the approved scope.
- Nineteen inherited Pydantic v2 deprecation warnings originate in the pinned Supabase client dependency graph.
- Preview deployment, migration verification, and production observability remain outside PR 1 and require separate authorization.

## Rollback

Revert the PR 1 remediation commit. This restores the previous dependency lockfile, lint configuration, test configuration, and removes the CI workflow. No database, storage, environment, or deployment rollback is required because this change performs no infrastructure or data mutation.
