# C03 independent review technical acceptance — 27 November 2026

## Candidate and scope

Fresh local checks exercised the existing C03 implementation at
`32e07e17439026d741e4c137f9858bc725fced49`. This work records its acceptance
evidence; it does not rebuild the review engine or create production access
grants. Subsequent C02 changes correct that test runner's session fixtures and
do not change the C03 production implementation.

The HTTP and browser checks used distinct synthetic owner, reviewer, signer and
employee identities backed by the disposable database. An independently
authenticated test actor demonstrates enforcement of person separation, but
does not establish a real person's qualifications, signature, delivery or
professional decision. Those operational acceptances remain separate.

## Executed results

| Suite | Exact observed result | Evidence scope |
| --- | --- | --- |
| `internal-document-review-validation.cjs` | **6 groups passed** | Strict sealed grant schema, source/scope bindings, expiry, prior-approval evidence and fail-closed authority |
| `internal-document-review-http-e2e.mjs` | **41 groups passed** | Actual HTTP/PostgreSQL, PDF renderer, concurrency, audit rollback, recipient isolation and five real-browser groups |
| `executive-decision-http-e2e.mjs` | **18 groups passed** | Actual HTTP/PostgreSQL/browser issuance, independent result closure, retraction, expiry, revocation and uncertain-response handling |
| `apps/web/scripts/internal-document-review-validation.cjs` | **31 checks passed** | Shipped dialog scripts with isolated request fixtures; distinct from the live isolated API browser checks above |

All four runners exited successfully. Their separate count units are retained;
these are not a completion percentage or evidence of a real professional's
acceptance.

## Behaviors established by the run

Owner previews bind the exact document version, source, named recipients and
expiry before any access grant is written. Confirmation rejects forged hashes,
missing consent, scope widening and injected authority. One-version grants do
not open the wider document library, branding, history or generic decision
routes. Audit failures roll back the grant or decision atomically.

The current actor, employment, department, position, account, membership,
verification and platform-owner authority are checked again when the source is
read or acted on. Revocation and later reactivation do not revive a stale
assignment. Revocation during asynchronous PDF rendering prevents private
bytes from being sent.

The reviewer and signer are distinct from each other and from the requester.
Signing retains the actual isolated approving actor and immutable source
version. Return-for-rework preserves prior history, creates a new draft and
invalidates old grants. Resubmission needs a fresh assignment; replacing a
declining signer preserves the previous persisted approval. Archiving and
later access revocation do not rewrite the signed evidence.

The executive workflow persists one issuance and receipt under concurrency,
uses scoped employee identity, requires signed evidence for the exact decision
before result reporting/independent owner closure, and retains terminal
retraction. A lost write response is not automatically retried; explicit reload
finds the single committed result. Logout and late responses do not reveal
private content from a previous session.

A document's approval or signature does not create a payment, IAM grant or
operating permit. Real qualified review, delivery and applicable professional
signatures remain operational steps, and were not manufactured by these tests.

## CI and reproducibility

`internal-document-review-validation.yml` already runs all four suites with
PostgreSQL 16, `NODE_ENV=test`, a disposable form-library database and
`INTERNAL_REVIEW_HTTP_BROWSER=1`. It preserves source identity, source archive,
domain/HTTP/executive/browser logs, and fails when a piped test command fails.
No additional C03 job is required for the verified scope. A documentation-only
PR may not match that workflow's path filter; use its existing manual trigger
when a fresh pre-merge C03 run is needed, and retain the tested commit identity.

The captured local summary is
`summary-c03-before-c02-fixture-fix.json`, SHA-256
`2f7a24e435512dc1ef7a09816f3c4e1504fc1cd498a45e971737ae8ddad73ba0`.
Its later C02 lifecycle failure does not invalidate the four completed C03
runners and is not counted as a C03 result. Raw evidence is in
`c03-domain.log`, `c03-http-browser.log`, `c03-executive-http.log` and
`c03-dialogs.log`.

| Tested runner | SHA-256 |
| --- | --- |
| `internal-document-review-http-e2e.mjs` | `f7f8a69ec628f95394af53181f90e6bfe1c01fb15c3615a13d44b1456c57704f` |
| `executive-decision-http-e2e.mjs` | `711dc9738ead02722160f815c4efadf1ef5f49e120f5b241aa054b948c9463f0` |
| `apps/web/scripts/internal-document-review-validation.cjs` | `78a04053f03040dd3c5ae89bf2defdfa53dc95af8bb27befc2fb71ee67d0c089` |

These are local source-candidate results. Remote CI, merge and deployment
require their own corresponding commit/source-tree evidence.
