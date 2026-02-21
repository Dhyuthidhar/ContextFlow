-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY documents_bucket_insert ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (metadata->>'size')::integer <= 10485760
    AND (metadata->>'mimetype') IN ('application/pdf', 'text/markdown', 'text/plain')
);

CREATE POLICY documents_bucket_select ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Seed: generic principles
INSERT INTO principles (user_id, content, type, category, source, confidence_score, embedding) VALUES

-- auth
(NULL, 'Set JWT access token expiry to 15 minutes and always issue a refresh token; short-lived access tokens limit the blast radius of token theft.', 'lesson', 'auth', 'generic', 0.50, NULL),
(NULL, 'Rotate refresh tokens on every use and invalidate the previous token immediately; this prevents refresh token replay attacks.', 'pattern', 'auth', 'generic', 0.50, NULL),
(NULL, 'Invalidate all active sessions when a user changes their password; assume the old password was compromised.', 'decision_framework', 'auth', 'generic', 0.50, NULL),
(NULL, 'Always validate the OAuth state parameter on callback to prevent CSRF attacks; generate it as a cryptographically random value per request.', 'pattern', 'auth', 'generic', 0.50, NULL),
(NULL, 'Never store plaintext secrets, passwords, or API keys; use bcrypt (cost 12+) for passwords and a secrets manager for API keys.', 'lesson', 'auth', 'generic', 0.50, NULL),

-- payment
(NULL, 'Pass an idempotency key on every Stripe API call that creates or modifies a charge; this prevents duplicate charges on network retries.', 'pattern', 'payment', 'generic', 0.50, NULL),
(NULL, 'Verify Stripe webhook signatures using the signing secret before processing any event; reject requests with invalid signatures with a 400.', 'pattern', 'payment', 'generic', 0.50, NULL),
(NULL, 'Never log card numbers, CVVs, or full PANs anywhere in your stack; log only the last four digits and card brand for debugging.', 'lesson', 'payment', 'generic', 0.50, NULL),
(NULL, 'Use Stripe test mode with test clock objects in CI pipelines; never make real charges in automated tests.', 'decision_framework', 'payment', 'generic', 0.50, NULL),
(NULL, 'Handle partial refunds explicitly in your business logic; do not assume a refund always equals the full charge amount.', 'error_solution', 'payment', 'generic', 0.50, NULL),

-- api
(NULL, 'Version all API endpoints from day one using a URL prefix (e.g. /v1/); retrofitting versioning onto an unversioned API is extremely costly.', 'decision_framework', 'api', 'generic', 0.50, NULL),
(NULL, 'Return HTTP 422 Unprocessable Entity for validation errors, not 400 Bad Request; 422 signals the request was well-formed but semantically invalid.', 'pattern', 'api', 'generic', 0.50, NULL),
(NULL, 'Rate limit by authenticated user ID, not by IP address; IP-based limiting is easily bypassed and punishes users behind NAT.', 'decision_framework', 'api', 'generic', 0.50, NULL),
(NULL, 'Include a unique request-id header in every API response; this enables end-to-end tracing across logs, clients, and support tickets.', 'pattern', 'api', 'generic', 0.50, NULL),
(NULL, 'Document every error code your API can return with its cause and resolution; undocumented errors force clients to guess at retry logic.', 'lesson', 'api', 'generic', 0.50, NULL),

-- database
(NULL, 'Create a B-tree index on every foreign key column; unindexed FKs cause full table scans on every join and cascade delete.', 'pattern', 'database', 'generic', 0.50, NULL),
(NULL, 'Never run a migration in production without a tested rollback script; every forward migration must have a corresponding down migration.', 'decision_framework', 'database', 'generic', 0.50, NULL),
(NULL, 'Configure connection pooling with a max pool size of 10 per service instance; unbounded pools exhaust database connections under load.', 'pattern', 'database', 'generic', 0.50, NULL),
(NULL, 'Run EXPLAIN ANALYZE on any query before adding an index; indexes have write overhead and are only justified by measurable read gains.', 'decision_framework', 'database', 'generic', 0.50, NULL),
(NULL, 'Use soft-delete (deleted_at TIMESTAMPTZ) over hard-delete for user-owned data; hard deletes make audit trails and recovery impossible.', 'lesson', 'database', 'generic', 0.50, NULL),

-- frontend
(NULL, 'Always return a cleanup function from useEffect when subscribing to external data sources; missing cleanup causes memory leaks and stale state.', 'error_solution', 'frontend', 'generic', 0.50, NULL),
(NULL, 'Lazy load all route-level components by default using dynamic imports; this reduces initial bundle size and improves time-to-interactive.', 'pattern', 'frontend', 'generic', 0.50, NULL),
(NULL, 'Debounce all search and filter inputs with a 300ms delay; firing a request on every keystroke wastes bandwidth and degrades UX.', 'pattern', 'frontend', 'generic', 0.50, NULL),
(NULL, 'Colocate state with the component that owns and mutates it; lifting state unnecessarily causes prop drilling and unnecessary re-renders.', 'decision_framework', 'frontend', 'generic', 0.50, NULL),
(NULL, 'Validate all required environment variables at build time and fail fast if any are missing; missing env vars cause silent runtime failures in production.', 'lesson', 'frontend', 'generic', 0.50, NULL),

