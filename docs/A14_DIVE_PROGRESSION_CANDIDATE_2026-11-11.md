# A14 dive progression: independent implementation candidate

Prepared 11 November 2026. This is a technical review deliverable, not acceptance of a real training programme, source edition, agency standard, licence, operating condition, or certificate.

## Verified current repository position

- Current main: `19a8dc31a2f98b993bcda8048cdd986f9bd21f3c`.
- Existing training integration: Draft [PR #582](https://github.com/sultanasiri001-sys/hydroland/pull/582), head `a7fc659c218ed41e26287b59a23acc93715d7efb`, not merged.
- Its 17 discovered pull-request workflows were re-read and are all completed/success. This is the returned PR-run set, not a claim about every deployment workflow or live acceptance.
- [Web run 42923595281](https://github.com/sultanasiri001-sys/hydroland/actions/runs/42923595281), job 130204305067, independently records 5/5 focused agency-selector cases and 667/667 full browser cases passed. The actual log, not just the PR description, was checked.
- [Calendar/training run 42923595477](https://github.com/sultanasiri001-sys/hydroland/actions/runs/42923595477) has successful real PostgreSQL jobs for UTC, Asia/Riyadh and America/New_York. Each job reports success for typecheck, build, training validation, cross-role availability, calendar availability, alias checks and weather context checks.
- The old calendar/browser regression failures have therefore been repaired on the current #582 head. Repeating the former fix is unnecessary. Successful CI does not establish agency-source acceptance or A14 closure.

## New isolated candidate

Two new standalone files are supplied:

- `apps/api/src/governance/training-dive-progression.ts`
- `apps/api/scripts/training-dive-progression.test.mjs`

They are prepared as an independent review candidate based on main, without changing the #582 branch. The existing API validation workflow adds one unconditional synthetic contract step; its original steps and assertions are unchanged. No application call path imports this evaluator. No schema, operational profile, approval, tracker, certificate or runtime setting was changed.

The pure evaluator accepts an explicit policy and complete already-verified evidence. It implements:

1. A contiguous sequence of qualifying dives with individual minimum bottom time and maximum depth. A programme-wide depth or accumulated time cannot substitute for these per-dive requirements.
2. Distinct experience dives with limits for the number of qualifying dives already completed. An experience dive never advances the qualifying sequence. An uncovered stage fails closed.
3. Daily dive counts and ordinal-specific daily depth limits, using the explicitly supplied policy timezone. Experience dives count as dives. Daily caps and stage caps both apply.
4. Pre-dive skill prerequisites linked to the same profile hash, with completion timestamps no later than the dive start.
5. Chronological evaluation of input-order-independent evidence; refusal of duplicate identities, overlapping windows, wrong-profile evidence, future completion, out-of-sequence or uncovered dives, and malformed or incomplete inputs.
6. Rejected dives do not advance the stage. Any violation keeps the entire result incomplete, even if other qualifying dives were valid.
7. Bounded, dense input arrays; exact primitive enums; strict explicit UTC timestamps that reject impossible dates. Technical bounds protect the evaluator and are not agency policy.

All numerical fixtures and names are synthetic. There are no PADI, SSI or NAUI defaults. A caller-provided hash is checked for consistency only; it does not prove that a source was independently approved. The result always includes `productionAuthorized: false`.

## Verification

Final local candidate on Node 24.22.1:

- 70/70 new progression contracts passed, zero failures/skips.
- 32/32 unchanged source-profile core contracts passed separately using the exact source retrieved from the #582 head. These are baseline contracts, not extra progression coverage.
- Standalone TypeScript strict check passed with ES2022/CommonJS and Node types.
- The current repository's API ESLint correctness rules passed for the new TypeScript file.
- JavaScript syntax check passed for the new test file.
- An independent review found sparse-array and enum-coercion defects in the initial candidate. Both were repaired and protected by nine added adversarial tests before the final 70-test run.
- Independent re-review confirmed both fixes and found no remaining blocking flaw within the ordinary-data evaluator scope. This is not an audit of executable getters or proxies.
- Six isolated guard mutations were all detected: per-dive depth, sequence, source hash, future evidence, dense arrays and primitive enum validation. The original source was unchanged and the final 70-test suite was rerun successfully.

At initial local preparation, full repository lint/typecheck/build, Node 22 execution, PostgreSQL/HTTP integration, browser integration and exact-head remote CI had not run for this new candidate. Subsequent exact-head run receipts belong in the PR review record; #582's earlier green runs cannot substitute. The new files have no runtime consumers, so these local tests are not enforcement evidence.

Reproduce the new focused suite from the candidate root:

```sh
node --experimental-strip-types --test apps/api/scripts/training-dive-progression.test.mjs
```

## Required integration contract

Before wiring this evaluator into #582 or any release:

1. Independently review the actual offered programme, edition, effective dates, exceptions and source locators. Bind the progression policy immutably into the same source-profile hash and approval lifecycle. Do not attach unreviewed new rules to an already approved hash.
2. Derive evidence only from authenticated, approved and signed records for the exact enrolment, participant, centre, instructor and profile. Check full pagination and reject a truncated history. The pure function cannot authenticate its arguments.
3. Obtain the full dive history, including experience dives and unsuccessful attempts where required by the source. Do not permit a caller-selected subset or silently discard a disqualifying record. Define the official attempt/retry, referral and existing-course adoption rules before translating those records.
4. Preserve actual bottom time separately from elapsed calendar attendance. Verify every dive lies within its completed session and actual attendance window. Provide the exact start/end evidence rather than inventing it from a broad session.
5. Obtain prerequisite skills from verified assessment/signature history with matching source and event time. A client list of skill names is not evidence.
6. Apply age, supervision, junior, equipment, environmental, medical, form, materials, qualification and Saudi requirements separately. The evaluator does not model or waive them.
7. The current candidate refuses a dive crossing a local calendar-day boundary. A source-specific rule must be reviewed before supporting such cases. It does not split a dive to gain extra daily capacity.
8. Add a separate planning/start gate using the verified prior sequence and planned dive, so unsafe plans are refused before execution. This candidate evaluates completed evidence and must not be passed fictitious future completion timestamps.
9. Run the new contracts on Node 22 in the existing approved workflow inventory, then add real database/HTTP/browser tests for scheduling, attendance, evidence, completion, certificate recommendation/approval, revocation, instructor transfer and concurrency. Do not weaken existing assertions to make CI green.

## Remaining A14 work and disposition

| Area | Current bounded result | Still required |
|---|---|---|
| #582 calendar/browser regressions | Current-head repair verified | No repeated repair needed |
| Per-dive progression | Pure evaluator and 70 synthetic contracts implemented | Source binding, planning/start and completion adapters, full integration tests and independent acceptance |
| Agency standards | Existing repository crosswalk identifies a previously uploaded PADI 2026 manual | Complete programmes, exact credentials, current editions/bulletins and exceptions; independent acceptance. Do not request the same PADI manual again |
| SSI and NAUI | Earlier repository references exist | Applicable complete current editions; archived/public summaries are not operational source approval |
| Group and assistants | #582 explicitly supports individual sessions only | Explicit group roster, qualified assistant identities, junior/equipment exceptions and concurrent supervision validation |
| Existing courses | #582 prevents silent rebinding after sessions or signed work | Authorized adoption/referral procedure that preserves real progress and signatures |
| Forms and dive proof | #582 has a strict proposed evidence contract | Map actual official templates, regional versions and signed records; do not manufacture or relabel evidence |
| Boat 50154, readiness and weather | No new operational acceptance was performed in this candidate | Verify current documents, maintenance, equipment, calendar linkage, site/activity weather policy and actual applicability |
| Final closure | A14 remains open | Independent review, authorized merge/deploy, exact release identity, live acceptance and evidence-backed tracker closure |

Primary implementation/source boundaries remain in [the #582 candidate document](https://github.com/sultanasiri001-sys/hydroland/blob/a7fc659c218ed41e26287b59a23acc93715d7efb/docs/TRAINING_STANDARD_SELECTION_CANDIDATE_2026-11-08.md) and [the PADI source crosswalk](https://github.com/sultanasiri001-sys/hydroland/blob/a7fc659c218ed41e26287b59a23acc93715d7efb/docs/PADI_2026_OPEN_WATER_SOURCE_CROSSWALK.md). The manual itself was not re-extracted in this task; the cited crosswalk is an existing working extraction, not independently accepted source data.
