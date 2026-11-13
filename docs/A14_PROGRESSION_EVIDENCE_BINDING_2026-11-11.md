# A14 source-bound dive completion integration

Prepared 11 November 2026. This candidate connects the reviewed pure progression evaluator to actual course completion and certificate gates in the unfinished training-standard branch. It is not merged, deployed, a source approval or A14 closure.

## Branch and implementation scope

This is a separate integration branch based on Draft PR582 head `a7fc659c218ed41e26287b59a23acc93715d7efb`. PR582 and PR585 remain unchanged and unmerged. The completion evaluator and original 150 tests originate from reviewed PR585 head `5b2fbe507684d9dfc8556f5ac6497cb28e28f3ae`. The 13 November extension adds a planning evaluator that reuses the same policy parser and actual-history evaluator; no parallel source rules are introduced.

The existing completion helper is already called by course completion, direct/legacy completion and certificate recommendation/approval paths. It now derives verified evidence and evaluates the source-bound progression instead of accepting total dive counts/minutes alone. **The 13 November extension enforces the bounded individual plan at create, reschedule and actual START.** Completion and planning share the source/evidence reader. See the current extension below; historical preparation counts are not current-head acceptance.

No real agency programme data, source decisions, credentials, documents, signatures or historical course approvals are created. Only explicitly synthetic isolated test fixtures receive test source records. No schema/dependency changes or new workflow are introduced.

## Immutable policy binding

`TrainingStandardProfile.diveProgression` contains the normalized schemaVersion2 policy definition without its own `profileHash`. The complete profile, including every qualification/sequence/day rule, is canonically hashed and independently reviewed through the existing lifecycle. Evaluation receives that complete profile hash from the server. A separate caller-supplied progression hash is forbidden; changing the nested policy invalidates both approval and enrolment binding.

A profile requiring OW dives or OW minutes must now supply the policy. Its required qualifying-dive count must equal the policy sequence length, and pre-dive skill codes must be in the programme's materialized required skills.

This bounded v2 integration requires aggregate `minimumOpenWaterMinutes: 0`. It uses actual per-dive qualification alternatives instead. Programme routes requiring an additional total-time rule need an explicit reviewed extension; they cannot be represented by relabelling submerged or elapsed time as bottom minutes. Non-diving profiles may omit the policy and retain their existing normalized shape.

**Adoption impact:** old diving profiles without the new definition fail closed. No historic approval is silently upgraded, no already-bound course is rebound and no progress/signatures are manufactured. Review an authorised adoption plan before any merge/deployment.

## Supported evidence contract

The adapter currently supports **exactly one physical OW dive per completed individual OW session**. Multi-dive sessions, imported/referral history and previous-instructor dive records are not silently inferred; those delivery/adoption routes require a separate reviewed contract. Group/assistant support remains unimplemented.

All completed sessions are inspected, with a hard limit of 200; histories are refused rather than truncated. Every completed OW session must have one matching signed dive entry. A started activity with another status, including CANCELLED or IN_PROGRESS, blocks completion until reviewed resolution. Completed POOL and CONFINED_WATER sessions provide the complete available confined history for the conditional day rule.

### Actual session producer fields

The existing TrainingSessionService records:

- `startedAt`, `endedAt`, `startedByAccountId` and `completedByAccountId`.
- Instructor/student `CheckInAt`, `CheckInByAccountId` and `CheckInSource`.
- `trainingStandardContext.environment` and `plannedMaximumDepthMetres`.

The adapter uses **endedAt**, the actual COMPLETE producer field. It does not accept the old tests' invented completedAt alias. Both check-ins must precede or equal actual start and occur after enrolment; source enums and attribution are checked. SELF attribution must match the relevant participant. Center/authorised-operator attendance retains its recorded actor rather than being falsely relabelled self-attendance.

Actual windows must lie within the scheduled window, after enrolment and no later than evaluation time. Windows must be positive, explicitly UTC and non-overlapping. The assigned instructor must match this bounded course contract. Source approval, credential validity, age/environment and depth limits are rechecked for both actual start and end, as well as current completion time.

### Signed dive documents

Only the existing managed-document system is read. A TRAINING-DIVE-LOG uses the existing generic document workflow and must be SIGNED and have actual approved/signed timestamps, content hash, distinct creator, independent approver and current instructor signer. It must match center, enrolment, student, instructor and full source-profile hash. Approval/signature cannot precede the recorded dive end or lie in the future. Wrong-source or malformed signed logs for this enrolment are refused, not filtered away while counting another valid log.

