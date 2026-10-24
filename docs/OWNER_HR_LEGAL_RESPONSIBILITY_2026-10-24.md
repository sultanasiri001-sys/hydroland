# Owner responsibility for HR and Legal administration

The internal owner can be explicitly assigned administrative responsibility for HR and Legal using the same verified owner account. This is organizational oversight, separate from Employment and IAM. The assignment does not claim professional legal qualification or an independent Legal review.

## Scope and consent

The assignment starts disabled. Deployment and reads never activate it. The owner sees the exact canonical account/email, the two fixed departments, and `INTERNAL_HR_DRAFTS_ONLY`. Assignment requires the latest revision, a reference, a reason, reviewed=true and a separate acknowledgment of combined responsibility. The server rejects arbitrary targets, extra departments and broader scopes. Revocation uses the same audited endpoint. Both actions are restricted to the current verified active owner/ADMIN; no account roles, employment records or appointments are created.

This is an explicit architecture decision for one administrative draft workflow. The normal independent Legal/HR publication path, self-appointment restrictions, employee consent, official documentation and party signatures remain separate.

## Per-template administrative approval

`INTERNAL_APPROVAL` remains drafting consent only. It cannot publish or create a draft on its own. With an active department assignment, the owner can issue the distinct `APPROVE_FOR_DRAFTS` decision against an exact version/hash, with its own reviewed acknowledgment, reference and reason. It produces `APPROVED_FOR_DRAFTS`, visibly **معتمد إداريًا للمسودات**, with `ownerDepartmentApproval` bound to the assignment revision, owner, organization revision and content digest.

`legalReview`, `hrReview`, `publishedBy` and `publishedAt` are not manufactured. Owner-authored HR templates still reject `LEGAL_REVIEW` and normal `PUBLISH`. Administrative approval cannot displace an active fully reviewed publication. Revisions and copies do not inherit the decision; retirement preserves its history.

## Consumption and revocation

EmploymentContract creation supports DRAFT only, with no signature, Document evidence or employment/IAM activation. The immutable template snapshot declares the owner administrative basis and `independentLegalReviewComplete:false`. Both the template selector and saved draft show that independent Legal review is pending.

New draft creation requires the exact assignment still to be current, the owner account still verified/active/ADMIN, both departments active, and unchanged ownership/organization revision. Revocation and regrant cannot revive old template approvals. Ownership transfer and transfer back also invalidate the old assignment. Existing saved drafts retain their original evidence. Missing or malformed approval evidence fails closed.

The assignment, library decisions and draft creation share the existing serializable write barriers and identity/unit locks. Audit failure rolls back assignment or approval atomically. No schema migration is required.

## Activation and rollback

Activation is a separate explicit operator action after the deployed implementation is reviewable. Record the actual owner decision; never substitute an internal reference for independent Legal review. Keep the new reader after activation: older builds do not recognize APPROVED_FOR_DRAFTS. Do not rewrite this state to PUBLISHED on rollback or treat the administrative evidence as legalReview.
