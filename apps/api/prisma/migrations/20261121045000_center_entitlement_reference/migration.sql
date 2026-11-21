-- One settlement preparation per supplying center and booking. Rejected or
-- voided entries remain history and require reconciliation, not another payout.
-- This index deliberately does not change legacy reference types.
CREATE UNIQUE INDEX "FinanceEntry_center_service_entitlement_unique"
  ON "FinanceEntry" ("organizationId", "referenceType", "referenceId")
  WHERE "referenceType" = 'CENTER_SERVICE_ENTITLEMENT';
