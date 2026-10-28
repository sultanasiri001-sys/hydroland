# A02 coordinated integration candidate - 28 October 2026

Status: DRAFT INTEGRATION; not a production release or full A02/A03 acceptance.

## Ownership and exact inputs

Continuation reserved in issue #523, comment 6468018656, after reading the latest
handoff (comment 6467704843). Existing author branches and Library evidence files
are not modified. This combines only three existing, disjoint change sets:

| Input | Exact source commit | Scope relative to main |
| --- | --- | --- |
| Baseline main | `a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d` | Existing production source at the recorded handoff |
| PR #535 | `2657db76e7c681062448b1ab94fde3fde969a656` | Four readiness/portable-contract files |
| PR #537 | `c9db5777465a2d11fa0e3243ea3a520d9d5f637e` | Seventeen isolated recovery/workflow/proposal files |
| PR #538 | `07abd700a3146736134ee4a2ebdd211e4517cfeb` | Three dated Render documentation files |

The assembly uses PR537 tree `4d2f8419f327b8fcaf8a9468ba39c15bffe69f88`
plus the seven exact Git blobs from PR535 and PR538. Their changed-path sets have
no overlap. This note is the only additional file: expected diff from the verified
main is 25 files. No application runtime/controller, schema, migration, dependency,
lockfile, Blueprint, service configuration, credentials or live feature flags are
changed by the assembly. The recovery workflow change is inherited unchanged from
PR537 and uses labelled disposable synthetic resources, not production secrets.

## Evidence and correction of historical wording

All 11 PR workflows for the input PR537 head completed SUCCESS, including
recovery run `40678656500`. The existing evidence reports 29 logical-restore
checks, four prior/candidate/prior/candidate phases, 23 application-switch checks,
and successful owned cleanup. These input results are not a test of this newly
assembled candidate. Its own CI must run and be reviewed on its exact head.

The four readiness tests ARE wired through `apps/api/scripts/phase12-validation.mjs`
in the included PR535 source. The original 27 October local-results document's
statements that the tests were not wired describe the earlier local stage, not
this candidate. PR535's later recorded API run `40598175466` executed all four
contracts. Preserve that historical record; use the current entrypoint and new
candidate CI as the executable source of truth.

The synthetic workflow deliberately retains its reviewed fixed artifacts:
prior `4f0b6ac663baeb814523d572def8c4cb8d754fbb`, candidate
`a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d`. A passing run verifies the harness
and that exact artifact pair. It does not certify an arbitrary future release,
and the prior predates PR533's calendar safety correction. It is NOT an approved
production rollback target. No production/PITR/worker-processing claim is promoted.

## Read-only native configuration reconciliation

A fresh authenticated Render service-list read during this continuation confirmed:

| Field | Existing API | Existing public web |
| --- | --- | --- |
| Service ID | `srv-dakelt142hec73aavvsg` | `srv-daknr0tbvr0c73ea69a0` |
| Branch/runtime | `main`, native Node | `main`, native Node |
| rootDir | `apps/api` | Repository root |
| Build | `node ../../scripts/build-api-release.mjs` | `node scripts/build-web-release.mjs` |
| Start | `npm run db:deploy && npm start` | `cd apps/web && npm run serve` |
| Saved health path | `/api/v1/health/ready` | `/` |
| Auto-deploy trigger | `commit` | `commit` |

This read confirms saved fields, not a new deployment or HTTP/business test.
See [dated deployed health evidence](RENDER_HEALTH_EVIDENCE_2026-10-28.md) for
separate prior deployment/HTTP observations. `render.yaml` remains a Docker API
TEMPLATE, not a faithful export of the existing native services. Do not apply it
as a drift repair, introduce replacement services or infer owner approval for a
Native-to-Blueprint migration. The native service metadata is the current observed
runtime configuration; an approved declarative source-of-truth decision is still open.

## Remaining acceptance gates and safe order

| Criterion | Disposition in this candidate | Required next evidence |
| --- | --- | --- |
| A02.01 configuration authority/release policy | PARTIAL | Approve native-versus-Blueprint ownership and reconcile release trigger with validated exact commit. |
| A02.02 readiness | Existing saved-field evidence plus controller/HTTP test inputs; combined CI pending at assembly | Verify candidate CI and preserve distinct dated deployed evidence. |
| A02.03 least-privilege network | OPEN for production | Identify actual internal database consumers and necessary external administration/backup clients; approve narrow ingress and a tested reversal before editing any allow list. |
| A02.04 rollback | Synthetic regression PASS on input; combined run pending | Approve a safety-compatible production prior/candidate/forward trio and bounded operational procedure. |

Do not merge to main merely to test integration: both native services currently
auto-deploy on a main commit. Keep this candidate Draft and review its own tests
without altering that policy. Existing PRs remain open and their authors' branches
remain intact until the coordinated release disposition is approved.

Production recovery/PITR or approved alternative, external object bytes/version/ACL
recovery, ownership transfer, RPO/RTO and cutover remain independent gates. Existing
24 October real-archive recovery evidence should be reused, not repeated from zero.
No new paid environment, private-data copy, provider change or model invocation is
part of this integration. A02/A03 and the 77-item register totals remain unchanged.
