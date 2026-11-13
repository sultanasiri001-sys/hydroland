# A02 current rollback target — 8 November 2026

Status: CANDIDATE_PENDING_REHEARSAL_AND_RELEASE_POLICY_ENFORCEMENT.
A02 remains PARTIAL until every remaining acceptance criterion is evidenced.

## Selected source and authority

The owner requested completion of A02 in this chat on 8 November 2026.
This candidate prepares a reviewable procedure and an isolated synthetic test.
It does not record an independent acceptance or authorise a production rollback.

- Observed production/main: `bb25994d6fd56929e465dc22945dc4af2abf379b`.
- Proposed prior/rollback source: `0c2bb13eeba416ef90c9b5068bb5a14aff194f9c`.
- Forward source in the rehearsal: the exact PR head selected by the existing workflow.
- Existing source of configuration authority: native Render service settings.
  The historical Docker `render.yaml` is not applied.

The prior was the preceding LIVE API/Web release on 8 November. It includes
the source-bound mandatory-control, source-review, catalog and marine correction
changes through #581. It does not revert to the older pre-A14 rehearsal artifact.
The GitHub comparison from prior to observed production contains exactly five
paths: API validation workflow, training-standard core tests, unused pure profile
engine, PADI source crosswalk and training foundation note. No Prisma schema,
migration, dependency lock, service/controller or application runtime entrypoint
changes are in that comparison. Re-evaluate this statement for any later target.

## Bounded exercise

Only the existing Phase 11 synthetic rehearsal's immutable prior changes.
Its current exact candidate checkout, locked dependencies, PostgreSQL isolation,
prior/candidate/prior/candidate phases, original recovery proof, negative
controls, deadlines, sanitised artifacts and always-run owned cleanup are retained.
No production credential, saved UAT data or provider call is introduced.
CI results are pending and must not be promoted to a successful rehearsal.

## Proposed production incident procedure

1. Pin the incident's actual LIVE API and Web deploy IDs and commit. Stop if they
   differ from the reviewed pair or if main/DB history has advanced materially.
2. Preserve the current native settings and empty external DB allowlists. Do not
   run down-migrations, reset data or import the historical Docker template.
3. Review exact current-to-prior schema/history/runtime/security compatibility.
   Require successful matching rehearsal and prior release checks. A later
   migration, activated source requirement or missing retained artifact blocks
   this procedure until reviewed.
4. Confirm the explicit incident rollback decision, exact API/Web retained
   deploy targets and forward target before changing traffic. Pausing automatic
   deployment, if necessary to prevent an in-flight push replacing the selection,
   is an explicit bounded incident change, not a standing security exemption.
5. Use the existing services' retained artifacts for the approved pair, monitor
   each operation to LIVE, then verify API readiness/database status, Web shell,
   exact revisions and relevant business/safety checks. No database rollback
   follows implicitly from an application rollback.
6. If either service fails acceptance, stop and execute only the reviewed
   forward recovery decision; do not cycle arbitrary historical versions.
7. Record actual deployment IDs, operator, timestamps, observations and the
   final auto-deploy state. Restore checksPass automation for the approved branch
   once the incident decision permits it. This procedure alone is not an RTO,
   PITR, object-recovery or A03 acceptance.

No incident rollback or automatic-deploy change is executed by this PR.

## Remaining A02 enforcement work

The 1 November record explicitly leaves the complete release inventory
PROPOSED_NOT_ADOPTED. Render checksPass plus four protected contexts is not
evidence that all inventory workflows/jobs/critical steps are independently
enforced by a protected coordinator. The live two-workflow sample is not full
policy acceptance. Keep that gap visible rather than flipping a status string.

Current connector administration reads fail with HTTP 403. The browser is signed
out of GitHub settings. Owner login is requested; no credential is requested in
chat and no protection is disabled. Complete and independently read back the
reviewed settings/coordinator implementation before marking A02 CLOSED.

References: [current network/release record](A02_NETWORK_AND_RELEASE_EVIDENCE_2026-11-01.md),
[comparison](https://github.com/sultanasiri001-sys/hydroland/compare/0c2bb13eeba416ef90c9b5068bb5a14aff194f9c...bb25994d6fd56929e465dc22945dc4af2abf379b).
