# HYDROLAND HR — Department Completion Gate

This gate is the authoritative checklist before moving from Human Resources to Operations.

## Architecture
- [x] Four HR levels approved.
- [x] Employee lifecycle baseline documented.
- [x] HR governance/automation baseline documented.
- [x] Shared-engine/no-duplication rule fixed.
- [x] Canonical HQ → Region → Center → Department → Unit → Team entities implemented.
- [x] Employment/Position relationships implemented against canonical hierarchy.

## Data model
- [x] Employment
- [x] EmploymentContract
- [x] EmploymentMovement
- [x] LeaveRequest
- [x] Shift/Attendance transaction
- [x] Performance cycle
- [x] Employee-relations/disciplinary case
- [x] Offboarding workflow state
- [x] Database bootstrap/reconciliation validated without rewriting legacy migration history: production migration state was inspected read-only, canonical Prisma schema bootstraps clean PostgreSQL in CI, and the Production Release Gate prevents modification/deletion/rename of historical migrations.

## Workflow and permissions
- [x] External-center request → HR verification → required executive approval → appointment → IAM activation rule approved.
- [x] Center manager cannot self-approve sensitive hiring/movement.
- [x] Maker/Reviewer/Approver separation approved.
- [x] Sensitive actions require Authentication + Authorization + Validation + Audit.
- [x] API/application services provide the canonical enforcement point for these rules.
- [x] End-to-end authorization and compliance tests pass: authentication, persisted transition, audit evidence, denial non-mutation, deterministic `HR_COMPLIANCE_*` HTTP conflict mapping, missing-control fail-closed behavior, and valid-control approval success are enforced in CI.
- [x] All nine canonical HR actions are policy-bound and semantically routed: staffing request, candidate verification, appointment approval, employment change, compensation approval, employee-relations opening, disciplinary approval, termination approval, and IAM change.
- [x] Candidate verification has a dedicated persisted workflow with role enforcement, denial non-mutation/no-success-audit behavior, approval provenance, and E2E coverage.
- [x] Compensation and disciplinary approvals use dedicated workflows and cannot bypass the shared fail-closed HR compliance gate; E2E proves 409/no mutation/no success audit when compliance is unavailable and successful audited persistence when controls are valid.

## Regulatory library
- [x] Regulatory chain and evidence model adopted.
- [x] PDPL applicability to HR acknowledged from approved library.
- [x] Saudi labor control families mapped to executable fail-closed HR controls and evidence requirements; authoritative requirement population/versioning remains owned by Legal Governance.
- [x] HR compliance contract fails closed when mandatory requirement/version/evidence/validation is missing or a blocking finding exists.

## Closure rule
HR is NOT COMPLETE until every unchecked item above is implemented and validated. This branch has a green completion gate, but department closure additionally requires merge to `main` and the required post-merge validation checks to remain green.

Current operating acceptance clarification (24 October 2026): the checked items
above preserve the approved architecture and prior technical validation; they do
not certify current production regulatory population or exercise every HR
document family. The current legal-review pack remains a draft, and source,
version, applicability, verified evidence and an independent legal-approval
reference must pass the existing fail-closed workflow. Internal template
approval and the owner responsibility already recorded are retained and are not
substitutes for that legal review. Full department acceptance follows the seven
gates in [the operating/document-cycle baseline](DEPARTMENT_OPERATING_DOCUMENT_CYCLES_2026-10-24.md), including execution, IAM handoff, verification,
exceptions, immutable evidence, Arabic print and offboarding. Discovery counts
and green component CI do not close these production acceptance gates.
- [x] IAM offboarding E2E passes: incomplete clearance is fail-closed; approved completed clearance atomically offboards employment, revokes active sessions, archives active roles with `endedAt`, closes the offboarding case with IAM timestamps, and emits audit evidence.
