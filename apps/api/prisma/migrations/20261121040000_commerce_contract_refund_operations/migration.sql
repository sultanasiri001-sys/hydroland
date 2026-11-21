-- Additive only: historical contracts keep NULL snapshots; no retroactive terms.
ALTER TABLE "Payment" ADD COLUMN "contractSnapshot" JSONB, ADD COLUMN "refundedAmountMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_refundedAmountMinor_check" CHECK ("refundedAmountMinor" >= 0 AND "refundedAmountMinor" <= "amountMinor");
ALTER TABLE "Invoice" ADD COLUMN "contractSnapshot" JSONB;
ALTER TABLE "StoreOrderItem" ADD COLUMN "contractSnapshot" JSONB, ADD COLUMN "actualReceivedAt" TIMESTAMP(3);

CREATE TABLE "CommerceRefundOperation" (
 "id" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "financeEntryId" TEXT NOT NULL,
 "requestAuditEventId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL,
 "organizationId" TEXT NOT NULL, "requestedByAccountId" TEXT NOT NULL, "approvedByAccountId" TEXT NOT NULL, "executedByAccountId" TEXT NOT NULL,
 "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL, "baselineRefundedMinor" INTEGER NOT NULL, "resultingRefundedMinor" INTEGER,
 "status" TEXT NOT NULL DEFAULT 'RESERVED', "providerPaymentId" TEXT NOT NULL, "providerInvoiceId" TEXT NOT NULL,
 "policyDecision" JSONB NOT NULL, "providerResult" JSONB, "dispatchedAt" TIMESTAMP(3), "confirmedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CommerceRefundOperation_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommerceRefundOperation_amounts_check" CHECK ("amountMinor" > 0 AND "baselineRefundedMinor" >= 0 AND ("resultingRefundedMinor" IS NULL OR "resultingRefundedMinor" >= "baselineRefundedMinor")),
 CONSTRAINT "CommerceRefundOperation_status_check" CHECK ("status" IN ('RESERVED','DISPATCHED','RECONCILIATION_REQUIRED','SUCCEEDED')),
 CONSTRAINT "CommerceRefundOperation_duties_check" CHECK ("requestedByAccountId" <> "approvedByAccountId" AND "requestedByAccountId" <> "executedByAccountId" AND "approvedByAccountId" <> "executedByAccountId")
);
CREATE UNIQUE INDEX "CommerceRefundOperation_financeEntryId_key" ON "CommerceRefundOperation"("financeEntryId");
CREATE UNIQUE INDEX "CommerceRefundOperation_idempotencyKey_key" ON "CommerceRefundOperation"("idempotencyKey");
CREATE INDEX "CommerceRefundOperation_paymentId_status_idx" ON "CommerceRefundOperation"("paymentId","status");
CREATE INDEX "CommerceRefundOperation_organizationId_status_createdAt_idx" ON "CommerceRefundOperation"("organizationId","status","createdAt");
-- Align FK column types with installations that retain native UUID identifiers.
DO $$ DECLARE coltype TEXT; BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO coltype FROM pg_attribute a WHERE a.attrelid='"Payment"'::regclass AND a.attname='id';
 IF coltype='uuid' THEN EXECUTE 'ALTER TABLE "CommerceRefundOperation" ALTER COLUMN "paymentId" TYPE uuid USING "paymentId"::uuid'; END IF;
END $$;
ALTER TABLE "CommerceRefundOperation" ADD CONSTRAINT "CommerceRefundOperation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceOperationGrant" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "operation" TEXT NOT NULL, "currency" TEXT NOT NULL, "limitMinor" INTEGER NOT NULL,
 "validFrom" TIMESTAMP(3) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
 "approvedByAccountId" TEXT NOT NULL, "approvalEvidenceReference" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FinanceOperationGrant_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "FinanceOperationGrant_bounds_check" CHECK ("limitMinor" > 0 AND "validUntil" > "validFrom" AND "approvedByAccountId" <> "accountId" AND length("approvalEvidenceReference") > 0),
 CONSTRAINT "FinanceOperationGrant_operation_check" CHECK ("operation" IN ('APPROVE_REFUND','EXECUTE_REFUND','APPROVE_PAYOUT','EXECUTE_PAYOUT'))
);
CREATE INDEX "FinanceOperationGrant_organizationId_accountId_operation_validUntil_idx" ON "FinanceOperationGrant"("organizationId","accountId","operation","validUntil");
DO $$ DECLARE coltype TEXT; BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO coltype FROM pg_attribute a WHERE a.attrelid='"FinanceEntry"'::regclass AND a.attname='id';
 IF coltype='uuid' THEN EXECUTE 'ALTER TABLE "CommerceRefundOperation" ALTER COLUMN "financeEntryId" TYPE uuid USING "financeEntryId"::uuid'; END IF;
END $$;
ALTER TABLE "CommerceRefundOperation" ADD CONSTRAINT "CommerceRefundOperation_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "CommerceCollectionEvidence" (
 "id" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
 "organizationId" TEXT NOT NULL, "customerAccountId" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL,
 "currency" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerPaymentId" TEXT NOT NULL, "providerInvoiceId" TEXT NOT NULL,
 "providerCapturedMinor" INTEGER NOT NULL, "providerRefundedMinor" INTEGER NOT NULL DEFAULT 0, "providerVerifiedAt" TIMESTAMP(3) NOT NULL,
 "providerSnapshot" JSONB NOT NULL, "financeEntryId" TEXT NOT NULL, "contractSnapshot" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CommerceCollectionEvidence_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommerceCollectionEvidence_amounts_check" CHECK ("amountMinor" > 0 AND "providerCapturedMinor" >= "amountMinor" AND "providerRefundedMinor" >= 0 AND "providerRefundedMinor" <= "providerCapturedMinor")
);
CREATE UNIQUE INDEX "CommerceCollectionEvidence_providerPaymentId_key" ON "CommerceCollectionEvidence"("providerPaymentId");
CREATE UNIQUE INDEX "CommerceCollectionEvidence_financeEntryId_key" ON "CommerceCollectionEvidence"("financeEntryId");
CREATE UNIQUE INDEX "CommerceCollectionEvidence_sourceType_sourceId_key" ON "CommerceCollectionEvidence"("sourceType","sourceId");
CREATE INDEX "CommerceCollectionEvidence_organizationId_sourceType_createdAt_idx" ON "CommerceCollectionEvidence"("organizationId","sourceType","createdAt");
DO $$ DECLARE coltype TEXT; BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO coltype FROM pg_attribute a WHERE a.attrelid='"FinanceEntry"'::regclass AND a.attname='id';
 IF coltype='uuid' THEN EXECUTE 'ALTER TABLE "CommerceCollectionEvidence" ALTER COLUMN "financeEntryId" TYPE uuid USING "financeEntryId"::uuid'; END IF;
END $$;
ALTER TABLE "CommerceCollectionEvidence" ADD CONSTRAINT "CommerceCollectionEvidence_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD COLUMN "contractSnapshot" JSONB;
