# Finance L1 — Branch Accounting & Equipment Handover Baseline

Status: ACTIVE — architecture baseline

## Principle
HYDROLAND uses one central platform and one canonical data source. Branch/center dashboards are scoped views and workflows, not independent finance or inventory systems.

## Branch Accountant Dashboard
Scope is restricted to the accountant's assigned branch/center unless a central role grants broader access.

Capabilities:
- daily sales and collections
- trip, course, membership and equipment-rental receipts
- invoices and receipts
- payment-method reconciliation
- permitted refunds/returns workflow
- permitted branch expenses
- cash drawer / shift opening and closing
- expected versus actual cash variance
- branch settlement handoff to central Finance
- read-only equipment handover/payment readiness where required

Accountant must not mutate physical inventory state or bypass Inventory/Safety controls.

## Inventory / Warehouse Dashboard
Capabilities:
- available, reserved, checked-out, quarantined and maintenance equipment
- QR/barcode scan
- reservation and allocation readiness
- equipment handover and return
- custody chain
- branch-to-branch transfer
- stocktake
- inspection/release state

Inventory staff must not approve or settle financial commitments.

## Equipment Handover Station
Canonical workflow:

`ORDER/BOOKING -> PAYMENT CONFIRMED -> READY FOR HANDOVER -> QR SCAN -> READINESS CHECK -> CHECK_OUT/CUSTODY -> RETURN SCAN -> QUARANTINE -> INSPECTION -> RELEASE`

Payment confirmation is owned by Finance/Payments. Physical custody and equipment state are owned by Inventory. Safety-critical readiness is fail-closed.

## Branch shift / cash closing

`OPENING BALANCE -> SALES/COLLECTIONS -> REFUNDS -> PERMITTED EXPENSES -> EXPECTED CASH -> ACTUAL CASH -> VARIANCE -> ACCOUNTANT SUBMIT -> INDEPENDENT REVIEW -> CLOSED`

Closing records are append-only/audited. Material variance requires review and cannot be silently overwritten.

## Access model

Authorization is `Role + Branch/Center Scope + Action`.

- Branch Accountant: assigned center finance operations.
- Inventory/Warehouse: assigned center physical stock operations.
- Center Manager: operational oversight within assigned center; no unrestricted self-approval.
- Central Finance: cross-center finance review/consolidation.
- Master Admin/Executive: governed platform-wide visibility and approval according to policy.

Segregation of duties is mandatory: cashier/accountant, inventory custodian, approver and settlement roles remain distinct for sensitive flows.

## Canonical ownership

- Finance/Payments owns monetary transaction state, settlement and accounting handoff.
- Inventory owns equipment identity, stock state, movements and custody.
- Safety/Compliance owns safety acceptance requirements.
- HR/IAM owns employment identity and role assignment.
- Governance owns approval policy and SOD rules.

No branch-local shadow ledger, duplicate stock ledger, duplicate payment engine, or duplicate user/permission store is allowed.