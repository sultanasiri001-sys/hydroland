# GENERAL-L1 — Closure Gate

Status: OPEN

GENERAL-L1 is the shared platform foundation. HR-L1 MUST NOT start until this gate is closed.

## Required closure controls
- [x] Canonical identity/auth boundary scaffold
- [x] Canonical authorization + scoped-access contract scaffold
- [x] Canonical organization hierarchy contract scaffold
- [x] Canonical audit-event contract scaffold
- [~] Persistent database schema and migrations — canonical PostgreSQL schema added; migration runner/validation pending
- [~] Authentication sessions/tokens lifecycle — PostgreSQL-backed hashed sessions implemented; secure token issuance/rotation and DB integration tests pending
- [~] RBAC persistence: roles, permissions, grants, scopes — canonical tables/permission keys added; repository/service enforcement pending
- [~] Organization persistence: HQ/Region/Center/Department/Unit/Team — canonical hierarchy table added; service/API validation pending
- [~] Approval workflow engine — transactional approval/status, scoped reviewer authorization, role-grant activation, audit and outbox implemented; DB state-locking/integration validation pending
- [~] Private document storage contract + validation — MIME allowlist, size limit, magic-byte validation, SHA-256, metadata persistence and read/download authorization implemented; private object storage and security tests pending
- [~] Notifications/outbox — transactional outbox, SKIP LOCKED claiming, retry/failure handling and dispatcher core implemented; external delivery adapter/integration validation pending
- [~] Append-only audit persistence — PostgreSQL inserts plus UPDATE/DELETE prevention triggers implemented; migration/integration validation pending
- [ ] Security controls (IDOR, validation, rate limiting, headers)
- [ ] Integration and security tests
- [~] Build/typecheck/test green in CI — push and PR checks green at ffb147e; lint still pending
- [ ] Deployment validation

## Rule
No item may be deferred to HR-L1. GENERAL-L1 closes only when every required control is implemented, tested, and validated.
