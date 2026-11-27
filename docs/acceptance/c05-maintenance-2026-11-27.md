# C05 — persisted maintenance on canonical assets

Date: 2026-11-27 (Asia/Riyadh). Scope: the existing marine assets and equipment register. This change does not add a building inventory, second asset register, stock balance, payment operation or financial ledger.

## Result and boundaries

C05 now has a persisted request → independent authorization → schedule/assign → start → execution report → independent inspection → manager closure workflow. Rejection, reopening, preventive cycles and returned-parts reconciliation retain the original source references and audit history. Both marine assets and equipment use the same work-order workflow, while their existing native asset records remain authoritative.

The isolated acceptance run exercised real authenticated HTTP handlers, PostgreSQL transactions, native calendar allocation and the actual B05 review/recommend/approve/post/acknowledge/return handlers. Synthetic accounts and fixtures are clearly labelled. No test is evidence that physical work occurred, that a qualified person performed an inspection, that the user accepted the module, or that anything was deployed. Q01 and genuine operational acceptance remain separate.

## Native ownership and integration

| Concern | Canonical source and resulting behavior |
| --- | --- |
| Marine asset | `MarineAsset`. A managed work order creates and retains one `MarineMaintenanceRecord`, with a `C05:` maintenance type. Only accepted work-order closure completes that native record. The old one-click completion route refuses these records. Rejection marks the native record cancelled; reopening restores it to open. |
| Equipment | Existing `EquipmentBarcode` scoped by its organization and keyed to `CalendarResource`. Starting work changes the native stock status to maintenance and records an `EquipmentMovement`. Closure restores available status only if it was available before this work and no other active work order remains. An asset already marked maintenance for another reason stays in that state. |
| Scheduling | Existing `CalendarEvent` and `CalendarAllocation` reserve the same resource used by trips. The native marine trip link and actual equipment rental intervals are checked. Reciprocal calendar and rental guards refuse an asset whose started or overdue maintenance has not closed. A changed legacy stock-status value cannot remove that work-order block. |
| Parts | A same-organization, approved, posted and acknowledged `WarehouseIssuePosting`, with its original `WarehouseDecisionRequest` and `WarehouseStockLot`. Its custodian must be the assigned technician. Linking reads the original quantity, unit cost, receipt and purchase references; it does not post or decrement stock again. One issue can belong to one work order. |
| Returned parts | An actual B05 approved return makes the previous maintenance snapshot stale. Completion is blocked until the assigned technician explicitly reconciles the increased original returned quantity. The original `MaintenancePartUsage` remains immutable; a new audited work-order command retains the correction and current net cost. This action does not change the stock balance. |
| Documents | Optional approved maintenance documents are pinned by organization, department, ID, version and content hash. Changed evidence blocks successful inspection or closure. A failed inspection can return work for a fresh report. |
| Cost | The native B05 net issued cost plus a separately recorded labor cost in halala. This is work-order cost evidence, not a claim of payment or a new finance posting. |

## Authority and evidence

Every request checks the current account, verified email, active role and active organization membership. For ordinary internal-platform staff, a current active employment/position in `FACILITIES_ASSETS_MAINTENANCE` is also required. Owners and organization administrators have manager actions; unrelated global administrators gain no organization access.

The requester cannot approve their own request. The assigned inspector must be a different person from both requester and technician. The technician alone can start, link or reconcile custody and submit execution. The assigned inspector records pass or failure; the closing manager must differ from the technician. Original manager authorization, relevant live participants and evidence are rechecked at the later acceptance steps.

Every mutation includes a command ID and, after creation, the expected revision. A retry must retain the same actor, subject, action and payload digest. Identical requests racing under PostgreSQL Serializable isolation replay the saved command instead of creating another side effect. Different input with the same ID conflicts. New requests cannot reuse a preventive cycle, and at most one open order exists for a preventive plan.

`MaintenanceCommand` and `MaintenancePartUsage` reject update, delete and truncate. Work-order changes, calendar reservations/releases, native maintenance status, equipment movement, command evidence and mandatory `AuditEvent` writes share the transaction. Injected audit failures demonstrated rollback of both a parts link and final closure.

## Migration and time handling

Migration: `apps/api/prisma/migrations/20261127013000_maintenance_work_orders/migration.sql`.

