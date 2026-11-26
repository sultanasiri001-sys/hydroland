-- Additive evidence for B08. Existing contracts, balances and approvals are retained.
-- Text source identities preserve production installations using TEXT or UUID keys.
CREATE TABLE IF NOT EXISTS "CommerceInvoiceFinalization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "collectionEvidenceId" TEXT,
  "collectionFinanceEntryId" TEXT NOT NULL,
  "contractHash" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "taxMinor" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "finalizedBy" TEXT NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommerceInvoiceFinalization_source_check" CHECK ("sourceType" IN ('STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','TRIP_BOOKING')),
  CONSTRAINT "CommerceInvoiceFinalization_money_check" CHECK ("amountMinor">0 AND "currency"='SAR' AND "taxMinor">=0 AND "taxMinor"<="amountMinor")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceInvoiceFinalization_sourceType_sourceId_key" ON "CommerceInvoiceFinalization"("sourceType","sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceInvoiceFinalization_sellerId_number_key" ON "CommerceInvoiceFinalization"("sellerId","number");
CREATE INDEX IF NOT EXISTS "CommerceInvoiceFinalization_sellerId_finalizedAt_idx" ON "CommerceInvoiceFinalization"("sellerId","finalizedAt");

CREATE TABLE IF NOT EXISTS "CommerceSourceTransferReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "financeEntryId" TEXT NOT NULL,
  "activeFinanceEntryId" TEXT,
  "organizationId" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "invoiceFinalizationId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankReference" TEXT NOT NULL,
  "bankReferenceKey" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "transferredAt" TIMESTAMP(3) NOT NULL,
  "document" BYTEA NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "evidenceSnapshot" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submittedBy" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "receivedAt" TIMESTAMP(3),
  "receiptDocument" BYTEA,
  "receiptDocumentSha256" TEXT,
  CONSTRAINT "CommerceSourceTransferReceipt_source_check" CHECK ("sourceType" IN ('STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','TRIP_BOOKING')),
  CONSTRAINT "CommerceSourceTransferReceipt_money_check" CHECK ("amountMinor">0 AND "currency"='SAR'),
  CONSTRAINT "CommerceSourceTransferReceipt_status_check" CHECK ("status" IN ('PENDING','CONFIRMED','REJECTED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommerceSourceTransferReceipt_activeFinanceEntryId_key" ON "CommerceSourceTransferReceipt"("activeFinanceEntryId");
CREATE INDEX IF NOT EXISTS "CommerceSourceTransferReceipt_organizationId_financeEntryId_idx" ON "CommerceSourceTransferReceipt"("organizationId","financeEntryId");
CREATE INDEX IF NOT EXISTS "CommerceSourceTransferReceipt_sourceType_sourceId_idx" ON "CommerceSourceTransferReceipt"("sourceType","sourceId");
CREATE INDEX IF NOT EXISTS "CommerceSourceTransferReceipt_centerOrgUnitId_status_idx" ON "CommerceSourceTransferReceipt"("centerOrgUnitId","status");
CREATE INDEX IF NOT EXISTS "CommerceSourceTransferReceipt_bankReferenceKey_idx" ON "CommerceSourceTransferReceipt"("bankReferenceKey");
-- A schema bootstrapped from Prisma does not contain CHECK constraints. Replays
-- add the same invariants without replacing any original table or record.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"CommerceInvoiceFinalization"'::regclass AND conname='CommerceInvoiceFinalization_source_check') THEN
  ALTER TABLE "CommerceInvoiceFinalization" ADD CONSTRAINT "CommerceInvoiceFinalization_source_check" CHECK ("sourceType" IN ('STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','TRIP_BOOKING'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"CommerceInvoiceFinalization"'::regclass AND conname='CommerceInvoiceFinalization_money_check') THEN
  ALTER TABLE "CommerceInvoiceFinalization" ADD CONSTRAINT "CommerceInvoiceFinalization_money_check" CHECK ("amountMinor">0 AND "currency"='SAR' AND "taxMinor">=0 AND "taxMinor"<="amountMinor");
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"CommerceSourceTransferReceipt"'::regclass AND conname='CommerceSourceTransferReceipt_source_check') THEN
  ALTER TABLE "CommerceSourceTransferReceipt" ADD CONSTRAINT "CommerceSourceTransferReceipt_source_check" CHECK ("sourceType" IN ('STORE_ORDER','TRAINING_ENROLLMENT','EQUIPMENT_RENTAL','TRIP_BOOKING'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"CommerceSourceTransferReceipt"'::regclass AND conname='CommerceSourceTransferReceipt_money_check') THEN
  ALTER TABLE "CommerceSourceTransferReceipt" ADD CONSTRAINT "CommerceSourceTransferReceipt_money_check" CHECK ("amountMinor">0 AND "currency"='SAR');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"CommerceSourceTransferReceipt"'::regclass AND conname='CommerceSourceTransferReceipt_status_check') THEN
  ALTER TABLE "CommerceSourceTransferReceipt" ADD CONSTRAINT "CommerceSourceTransferReceipt_status_check" CHECK ("status" IN ('PENDING','CONFIRMED','REJECTED'));
 END IF;
END $$;
DO $$ BEGIN
 IF to_regclass('"FinanceEntry"') IS NOT NULL THEN
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "FinanceEntry_commerce_entitlement_source_key" ON "FinanceEntry"("organizationId","referenceType","referenceId") WHERE "referenceType" IN (''CENTER_STORE_ENTITLEMENT'',''CENTER_COURSE_ENTITLEMENT'',''CENTER_RENTAL_ENTITLEMENT'')';
 END IF;
END $$;
