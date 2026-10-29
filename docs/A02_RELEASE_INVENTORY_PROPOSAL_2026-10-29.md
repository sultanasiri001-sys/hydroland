# Proposed Web/API release inventory — 29 October 2026

Status: **PROPOSED_NOT_ADOPTED**. This implements source coverage, not live policy enforcement, deployment approval or A02 closure. Coordination: issue523 comment6493513445. Base is unchanged Draft PR543 `a1e82d43f8e6c4b71576beb2468e5359df53c8df`; main was independently observed at `a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d`. Other authors' branches remain untouched.

## Policy and source coverage

`scripts/a02-release-inventory.json` classifies all 46 workflow files and contains an evaluator-compatible `policy` object. Its 24 required workflow IDs were matched by path against the repository's read-only Actions registry on 29 October (58 registered workflows, including historical paths absent from this source). Registration does not establish release authority. Required job names include the three calendar timezone legs and two offline session-column types: 27 jobs total.

The proposal reconciles `RELEASE_CHANNELS_2026-10-03.md`: both Web/API security gates, API and Web regression/build gates, native/runtime security, release candidate, production-readiness, main integrity, and applicable commerce/calendar/messaging/forms/recovery regressions. This deliberately conservatively requires these safe synthetic regressions on every main push rather than making a release policy depend on changed-path inference.

| Required workflow group | Purpose |
| --- | --- |
| API validation; Web validation | Existing API/build/HTTP and Web/browser suites |
| Security audit; Dependency lock audit | Independent Web/API security checks and committed lock installation/audit |
| Phase 11 production security | Existing native build, Docker boundary and runtime readiness checks |
| Release Candidate; Production Release Gate | Existing aggregate candidate/readiness validations |
| Stage 3 Main Integrity; Technical Closure | Existing adapter, authorization, readiness and integration coverage contracts |
| Calendar/training availability | UTC, Asia/Riyadh and America/New_York matrix legs |
| Commerce payment boundaries | Synthetic PostgreSQL commerce boundary regressions |
| Messaging key schemas; Membership pass | Existing API schema and membership regressions |
| Form library validation/integration; Internal research integration; Internal document review | Synthetic forms/research/document validation, database/HTTP/browser tests |
| Admin documents entry; Owner approval; Owner decision | Existing navigation and synthetic authorization/decision regressions |
| Offline trip authorization | Both timestamp and timestamptz session expiry columns |
| Organization migration recovery; Phase 11 recovery drill | Existing synthetic migration recovery and logical restore regressions |
| A02 release evidence contract | Evaluator, collector and proposed inventory negative controls |

Ten existing safe workflows gain main-push triggers. Seven existing path-filtered push triggers lose their path filters, including the A02 evidence contract. Existing PR filters and feature-branch triggers are preserved. All existing validation job bodies are unchanged except the A02 evidence contract, which now installs the existing locked API tooling for `js-yaml`, runs all A02 release test suites, and allows ten minutes. No package, lock, shared Docker, application runtime or production settings change.

## Deliberate exclusions

The JSON records a reason for every non-required source workflow. Mobile validation and mobile release security remain an independent release channel, unchanged. Pages deployment, production E2E, production Prisma recovery, Stage2 one-shot and live integration inventory remain outside ordinary CI; no new main trigger is added to them.

Public uptime and phase3 account observations are not exact-candidate full acceptance. The collector's live two-workflow sample remains a sample; its offline contracts also run in the required A02 evidence workflow. No sample is substituted for the 24-workflow proposal.

Twelve focused Stage3 workflows retain their original triggers. Their adapter/readiness/coverage scripts run through Main Integrity and Technical Closure; API/RC cover typecheck, build, translation and trip-intelligence validations; Web validation runs the browser suite including credential documents. This is a source mapping of existing checks, not live provider acceptance or a claim that historical focused workflow plumbing has been repaired.

## Fail-closed checks

The inventory validator checks complete source classification, matching required sets, unique positive workflow IDs, explicit unfiltered main push, unconditional/non-optional jobs and exact expanded job names. Static Cartesian matrices are bounded; dynamic expressions, include/exclude matrices and reusable jobs require explicit future review rather than optimistic expansion. The existing evaluator then independently rejects missing workflows/jobs, wrong IDs/paths, PR evidence, incomplete pagination, stale results and skipped/non-success jobs.

Run with the locked API tooling installed:

```sh
npm ci --workspace=@hydroland/api --include-workspace-root=true --ignore-scripts
node --test scripts/a02-release-*.test.mjs
```

Local Node22.23.4: 241 tests pass (165 inherited + 76 new), zero failures/skips. New negative cases exercise missing/filtered/wrong-branch push, conditional or optional jobs, changed names, unclassified workflows, unsupported matrices, every required missing workflow, every incorrect required job and skipped matrix legs. These are source/synthetic evidence tests, not real main-push receipts. Local tooling was reused read-only from the existing workspace with the same lock; CI must independently confirm a fresh scoped installation.

## Remaining acceptance and integration boundaries

This proposal is not the protected production policy. A future reviewed coordinator must select policy and target from protected sources, bind this source inventory to the target tree, collect all real exact-main-push results and revalidate immediately before an authorized deployment. Workflow-step sufficiency/protection, step-level optionality, release serialization and enforcement remain separate reviews. An inventory test cannot prevent an attacker editing both policy and checks in an unreviewed candidate.

Opening a Draft PR exercises PR CI, not the proposed main-push event. Main-push coverage remains source-proven only until an independently authorized merge and real main run. Missing runs must block; never accept PR runs instead. No merge or deployment is authorized here.

PR540's reviewed application-version-switch package is separate and unmerged. This base contains the original logical restore job. Only its push trigger changes here; preserve PR540's job/helper when coordinating a future combined candidate. Logical restore success does not establish application rollback, PITR, production RPO/RTO or object ACL recovery. No historical receipt is recreated or attributed to this head.

Fresh remote source/CI evidence will be recorded in the Draft PR and issue523 without rewriting historical receipts or claiming live policy adoption.

## First CI integration correction

Initial head ecba699b1886e2e37c413c4a8783fd594f636ff0 passed all 241 A02 tests remotely, but Phase11 run40854534794 rejected the unfiltered push because its existing Render contract test required literal path entries. The correction changes only that test's trigger guard: push must be exactly unfiltered main; PR must retain each contract input path. Missing events, filtered/wrong-branch/tag-only pushes and skipped/ignored contract execution still fail. Build/runtime assertions and scripts remain unchanged. All nine Render contract tests pass locally with a workspace-local TMPDIR. The first default macOS TMPDIR attempt had four pre-existing `/var` versus `/private/var` alias assertion failures; using a canonical workspace directory resolves that fixture-location issue without changing assertions. Remote image/native steps skipped after the original failure are not counted as verified; the corrected head requires fresh CI.
