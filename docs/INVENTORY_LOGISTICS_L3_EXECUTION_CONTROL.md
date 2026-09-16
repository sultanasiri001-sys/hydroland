# Inventory, Warehousing, Logistics & Procurement — L3 Execution & Control

Status: IN PROGRESS

## Canonical execution lifecycle

`REQUEST -> VALIDATE -> RESERVE -> APPROVE -> PICK -> INSPECT -> HANDOVER/DISPATCH -> CUSTODY -> RETURN/RECEIVE -> INSPECT -> RESTOCK | QUARANTINE | MAINTENANCE -> CLOSE -> AUDIT`

## Existing canonical movement engine

L3 MUST extend `EquipmentInventoryService` and the existing `EquipmentMovement` append-only history. It MUST NOT introduce a second inventory ledger.

Current movement vocabulary:
- `CHECK_IN`
- `CHECK_OUT`
- `TRANSFER`
- `MAINTENANCE`
- `QUARANTINE`
- `RELEASE`
- `RETIRE`

Current stock states:
- `AVAILABLE`
- `CHECKED_OUT`
- `MAINTENANCE`
- `QUARANTINED`
- `RETIRED`

## L3 invariants

1. Every physical movement is append-only in `EquipmentMovement`; historical movements are never edited to hide a correction.
2. Corrections use a new compensating movement with actor, reason and source reference.
3. `CHECK_OUT` creates explicit custody: responsible account plus source trip/rental/internal request when applicable.
4. `CHECK_IN` closes custody only after the asset is physically received.
5. Damaged, failed, recalled or suspect equipment routes to `QUARANTINED` or `MAINTENANCE`; it does not silently return to `AVAILABLE`.
6. `RELEASE` from quarantine/maintenance requires valid inspection/service readiness before circulation.
7. `TRANSFER` preserves stock state and records from/to locations; cross-center transfer must preserve source and destination scope and chain of custody.
8. `RETIRE` is terminal for circulation. Reinstatement requires a separately governed exceptional process; ordinary movement cannot reactivate it.
9. Rental and trip flows consume the same movement ledger and must not fabricate shadow stock events.
10. Audit events reference the canonical movement/resource identifiers.

## First implementation gaps identified

The existing service already provides append-only movement rows, row locking, stock transition validation, account/trip references and audit events. The following gaps must be closed during L3:

- `CHECK_IN` currently maps directly to `AVAILABLE`; return-condition inspection/quarantine routing must be enforced.
- `RELEASE` currently checks only the prior stock state; it must require a current `PASS` inspection and valid service date.
- `TRANSFER` needs explicit destination and cross-center/scope validation rather than accepting a null destination.
- custody needs a canonical read model derived from the latest checkout/return movement rather than a parallel custody ledger unless schema review proves a dedicated canonical table is required.
- stocktake discrepancies must become governed compensating adjustments, never direct history mutation.

## L3 completion gate

L3 is complete only when return routing, release readiness, transfer chain-of-custody, custody read model, compensating adjustment policy, tests, TypeScript and build all pass CI.
