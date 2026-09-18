# GENERAL-L1 — Closure Gate

Status: CLOSED

GENERAL-L1 is the shared platform foundation. HR-L1 MUST NOT start until this gate is closed.

## Required closure controls
- [x] Canonical identity/auth boundary
- [x] Canonical authorization with permission-to-scope grant isolation
- [x] Organization hierarchy contract and PostgreSQL persistence
- [x] Append-only audit contract and database mutation guards
- [x] PostgreSQL canonical schema plus checksummed transactional migration runner
- [x] Authentication sessions with server-generated cryptographic tokens, hashed persistence, expiry/revocation and inactive-account invalidation
- [x] RBAC persistence: roles, permissions, grants and exact scoped enforcement
- [x] Approval workflow transaction: valid persisted state transition, scoped reviewer authorization, pending role-grant activation, audit and notification outbox
- [x] Private document validation/storage: MIME/size/magic bytes/SHA-256, opaque private storage, authorized upload/read/download and failed-DB cleanup
- [x] Notification outbox: atomic PROCESSING lease, retry/failure handling, stale-lease recovery and dispatcher
- [x] Security baseline: global authorization guard, UUID resource validation, strict input validation, headers, rate limiting, IDOR scope isolation and spoofed-document tests
- [x] CI build/typecheck/lint/test gate
- [x] CI PostgreSQL migration execution; repeat migration verifies idempotent checksum path
- [x] Final latest-head CI success
- [x] Deployment baseline validated on connected Render environment; existing API service is live and PostgreSQL is available. GENERAL-L1 branch remains isolated until merge to avoid disrupting the currently deployed legacy branch.

## Rule
No item may be deferred to HR-L1. GENERAL-L1 closes only when every required control is implemented, tested, and validated.
