# A14 owner onboarding and hull identity — local technical verification

Verified on 28 November 2026 (Asia/Riyadh), on the working tree based on
`0b26c759ac9a4be6815ede66b0977f6d8fc60fb7`. This record does not assert merge,
deployment, real vessel readiness, or final Q01 acceptance.

## Implemented behavior

`MarineAsset.hullNumber` is a separate, nullable, globally unique identifier.
Creation normalizes Unicode compatibility forms, Arabic/Persian digits, case,
and spacing before writing. Invalid types, control characters, unsupported
characters, and identifiers longer than 80 characters are rejected. A database
uniqueness conflict returns a generic HTTP 409 without another organization's
asset, account, or organization details. Membership authorization and asset
creation run in one serializable transaction.

The additive migration `20261128020000_marine_asset_hull_number` leaves existing
registration numbers and asset statuses unchanged. It does not infer hull
numbers from registration numbers or require a backfill. The Arabic/English
marine-document interface provides a separate hull field and shows its value
to the owner and the authorized document reviewers. This change does not add a
hull-correction endpoint or authorize vessel operation.

## Executed local verification

- Prisma generation and API build passed.
- `a14-owner-onboarding-http-e2e.mjs`: **14/14 groups passed**, PostgreSQL
  **17.12**, Node **24.22.3**, 7.289 seconds. External HTTP attempts: **0**.
- The actual additive SQL migration preserved two legacy registrations with
  null hull values and rejected a duplicate hull in PostgreSQL.
- The native HTTP flow registered a new synthetic owner, delivered one local
  verification link through the original auth worker, rejected tampering and
  replay, and activated the requested boat-owner role through a separate
  reviewer.
- Center invitation/acceptance, stale invitation rejection, same-session loss
  of write access after read-only/suspended membership, and independent marine
  organization review passed.
- Hull normalization, cross-organization collision rejection, unauthorized
  creation, and concurrent duplicate creation passed. Concurrent requests
  produced exactly one created asset and one conflict.
- The owner submitted a synthetic document, the center returned V1, and the
  owner corrected and resubmitted V2 on the same record. Unchanged, unauthorized,
  and stale resubmissions were rejected. The center then forwarded V2 to Marine
  Operations, which recommended it to the independent platform reviewer. The
  final verification and its ordered audit trail persisted. Verified bytes
  remained immutable and the asset remained `DRAFT`.
- `marine-documents.spec.js` passed against local Chromium with routed browser
  fixtures, including the separate hull input, submitted value, and owner and
  reviewer displays. The existing document workflow and status display passed.
- Existing marine source validation: **27/27 passed**. JavaScript syntax and
  `git diff --check` passed.

The API suite writes a JSON receipt containing case results, runtime versions,
source and compiled-module SHA-256 hashes (including the canonical schema and
the hull identity helper), and explicit `synthetic: true`,
`realOwnerAcceptance: false`, and `productionDocumentAccepted: false` markers.
It creates and drops a random schema in a specifically named disposable
loopback database, and refuses an existing external API URL or non-loopback
HTTP destination. The browser check uses routed fixtures; it is not another
live backend acceptance run.

## CI reproduction

Create an empty local database named `a14_owner_onboarding_test`, generate the
Prisma client, and build the API before running:

```bash
CI=true NODE_ENV=test \
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/a14_owner_onboarding_test \
A14_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
A14_ONBOARDING_RESULT_FILE=/tmp/a14-onboarding.json \
node apps/api/scripts/a14-owner-onboarding-http-e2e.mjs

npm run test:e2e -w @hydroland/web -- e2e/marine-documents.spec.js
```

The normal CI runtime is Node 22 and runs the suite independently on PostgreSQL
16 and 18; both receipts are retained. Its result and the merged/deployed revision
must be recorded separately. The local Node 24 result does not replace that
release gate.

## Preserved acceptance boundaries

No real registration email was delivered, real boat document approved, voyage
opened, or boat 50154 changed. The original renewed navigation license,
maintenance evidence, authorized center/Marine Operations/platform review,
applicable training programs and standards, site/activity/weather limits, and
the real owner's final interface acceptance remain in Q01 under their existing
requirements. A technical fixture pass does not establish those facts.
