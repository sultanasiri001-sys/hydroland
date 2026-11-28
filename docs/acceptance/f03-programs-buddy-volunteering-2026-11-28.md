# F03 programs, buddy consent and volunteer corrections

Date: 2026-11-28. Scope: isolated implementation and acceptance for the remaining F03 technical gaps on top of B14 community and D16 policy controls. These checks created only disposable synthetic records. They did not adopt a real D19 program, approve its contents, enroll a production participant, issue a certificate or complete Q01.

## Native programs and source approval

The platform owner can prepare an ordinary native `DRAFT` document using the `HYD-COMMUNITY-F03` template and `DocumentPersistenceService`. The form requires explicit academy, environment, volunteering and buddy-matching choices; a named verified coordinator; bilingual content, consent, privacy and safety terms; and explicit validity dates. No choices, coordinator, validity dates, approved source or participant consent are seeded.

The draft opens in the existing document workspace. Adoption is a separate owner action and requires a currently approved or signed native document, its exact version and content hash, the full independent review-source hash, an active unchanged template, and current owner/coordinator authority. The immutable template statement limits matching to consent to coordinate: it does not grant dive clearance, medical eligibility or an external certificate. The existing D02 training and trip workflows retain their own authorization and completion requirements. The academy action opens the existing training interface.

Each adopted program pins its native source and owner. Reads and new actions recheck the source, approval evidence, template, validity interval, canonical platform organization, active verified owner/coordinator, and current D16 community policy. Drift, retirement, expiration or loss of authority removes the program from the available catalog and blocks new consent and matching. A withdrawn edition cannot be silently adopted again; it needs a new source edition. Program adoption and withdrawal include atomic audit records.

Approved program activities use the existing community event and volunteer lifecycle. New F03 activities are created as drafts, are limited to an enabled program scope, and must stay within the approved date interval. Publication and later cancellation use the existing moderator controls. Naming an ADMIN coordinator does not itself grant D16 moderation: the platform owner remains able to manage the activities, and a coordinator must also be the designated D16 moderator to do so. The source form states this boundary explicitly; a separate-coordinator native case verifies that it grants no extra event privileges. Registration requires explicit current program consent and safety acknowledgement in the same transaction as the registration and audit. The participant's source hash is retained separately and is rechecked before hours approval. Unrelated existing B14 events keep their existing registration flow.

## Mutual matching consent and visibility

An active verified participant must opt in to a specific current program before viewing its directory. The directory exposes only an opaque membership identifier, the participant's chosen alias and broad area. It does not expose account identifiers, email addresses or phone numbers. It does not open a conversation, send an outbound message or automatically share contact details.

A request requires explicit current terms and a stable retry key. Only the invited participant can accept or decline it. Acceptance rechecks both active accounts, their membership revisions, current consent, source hash and program authority. A different account belonging to the same person cannot serve as the second participant. An active pair is unique even under concurrent requests. Both participants can withdraw a pending or accepted request.

Withdrawing program membership invalidates its pending and accepted requests and removes the peer's alias/area from current request views. Rejoining advances the consent revision and cannot restore an old match. Source suspension and peer-account suspension also redact peer details. Active participants can still withdraw or decline while the program source is unavailable. No new participation is authorized by a stale browser response.

Mutations use serializable transactions, a shared F03 transaction advisory lock, native identity/source locks, database uniqueness and bounded conflict retries. Write paths lock the current owner/coordinator identities and ADMIN roles as well as the inherited D16 policy pin, document, template, revisions, lifecycle and moderator authority through commit. Two held-row acceptance barriers exercise actual coordinator-role revocation and D16-source archiving: the request waits, then returns 403/409 without an acceptance record or audit. Failed audit insertion rolls back the corresponding adoption or request. The SQL uses bound parameters and preserves the native types of referenced identifiers.

## Volunteer correction history

The existing attendance review now requires a reason when changing previously approved minutes, preserves previous and new minutes, and records the reason and reviewer identity in each audit entry. The member's existing work summary includes the history for their own registrations only. It continues to count the latest approved value once. Corrections preserve the original attendance timestamp; their separate review and audit timestamps record when the correction occurred.

The interface submits the current record revision and retains entered values after a failed save. A stale revision is rejected. An identical successful review retry does not create another history entry. Native acceptance verifies 120 → 90 → 75 minutes, all three reasons and the reviewer identity, while the final summary is 75 minutes. No unrelated member can read that history.

## Arabic and English interface

The community workspace includes the approved program catalog, visible source reference/version, content and participation terms, guided source drafting/adoption, program activity forms, explicit registration consent, buddy opt-in, the consenting directory and incoming/outgoing matching decisions. Source hashes remain internal bindings rather than fields a user must type.

The interface clears private state on session or role changes and fences late responses from a previous account. Switching programs immediately removes the old forms; each form is also pinned to the program identifier and source hash it displayed. A delayed reload cannot apply consent or an activity entered under one program to another. Authenticated F03 reads and the private volunteer history use `Cache-Control: private, no-store`. Inputs survive failed saves. Inactive source views retain exit controls. Native workspace routing includes the program section; locale changes update its Arabic and English labels. Browser checks cover 320 px and 1024 px widths in both languages, horizontal overflow, consent controls and target sizes. The captured Arabic mobile and English desktop views were visually inspected.