`payload.openWaterDives[]` entries contain exactly:

- `id`, `sessionId`, `environment: OPEN_WATER`.
- `startedAt`, `endedAt`, `kind: QUALIFYING | EXPERIENCE`, `qualifyingNumber` or null.
- `maximumDepthMetres`.
- Scalar `submergedSeconds`, `depthThresholdMetres`, `secondsAtOrDeeperThanThreshold`, and `breathedGasLitres` or explicit null.

These are scalar TABLE columns accepted by the actual pinned-template validator (at most 100 rows per document). The adapter reconstructs the evaluator's nested qualification object. Earlier candidate underscore codes and nested table cells are refused rather than silently migrated. The generic template, payload, separation-of-duties and permission rules are unchanged.

**Signing boundary:** the existing document API grants SIGN only to organisation OWNER/ADMIN. This bounded route therefore needs the qualified current instructor to already hold that organisation role, plus a distinct authorised creator and approver. An ordinary organisation INSTRUCTOR cannot sign via this route. No real role is granted, and the candidate does not invent an instructor-signing exception. A dedicated reviewed domain-signing workflow remains an adoption need for other staffing models.

Generic documents preserve a supplied content hash; the adapter does not claim that its presence independently cryptographically verifies physical measurements. The exact profile hash is compared against the server-owned course binding, and authorised review/signature supplies the documentary evidence.

The server supplies the verified source hash. Every dive fits its actual attended window and planned depth. The evaluator then checks measurement consistency, qualifying sequence, depth/time-or-gas rules, daily caps, duplicates, overlaps and prerequisites. Experience dives count in applicable day limits but cannot satisfy required qualifying counts. Any recorded violation blocks completion.

Physical identity and measurement authenticity still depend on the official evidence workflow and its authorised signers/reviewers. Neither a JSON ID nor a valid hash independently proves a physical event. A future evidence-ingestion/manifest contract must address unsupported imports, attempts and delivery routes; do not claim universal history completeness from this adapter.

### Skills and other gates

Accepted competencies retain current-instructor evidence or exact source/signer/time audit proof for previous instructors. The stored assessment event time is used for pre-dive readiness; late documentation is not silently backdated to an assumed performance time. Other official forms, required skills/sessions and existing gates still apply.

The pure evaluator's `productionAuthorized: false` is not changed or treated as a regulatory approval. The existing authenticated source-review/approval and course gate remain the only operational-authority path, and no real source has been accepted by this change.

## Tests and validation boundaries

At local preparation:
- 305 isolated contracts pass: 32 core-profile, 123 profile/adapter and 150 unchanged pure progression tests.
- Strict standalone TypeScript against available Prisma/Nest types, repository API ESLint and JavaScript syntax checks pass.
- Independent review found the endedAt/completedAt producer mismatch and missing check-in enforcement despite initially green tests. Both were corrected before publication, with explicit seam/attendance regressions. The additional document-producer review found nested TABLE and template-code incompatibilities and an invalid test signer/creator pairing. Those were corrected without relaxing document rules. Targeted re-review independently passed all 123 profile tests and found no remaining blocker in the revised boundary. Eight isolated guard mutations were detected.
- The new guarded PostgreSQL script contains 37 cases. It tests actual Prisma transactions and completion helper behavior, no-write snapshots and rollback cleanup. One case calls the compiled TrainingSessionService lifecycle with real AuditService and TrainingAuthorizationService inside a rollback-only Serializable transaction, verifying actual producer output. Every baseline uses actual DocumentPersistenceService and DocumentAuthorizationService to create a template/document, submit, approve and sign, checking revisions and lifecycle events. A negative case proves a plain organisation INSTRUCTOR cannot sign; another proves signed-document immutability.
- The script hard-refuses non-CI use, non-loopback DB hosts and unsupported URL overrides before connecting. Local syntax and guard refusals passed; **actual PostgreSQL/service execution is pending CI** at this preparation.
- Database fixtures are synthetic. They exercise separate test author/reviewer approval and explicitly scoped historical fixture dates, then roll back. This is not historical real-source approval and not a production or provider operation.
- The optional PlatformDocumentSourceService capture path is not requested; a throwing stub guards that unused dependency. No source-capture coverage claim is made. No HTTP test claim is made for direct compiled service calls. Existing endpoint wiring checks and broader regressions remain separate.

