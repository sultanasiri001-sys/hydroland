# A02 full release-policy gate — 8 November 2026

Status: ROLLOUT_CANDIDATE. Full A02 closure is conditional on successful PR/main
receipts, protected-context readback, current native settings and rollback review.

## Policy selection

The owner explicitly requested completing A02. This implementation adopts the
exact 28-workflow/31-job source inventory bytes with SHA-256
`bfd4953e12d3b19988f2251728f1d1f59bb50e68048478392eb061526652f502`
as the reviewed release prerequisite for the existing Web/API main branch.
The inventory file's older PROPOSED_NOT_ADOPTED label is retained as provenance;
this document and the pinned coordinator define the new prospective adoption.
Neither that label nor flipping it is evidence of live enforcement.

The existing binder reads exact committed workflow/inventory blobs, checks tree,
repository, workflow classification, unconditional main coverage, job matrices
and declared critical-step source. The frozen inventory contains 28 workflows
and 31 jobs. Mobile remains its existing separate channel. The gate invokes the
existing collector for all required workflows, not the old two-workflow sample.

## Gate behavior and protection

The existing observer workflow becomes unfiltered on main push and pull request.
Its uniquely named check is `a02-full-release`. Require that context specifically
from GitHub Actions in the existing main branch-protection rule, preserving the
four current contexts, up-to-date branches, resolved conversations, enforced
administrator rules, and force-push/deletion prohibitions.

PR execution binds and validates its exact merge source only. It explicitly
reports PR_SOURCE_CONTRACT_ONLY and cannot claim main evidence. Push execution
accepts only this repository/workflow at refs/heads/main and the exact GITHUB_SHA.
It waits for stable completed push runs, then makes one strict, authenticated
GET-only collection with complete pagination and run-attempt revalidation.
Missing, failed, skipped, stale, duplicate or changed evidence blocks the gate.
All 28 evaluations and their declared critical steps must pass. A final main-head
read must still match. No collection failure is retried into a pass.

The job always runs after its contract prerequisite and explicitly fails when
that prerequisite failed or was skipped. Workflow permissions remain read-only.
The old sample CLI remains historical and is no longer the workflow entrypoint.
No new credential or deployment provider permission is introduced.

Existing Render services retain checksPass auto-deploy. The main gate check is a
deployment prerequisite, not a mutating deployment controller. The coordinator
serializes its own runs per ref; GitHub head revalidation is not an atomic lock
against subsequent pushes, and Render remains responsible for service rollout
serialization. An interrupted/outdated candidate is rejected and must be
reviewed on current main, never waived. Monitor the exact selected commit LIVE
on both services and verify readiness after adoption.

## Rollback and independent scopes

See A02_CURRENT_ROLLBACK_TARGET_2026-11-08.md. Keep the safety-compatible preceding
LIVE 0c2bb13 artifact and exact head rehearsal. The first candidate rehearsal run
42479543354 passed on f9f93d0; later code requires its own exact-head CI.
Do not inherit old receipts as verification of changed source.
This PR does not perform a production rollback or any database down-migration.

A03/PITR/object byte and ACL recovery, UAT saved-data restoration, RPO/RTO and
human center/HR acceptance are separate and are not closed by this gate.
