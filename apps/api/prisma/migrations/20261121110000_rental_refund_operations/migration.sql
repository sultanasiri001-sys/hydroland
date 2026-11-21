-- Additive execution journal. No grants, money, fees or historical approvals are seeded.
CREATE TABLE "RentalRefundOperation" (
 "id" TEXT NOT NULL, "checkoutId" TEXT NOT NULL, "rentalId" TEXT NOT NULL, "collectionEvidenceId" TEXT NOT NULL,
 "financeEntryId" TEXT NOT NULL, "requestAuditEventId" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
 "requestedByAccountId" TEXT NOT NULL, "approvedByAccountId" TEXT NOT NULL, "executedByAccountId" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL, "baselineRefundedMinor" INTEGER NOT NULL,
 "resultingRefundedMinor" INTEGER, "status" TEXT NOT NULL DEFAULT 'RESERVED',
 "providerPaymentId" TEXT NOT NULL, "providerInvoiceId" TEXT NOT NULL,
 "policyDecision" JSONB NOT NULL, "providerResult" JSONB, "dispatchedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RentalRefundOperation_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RentalRefundOperation_amounts_check" CHECK ("amountMinor">0 AND "currency"='SAR' AND "baselineRefundedMinor">=0 AND ("resultingRefundedMinor" IS NULL OR "resultingRefundedMinor"="baselineRefundedMinor"+"amountMinor")),
 CONSTRAINT "RentalRefundOperation_status_check" CHECK ("status" IN ('RESERVED','DISPATCHED','RECONCILIATION_REQUIRED','SUCCEEDED')),
 CONSTRAINT "RentalRefundOperation_duties_check" CHECK ("requestedByAccountId"<>"approvedByAccountId" AND "requestedByAccountId"<>"executedByAccountId" AND "approvedByAccountId"<>"executedByAccountId")
);
CREATE UNIQUE INDEX "RentalRefundOperation_financeEntryId_key" ON "RentalRefundOperation"("financeEntryId");
CREATE UNIQUE INDEX "RentalRefundOperation_idempotencyKey_key" ON "RentalRefundOperation"("idempotencyKey");
CREATE INDEX "RentalRefundOperation_rentalId_status_idx" ON "RentalRefundOperation"("rentalId","status");
CREATE INDEX "RentalRefundOperation_organizationId_status_createdAt_idx" ON "RentalRefundOperation"("organizationId","status","createdAt");
-- Existing deployments can retain a native UUID financial ledger identity.
DO $$ DECLARE coltype TEXT; BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO coltype FROM pg_attribute a WHERE a.attrelid='"FinanceEntry"'::regclass AND a.attname='id';
 IF coltype='uuid' THEN EXECUTE 'ALTER TABLE "RentalRefundOperation" ALTER COLUMN "financeEntryId" TYPE uuid USING "financeEntryId"::uuid'; END IF;
END $$;
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "CommerceCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "EquipmentRental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalRefundOperation" ADD CONSTRAINT "RentalRefundOperation_collectionEvidenceId_fkey" FOREIGN KEY ("collectionEvidenceId") REFERENCES "CommerceCollectionEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