The existing API workflow runs all isolated suites and the new PostgreSQL suite after build/schema setup. Full repository checks, real database/service output and current-head remote CI must be verified on the published commit; earlier PR582/585 results cannot substitute.

## Remaining adoption gates

Complete current agency editions, updates, source applicability and official credential/form/measurement mapping; independent authorised source acceptance; unsupported planning/delivery routes beyond the individual contract; group/assistant rosters and role/risk/equipment/junior exceptions; deliberate legacy/referral/multi-dive-session/attempt handling; real endpoint/concurrency/browser acceptance and authorised live release checks. Marine/weather/site and broader A14 organisational obligations remain open.

Do not merge, deploy or close A14 from these test results alone.


## 13 November: certificate endpoint acceptance extension

The existing evaluator and completion adapter are reused unchanged. `training-progression-certificate-http-checks.mjs` is called from the existing certificate HTTP suite in the isolated API/HR integration path. It creates synthetic database evidence, then sends authenticated HTTP requests to the actual certificate recommendation and reviewer-decision endpoints: a source-specific first-dive depth violation must create no recommendation; failed individual qualification must issue no certificate; the explicit v2 gas alternative may qualify below the time threshold and permit independent approval. The existing 305 isolated contracts remain unchanged and passed locally.

This extension tests the certificate endpoint wiring, not a full learner browser journey, concurrent progression edits, document lifecycle HTTP, physical measurement provenance, source approval or operational acceptance. Signed-proof modifications are direct-database fault injection on disposable CI fixtures; production document signing/immutability permissions are not changed. Actual HTTP/PostgreSQL execution on this new head must pass before claiming that new coverage.


## 13 November: individual planning and actual START

Current implementation adds the following bounded behaviour to this same candidate:

- OPEN_WATER reservations explicitly carry `diveKind: QUALIFYING | EXPERIENCE` and a qualifying sequence number or explicit null. The center UI supplies these fields; non-OW requests reject them. They participate in the existing stable request fingerprint and optimistic parent revision.
- Create and reschedule evaluate the complete remaining reserved horizon against the immutable v2 source policy and the same verified actual-history reader used by completion. Per-dive and daily depth, sequence, day quotas, confined-water conditions, source identity and overlaps are enforced. A reservation can project the sequence for future planning; it never becomes a completed dive or a certificate prerequisite.
- At START the server uses actual current time and requires actual qualifying predecessors and source-bound pre-dive skill signatures. Future reservations cannot supply those facts. An expired source, unsupported instructor transfer, malformed/unclassified OW reservation, unfinished started attempt or incomplete actual evidence fails closed. New classified sessions cannot be relabelled in a later signed log.
- Source-bound individual dive participants cannot be double-booked across training and human calendar resources even when generic SCHEDULE_CONFLICT is DISABLED/REVIEW. The reciprocal calendar predicate retains this protection for dive profiles; existing optional non-diving semantics are preserved. Existing Serializable transactions contain the reads and writes.
- Exactly one physical dive per individual session remains the supported delivery route. Cross-midnight reservations and histories beyond 200 sessions require a reviewed extension. No group/assistant/import/referral/transfer permission or production profile is inferred.

Local validation: 329 isolated contracts (32 core + 124 profile/adapter + 173 evaluator/planner) passed locally. API typecheck, build, lint, JS syntax and whitespace checks passed on the complete candidate. The PostgreSQL suite now contains 45 cases, including partial-history planning, per-dive depth, unclassified legacy plans, actual compiled START, planned-only predecessor refusal, post-START classification consistency and both conflict directions with the generic flag disabled. Real HTTP cases exercise create depth rejection with no writes, concurrent reservation requests with one winner, idempotent replay, actual START predecessor refusal with unchanged session/audit, and the existing certificate paths. These new database/HTTP cases require current-head CI success before acceptance.

Seven focused browser cases include experience/null handling, clearing OW fields for POOL and retaining a server source rejection. Local Chromium was attempted but the environment refused socket() during launch, before tests ran. This is not a browser pass; the existing GitHub full-browser workflow must validate them. No workflow, schema, dependency, source approval, production document or access permission is changed.

These tests use explicitly synthetic isolated fixtures only. Operational source/form/measurement acceptance, group/assistant/legacy delivery, marine equipment and licenses, site/weather policy, independent real acceptance and authorised release remain outside this technical slice. The owner-approved current boat inspection report closes that document approval follow-up only; it does not resolve the report's 12 passengers versus 8 lifejackets or all vessel readiness requirements.
