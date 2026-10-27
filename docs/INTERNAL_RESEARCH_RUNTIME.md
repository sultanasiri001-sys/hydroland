# Internal desk-research runtime — V1

## Scope and non-authority

`INTERNAL_DESK_RESEARCH_V1` persists RND_MARKET_INTELLIGENCE initiatives, exact-version source references, actual employee reviews, and owner lifecycle decisions. It does **not** execute research externally, call a model, spend money, publish, make investments, change staffing/roles, confer general document access, or close an administrative department. `COMPLETED` means only this internal research record passed its defined proposal/result review path. It is not regulatory/legal approval or operational acceptance.

Existing pure research-market planners remain unchanged; caller-constructed review objects from those planners cannot approve this runtime. No real employee, evidence, assignment or approval is seeded. Operational adoption still requires real eligible employees, genuine evidence and their own decisions. This package is API-first; no owner/reviewer UI is delivered here.

## Authority and independence

The current verified active ADMIN owner of the configured internal platform organization is the only author/assigner/lifecycle actor. Reviewers must have an actual current `EMPLOYEE` appointment, active STAFF role, active organization membership, correct active RND department/unit/position, valid employment dates and verified active account. A contractor, center affiliate or trip-only role is not sufficient. Existing generic document-review eligibility is unchanged; its helper accepts an additional restrictive employee-class filter only for this route.

Assignments bind one initiative phase and version, the authenticated review account **and person**, current source versions/hashes, and all owner/recipient security epochs. The reviewer must differ from the initiative creator, current brief/result authors, current owner, original creators of all referenced documents and authors of their current canonical DocumentRevision. Source authors are server-resolved; the client cannot submit qualification, actor identity or source digests. The scoped review endpoint exposes only the exact listed RND source fields. It never grants generic document workspace access.

A preview describes the recipient, exact sources and three permissions: read assigned initiative version; read listed source versions; record one review decision. Explicit confirmation re-resolves everything inside the write transaction and rejects a changed plan. Assignments expire in at most seven days. Expiry stops pending read/decision access; it is **not** a seven-day business deadline on the initiative. A decision made within its assignment window remains historical evidence after natural expiry, but START and COMPLETE still revalidate live source/authority/employee epochs. Revocation/restoration never revives an old binding. A changed source or revoked qualification requires explicit new content/review rather than automatic approval upgrade.

## State machine

- Owner creates `PROPOSED`; proposal assignment produces `PROPOSAL_REVIEW`.
- Actual assigned employee APPROVE → `APPROVED`, RETURN → `PROPOSED`, REJECT → `REJECTED`.
- Owner separately previews/confirms START → `ACTIVE`, requiring current accepted proposal receipt.
- Owner records a result with at least one real current managed-document reference. Result assignment → `RESULT_REVIEW`.
- Actual employee APPROVE → `VERIFIED`; RETURN/REJECT → `ACTIVE` for explicit rework.
- Owner previews/confirms COMPLETE → `COMPLETED`, revalidating **both** proposal and result receipts and current sources/qualifications. Owner may then ARCHIVE.
- A pending assignment must be revoked before editing/cancelling. CANCEL is terminal. Terminal records cannot be silently reopened.
- A new proposal revision resets to PROPOSED and clears current result/review pointers, preserving all prior revisions/reviews. Result revision resets to ACTIVE and clears result approval. Nothing implicitly reuses approval for changed content.

## API (all responses private, no-store)

Owner: `/api/v1/admin/research-initiatives`

- GET list (`before` stable scope-bound cursor); POST create `{requestKey, proposal, confirmed:true}`.
- GET `/:id` detail/history/current-source summary.
- POST `/:id/revise` `{expectedRevision,phase,section,reason,confirmed:true}`.
- GET `/:id/review/candidates?before=...` paginates unique account candidates, including through pages with ineligible records.
- POST `/:id/review/preview` `{expectedRevision,phase,reviewerAccountId,expiresAt,reason}`.
- POST `/:id/review/assign` same input plus `{expectedPlanHash,confirmed:true}`.
- POST `/:id/review/revoke` `{expectedRevision,expectedReviewId,reason,confirmed:true}`.
- POST `/:id/transitions/preview` `{expectedRevision,action,reason}`; POST `/:id/transitions` adds `{expectedPlanHash,confirmed:true}`.

Reviewer: GET `/api/v1/research-reviews/inbox?before=...`; GET `/:reviewId`; POST `/:reviewId/decisions` with `{expectedRevision,reviewHash,decision,note,confirmed:true}`. `decision` is APPROVE, RETURN or REJECT. Only the current actual assigned actor can read or decide. No reviewer identity is accepted in a decision request.

Section: `{title,summary,method,limitations,evidence:[{documentId,version}]}`. Up to five unique current same-organization RND documents per section. Result requires evidence. Missing/foreign/stale/inconsistent sources fail closed; textual URLs, model PASS, CI output, templates or owner administrative approvals do not satisfy a human review.

## Persistence and concurrency

Additive migration `20261026200000_internal_research_runtime` creates initiative head, append-only revisions and scoped review records. Only new empty FK columns adapt to historical TEXT/UUID parent keys. No historical migration or data is rewritten. Database constraints enforce positive/unique revisions, state/receipt consistency and assignment bounds. Revision UPDATE/DELETE/TRUNCATE are blocked by actual DB triggers. Previous digests link the history; current head and latest revision are checked before mutation.

Serializable transactions with deterministic account locks and conditional head writes enforce stale/replay/race protection. Head, revision, review receipt and audit writes commit together. Audit failure rolls all back. Retryable transaction callbacks contain no external calls. Duplicate creation request keys conflict rather than creating a second record. Clients must refetch after a conflict or uncertain response, not silently resend confirmation.

## Verification

On a **fresh disposable** loopback PostgreSQL database named `hydroland_research_ci`, set `NODE_ENV=test`, `RESEARCH_E2E_CONFIRM=ISOLATED_LOOPBACK_DATABASE`, a synthetic JWT_SECRET, DATABASE_URL, and RESEARCH_E2E_BASE_URL. Generate Prisma, `prisma db push --skip-generate`, build/start the test API, then run:

```
node apps/api/scripts/internal-research-migration-db-e2e.mjs
node apps/api/scripts/internal-research-http-e2e.mjs
```

The HTTP harness refuses an existing account/organization store; replaces only empty new research tables with the exact migration, installs the existing audit append-only guard, and uses synthetic actors. It preserves historical audit/revision rows; destroy the disposable database/cluster afterwards. Never point it at a production tunnel. The dedicated GitHub workflow applies these same tests on PostgreSQL16/Node22. Existing internal-document-review HTTP regression must also pass because the shared eligibility helper has a default-preserving restrictive option.
