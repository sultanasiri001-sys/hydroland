# HYDROLAND Database & Persistence Consolidation Audit

Status: Phase 1 database audit complete; production-state reconciliation still required before new migrations.

## Canonical database decision
- Database engine: PostgreSQL.
- ORM in the integrated implementation: Prisma.
- Canonical runtime adapter: `apps/api/src/database/database.service.ts`.
- Canonical schema candidate: `apps/api/prisma/schema.prisma` on `consolidation/hydroland-unified`.
- Migration history is immutable evidence until compared with the deployed database `_prisma_migrations` table.

## Existing persisted capabilities confirmed
The integrated schema already persists identity/accounts/sessions, role assignments, credentials/documents, activation review, organizations/memberships, notifications, audit events, operational settings, policy controls, trips/bookings/participants, calendar resources/allocations, crew assignments, safety checklists, dive logs, payments/invoices, theme scheduling, boat compliance and trip compliance.

## Consolidation mapping for Governance V1
| Governance V1 concept | Canonical persistence direction |
|---|---|
| AuditEvent | Extend existing Prisma `AuditEvent`; do not create a second audit table/service |
| Notifications | Extend existing `Notification` capability; add channel/delivery metadata additively when required |
| Professional credentials | Extend existing `Credential`; do not create parallel credential persistence |
| Resource reservation/conflict | Reuse `CalendarResource` + `CalendarAllocation`; generalize source linkage additively |
| Policy/permissions | Evolve `PolicyControl` plus role assignments/scopes; avoid a second policy database |
| Inter-center support | New additive models after center/organization semantics are reconciled |
| Workforce profile/contracts | New additive models; link Person/Account/Organization rather than duplicate identity |
| Training record/session/skills | New additive models; link existing accounts, credentials, trips/resources and audit |
| Workforce payables | New additive finance models separate from customer `Payment`/`Invoice` |
| Delegation | New additive authority-delegation model linked to account/role/scope |
| Privacy/retention | New policy metadata/configuration; do not hard-code changing legal retention periods |
| Offline evidence/outbox/idempotency | Add only where existing runtime capabilities do not already cover the invariant |

## Important defects/risks found
1. Several persisted status/type fields are free-form `String`; governance-critical fields should progressively move to constrained enums or validated policy keys without destructive rewrites.
2. `RoleAssignment` currently has `@@unique([accountId, role])`, which may prevent the same role being scoped to multiple centers/departments. Governance V1 requires scope-aware assignments; change must be additive/safe after data inspection.
3. `Organization` is the current organization/center anchor, but explicit center hierarchy and department hierarchy are not yet modeled strongly enough for the new multi-center governance requirements.
4. `Notification` currently has one status and no explicit channel/delivery/read lifecycle metadata beyond `sentAt`; extend rather than duplicate.
5. `AuditEvent` exists and should become the platform audit source of truth. Governance's in-memory audit implementation is temporary only and must not become a parallel production store.
6. `CalendarAllocation` is trip-bound today. Inter-center support/training/facility allocation requires a generalized allocation source while preserving existing trip behavior.
7. Customer payments/invoices exist. Instructor/employee compensation must not reuse them as if they were customer payments.
8. Current compliance fields such as authority references are storage fields, not proof that a legal rule is current. Regulatory rules must retain official source, version/effective date and configurable status.

## Migration safety gate
Before writing any governance migration:
1. Obtain deployed database migration state (`_prisma_migrations`).
2. Compare it with repository migration directories in order.
3. Resolve the historical Prisma/P3011 recovery line and any failed/rolled-back migration records.
4. Run `prisma validate` and migration diff in a non-production environment.
5. Create additive migrations only; no reset, drop-all, squash or destructive baseline on production.
6. Back up production before applying schema changes.

## Next canonical implementation order
1. Reconcile duplicate governance domain types in source code.
2. Port Governance V1 into the unified branch without copying duplicate audit/notification/resource implementations.
3. Define Center/Department/Workforce/Contract/Training persistence extensions.
4. Produce an additive Prisma migration candidate only after migration-state reconciliation.
5. Validate API build/typecheck and schema before deployment.
