# A14 clearance snapshot integration

This change closes the transaction-routing gap left by PR534. It does not adopt
new legal requirements, reinterpret optional controls, or close all of A14.

Operational clearance now evaluates calendar readiness inside the same existing
serializable transaction as the persisted decision. Calendar trip, policy,
weather, boat, equipment, trip-compliance and marine reads receive that client;
marine readiness snapshots participate in the same rollback. Single-trip
evaluation only evaluates that trip rather than every overlapping trip.

The CLOSE/COMPLETE consumers also re-evaluate readiness inside their mutation
transaction. A current audit event or an unchanged maximum update timestamp
cannot substitute for current proof validity. Existing explicit rejections
remain hard blocks across all optional policy states.

Validation commands after building the API:

    node apps/api/scripts/clearance-snapshot-validation.cjs
    node apps/api/scripts/compliance-transaction-validation.cjs
    node apps/api/scripts/calendar-weather-readiness-validation.cjs

The new routing suite uses compiled product services with a root-client trap.
The existing disposable operational-controls HTTP/PostgreSQL runner additionally
executes `clearance-snapshot-acceptance.mjs`: successful grants, authorization
denial, committed adverse decisions before transaction entry, expired proof at
mutation checks, and rollback of both audit grants and marine snapshots.
CI uses PostgreSQL 16; local PGlite results are not multi-session isolation proof.

No new schema, packages, transaction timeouts, provider calls, live control state,
regulatory defaults or production test fixtures are part of this change.

## Full A14 acceptance still required

The authoritative 18-entry requirement/adoption manifest is not present in the
current source checkout or the reviewed current tracker. A count or preliminary
source description cannot replace the actual entries. For each applicable
requirement, acceptance needs the exact official clause/version/effective date,
service and jurisdiction, issuer/validity conditions, adoption authority and
proof, then the source-bound mandatory consumer and its acceptance results.
Neither this technical change nor a generic instruction to close the item
establishes those facts. A14 must remain PARTIAL until that evidence and the
source-bound integration are complete.
