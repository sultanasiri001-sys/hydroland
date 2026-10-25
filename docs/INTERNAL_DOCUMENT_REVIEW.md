# Independent review of internal administrative documents

The internal platform owner keeps exclusive access to the general document workspace, template library, inventory and revision browser. The independent-review workflow allows the owner to preview and explicitly confirm access to **one current document version** for two actual department employees. Deployment creates no assignments, users, memberships or approvals.

## Owner and employee workflow

1. The owner completes a generic administrative document and submits its current version for approval. Specialized cooperation and contract-library documents use their existing workflows.
2. In the document row, **إدارة تكليف المراجعة المستقلة** opens a read-only inspection of the pinned source and eligible employees. A recipient must have an active verified account, active STAFF role, active internal membership, active employment in the document's department and an active matching position. A center membership alone grants no internal access.
3. The owner selects the actual reviewer/approver and a separate signer, a reason and an expiry of at most seven days. The creator, approver and signer must represent three distinct people. The server previews the exact recipients, source version, expiry and permissions; applying it requires a separate explicit confirmation of the unchanged plan.
4. Employees open **مراجعات المستندات المكلّفة** from their profile. Their inbox and PDF access expose only valid assignments. They read the pinned fields or PDF, choose the allowed action, enter a note and explicitly confirm it under their own authenticated identity.
5. The reviewer can approve a pending version or return it for rework. The signer can sign an approved version or decline signing. Generic internal approve/sign routes cannot bypass this workflow. The owner can archive a signed document through the existing lifecycle.

## Version and history guarantees

An approval and signature record the actual actor and person, source hash, version, time, assignment revision, bounded note and verifiable receipt digest. Existing signed or archived documents are not migrated or rewritten. Source payload, template version, branding snapshot and document reference are pinned.

Returning a pending version retains its original revision, creates a new draft version with the same payload, and invalidates the previous assignment. After correcting and submitting the draft, the owner must preview and confirm a new assignment. Declining a signature preserves the actual prior approval and approved content; a new signer-only assignment keeps the recorded approval account, person and timestamp and grants no renewed reviewer access.

An active unexpired assignment cannot be silently overwritten: it must first be explicitly revoked with the displayed revision and a reason. Revocation prevents further access and decisions while retaining historical evidence. Assignment, decision, lifecycle event and audit writes are atomic. Concurrent or stale operations fail with a conflict rather than repeating the decision.

## Access validity

Each read, PDF export and action rechecks the current platform owner, active roles and membership, employment, department, position, account verification, expiry and exact source. Security revisions bind assignments to their issuing authority and recipient qualifications. Suspending and restoring an actor, membership, employment, unit, position or owner authority does not resurrect the old assignment. Account status changes use the existing audited status epoch rather than login-related account timestamps. The PDF controller rechecks the assignment after asynchronous rendering and before sending private bytes. Responses are private and not cached.

This workflow grants no organization role, administrative portal, employee-file access, general library access, revision browsing or authority over other documents. Its account signature records a document action; specialized employment, payment, legal, safety, operating-permit and contract execution decisions still require their own professional workflows and actual evidence.

At implementation time production had one employment pending approval and no ACTIVE eligible internal employees. No production recipient, employment or access grant was created to fill that gap. Operational use requires actual approved employees and an explicit assignment to the intended records; template availability alone does not close departmental cases.

## Validation

`internal-document-review-validation.cjs` covers strict stored grant parsing, source hashes, input limits and authorization before private source reads. `internal-document-review-http-e2e.mjs` refuses non-loopback databases and tests real HTTP/PostgreSQL actors, assignment and decision races, rollback on actual audit failures, source pinning, qualification revocation, return/rework, signer replacement and revocation during PDF rendering. Browser validation loads the shipped dialog script with isolated request fixtures to test confirmation, stale sessions, recipient actions, PDF privacy, uncertain writes and mobile containment. Existing form, owner-routine and center lifecycle suites remain applicable.
