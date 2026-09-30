# Phase 5 — permissions, centers, roles, isolation and approvals — CLOSED 2026-09-30

## Scope and order
permissions → centers → roles → isolation → approvals across all protected portals.

## Portal RBAC
PR #379 added focused browser coverage for every protected portal:
- INSTRUCTOR → professional portal
- DIVE_CENTER → dive-center portal
- BOAT_OWNER → marine-vessels portal
- ORGANIZATION → organization portal
- ADMIN → administration portal

No-role, PENDING_REVIEW and SUSPENDED states are denied. Only the exact ACTIVE role unlocks its portal. Revocation closes an already-open protected portal and one role never unlocks another. After the test sequencing correction, the full web suite passed 115/115.

## Centers and organizational isolation
PR #380 added isolated HTTP/DB E2E with two independent dive-center organizations and disposable accounts. It proved:
- center creation enters PENDING_REVIEW under current enforced activation policy;
- another center owner cannot list members, update the center or invite members;
- owner invitation is PENDING and cannot be accepted before center activation;
- owner cannot review their own center;
- REVIEWER approval activates the center;
- invited member can accept only after activation;
- ordinary STAFF cannot use manager operations;
- owner sees the correct membership set;
- a second center can be independently rejected;
- relevant audit events are retained.

The current production policy remains ENABLED for CENTER/ORGANIZATION activation and REVIEW for license/registration-document review.

## Professional role approvals
PR #381 proves the professional approval lifecycle using disposable accounts:
SUBMITTED/PENDING_REVIEW → MORE_INFORMATION_REQUIRED → RESUBMITTED → APPROVED/ACTIVE.
Ordinary accounts cannot enter the review queue, applicants cannot self-approve,
outsiders cannot resubmit another applicant's request, duplicate activation of
an already ACTIVE role conflicts, and decision notifications/audit evidence are written.

## Production boundary
The PR #381 API deployment is live. Read-only production inspection at closure
found zero Organization rows, zero ActivationRequest rows and zero ACTIVE
RoleAssignment rows. Therefore no fake production center, reviewer or role was
created merely to manufacture live acceptance. Positive lifecycle acceptance is
the isolated HTTP/DB/browser evidence above; production will exercise the same
gates when the first real center/professional is onboarded.

This closure does not grant any role to the owner account and does not bypass
license/document review, external regulatory verification, issue #329, or
production recovery/PITR issue #369.

## Closure
Phase 5 is CLOSED for implementation, RBAC, isolation and approval workflow.
Reopen only for a regression, approved scope change, or evidence that a real
production onboarding path behaves differently from the tested contract.
