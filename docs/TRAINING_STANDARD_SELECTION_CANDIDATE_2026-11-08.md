# A14 — organisation-scoped training standards candidate

Base: `0c2bb13eeba416ef90c9b5068bb5a14aff194f9c`. Owner direction in the 8 November conversation: each course uses the instructor's selected agency, programme, level and reviewed standards edition; no substitution of one agency's rules for another.

## Status and non-adoption boundary

This is a **review candidate**, not production acceptance, an approval of any agency's standards, a Saudi licence, or A14 closure. No production records, switches, credentials, infrastructure, or deployments were changed. No real programme was automatically approved or seeded. All numbers and agency-like identifiers in tests are explicitly synthetic. The source/library references below identify available evidence, not accepted operational profiles.

The integration is intentionally fail-closed. **Do not merge/deploy without the rollout checklist below:** an existing course without an approved binding cannot be activated, start sessions, complete, or obtain a new certificate approval after adoption. Completed certificates are not rewritten. Existing unbound courses with sessions need a reviewed migration/adoption path, not invented historic approvals.

## Implemented candidate

- Versioned, canonical-hashed agency/programme/level/edition profiles; agency source required even when ISO is cited.
- Draft creation and independent source review/revocation, revision-checked and audited. Reviewer decisions are authenticated operations, not inferred from successful tests or this owner's design approval.
- Only the assigned active instructor can bind an eligible programme. Verified, exact-issuer instructor qualifications are checked, not a substring or a diver certificate from another agency.
- The catalogue filters approved, valid programmes by the instructor's verified qualifications. New agencies are data, not hardcoded fallback rules.
- Selection is immutable for the course. Missing required skill codes are materialised without deleting existing plan content. Exact source codes remain labels until reviewed human-readable skill names are mapped; no descriptions are invented.
- Instructor UI selects agency then programme/level/edition and shows the programme's requirements. No choice is committed merely by changing a dropdown.
- Centre scheduling specifies the environment and planned depth per individual session, allowing pool and open-water sessions under the same pinned programme. Rescheduling and instructor transfers recheck qualification and date-dependent limits.
- Session scheduling/actions, direct/legacy completion, instructor completion, certificate recommendation, and certificate approval call the same server-side standard gates. General control switches do not adopt a source profile or bypass these gates.
- Generic policy-control mutation endpoints refuse the profile category. Public enrolment metadata cannot inject a trusted `trainingStandard*` namespace.
- Source approvals must cover the activity date. Missing birth date, unknown supervision bands, expired credentials, revoked approvals, and content-hash drift stop the operation.
- Existing sessions model one student each. No group roster or assistant multiplier is invented; a separate invariant prohibits overlapping individual assignments even if generic schedule-conflict controls are off. **Group training is not implemented by this change.**

## Evidence contract for completion

Read existing managed documents only: `SIGNED`, non-null approval/signature timestamps, same centre, and payload `trainingEnrollmentId`, `studentAccountId`, `instructorAccountId`, `trainingStandardHash` matching the course. The approving account must differ from instructor and student. Form codes come from `DocumentTemplate.code`.

Open-water proof uses template `TRAINING_DIVE_LOG`, signed by the instructor, with `payload.openWaterDives[]`: `id`, `sessionId`, `environment: OPEN_WATER`, `startedAt`, `bottomMinutes`, and `maximumDepthMetres`. It must refer to a completed session of this course/instructor and lie inside both its scheduled and actual attendance window (`evidence.startedAt`, `evidence.completedAt`), with the session's verified planning context. Duplicate IDs, overlapping dive windows, excessive depths, unsigned/different-source documents, and generic elapsed session time do not count. Existing documents that do not meet this contract are not silently relabelled or accepted.

## Available references; extraction is not source acceptance

- Owner-uploaded Arabic **PADI Instructor Manual, Version 2026**: https://chatgpt.com/library?file_id=libfile_b3a16485715c8191870d22e0fa9e3a35&account_id=personal . Printed guide pp. 1–2 distinguishes general standards from individual programme exceptions; PDF page 1 identifies Version 2026. Full programme/age/environment/assistant/progression exceptions and later training bulletins still require extraction and review. Do not ask for the same manual again.
- Initial Open Water source extraction is in `docs/PADI_2026_OPEN_WATER_SOURCE_CROSSWALK.md`: physical PDF pp. 53–57. It records four qualifying open-water dives, the source-specific 12 m/18 m progression, knowledge/confined-water requirements, forms and ratio exceptions. These are not a complete operational profile and were not seeded or approved.
- ISO 24801-2:2014 scope: https://www.iso.org/standard/60461.html . Shared competencies do not prove every agency's detailed ratios, sequence, or certification procedure.
- SSI publishes programme-specific requirements: https://training.divessi.com/us/course/scuba-training-standards-and-procedures/entry-level-programs-1/open-water-diver-iso-24801-2 . The fetched view was labelled **ARCHIVE**; do not adopt it as the current edition without verification.
- NAUI programme: https://www.naui.org/learn/entry-level/open-water-scuba-diver-autonomousiso-level-2/ and policies discussion https://www.naui.org/faqs/ . Public summaries are not a substitute for the applicable complete standards edition.