## Executed evidence

All native checks used a fresh disposable loopback **PostgreSQL 17.12** cluster, the compiled normal API and synthetic accounts. The baseline schema was created without F03 tables and the actual forward migration was applied before the HTTP suite. The cluster and API were stopped and its data directory removed afterward. PostgreSQL 18 production/CI acceptance belongs to the integration run; it is not claimed by this local receipt.

| Check | Observed result |
| --- | --- |
| API build, TypeScript and ESLint | Passed |
| Prisma schema validation | Passed |
| Web build | Passed |
| Web node tests | 165/165 passed, no skips; all six source/design/public/commerce/portal validators passed |
| F03 native HTTP/PostgreSQL | 21/21 groups passed, no failed or skipped groups |
| F03 migration rehearsal | 32/32 mixed TEXT/UUID combinations passed for Account, Organization, ManagedDocument, CommunityEvent and CommunityVolunteerRegistration |
| Existing B14 completion HTTP/PostgreSQL | Passed edit/review, stale revision, suspension, withdrawal, private case report, hold, independent release and explicit retention purge |
| Existing community integrity | 16 groups passed, including ten audit rollbacks, three deterministic races and revoked-role/suspended-account checks |
| Existing community HTTP/PostgreSQL | Passed publication review, private ownership, capacity-safe registration, 120 → 90 minute reconciliation and consultation lifecycle |
| Focused Chromium acceptance | 24/24 passed: 12 F03 cases plus all 12 existing community cases |

The native and migration receipts are retained in [`f03-native-evidence-2026-11-28.json`](f03-native-evidence-2026-11-28.json), including the tested SQL SHA-256.

The 21 native F03 groups cover default-off behavior; owner-only authoring; native drafting and rejection before independent approval; exact source adoption and audit rollback; explicit directory consent; limited projections; retry idempotency and key-substitution rejection; invited-participant acceptance; withdrawal and revision invalidation; concurrent duplicate pairs; acceptance racing withdrawal; request audit rollback; source drift; template retirement and coordinator revocation; suspended peer visibility; source-bound event dates; atomic volunteer consent evidence; correction history; unchanged unrelated B14 registration; program withdrawal with remaining exit controls; held-row authority/source revocation during acceptance; and the separate coordinator/D16 moderation boundary.

The 32 migration cases apply the real SQL in isolated schemas, verify exact referenced column types, enforce active-pair uniqueness and valid states, reject deletion of referenced identities, and verify event/registration cascading cleanup. The migration contains no approval, program, consent or policy data.

The native program fixture exercises the real draft and document submission endpoints, then records a clearly labelled synthetic independent approval in the isolated database using the existing D16 fixture pattern. Native independent reviewer assignment is owned by the existing document acceptance suite. These synthetic approvals are not evidence of a human D19 decision.

## Reproduction and integration

The additive migration is `20261128040000_community_program_buddy_consent`. It creates five native tables: `CommunityProgram`, `CommunityEventProgram`, `CommunityVolunteerConsent`, `CommunityBuddyMembership` and `CommunityBuddyRequest`. Existing tables and historical migrations are unchanged. The new Prisma relations mirror these tables; the partial unique active-pair index and check constraints are supplied by the SQL migration.

Use a fresh loopback test database with the existing baseline schema plus the actual migration, and a normally built API. Set `NODE_ENV=test`, `DATABASE_URL`, and `F03_E2E_BASE_URL` to the loopback API URL. `F03_PSQL_PATH` can select a local `psql` binary. Optional `F03_EVIDENCE_FILE` and `F03_MIGRATION_EVIDENCE_FILE` paths retain machine-readable receipts.

```sh
npm --workspace apps/api run build
npm --workspace apps/api run typecheck
npm --workspace apps/api run lint
node apps/api/scripts/community-f03-http-checks.mjs
node apps/api/scripts/community-f03-migration-types.mjs
node apps/api/scripts/community-runtime-http-e2e.mjs
npm --workspace apps/web run build
npm --workspace apps/web test
npm --workspace apps/web exec -- playwright test community-f03.spec.js community-runtime.spec.js
```

The HTTP scripts require the isolated API to be running. The migration rehearsal requires `psql`. A fixture bootstrapped from the updated Prisma schema must recreate these five new, empty F03 tables from the actual migration before claiming SQL constraints were exercised; `prisma db push` alone does not create the partial index or check constraints. Existing community fixtures based on the full updated schema already have the table names required by the optional F03 event lookup. The isolated F03 commits did not modify workflows or publish/deploy anything; the integration change adds the focused checks to the shared workflow and runs the combined blue-group source.

## Remaining real decisions

F03's local technical implementation and isolated acceptance are complete for this scope. Real D19 program content, coordinator assignment, validity dates, independent approval and owner adoption remain human decisions. Without those current sources, the new program features remain inactive. Real participant participation, any physical diving/training activity, and final user acceptance remain Q01. No test result or technical record changes those decisions.
