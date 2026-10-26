# Governance Office — persistent review ledger acceptance contract
Status: DESIGN SPECIFICATION ONLY. No production migration or live write APIs included.

## Authoritative records
- `GovernanceWorkPackage`: uuid ID, organization ID, department code, source type/id, revision, createdByAccountId, status, policyVersion, immutable source hash, createdAt/updatedAt.
- `GovernanceEvidence`: uuid ID, workPackageId, kind, canonical source ref, SHA-256 checksum, submittedBy actor identity, createdAt. Evidence metadata is append-only; source retrieval must recheck tenant permissions.
- `GovernanceReviewDecision`: uuid ID, workPackageId, workRevision, agentKey, verdict, finding codes, evidence reference IDs, policyVersion, recordedAt, runtime task ID, signature/attestation metadata; unique(workPackageId, workRevision, agentKey).
- `GovernanceTransition`: uuid ID, workPackageId, expectedRevision, from/to state, reason, actor kind/id, createdAt. Append-only and committed in the same database transaction as status changes.

## Trust boundaries
- All tenant, actor, resource and risk classifications are derived server-side from authenticated IAM and authoritative domain records. Browser claims and model output are never trusted as proof.
- Persisted review decisions link only to completed runtime tasks whose agent key matches the reviewer, and validated evidence that belongs to the same work package and revision.
- `GOV_FINAL_GATE` issues recommendations, not executable approval tokens.
- The owner must approve through the existing IAM-protected workflow. The visible account label `001` is a display identifier, not a substitute for real authorization.
- A high-risk, safety, legal or financial block cannot be downgraded by a generative model. Hard policy precedence is DENY > OWNER_REQUIRED > INTERNAL_REVIEW.
- Changing source inputs creates a new work revision and invalidates prior passing reviews for acceptance.
- Failure to load policy, evidence or permissions means WAIT_FOR_EVIDENCE or reject, never approve.

## Workflow states
SUBMITTED -> REVIEWING -> (CORRECTION_REQUIRED | EVIDENCE_REQUIRED | INTERNAL_REVIEW_COMPLETE | OWNER_REVIEW_REQUIRED).
Correction re-enters SUBMITTED as a new revision after evidence is refreshed.
OWNER_REVIEW_REQUIRED -> (OWNER_APPROVED | OWNER_REJECTED), performed only through existing human-approved service.
All transitions require optimistic revision comparison and atomic audit, avoiding duplicate dispatch or race approvals.

## Required acceptance tests
1. A spoofed organization/department/user is rejected.
2. A forged reviewer verdict without matching completed runtime evidence is rejected.
3. Duplicate agent reviews cannot increase quorum.
4. A changed source hash invalidates earlier PASS results.
5. A failed/missing/ambiguous review cannot advance the work.
6. Concurrent finalizations allow only one atomic transition.
7. Revoked credentials block writes even when the task was queued earlier.
8. High/critical safety, privacy, payment and role changes cannot auto-approve.
9. An owner rejection remains authoritative across retries.
10. Existing departmental, safety, legal and financial approvals remain required after internal governance completion.

## Rollout
Implement as an additive, reviewed Prisma migration in a separate PR after checking migration history. Ship API and integration tests behind a disabled feature flag. Enable initially for a single internal department in shadow mode, compare recommendation with actual authorized decisions, then extend to all 14 departments only after acceptance.
