# HYDROLAND Governance & Policy Consolidation — Unit Report

Status: CODE CONSOLIDATION COMPLETE; runtime/CI validation pending branch publication.

## Canonical ownership
- Persisted audit remains owned by `src/audit` / Prisma `AuditEvent`.
- Persisted notifications remain owned by `src/notifications` / Prisma `Notification`.
- Persisted professional credentials remain owned by `src/credentials` / Prisma `Credential`.
- Persisted policy switches remain owned by `src/trips/policy-control.service.ts` / Prisma `PolicyControl` until a later migration relocates the module without changing ownership.
- Persisted resource reservations remain owned by `CalendarResource` + `CalendarAllocation`.
- Governance owns scoped permission evaluation, approval workflow semantics, delegation semantics, workforce/contract semantics, inter-center support request semantics and workforce-payable semantics.

## Duplicates removed by design
- No second Governance `AuditEvent` production store.
- No second professional credential domain/store.
- One `SupportResourceType` and one `InterCenterSupportRequest` definition.
- One `CompensationModel`, owned by workforce contracts and imported by finance.
- Resource-support conflict helper is reduced to interval semantics; actual persisted conflict enforcement must use the canonical calendar allocation service.

## Correctness improvements
- Scoped permissions now have explicit ALLOW/DENY effects and deny-wins evaluation.
- Permission evaluation supports role/action/resource, center scope, department scope and effective periods.
- Approval steps are sorted by declared order instead of treating order as an array index.
- Duplicate/invalid approval step orders are rejected.
- Optional approval steps are skipped by the required-step execution path rather than blocking progression.
- Inter-center support monetary values use minor units rather than floating currency amounts.
- The misleading `preventDuplicateCompensation` helper was not ported. A deterministic compensation event key is provided as the basis for persistence idempotency, plus separate monetary validation.
- Delegation is explicitly time-bound.

## Persistence gates not bypassed
No Prisma migration was created in this unit. Multi-center scoped role assignments, delegation, workforce contracts, support requests and payables require additive persistence changes after production `_prisma_migrations` reconciliation.

## Security/administrative invariants for next persistence unit
- Sensitive workflows must enforce maker/reviewer/approver separation and no self-approval.
- Emergency override requires reason, bounded scope, notification and audit evidence.
- Deny wins unless an explicitly modeled higher-authority override policy permits otherwise.
- Temporary authority expires automatically.
- Center managers can request/operate only within centrally enabled scope; final sensitive appointment authority remains configurable at higher administration.

## Validation note
The source consolidation is complete in the candidate commit chain. No claim is made that TypeScript build, Prisma validation or runtime tests have passed until CI/Render executes against the published branch head.
