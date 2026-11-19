# Q04 — Community rehearsal integrity

## Reviewed source and boundary

The finite Q04 review compares accepted PR #586 (`752d9f1`) with main
`15f835865ea5f986b0da4ec2e17ba0e6f8bca9b4`. PR #623 introduced the community
service, controllers, schema and acceptance fixture. This note records a concrete
finding and repair within that delta; it does not close the rest of Q04.

The module remains available **only** when both `NODE_ENV=test` and
`HYDROLAND_COMMUNITY_REHEARSAL=1`. The patch does not change that condition or the
disabled public UI. It is not evidence of a production disclosure or permission
to activate the community product.

## Findings and repair

The anonymous post query returned the complete persisted post, including internal
moderation notes and reviewer identity. The new real HTTP regression failed on
the original service because `reviewNotes` was present. The query now explicitly
selects published content, publication timestamps and the existing public author
identity. Administrative and author-owned reads retain their existing scope.

All ten mutations wrote their audit event after committing the business change.
The volunteer registration already used a serializable transaction, but its audit
write was outside that transaction. Event-capacity changes, cancellations and
review decisions also read state outside their final write transaction.

Each mutation now reads, validates, writes and audits in one serializable
transaction. The existing bounded retry helper rechecks state after a conflict.
The existing account administration lock order and active verified actor checks
are reused inside that transaction. Existing status rules and administrator
permissions are preserved. No migration, provider call or new operational policy
is introduced.

## Actual local acceptance

The compiled API and persisted login sessions ran against native PostgreSQL 18.6
in a separate loopback cluster, `q04-community`, with synthetic accounts and data.
The existing publication, ownership, volunteer-hour correction and engagement
fixture passed, followed by **16 additional HTTP/PostgreSQL groups**:

| Group | Observed result |
| --- | --- |
| Public post projection | Published content and public author remain available; moderation notes, reviewer ID and review timestamp are absent. |
| Ten audit insert failures | A disposable database trigger rejected each mutation's audit action. Each request failed; deep comparison confirmed that all four business tables and scoped audit rows remained unchanged. |
| Capacity reduction versus registration | A database barrier forced overlap. The final active registrations never exceeded the saved capacity. |
| Volunteer cancellation versus attendance | Cancellation completed; the concurrent review rechecked state and returned 409. Status remained CANCELLED and approved minutes stayed null. |
| Engagement cancellation versus scheduling | Cancellation completed; the concurrent decision rechecked state and returned 409. The request remained CANCELLED. |
| Revoked administrator role | The request returned 403 and left business/audit snapshots unchanged. |
| Suspended member account | The request returned 401 and left business/audit snapshots unchanged. |

The exception triggers and race barriers exist only in the isolated test database
and are removed by the fixture. The test refuses non-loopback hosts and requires
`NODE_ENV=test`. It never creates a real participant, event, provider action or
financial transaction.

Reproducible entry point: `apps/api/scripts/community-runtime-http-e2e.mjs`, which
now imports `community-integrity-http-checks.mjs`. The existing **API validation →
Admin account lifecycle HTTP and PostgreSQL** job already runs that entry point
with the rehearsal flags; no workflow gate is removed or replaced.

Local API build, typecheck and lint passed. The final PR head must also pass its
normal CI before this repair is counted as a delivered Q04 result.
These tests do not establish live community activation, complete F01–F08 business
acceptance or all remaining Q04 module reviews.
