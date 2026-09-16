# HYDROLAND — Inventory, Warehousing, Logistics & Procurement L1–L4 Baseline

## Purpose
Establish one canonical operating model for inventory, warehousing, logistics, rentals, equipment movement and procurement without duplicating Trip, Finance, HR, Safety, Compliance, Document, Approval, IAM, Audit or Notification engines.

## L1 — Organization and ownership
- Inventory & Logistics owns stock records, warehouses/locations, equipment availability, custody, transfers, rental handover/return and stocktakes.
- Procurement owns requisition-to-purchase operational workflow while Finance remains the canonical budget/payment/accounting authority.
- Marine Operations consumes availability and reservation state; it does not maintain a parallel inventory ledger.
- Safety/Compliance owns mandatory inspection/regulatory clearance decisions; inventory consumes those decisions and must fail closed when equipment is blocked.
- HR remains the canonical workforce/employment source for storekeepers, procurement staff and logistics personnel.
- External centers operate only within centrally assigned organization/center scope. Master administration controls activation and permissions.

## L2 — Planning and readiness
Canonical flow:
Demand / requisition → availability check → reserve or procure → approval route → inspection/compliance check → allocate → handover / dispatch.

Rules:
- One stock ledger and one equipment identity per physical asset/item.
- Do not copy payment, employment, credential, document or compliance records into inventory-owned duplicates.
- Reservations must be traceable to their source (trip, rental, training, maintenance or approved internal request).
- Safety-critical equipment cannot be allocated when inspection/compliance state is expired, rejected, deferred or missing where required.
- Procurement cannot self-approve financial commitment; Finance approval is referenced through the shared approval/governance path.

## L3 — Execution and control
Canonical execution lifecycle:
Request → Validate → Reserve → Approve → Pick → Inspect → Handover/Dispatch → In-use/Custody → Return/Receive → Inspect → Restock/Quarantine/Maintenance → Close → Audit.

Controls:
- Every stock movement is append-only/auditable; corrections use compensating movements rather than destructive history edits.
- Custody records identify responsible account/employment/organization and source transaction.
- Transfers require source and destination validation and preserve chain of custody.
- Rental handover/return reuses canonical customer/account and payment references.
- Damaged, lost, overdue, recalled or non-compliant equipment is unavailable for allocation until formally cleared.
- Trip completion/release must not fabricate stock movements; operational workflows call the canonical inventory service.

## L4 — Governance, approvals and analytics
- Segregation of duties for sensitive procurement and inventory adjustments: Maker → Reviewer → Approver where risk/amount/policy requires it.
- No actor may request, approve, receive and financially settle the same sensitive procurement end-to-end.
- Inventory adjustments above policy thresholds require documented reason and approval.
- Procurement analytics, stock valuation views and utilization dashboards read canonical records; they do not create shadow ledgers.
- Finance owns accounting valuation/posting; Inventory supplies quantity/cost-reference events only.
- Safety/Compliance blocks remain non-bypassable by generic inventory/admin permissions.
- AI may forecast demand, identify anomalies, draft purchase suggestions and route reviews; AI cannot autonomously approve purchases, write off controlled assets, override safety blocks or erase evidence.

## Shared engines — mandatory reuse
- Account / Person / Organization / Employment
- Document
- Approval / Governance / PolicyControl
- Safety / Compliance / EquipmentInspection
- Payments / Finance references
- AuditEvent
- Notification
- Trips / Training / Rentals as source references

## Completion gate
Inventory/Logistics L1–L4 is complete only when:
1. Existing inventory/rental/inspection/procurement code is reconciled before creating new models.
2. Exactly one canonical stock/equipment movement ledger is used.
3. Center/organization scope is enforced in application services.
4. Safety/compliance equipment blocks fail closed.
5. Reservation, allocation, handover, return, transfer, adjustment and stocktake transitions are validated and audited.
6. Procurement preserves approval and Finance separation of duties.
7. Trip/rental/training integrations use canonical references instead of copied records.
8. Prisma generation, TypeScript/build and inventory policy tests pass in CI before production closure.
