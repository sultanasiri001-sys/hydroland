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
- [x] Required Prisma migration(s) validated against existing migration history.

## Workflow and permissions
- [x] External-center request → HR verification → required executive approval → appointment → IAM activation rule approved.
- [x] Center manager cannot self-approve sensitive hiring/movement.
- [x] Maker/Reviewer/Approver separation approved.
- [x] Sensitive actions require Authentication + Authorization + Validation + Audit.
- [x] API/application services provide the canonical enforcement point for these rules.
- [ ] End-to-end authorization tests pass. (Domain authorization/isolation tests are now enforced in CI; full HTTP/DB E2E remains required.)

## Regulatory library
- [x] Regulatory chain and evidence model adopted.
- [x] PDPL applicability to HR acknowledged from approved library.
- [x] Saudi labor control families mapped to executable fail-closed HR controls and evidence requirements; authoritative requirement population/versioning remains owned by Legal Governance.
- [x] HR compliance contract fails closed when mandatory requirement/version/evidence/validation is missing or a blocking finding exists.

## Closure rule
HR is NOT COMPLETE until every unchecked item above is implemented and validated. Do not report HR as 100% complete and do not move to Operations before this gate is green.