# HYDROLAND HR — Department Completion Gate

This gate is the authoritative checklist before moving from Human Resources to Operations.

## Architecture
- [x] Four HR levels approved.
- [x] Employee lifecycle baseline documented.
- [x] HR governance/automation baseline documented.
- [x] Shared-engine/no-duplication rule fixed.
- [ ] Canonical HQ → Region → Center → Department → Unit → Team entities implemented.
- [ ] Employment/Position relationships implemented against canonical hierarchy.

## Data model
- [ ] Employment
- [ ] EmploymentContract
- [ ] EmploymentMovement
- [ ] LeaveRequest
- [ ] Shift/Attendance transaction
- [ ] Performance cycle
- [ ] Employee-relations/disciplinary case
- [ ] Offboarding workflow state
- [ ] Required Prisma migration(s) validated against existing migration history.

## Workflow and permissions
- [x] External-center request → HR verification → required executive approval → appointment → IAM activation rule approved.
- [x] Center manager cannot self-approve sensitive hiring/movement.
- [x] Maker/Reviewer/Approver separation approved.
- [x] Sensitive actions require Authentication + Authorization + Validation + Audit.
- [ ] API/application services enforce these rules.
- [ ] End-to-end authorization tests pass.

## Regulatory library
- [x] Regulatory chain and evidence model adopted.
- [x] PDPL applicability to HR acknowledged from approved library.
- [ ] Saudi labor controls mapped to executable HR controls and evidence requirements.
- [ ] Production activation blocked where mandatory control evidence is missing.

## Closure rule
HR is NOT COMPLETE until every unchecked item above is implemented and validated. Do not report HR as 100% complete and do not move to Operations before this gate is green.