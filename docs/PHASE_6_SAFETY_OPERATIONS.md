# Phase 6 — Safety and operations

Approved roadmap checklist:
1. Digital safety checklist.
2. Checklist linked to a trip.
3. ALLOWED decision.
4. REVIEW_REQUIRED decision.
5. DEFERRED decision and operational log.

## Baseline
The platform already has an authenticated trip safety API, persisted
SafetyChecklist records, reviewer-only history/decision endpoints, an admin
pre-trip checklist UI and Playwright coverage. Each checklist stores tripId,
items, notes, decision and decision timestamps. AuditEvent records assessment
creation and reviewer decisions.

## Integrity correction
Baseline review found that SafetyReviewService accepted ALLOWED from a reviewer
without checking whether the persisted checklist still contained a failed item.
Phase 6 cannot close with that bypass.

The correction rejects ALLOWED with HTTP 409 whenever checklist items are
missing, incomplete or contain any value other than true. REVIEW_REQUIRED and
DEFERRED remain valid reviewer outcomes and are audit-recorded.

Focused HTTP/DB E2E proves trip linkage, REVIEW_REQUIRED, valid ALLOWED,
automatic DEFERRED on a failed item, unsafe ALLOWED override denial, explicit
reviewer REVIEW_REQUIRED/DEFERRED decisions, invalid-decision rejection, role
authorization and append-only operational audit evidence.

## Boundary
This phase is safety checklist and operational decision integrity. Weather/sea
provider enrichment, emergency integrations and official permits are the next
roadmap transition and are not used to falsely close Phase 6.

Production currently has no Trip or SafetyChecklist rows, so no synthetic live
trip will be created merely to manufacture acceptance. Closure requires green
CI, merge/deployment and production code/readiness verification.