-- security
(NULL, 'Set Strict-Transport-Security on all HTTPS responses with a max-age of at least one year; this prevents protocol downgrade attacks.', 'pattern', 'security', 'generic', 0.50, NULL),
(NULL, 'Sanitize all user-generated content before rendering it in the DOM; unsanitized content enables stored XSS attacks.', 'lesson', 'security', 'generic', 0.50, NULL),
(NULL, 'Rotate all API keys and secrets immediately when any team member with access departs; treat departures as a potential credential exposure event.', 'decision_framework', 'security', 'generic', 0.50, NULL),
(NULL, 'Set an explicit Content-Type header on every HTTP response; missing content-type headers allow browsers to MIME-sniff and execute malicious content.', 'pattern', 'security', 'generic', 0.50, NULL),
(NULL, 'Default to deny-all in authorization logic and explicitly allow permitted actions; allowlist-based access control is far safer than denylist-based.', 'decision_framework', 'security', 'generic', 0.50, NULL),

-- deployment
(NULL, 'Use blue-green deployments to achieve zero-downtime releases; always keep the previous version live until the new version passes health checks.', 'pattern', 'deployment', 'generic', 0.50, NULL),
(NULL, 'Tag every Docker image with the full git commit SHA; using mutable tags like latest makes rollbacks and audits unreliable.', 'lesson', 'deployment', 'generic', 0.50, NULL),
(NULL, 'Require a passing health check endpoint before routing any traffic to a new deployment; routing to an unhealthy instance causes user-facing errors.', 'pattern', 'deployment', 'generic', 0.50, NULL),
(NULL, 'Store all secrets in environment variables or a secrets manager, never in the repository; secrets in git are permanently compromised even after deletion.', 'lesson', 'deployment', 'generic', 0.50, NULL),
(NULL, 'Automate rollback when the error rate exceeds a defined threshold (e.g. 1%) for more than two minutes; manual rollback decisions are too slow under incident pressure.', 'decision_framework', 'deployment', 'generic', 0.50, NULL),

-- error_handling
(NULL, 'Never swallow exceptions silently with an empty catch block; at minimum log the error with its stack trace and propagate or surface it.', 'lesson', 'error_handling', 'generic', 0.50, NULL),
(NULL, 'Log every error with its full stack trace and the user context (user_id, request_id, endpoint) at the time of failure; context-free logs are unactionable.', 'pattern', 'error_handling', 'generic', 0.50, NULL),
(NULL, 'Classify all errors as retryable or fatal at the point of handling; retryable errors should trigger backoff logic, fatal errors should alert immediately.', 'decision_framework', 'error_handling', 'generic', 0.50, NULL),
(NULL, 'Surface a correlation ID to the end user on every error response; this allows support to locate the exact log entry without exposing internal details.', 'pattern', 'error_handling', 'generic', 0.50, NULL),
(NULL, 'Apply exponential backoff with jitter on all retryable operations; fixed-interval retries cause thundering herd problems under load.', 'error_solution', 'error_handling', 'generic', 0.50, NULL),

-- testing
(NULL, 'Write tests that assert observable behavior and outcomes, not internal implementation details; behavior tests survive refactoring, implementation tests do not.', 'decision_framework', 'testing', 'generic', 0.50, NULL),
(NULL, 'Limit each test case to a single logical assertion; multiple assertions per test obscure which condition caused a failure.', 'pattern', 'testing', 'generic', 0.50, NULL),
(NULL, 'Seed the database to a known state before each integration test and tear it down after; shared mutable state between tests causes flaky, order-dependent failures.', 'pattern', 'testing', 'generic', 0.50, NULL),
(NULL, 'Mock external third-party services in tests, not your own internal modules; mocking internals couples tests to implementation and hides integration bugs.', 'decision_framework', 'testing', 'generic', 0.50, NULL),
(NULL, 'Measure test coverage by critical user paths and business logic, not by raw line count; 100% line coverage with no path coverage is a false sense of safety.', 'lesson', 'testing', 'generic', 0.50, NULL),

-- performance
(NULL, 'Cache responses at the CDN edge rather than the application origin; edge caching reduces latency globally and offloads origin servers.', 'pattern', 'performance', 'generic', 0.50, NULL),
(NULL, 'Lazy load all images below the fold using the loading="lazy" attribute or an IntersectionObserver; eager loading off-screen images wastes bandwidth on initial load.', 'pattern', 'performance', 'generic', 0.50, NULL),
(NULL, 'Paginate all list API endpoints with a default page size of 20 and a maximum of 100; unbounded list responses cause memory exhaustion and slow clients.', 'decision_framework', 'performance', 'generic', 0.50, NULL),
(NULL, 'Profile and measure before optimizing any code path; premature optimization wastes engineering time and often optimizes the wrong bottleneck.', 'lesson', 'performance', 'generic', 0.50, NULL),
(NULL, 'Set a database statement timeout of 5 seconds on all application connections; runaway queries block connection pool slots and degrade the entire system.', 'pattern', 'performance', 'generic', 0.50, NULL);
