# Department source contract version 3

New reporting cycles pin `department-source:v3:`. The read-only owner preview
returns `sourceVersion: 3`. Fourteen departments still have canonical document
counts; thirteen now also have operational count adapters. Every department's
coverage remains `PARTIAL` and operational acceptance remains `NOT_ASSESSED`.

## Added recorded sources

| Department | Source and population | Recorded counts | Remaining gap |
| --- | --- | --- | --- |
| Inventory and logistics | `StoreProduct` rows with the internal platform organization ID and kind `GOODS` | All goods listings, active listings, drafts, active listings with zero or negative recorded stock, listings with negative recorded stock | Warehouse, procurement and supplier registries |
| Facilities and maintenance | `MarineAsset` rows with that organization ID and maintenance rows linked to those assets | All marine assets, active marine assets, all maintenance records, records with status `OPEN`, records with status `COMPLETED` and a recorded completion time | Unified facilities/assets registry and work orders |

Service listings, products without an organization, unrelated organizations and
their maintenance records are excluded. The legacy equipment/stocktake tables
do not establish organization ownership, so their global contents are not
attributed to the internal organization. The procurement page's unavailable
supplier/order sections are not treated as measured zero.

Counts describe stored rows in their current states as of the captured source
time. Active store listings do not prove available stock or physical custody.
Recorded maintenance completion does not prove execution quality, inspection,
asset readiness or operating permission. Marine assets are only a subset of
facilities and assets. The existing missing-source labels remain explicit.
Marketing publication and campaign analytics still have no operational adapter.

Only allowlisted nonnegative integer counts leave these readers. Names,
identifiers, SKUs, registration numbers, descriptions, notes, amounts and raw
records are not sent to the model or returned in the source preview. Previewing
sources does not create tasks, mutate business records or invoke a model.

## Version and receipt preservation

Version 1 general receipts remain readable. Version 2 has its original eleven
adapters, including empty inventory and facilities metrics. A queued task pinned
to version 2 is still collected with version 2 after upgrade, even when the new
adapters are available. Historical receipts are never reconstructed from current
counts or relabeled as version 3.

The fingerprint, recorded evidence scope and `values.version` must agree.
Unknown reserved source fingerprints fail closed before model execution. A
legacy or mismatched worker receipt cannot fulfill a version 3 task. Every
receipt continues to bind the exact task, claim, revision, source time, catalog
provenance and canonicalized values. Fresh owner checks apply before collection
and before forwarding either departmental version into office review.

The browser accepts historical version 2 and current version 3 evidence with
version-specific metric allowlists. It labels the new subsets explicitly and
keeps the captured preview visible during background metrics refresh, preserving
the existing logout, role, failure and explicit-refresh clearing behavior.

## Rollout and validation

No migration, credential, provider model or budget change is required. Deploy
the API and browser together while the durable provider wait is active and no
task is running, or stop new claims before replacing incompatible workers.
Before rollback to a release without version 3 support, stop new claims and
review pinned queued tasks. Completed and uncertain tasks must not be replayed.

Validation includes strict source/receipt version contracts, the native
HTTP/PostgreSQL source fixture, a queued version 2 director and linked review,
all fourteen current director inputs, unrelated and unowned product exclusions,
service exclusions, TEXT/UUID native-type probes of the compiled count readers, scoped marine maintenance, private-data sentinels, immutable
inventory evidence after a live count changes, and mobile/historical browser
regressions. Automated model and email traffic remains loopback only.
