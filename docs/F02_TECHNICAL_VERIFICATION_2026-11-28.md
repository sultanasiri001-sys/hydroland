# F02 — crew assignment lifecycle and current qualification

Scope: [HYD-35 / F02](https://linear.app/hydroland/issue/HYD-35/f02-alwzaef-walmham-waltaqm-walantzar-walbdyl-almuhl), implemented on the isolated `work/blue-f02-20261128` branch from main `6611c84ec34cbe258d13a27fb56637db4b78f431`.

This record describes technical behavior and isolated verification. It does not certify a person's professional qualifications, adopt a real external requirement, approve a real assignment, execute compensation, publish to production, or close Q01.

## Original gaps and resulting behavior

The former response endpoint could mark an assignment accepted without rechecking the current credential, native role, membership, compensation, or calendar source. Rejection and overdue handling could choose a replacement automatically. An accepted row alone was used as operational readiness.

The new native lifecycle distinguishes the following decisions:

| State/action | Result and preserved evidence |
| --- | --- |
| Waitlist | Qualification and compensation are captured, but no calendar reservation or acceptance is implied. |
| Proposal | A scoped manager proposes an eligible person for this exact trip and role. Current source and compensation revisions are pinned. |
| Independent approval | A different authorized person rechecks the source, requester, credentials, compensation and current calendar, then reserves the candidate's interval. The original assignment remains in place. |
| Personal acceptance | The assigned person accepts the recorded terms. Current evidence, reservation, approval and revision are checked again. |
| Decline/cancel | The decision and reason are recorded atomically, and only this person's unused reservation is released. No substitute is selected automatically. |
| Substitute acceptance | A separately proposed, qualified and independently approved substitute personally accepts before the original is marked replaced and its reservation released. |
| Overdue response | One notification/audit per assignment revision requests administrative action. It never approves a substitute. |

Every new acceptance or replacement is prohibited once the trip has started. Account aliases are compared by the native person where independence matters. Existing accepted rows remain readable and are identified as `legacyUnverified` when they lack the new evidence. They are not silently promoted into qualified assignments.

## Qualification and compensation boundaries

`MAR-F02-CREW-QUALIFICATION` is a blank form installed only through an explicit owner action. It requires the actual source authority/reference/version/clause, exact operator, trip activity, role, effective window, and explicit credential criteria. No real requirement or approval is seeded.

The command reads the current approved native document version, its revision and approval lifecycle, branding evidence and current approver authority. It matches exact credential issuer/title, issue/expiry dates, the native credential review audit, reviewer identity, active role and operator membership. An optional generic policy setting cannot manufacture qualification evidence.

Instructor compensation uses the existing owner-recorded immutable agreement and its original validator: percentage, fixed, combined, or salary-only. A new revision does not rewrite already assigned terms. Employees/captains use the existing approved effective employment compensation term with independent approval. All snapshots state `financialExecution: false`; no earning, payment or ledger entry is created.

The worker and scoped manager receive limited source references/counts and the compensation terms needed for the decision. Credential files, source payloads, hashes and private document storage references are not returned in the workspace.

## Consistency and physical accountability

Commands run in the native serializable transaction with request receipts, compare-and-swap revisions, audit and notifications. A retry with the same actor/request identifier returns the original result; changed payloads cannot reuse that identifier. Partial unique indexes protect duplicate active native assignments and concurrent approved substitutes.

Before a write commits, locking reads pin the actual account/role/membership/employment/authority, trip/resource/reservation, credential/review, source and compensation rows. A change committed after the transaction snapshot causes PostgreSQL to reject the stale locking read; the native transaction retry then rechecks the new source state. The concurrency acceptance case pauses the real credential read, commits a revocation through another connection, resumes acceptance and proves that the original person and reservation remain intact.

`crewAssignmentReadiness(tx, assignmentId)` returns only `operationalReady`, `legacyUnverified` and safe reason codes. It checks the live source and the existing active reservation. Calendar readiness retains the original until a substitute accepts, and accepted but invalid source evidence blocks new operational clearance even when the generic response preference is disabled. Clearance preview/scan now also checks current crew evidence, so credential loss produces `STALE` and a subsequent explicit scan records revocation.

This helper must not filter physical accountability. D04 retains accepted and previously recorded people for return/assistance, including legacy or subsequently ineligible crew. Losing qualification never deletes a person or declares that person returned.

## Migration and compatibility

`20261128030000_crew_assignment_lifecycle` is additive: nullable evidence/approval fields, revision default 1, command receipts and two partial unique indexes. Existing statuses and null evidence remain unchanged. New fields are read/written through bound SQL, so no parallel shared-client regeneration was needed during development.

The acceptance harness creates a unique disposable schema, derives the immediately preceding Prisma shape, seeds a legacy row using its original SQL columns, applies the actual new migration, and checks that the row survives unaltered. The original equipment-inspection and trip-weather runtime definitions are applied only inside that disposable schema for the real clearance reader. Older production migration files are unchanged.

Existing calendar/training, clearance snapshot, explicit prohibition, center lifecycle and mixed-commerce fixtures now establish synthetic qualification and compensation through the real propose → independent approval → personal acceptance service. The old private automatic-replacement entry point fails closed. Their original scheduling, clearance and finance assertions remain in place.

## Verification

The native receipt is emitted on success or failure at `artifacts/f02/crew-assignment-http.json`. It contains test results, runtime versions, source SHA-256 hashes, compiled SHA-256 hashes and explicit isolation bounds. It contains no credentials or authorization tokens.

Local native run completed **2026-11-28 14:20:52 UTC: 16/16 groups passed**, on Node 24.22.3 and PostgreSQL 17.12 in a disposable loopback database/schema. Chromium uses the locally available headless executable. These are local results; the integration head still needs its normal Node 22 / CI PostgreSQL gate.

- Native HTTP/PostgreSQL groups: migration/legacy; exact credential/role/membership; compensation; waitlist/approval/acceptance; current source and same-session revocation; calendar/alias conflict; removed reservation; rejection/cancellation/escalation; concurrent substitute approval and audit rollback; notification rollback; mid-command credential revocation; employment/salary-only; departure boundary; current-clearance revocation; workspace confidentiality and revoked manager.
- Browser: 5/5 passed against the actual shipped page/auth code with deterministic API responses. Covered Arabic mobile terms acceptance, matching source selection/waitlist, English independent substitute approval, retained retry identity, denied-authority scrubbing and logout with an in-flight private response. Browser fixtures do not replace native backend proof.
- TypeScript build and scoped ESLint: passed.
- Clearance snapshot contract: 42 groups passed, including source failure through all three preference states and atomic rollback. This contract suite explicitly stubs crew readiness; native source truth is covered by the HTTP/PostgreSQL suite.
- Existing mandatory-policy contract: 48 groups passed.

### CI commands

After the normal isolated dependency install, Prisma generation and API build, create a disposable loopback database named `f02_crew_test` (or `f02_crew_test_<suffix>`), then run:

```sh
CI=true NODE_ENV=test F02_DB_TEST_CONFIRM=DISPOSABLE_LOOPBACK_ONLY \
  DATABASE_URL=postgresql://<ci-user>:<ci-password>@127.0.0.1:<ci-port>/f02_crew_test \
  node apps/api/scripts/f02-crew-assignment-http-e2e.mjs

node apps/api/scripts/clearance-snapshot-validation.cjs
node apps/api/scripts/mandatory-policy-validation.cjs
npm --workspace @hydroland/web run test:e2e -- crew-assignment.spec.js
```

The native harness starts its own loopback API and rejects a supplied API base URL. Archive its receipt with `if: always()` and identify it by the exact integration head. Use the existing CI browser configuration and Node/PostgreSQL versions. Do not run this fixture against a production database.

## Remaining non-technical adoption

An authorized owner/operator still supplies and adopts the actual qualification source, the actual verified credentials and the native compensation agreement, then performs the independent human decisions. This implementation does not create those facts. Production deployment, exact-head CI acceptance, group status changes and Q01 are recorded separately by the integration owner.
