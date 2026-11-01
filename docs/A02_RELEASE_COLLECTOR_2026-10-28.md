# A02 read-only release evidence collector - 28 October 2026

Status: implementation/verification candidate; not a production deployment policy.
Reservation: issue #523 comment6476707031, following handoff6473998500.
Base: PR541 head `8171c094f67834b7d4754b041243c5586d4db809`, tree
`54e34d9c42d989e1fccf275278873af55e63a029`. The evaluator and its author branch
are unchanged. These five new files add collection, tests, a live read-only probe,
a dedicated workflow and this record. PR540 and A03/PITR/object recovery remain separate.

## Collector behavior

`a02-release-collector.mjs` imports the exact PR541 evaluator. The caller supplies
the protected policy and exact target SHA. It reads repository identity and the
branch ref, then collects EVERY page of push runs for that SHA/branch. It does not
filter on success, which would hide newer failed or pending runs. It checks stable
counts, expected page sizes, duplicate IDs, and an empty terminal page. It builds
numbered URLs itself and never follows provider-supplied Link/URL destinations.

GitHub limits filtered workflow-run searches to 1000 results. The collector blocks
at that ceiling instead of claiming completeness. Job pages have a similarly
conservative bound. A mismatch, changed count or missing page fails closed.

For each required workflow, the newest run_number is selected. Its current run
metadata and exact attempt metadata must match before reading jobs via
`/actions/runs/{run_id}/attempts/{attempt_number}/jobs`. It checks every job's run
and commit identity (and attempt if supplied), then re-reads the current run.
After collecting all jobs it re-reads the ENTIRE run list, the selected current
runs, and the deployment branch. A new run, rerun, changed status, changed target,
or inconsistent evidence blocks; there is no silent retry to a convenient result.

Both transport and collection are bounded: GET-only api.github.com requests,
redirects refused, fixed permitted endpoint families, 10-second per-request limit,
2 MiB response limit, 120-second collection limit and 400-request ceiling. The
transport uses an explicitly supplied token; the CLI reads GITHUB_TOKEN, not a
connection string or repository secret. API error bodies, tokens, URLs, actors,
commit messages and runner details are not logged or retained in the snapshot.
The CLI prints a sanitized summary, not the raw snapshot. The programmatic result
contains only the run/job fields needed by the existing evaluator.

The returned evidence must still pass PR541's explicit-SUCCESS, age, provenance,
required-job and complete-snapshot checks. Missing or stale evidence remains BLOCKED.
All outcomes retain `productionAuthorized: false` and `scope: CI_EVIDENCE_ONLY`.
A COMPLETE collection is not equivalent to a PASS evaluation or release approval.

## Reproduce

```
node --test scripts/a02-release-collector.test.mjs
node --test scripts/a02-release-evidence.test.mjs scripts/a02-release-collector.test.mjs
node scripts/a02-release-collector.mjs protected-policy.json EXACT_40_HEX_SHA
```

The CLI requires GITHUB_TOKEN with only the read access needed for the chosen
repository. Exit 0 means supplied-policy evidence passes; 1 means collection or
evaluation blocked; 2 means invalid invocation/input. No production credentials,
Render token, deployment hook, payment call, database or external object access exists.

## Read-only live-main probe

`a02-release-collector-live.mjs` obtains the current main SHA and uses two known
workflows (API validation and Production Release Gate) solely as an integration
sample. It forces pages of size 2 to exercise real pagination. The workflow supplies
only the ephemeral GitHub Actions token with contents:read and actions:read.
No user token is created, copied or printed; no pull_request_target is used.

The probe fails on a collection error/race and does not retry. A COMPLETE snapshot
with a BLOCKED evaluation (for example, because main's last run is now too old)
is reported as BLOCKED, while the probe may finish successfully because collection
worked as designed. That green probe is NEVER a production release gate. Its
sample policy is not a complete or owner-approved workflow inventory.

## Verification at publication

Local Node22.16.0: 81 collector/transport/CLI tests passed, zero failures/skips.
The exact inherited evaluator blob was checked as
`ab8f0cd2212f533ab782b67dc9496987aefa8011`; it was not edited.
Four isolated mutations were detected: remove final head check (2 failures), ignore
run/attempt drift (4), ignore final run-set comparison (2), accept truncated pages
(3). Each temporary mutated copy was discarded. These are sensitivity checks, not
additional production tests. Both new executable modules passed syntax checks.

Fresh GitHub CI and the live-main GET probe must be verified on the published head;
parent PR541 results do not verify this collector. The workflow runs both the
76-test inherited evaluator suite and the new collector suite. Results will be
recorded in the PR/coordination thread without retroactively changing tested source.
Local outbound DNS was unavailable; no local live-GitHub success is claimed.

## Trust and residual boundaries

The read callback is injectable for tests. Production use must instantiate the
fixed-origin reader from protected reviewed code, not an arbitrary adapter or a
candidate-provided snapshot. Policy and exact target selection belong to a protected
coordinator. The evaluator does not authenticate arbitrary JSON files by itself.

Re-reading detects observed drift; it is not an atomic snapshot or a lock. Changes
after the final read, or a branch that moves away and back between observations,
remain possible. Approved deployment wiring must revalidate immediately before
execution and serialize release ownership. This patch contains no deployment code.
It does not review whether workflow steps are sufficient or protected from edits,
continue-on-error, or skipping mandatory steps inside an otherwise green job.

Before production enforcement, reconcile the complete API/web/security/commerce/
calendar/messaging/recovery workflow and job inventory, including main-push path
filters. Adopt a protected policy and review the mandatory invocation point and
negative end-to-end controls. Keep network consumer inventory, least privilege,
safety-compatible rollback target, PITR, object ACL recovery and RPO/RTO independent.
No main merge, Render/ingress/environment change or broad A02/project closure is
included. Original PR541 and PR540 stay intact pending coordinated disposition.

## Official API contracts checked

- https://docs.github.com/en/rest/actions/workflow-runs
- https://docs.github.com/en/rest/actions/workflow-jobs
- https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api

These establish endpoint/pagination behavior, not approval of this project's policy.
