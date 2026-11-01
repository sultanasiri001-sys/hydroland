# A02 exact-commit release evidence contract - 28 October 2026

Status: implementation candidate, NOT production enforcement or A02 closure.
Reservation: issue #523 comment6473598578. Baseline source:
`a3d5ad1d73dad0cd81c0194031a2e1ed57e4038d`. PR540 and all other author branches
are unchanged. A03/PITR/object recovery belongs to its existing lane.

## Gap and current evidence

Render's After CI Checks Pass considers GitHub success, neutral and skipped as
passing, and refuses a commit with zero detected checks. It does not establish
that every project-required workflow/job exists and explicitly passed.
Source: https://render.com/docs/deploys#integrating-with-ci (read 2026-10-28).

The existing production-release-gate.yml runs its own tests on main pushes and
PRs; it does not aggregate all other workflows. Web validation is path-filtered
on both PR and main push. Therefore a missing Web run cannot be silently treated
as success merely because other checks are green. The same review must cover
all required path-filtered workflows before any live policy change.

The last recorded operational observation (issue523/comment6473438235) has both
native production services deploying on main commits. This patch makes NO Render
change. It does not replace render.yaml, require new secrets, expose a database,
merge PR540, trigger a production deployment, or authorize production rollback.

## Implemented boundary

`scripts/a02-release-evidence.mjs` is an offline, dependency-free evaluator of a
complete REST evidence snapshot against a separately supplied trusted policy and
an exact target SHA. It accepts only the policy's main/deployment-branch **push**
runs, matching repository name/ID, workflow path/ID and required named jobs.
A PR or manual dispatch cannot substitute for an unobserved deployment-branch run.

It requires complete run/job lists, nonempty policy/jobs, unique identities,
latest run_number, exact run attempt, explicit completed/success at both workflow
and job level, bounded snapshot/run ages, consistent timestamps, and matching
before/after deployment-branch heads. An older green run cannot hide a newer
failed or pending run. Unknown/absent/truncated evidence blocks. CLI malformed
input is sanitized, and invocation through a symlink still evaluates the gate.

Every result, including PASS, has `scope: CI_EVIDENCE_ONLY` and
`productionAuthorized: false`. This is evidence validation, not an owner-approval
system, signature verifier, network access controller or automatic deployer.
No deployment endpoint or network client is present in the module.

## Trusted collector contract (not implemented by this patch)

A release coordinator must obtain the target SHA and policy from a reviewed,
protected source, not a candidate-controlled artifact. No approved production
policy is invented here; the two-workflow unit-test policy is only a fixture.
Before live adoption the owner must approve the complete API/Web/security,
calendar, messaging, commerce, recovery and release-gate inventory, job names,
workflow IDs, age limits and required event coverage. Mobile is a separate channel.

The collector must use authenticated GitHub GET requests as needed, fetch every
page of runs for the exact head, and every page of jobs for the selected run
attempt. Re-read the newest run/attempt and deployment-branch head after collection;
abort and recollect on any change. A latest-attempt-only or first-page connector
response is insufficient unless completeness and attempt identity are verified.
Never allow missing evidence to become a waiver or fall back to an old green run.

REST references:
- https://docs.github.com/en/rest/actions/workflow-runs
- https://docs.github.com/en/rest/actions/workflow-jobs

Snapshot envelope: schemaVersion=1, complete=true, repository, repositoryId,
branch, headBefore, headAfter, capturedAt (UTC ISO), total_count, workflow_runs
(raw REST run objects), and jobs keyed by selected run ID. Each jobs entry has
complete=true, runId, runAttempt, total_count and the raw REST jobs array.
Policy: schemaVersion=1, repository, repositoryId, branch, event=push,
maxSnapshotAgeMs (positive, at most 300000), maxRunAgeMs (positive, at most 86400000),
and nonempty required entries {workflowId, path, jobs:[exact job names]}.
Those upper bounds are conservative implementation limits, not adopted business
recovery objectives. The supplied snapshot is not authenticated by the evaluator;
forged JSON can never be treated as authoritative evidence by a deployment system.

The evaluator validates job outcomes, not the content or adequacy of job steps.
Protected workflow review must prevent no-op replacements, unsafe continue-on-error
and skipped mandatory test steps. No SHA-to-tree equivalence shortcut is accepted.

## Run and reproduce

```
node --test scripts/a02-release-evidence.test.mjs
node scripts/a02-release-evidence.mjs trusted-policy.json snapshot.json EXACT_40_HEX_SHA
```

CLI exit codes: 0=required supplied evidence passes, 1=blocked evidence/policy,
2=invalid invocation/input. All output is sanitized JSON; no raw error, file path,
connection string or input payload is printed. The separate contract-test workflow
executes these tests on relevant PRs/main pushes with contents:read only. It tests
the evaluator, not the production release. Existing workflows are not modified.

## Remaining rollout acceptance

1. Approve protected policy/collector ownership and the complete required inventory.
2. Ensure all required jobs actually execute for the deployment SHA; resolve path
   filters without accepting missing/neutral/skipped checks. Verify a complete
   real main-push snapshot and negative controls using the trusted collector.
3. Review wiring so the evidence check is mandatory and cannot be bypassed by an
   unrelated green contract test or candidate-provided policy. Re-check immediately
   before deployment; the current implementation alone cannot close a race with
   a later branch update or run rerun.
4. Only after explicit approval, change the exact existing API/Web deployment
   policy. Preserve native settings, observed prior configuration, abort thresholds
   and a reviewed reversal. Do not silently revert to on-commit as a failure fix.
5. Keep network least privilege, internal/external consumer inventory, safety-
   compatible rollback targets, PITR, object ACL recovery and RPO/RTO separate.

This bounded slice completes a testable evidence-evaluation contract, not the
live collector, policy inventory, production wiring or broader project acceptance.
