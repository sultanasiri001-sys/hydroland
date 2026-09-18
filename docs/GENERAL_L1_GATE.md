# GENERAL-L1 — Closure Gate

Status: OPEN

GENERAL-L1 is the shared platform foundation. HR-L1 MUST NOT start until this gate is closed.

## Required closure controls
- [x] Canonical identity/auth boundary scaffold
- [x] Canonical authorization + scoped-access contract scaffold
- [x] Canonical organization hierarchy contract scaffold
- [x] Canonical audit-event contract scaffold
- [~] Persistent database schema and migrations — canonical PostgreSQL schema added; migration runner/validation pending
- [ ] Authentication sessions/tokens lifecycle
- [~] RBAC persistence: roles, permissions, grants, scopes — canonical tables/permission keys added; repository/service enforcement pending
- [~] Organization persistence: HQ/Region/Center/Department/Unit/Team — canonical hierarchy table added; service/API validation pending
- [ ] Approval workflow engine
- [ ] Private document storage contract + validation
- [ ] Notifications/outbox
- [ ] Append-only audit persistence
- [ ] Security controls (IDOR, validation, rate limiting, headers)
- [ ] Integration and security tests
- [ ] Build/typecheck/lint/test green in CI
- [ ] Deployment validation

## Rule
No item may be deferred to HR-L1. GENERAL-L1 closes only when every required control is implemented, tested, and validated.
