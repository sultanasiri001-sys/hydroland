# A15 technical verification — 28 November 2026, Saudi time

## Observed local outcome

The final native acceptance run completed **14/14 groups, zero failures**, from `2026-11-27T22:13:52.328Z` to `2026-11-27T22:14:04.000Z` UTC. It ran the real Nest HTTP application against a new PostgreSQL 17.12 cluster, a loopback S3-compatible test gateway through the production AWS SDK adapter, and a separate database created by real `pg_dump`/`pg_restore`. It produced 17 encrypted journal objects. The API build also passed.

The machine-readable result is emitted by `apps/api/scripts/a15-erasure-http-recovery-e2e.mjs` to `A15_EVIDENCE_FILE`. CI retains it as `a15-erasure-recovery`. The local reviewed result was `/workspace/scratch/9b25dd62c988/a15-acceptance.json`; the run log was `/tmp/a15-test.log`.

This is synthetic technical evidence. No production data was deleted, no production source was approved, and no real owner effective date was created. A live Backblaze/Render configuration and Q01 owner acceptance remain separate release evidence.

## What the native acceptance exercised

- Native migration and rolling-deployment barrier: a legacy deletion followed by the old audit action is rejected and the deletion rolls back.
- Authentication, owner-only blank-template preparation and idempotence; preparation creates no approvals or activation.
- The original HTTP document cycle: owner draft and submission, explicit independent review assignment, staff review and approval, then owner source binding. Source hashes use the `sha256:` format produced by the Documents interface.
- Center and subject isolation, immature booking rejection, a genuinely approved synthetic activation source and source-bound retention information in the export.
- Record holds, two-person release and denial when the center owner is suspended.
- Native booking deletion, encrypted intent/receipt readback after an ambiguous upload result, operation-id retry without duplicate audit, refusal of unproved `APPLIED`, and verified request closure/notification.
- Closed-case hold release without reopening erasure; denial of a staff assignment whose department unit belongs to another organization.
- Financial period requirements, payment-source drift without changing `updatedAt`, and deletion of the mature classified payment and its native invoice.
- Archived-account contact scrubbing, session removal and preservation of the account's separately retained identity.
- Failure to publish an intent preventing native purge; changed restricted text invalidating a prepared plan.
- Audit failure rolling back deletion, followed by repair of lost abort publication without deletion.
- Restart blocking after failed intent publication, followed by explicit offline cancellation of the unchanged preparation.
- Lost commit publication repaired from its exact local receipt, without repeating the native deletion/audit.
- Unresolved external intent refusal, duplicate-phase and commit/abort conflict refusal at publication, and encrypted-object tamper detection.
- A real restored database blocked before exposure; rejection of a different baseline and changed restored private content; replay only after the original native content matches, followed by successful bootstrap verification.

## Existing-feature regression evidence

These ran against another new loopback PostgreSQL cluster and the real HTTP application:

| Command | Observed result |
| --- | --- |
| `node apps/api/scripts/private-message-review-http.mjs` | PASS: withdrawal hidden in both participants' history, preview and export; 30-day retention boundary; case-scoped abuse evidence and audit; independent hold release and native purge. |
| `node apps/api/scripts/private-audio-http-e2e.mjs` | PASS: existing explicit audio-policy controls, consent, exact PCM bytes and 4 MiB upload, participant/session isolation, idempotence and notification rollback, withdrawal, abuse hold and purge. |
| `node --test apps/api/scripts/profile-privacy.test.cjs apps/api/scripts/private-audio-validation.test.cjs` | PASS: 9 tests, zero failures or skips. |

The old direct-purge tests now construct the real erasure/recovery services with an independent synthetic journal fixture. They retain their original HTTP assertions. The dedicated A15 acceptance separately covers the real encrypted S3 adapter and backup recovery. General erasure is not enabled in these legacy tests, demonstrating that protected private-message retention remains independently usable.

The shipped Arabic/English privacy panel also passed all **14 distinct browser
cases** across the focused local runs. These use routed API fixtures and cover
the existing grievance flow, operation-key reuse after a failed transport,
refusal to display unpublished execution as complete, holds, logout with a late
private response, blank-template preparation, effective-date source selection,
owner disposition binding without execution, and independent hold release on
a closed case. Their UI checks do not replace the native HTTP/PostgreSQL source
and erasure checks above. API correctness lint completed with zero warnings.

## Reproduction contract

Build and generate the Prisma client with the repository's normal commands. Use a **new disposable loopback database**, named `a15_erasure_test`, with no accounts. PostgreSQL client tools must match the server; the fixture user needs permission to create its random restored database. `A15_POSTGRES_BIN` can point to those client binaries when they are not on `PATH`.

The fixture reads the server major version before setup, prefers the matching installed `/usr/lib/postgresql/<major>/bin` directory when no explicit override is supplied, and checks both client major versions. Its receipt records the Node and PostgreSQL client/server versions. This avoids a newer runner client introducing unsupported restore settings into PostgreSQL 16; an unavailable matching client fails the preflight instead of accepting restore errors.

The following schema reset is **only for that newly created disposable test database**. Production uses the normal migrations and must never use this reset:

```sh
npm --workspace @hydroland/api exec -- prisma db push --skip-generate
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c 'DROP TABLE "PrivacyRecordHold", "PrivacyErasureOperation"' \
  -f apps/api/prisma/migrations/20261128010000_privacy_erasure_receipts/migration.sql
node apps/api/scripts/bootstrap-messaging-runtime-schema.mjs
CI=true NODE_ENV=test A15_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
  A15_EVIDENCE_FILE=/tmp/a15-erasure-recovery.json \
  node apps/api/scripts/a15-erasure-http-recovery-e2e.mjs
```

The acceptance refuses a non-loopback database or an unexpected database name. It creates all accounts, decisions and private content synthetically and isolates every provider integration. Its journal survives the database restore in an independent in-memory gateway. No external provider request is part of this test.

Deployment and recovery requirements, including the temporary initialize variable, the old-worker barrier, baseline preservation and limits of earlier backups, are in `A15_ERASURE_RECOVERY_RUNBOOK.md`.
