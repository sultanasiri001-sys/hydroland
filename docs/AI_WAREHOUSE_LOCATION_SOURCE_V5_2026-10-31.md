# Warehouse location register and department source V5

The owner of the active internal HYDROLAND organization can record warehouse
locations, edit their names/descriptions, archive them, and restore their records.
Every action rechecks the verified active account, ADMIN role, internal ownership,
and applicable membership. Mutation locks and revision comparisons protect these
checks from concurrent changes. Other administrators do not inherit this access.

`WarehouseLocation` and `WarehouseLocationRevision` are additive, initially empty
tables. The migration adapts organization/account foreign keys to native TEXT or
UUID parent keys. It does not seed records or attribute legacy global equipment
and stocktake rows to an organization.

Location codes are canonical uppercase ASCII references, unique within the
organization and immutable after creation. Archived records retain their codes.
Creation requires a stable UUID request key; replays return the current record
without overwriting later edits. Edits and archive/restore require the current
integer revision and a reason; state transitions also require confirmation.
Each successful mutation writes a digest-bound snapshot, append-only revision,
and minimal audit entry in the same transaction. Audit failure rolls back all
three. There is no delete, operating approval, inventory balance, reservation,
stock movement, purchase, supplier validation, notification, or publication action.

The owner UI is available in the employee administration workspace under
`مواقع المستودعات`. It renders stored text as text, clears private content on
logout/workspace/role changes or denied ownership, fences delayed responses,
and retains create request keys across uncertain errors until content changes.
The create form is displayed only after a successful authorized register read.

## Source V5

New cycles pin `department-source:v5:` and capture `DEPARTMENT_AGGREGATE_V5`.
The read-only preview returns `sourceVersion: 5`. All fourteen departments retain
basic partial count adapters and `NOT_ASSESSED` operational acceptance.

Inventory keeps its five store-goods counts and adds:

| Metric | Meaning |
| --- | --- |
| `warehouseLocations` | All recorded location rows in the internal organization |
| `recordedWarehouseLocations` | Location rows in state `RECORDED` |
| `archivedWarehouseLocations` | Location rows in state `ARCHIVED` |

The remaining inventory gap is
`WAREHOUSE_BALANCES_MOVEMENTS_PROCUREMENT_REGISTRY`: warehouse balances, stock
movements, procurement, and suppliers. A location row does not prove physical
custody, a measured balance, operating permission, or inventory availability.
Store goods remain a catalog subset; marketing remains planning drafts only;
marine maintenance remains a subset of the unified asset/work-order gap.

Only allowlisted nonnegative integer counts leave the reader. Location codes,
names, descriptions, account/organization IDs, and revision contents are excluded
from previews and model inputs. Source reads create no task, document, or email.
Counts describe recorded rows at source capture time, not activity in a period.

V1 general receipts and V2/V3/V4 department contracts retain their original
meanings. V4 inventory has only the original five store-goods metrics and its
original gap. Queued V4 tasks and their office reviews must not acquire warehouse
metrics. Historical snapshots remain immutable after live locations change.
Unknown future reserved versions and scope/value version mismatches fail closed.
The existing production cycle keeps its original general counters; this addition
does not retrofit its input or start another cycle.

## Verification and rollout

Native acceptance uses a dedicated empty loopback PostgreSQL database with an
explicit confirmation. It covers all four TEXT/UUID parent type combinations,
code/request uniqueness, concurrent requests and edits, stale versions,
append-only history, audit rollback, same-session revocation, paging, privacy,
and source version preservation. Browser cases cover the mobile record form,
safe text, version-bound mutations, uncertainty, revocation, delayed responses,
and source snapshots across metric refresh. Automated model/email traffic is
loopback only; production QA reads sources and an empty list without creating
test records or invoking a model.

Deploy API and web together while the existing durable provider wait is active
and no task is running. Keep provider credentials, model, and budget unchanged.
Before rolling back to a version without V5 support, stop new claims and review
any pinned V5 work. Preserve recorded data and completed/uncertain results;
do not drop tables or replay tasks as a rollback mechanism.