The migration adds only four workflow/evidence tables: `MaintenancePreventivePlan`, `MaintenanceWorkOrder`, `MaintenancePartUsage` and `MaintenanceCommand`. It creates no data. New references match the observed TEXT or UUID type of their original source before adding foreign keys. Existing identities and source tables are not rewritten. B05's textual organization reference can coexist with historical UUID core identities.

New work-order times use `TIMESTAMPTZ`. A mutation transaction locally normalizes the timezone to UTC when it touches older native `TIMESTAMP(3)` calendar or inventory fields. The PostgreSQL acceptance server deliberately uses **Asia/Riyadh**, not UTC. Work-order schedule instants, native calendar dates and native marine due dates were checked against the requested UTC instants. No production database timezone is changed.

No shared Prisma client was regenerated. The code follows the existing SQL runtime-table convention. Production installation must apply this migration after the genuine existing migration history. The fresh CI preparation is not a production recovery procedure and does not invent migration history.

## Reproducible checks

Run the API and web builds using the repository's installed dependencies. The acceptance scripts require `NODE_ENV=test`, a dedicated loopback PostgreSQL database named `hydroland_form_library_ci`, and `C05_E2E_CONFIRM=ISOLATED_LOOPBACK_DATABASE`. The HTTP suite refuses a database containing existing accounts.

1. Bootstrap the current Prisma schema on that empty CI database without regenerating a shared client.
2. Run `node apps/api/scripts/maintenance-work-order-migration-e2e.mjs`. It applies the exact migration to isolated TEXT and UUID source schemas, verifies empty tables, native FK casts, state/XOR checks, immutable evidence and rollback, then removes only its own temporary schemas.
3. Run `node apps/api/scripts/maintenance-work-order-ci-prepare.mjs`. It calls the existing canonical equipment bootstrap and applies the exact C05 migration. It sets only this dedicated test database's new connections to Asia/Riyadh.
4. Start the built API with the test signing secret. Set `C05_E2E_BASE_URL` to its loopback `/api/v1/` URL. For browser acceptance, also set `C05_E2E_BROWSER=1` and API `WEB_ORIGIN=http://127.0.0.1:4182`.
5. Run `node apps/api/scripts/maintenance-work-order-http-e2e.mjs`.
6. Run `node apps/web/scripts/maintenance-work-order-validation.cjs` for isolated browser boundary cases.

The HTTP/PostgreSQL suite passed **18 groups** covering scope, same-person separation, duplicate command races, changed replay, optimistic revisions, rental/calendar conflicts, competing schedules, reciprocal existing booking guards, actual B05 issue and return, stale cost reconciliation, revoked authority, inspection failure/rework, audit rollback, immutable evidence, rejection/reopen, document version pinning, preventive recurrence, native marine closure and independent connection reads.

The first browser scenario mounts the shipped UI component on the isolated API health-page origin, using a harness CSP bypass because that API page correctly forbids all scripts. It checks actual Arabic/mobile and English interactions against the real API. This scenario does not establish the production web loader or web CSP.

A second scenario serves the actual built web through its unchanged `createStaticServer`, uses the native `HydrolandAuth` and locale implementation, and creates a persisted work order with **no CSP bypass**. This agent's isolated branch loads the exact built C05 asset through an external script URL; the parent integrates the ordered `app.js` loader and validates that final combined tree separately. No production CSP or authentication policy was relaxed.

The standalone Web checks passed **5 groups**, using synthetic response fixtures for opaque source text, mobile layout, exact ambiguous-save retry, protection against duplicate clicks and late writes after logout, 403 clearing and English direction. These are UI boundary checks, separate from the native HTTP/PostgreSQL evidence.

## Integration notes

Load `hydroland-maintenance.js` before `hydroland-marine-readiness.js` in the existing ordered `app.js` list. The component styles itself, adds a profile shortcut and exports `HydrolandMaintenance.open({ organizationId, assetKind, assetId })`. The marine readiness card links to this workspace and hides the legacy quick-complete button for C05 records. No separate stylesheet or external service is required.

The existing mandatory API/Web validation jobs should invoke the new scripts. No additional workflow or change to the A02 required-gate policy is included in this change.

The workspace lists the latest 100 work orders and up to 300 native assets/plans/eligible participants per organization; an order can still be opened directly by its ID. This delivery targets the existing platform scope and does not implement an asset migration, a new inventory register or an automatic scheduler that opens or closes physical work without a person.