## Required before adoption

1. Extract the actually offered programmes and exact credential titles from the known manuals/current official standards, then independently review sources, applicability, edition, and effective dates. Complete source-specific exceptions (including dive progression, individual-dive minima and group/assistant limits) before treating any profile as complete. The present profile supports a bounded set of programme constraints, not every rule of every training agency.
2. Review the new `TRAINING_DIVE_LOG` evidence/field mapping against existing official templates and documents. Do not fabricate forms or map unrelated signed documents as proof.
3. Run full API typecheck/lint/build, real isolated PostgreSQL and Nest HTTP checks, and browser regression tests. Update old synthetic fixtures to explicitly model accepted profile selection; do not disable gates to turn them green. Local adapter tests use exception substitutes and an in-memory transaction-shaped fixture, **not a real Prisma transaction or rollback/concurrency proof**.
4. Define an authorised adoption path for existing courses and group-session requirements. No new authorisation rules for Saudi licences are implied; existing Saudi gates remain in place.
5. Reconcile release-source/CI/deployment identities, perform authorised live functional acceptance, and record independent review/owner approval. Keep A14 open until its other marine-asset, weather, source-applicability and organisational acceptance requirements are also met.

## Local verification at preparation

`node --experimental-strip-types --test apps/api/scripts/training-standard-profile.test.mjs`: **68/68** isolated contracts on Node **24.22.1**. JavaScript syntax checks and `git diff --check` passed. Added five real-browser UI fixtures but did not execute them locally: Playwright launch failed because no Chromium executable is installed. Node 22, full TypeScript/Nest/PostgreSQL checks, remote CI and live acceptance are separate evidence and must not be claimed from the local result.

## Subsequent remote evidence (bounded by exact commit)

- `7eddc55e86d90ec45e4ac64812b2707254d9f47d`: isolated contracts passed on Node 22; API job 128662685500 in run 42458559858 recorded successful lint, training validation, typecheck and build steps. This is not a claim that the entire API workflow or deployment passed.
- The initial separate workflow was correctly blocked by the A02 inventory contract as unclassified. It was removed and the same isolated suite was added as an unconditional step in the existing API workflow, without changing the approved workflow inventory or weakening a gate.
- `17b3097150d7670e0a0eefa416aa2cc6e570bf87`: API run 42458747749 passed the new isolated Node 22 step and source lint; A02 release-evidence contract run 42458747734 passed. Full API, browser and other checks were still running at this observation. Do not transfer a completed step from the earlier commit into a full-pass claim for this commit.

PR: https://github.com/sultanasiri001-sys/hydroland/pull/582 (draft, not merged). Any documentation-only later head still needs its own exact-head CI reconciliation before adoption.

## Follow-up: separate ready foundation from unfinished activation

Owner requested merging the ready subset and completing the remainder. PR #583 extracts only the side-effect-free engine, 32 core tests, and source crosswalk, without any runtime import/call sites or operational changes. Its merge must not be described as activation or A14 closure.

PR #583 passed all **16/16 exact-head checks** and was merged as `bb25994d6fd56929e465dc22945dc4af2abf379b` on 8 November 2026. This branch incorporates that main-line foundation while retaining the unfinished operational integration separately. No real source profile, legacy-course adoption, group roster, or A14 closure was approved by that merge.

On the full #582 candidate, calendar and grouped form-library integration correctly rejected unbound legacy/synthetic courses with `STANDARD_SELECTION_REQUIRED`. The existing tests now explicitly set up **synthetic** programme prerequisites using `training-standard-isolated-fixture.mjs`, guarded by `CI=true` and loopback database/API hosts. No production source record is approved, no real agency limit is seeded, and no original assertion is relaxed. The store path adds an explicit negative check that an unbound course is rejected before fixture adoption. This helper is not an operational adoption mechanism; real legacy courses still need one.

Prior instructors' signed skills now carry source-hash, signer and timestamp audit metadata. Completion can retain an earlier signature only with exact matching audit proof for the pinned source. Two additional local contracts cover preservation and refusal without proof: **70/70** isolated tests passed on Node 24.22.1. Real database/concurrency checks for these changes remain separate, pending exact-head CI.
