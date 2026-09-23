# HYDROLAND Administrative Affairs — Department Completion Gate

This gate is authoritative for Administrative Affairs closure.

## Ownership boundary
Administrative Affairs owns correspondence, administrative records, routing and follow-up, meetings and minutes, administrative assignments, archive metadata, and administrative performance records.

Administrative Affairs does **not** grant executive authority, IAM privileges, financial authority, legal authority, safety authority, or operational authority owned by another domain. An acting/delegation entry in Administrative Affairs is administrative evidence/reference only. The authoritative grant must originate in the owning domain (including Executive Governance or IAM where applicable).

## Persistence and workflow
- [x] Canonical OrgUnit-backed records, routing, meetings and archive persistence.
- [x] Register and archive transitions use atomic compare-and-set semantics.
- [x] Routing requires registered records and distinct active units in the same organization.
- [x] Assignment validates active membership, eligible role and target-unit scope.
- [x] Decisions require the exact assigned approver and deny requester self-approval.
- [x] Successful sensitive mutations emit transactional audit evidence.
- [x] Denied authorization paths do not create success audit evidence.

## Authorization and scope
- [x] Authenticated account boundary is enforced at the controller.
- [x] Organization scope is fail-closed.
- [x] OWNER/ADMIN retain organization-wide authority without accidental CENTER_MANAGER narrowing.
- [x] CENTER_MANAGER remains constrained to explicitly assigned units.
- [x] Cross-organization access is denied.

## Unified calendar
- [x] Administrative meetings use the canonical CalendarEvent source of truth.
- [x] Meeting resource allocations use CalendarAllocation.
- [x] Overlapping active resource allocations are rejected.
- [x] Administrative meeting scheduling emits audit evidence.
- [x] Concurrency-safe resource locking is enforced with sorted row locks inside a retryable serializable transaction; CI HTTP/DB E2E proves meeting allocation and overlap denial.

## Ownership guard
- [x] Executive authority grants are denied.
- [x] IAM privilege grants are denied.
- [x] External-domain state mutation is denied.
- [x] Cross-domain work is reference/route/evidence/notify only unless the owning domain provides an explicit contract.

## Validation
- [x] Static Administrative Affairs closure invariants run in CI.
- [x] HTTP/DB E2E covers authentication, cross-org denial, register, route, assignment, decision, archive, provenance and audit.
- [x] HTTP/DB E2E covers unified-calendar meeting creation, allocation, audit evidence, cross-organization denial, and overlapping-resource denial with no conflicting calendar mutation.
- [x] Security Audit passes.
- [x] Release Candidate Gate passes.
- [x] Production Release Gate passes.
- [x] Dependency Lock Audit passes.
- [x] API Validation passes.

## Closure rule
Administrative Affairs is **NOT CLOSED** until every checkbox above is complete, the branch is merged to `main`, and required post-merge validation remains green.
