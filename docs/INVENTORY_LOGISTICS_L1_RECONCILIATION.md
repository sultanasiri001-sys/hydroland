# Inventory & Logistics — L1 Reconciliation

## Decision
HYDROLAND already contains mature inventory/equipment capabilities inside the Trips domain. L1 will **reuse and consolidate** them rather than create a second inventory module or shadow ledger.

## Canonical components discovered
- `CalendarResource` with `type='EQUIPMENT'`: canonical schedulable equipment/resource identity currently used by Operations.
- `EquipmentBarcode`: asset identity extension (asset code, barcode, QR, serial, location, stock status, acquisition-cost reference).
- `EquipmentInspection` + `EquipmentInspectionService`: canonical inspection/service-readiness history and evaluation.
- `InventoryStocktake` / `InventoryStocktakeScan` + `InventoryStocktakeService`: canonical physical count/scanning workflow.
- Existing rental, handover and equipment services/controllers in `apps/api/src/trips`: must be reused and reconciled before any new persistence model is introduced.
- `AuditService` and `NotificationsService`: shared evidence and notification engines already used by stocktake.
- `PolicyControlService`: shared policy engine already used by equipment inspection.

## Findings requiring hardening
1. `InventoryStocktakeService` uses equipment identity correctly but currently has no explicit organization/center scope in the stocktake session/service API. L2/L3 must add or derive canonical scope before external-center rollout.
2. Stocktake completion records discrepancies but does not itself mutate stock, which is correct. Any later adjustment must be a separate approved/audited compensating movement.
3. `EquipmentInspectionService.evaluate()` currently honors generic policy bypass/review semantics. For safety-critical equipment, missing/failed/expired inspection must become a non-bypassable hard block at allocation/dispatch/operational-clearance boundaries.
4. Acquisition cost is an inventory reference only. Finance remains authoritative for accounting valuation/payment/ledger posting.
5. No new duplicate `Inventory`, `Equipment`, `Payment`, `Employee`, `Document`, `Trip` or compliance master should be created.

## L1 ownership boundary
Inventory & Logistics owns:
- equipment stock identity extension and physical location/status;
- stocktake/count evidence;
- reservation/allocation inventory state;
- custody, transfer, handover and return;
- inventory movement evidence;
- procurement operational requests.

Other canonical owners remain:
- Operations: Trip/Booking/schedule and operational execution.
- Safety/Compliance: safety/regulatory clearance.
- Finance: budget, payment and accounting ledger.
- HR: employment/workforce.
- Governance/IAM: approvals and permissions.

## L1 exit criteria
- Existing inventory/equipment/rental code mapped: complete for baseline.
- Duplicate-engine prohibition established: complete.
- Canonical shared-engine boundaries established: complete.
- Scope and hard-safety gaps identified for L2/L3 implementation: complete.

**L1 status: ARCHITECTURALLY COMPLETE.** Production closure remains dependent on L2–L4 implementation and CI validation.
