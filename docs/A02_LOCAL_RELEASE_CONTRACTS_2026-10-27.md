# A02 local release contracts, 27 October 2026

Status: PARTIAL. This change improves local release-health verification; it does
not establish application rollback, provider rollback or production acceptance.

## Baseline and ownership

This lane cloned main at `a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d` into its
own checkout and uses branch `task/a02-rollback-contract-20261027`. Issue523 was
read before changes, including coordination comment6453043760. Existing-service
HTTP health configuration remains with the other chat (comments6452498759,
6452531505 and6453032855). No live setting, native release entrypoint, application
controller, governance/runtime source, CI, dependency manifest, lock or Docker
file is changed here. The current tree contains no AGENTS.md or .agents skills.

## Actual-source evidence

The existing `scripts/render-release-contract.test.mjs` initially passed5/9 and
failed4/9 on this Mac. Its child processes returned `/private/var/...` while the
temporary fixture was named `/var/...`: these are the same directory. Canonicalize
the newly created fixture with `realpathSync` before constructing child paths.
Exact root comparisons, scoped build commands and fail-stop assertions remain.
No production build behavior changes.

`apps/api/scripts/health-release-contract.test.cjs` transpiles and executes the
actual HealthController source using the locked TypeScript package, real Nest
decorators and real ServiceUnavailableException. A query-only database double
proves SELECT1 is awaited; no success can be emitted before query completion.
It checks ready/database=ok/exact commit, sanitized503/database=unavailable,
liveness without database-readiness claims, current commit reporting and the
explicit local fallback when release identity is missing.

This is a direct class unit test. Decorator metadata is omitted because injection
is direct. It does not prove Nest dependency injection, full TypeScript typecheck,
HTTP transport, PostgreSQL connectivity or an actual old/new binary switch.
The commit sequence in the unit test validates reporting only, not rollback.

## Reproduction and observed results

Environment: Apple Git2.50.1, Node22.23.4, npm10.9.8, macOS26.7.1 x64.
Dependencies installed from the unchanged lockfile with scoped API npm ci,
development dependencies included, lifecycle scripts disabled and a lane-local
cache. Prisma Client6.19.3 was subsequently generated using its official engine download. API typecheck (tsc --noEmit) and full API build (nest build) both passed. No seed, migration, application server or provider operation was run.

```
node --test scripts/render-release-contract.test.mjs apps/api/scripts/health-release-contract.test.cjs
git diff --check
```

Observed: 13 tests passed, zero failed/skipped; 17.069 seconds. Diff whitespace
check passed. Manifest/lock diff is empty. These are newly executed test results,
not recovered historical receipts. The earlier standalone Python/SQLite model
was not copied into this checkout and is not counted as product verification.
The new unit test is not wired into CI: that requires coordination and is not
silently claimed by these local results.

## Remaining acceptance and next action

The existing PostgreSQL18 `recovery-rehearsal.mjs` checks logical backup/restore;
it cannot stand in for application rollback. A02 still requires running selected
prior/candidate/rollback/forward application artifacts against the same disposable
synthetic PostgreSQL data, including post-upgrade writes, correction histories,
queue semantics and pinned context. Verify schema compatibility, preservation,
exact API/Web identities, readiness, authorized/revoked access and bounded error
observations throughout. Do not restore old database state to repair an app-only
failure. Ordinary deployment is not evidence of a completed rollback.

The present blocker is the execution environment: Docker/PostgreSQL are absent,
and prior lane reports of socket restrictions are unchanged. No socket was retried
or bypassed here. A supported isolated environment permitting the real HTTP/DB
fixtures is needed before executing this acceptance. Actual rollback-target
selection also needs review: PR532 predates the PR533 calendar prohibition fix,
and earlier releases can lose governance queue/pinned-context behavior.

External approval remains required for any provider or production action, naming
the exact existing service IDs, source/target/forward commits, data compatibility,
worker/write treatment, window, thresholds and abort/forward-recovery steps.
The owner subsequently authorized publishing these A02 tests as a Draft PR and running checks only. Merge, deployment, live health settings, private-data copies and paid resources remain outside this slice. Local integration
of the unit test into shared CI must first be coordinated with its owner. A02
must remain PARTIAL until the independent acceptance evidence exists.
