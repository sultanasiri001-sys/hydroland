-- F08 organization-owned procurement. Existing supplier/contract documents and
-- finance journals remain their native sources; this migration creates no data.
CREATE TABLE IF NOT EXISTS "ProcurementOrder" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "purchaseReference" TEXT NOT NULL,
  "contractDocumentId" TEXT NOT NULL, "contractVersion" INTEGER NOT NULL, "contractHash" TEXT NOT NULL, "contractSnapshot" JSONB NOT NULL,
  "supplierDocumentId" TEXT NOT NULL, "supplierVersion" INTEGER NOT NULL, "supplierHash" TEXT NOT NULL, "supplierSnapshot" JSONB NOT NULL,
  "authoritySnapshot" JSONB NOT NULL, "terms" JSONB NOT NULL, "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'SAR', "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "revision" INTEGER NOT NULL DEFAULT 1, "requestedByAccountId" TEXT NOT NULL, "ownerAccountId" TEXT NOT NULL,
  "recommendation" JSONB, "approval" JSONB, "invoiceKey" TEXT, "invoiceSnapshot" JSONB, "receiptAcceptanceSnapshot" JSONB, "reversalSnapshot" JSONB, "acceptanceSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrder_organizationId_id_key" ON "ProcurementOrder"("organizationId","id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrder_contractDocumentId_key" ON "ProcurementOrder"("contractDocumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrder_invoiceKey_key" ON "ProcurementOrder"("invoiceKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrder_organizationId_purchaseReference_key" ON "ProcurementOrder"("organizationId","purchaseReference");
CREATE INDEX IF NOT EXISTS "ProcurementOrder_organizationId_status_createdAt_idx" ON "ProcurementOrder"("organizationId","status","createdAt");

CREATE TABLE IF NOT EXISTS "ProcurementOrderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "requestId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL, "actorPersonId" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL, "beforeRevision" INTEGER NOT NULL, "afterRevision" INTEGER NOT NULL,
  "payload" JSONB NOT NULL, "evidenceHash" TEXT NOT NULL, "result" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrderEvent_organizationId_requestId_key" ON "ProcurementOrderEvent"("organizationId","requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementOrderEvent_organizationId_orderId_afterRevision_key" ON "ProcurementOrderEvent"("organizationId","orderId","afterRevision");
CREATE INDEX IF NOT EXISTS "ProcurementOrderEvent_organizationId_orderId_createdAt_idx" ON "ProcurementOrderEvent"("organizationId","orderId","createdAt");

CREATE TABLE IF NOT EXISTS "ProcurementReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "documentId" TEXT NOT NULL, "documentVersion" INTEGER NOT NULL,
  "documentHash" TEXT NOT NULL, "documentSnapshot" JSONB NOT NULL, "lines" JSONB NOT NULL, "receivedByAccountId" TEXT NOT NULL, "receivedByPersonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementReceipt_documentId_key" ON "ProcurementReceipt"("documentId");
CREATE INDEX IF NOT EXISTS "ProcurementReceipt_organizationId_orderId_createdAt_idx" ON "ProcurementReceipt"("organizationId","orderId","createdAt");

CREATE TABLE IF NOT EXISTS "ProcurementMoneyProof" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "financeEntryId" TEXT NOT NULL, "activeKey" TEXT, "status" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'SAR',
  "documentId" TEXT, "documentVersion" INTEGER, "documentHash" TEXT, "documentSnapshot" JSONB,
  "bankReferenceKey" TEXT, "bankName" TEXT, "bankReference" TEXT, "transferredAt" TIMESTAMP(3),
  "preparedByAccountId" TEXT NOT NULL, "approvedByAccountId" TEXT, "confirmedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "confirmedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementMoneyProof_financeEntryId_key" ON "ProcurementMoneyProof"("financeEntryId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementMoneyProof_activeKey_key" ON "ProcurementMoneyProof"("activeKey");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementMoneyProof_documentId_key" ON "ProcurementMoneyProof"("documentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementMoneyProof_bankReferenceKey_key" ON "ProcurementMoneyProof"("bankReferenceKey");
CREATE INDEX IF NOT EXISTS "ProcurementMoneyProof_organizationId_orderId_kind_createdAt_idx" ON "ProcurementMoneyProof"("organizationId","orderId","kind","createdAt");

-- Conditional constraints also support replay after a checkless Prisma bootstrap.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementOrder_values_check' AND conrelid='"ProcurementOrder"'::regclass) THEN
    ALTER TABLE "ProcurementOrder" ADD CONSTRAINT "ProcurementOrder_values_check" CHECK (
      "amountMinor">0 AND "currency"='SAR' AND "revision">0 AND "contractVersion">0 AND "supplierVersion">0
      AND "contractHash" ~ '^[a-f0-9]{64}$' AND "supplierHash" ~ '^[a-f0-9]{64}$'
      AND "status" IN ('REQUESTED','RECOMMENDED','APPROVED','DECLINED','CANCELLED','SETTLED','REVERSED','RECOVERY_REQUIRED','RECOVERED')
      AND jsonb_typeof("terms")='object' AND jsonb_typeof("authoritySnapshot")='object' AND jsonb_typeof("contractSnapshot")='object' AND jsonb_typeof("supplierSnapshot")='object'
      AND (("invoiceSnapshot" IS NULL AND "invoiceKey" IS NULL) OR ("invoiceSnapshot" IS NOT NULL AND jsonb_typeof("invoiceSnapshot")='object' AND "invoiceKey" IS NOT NULL AND "invoiceKey" ~ '^[a-f0-9]{64}$')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementOrderEvent_organizationId_orderId_fkey' AND conrelid='"ProcurementOrderEvent"'::regclass) THEN
    ALTER TABLE "ProcurementOrderEvent" ADD CONSTRAINT "ProcurementOrderEvent_organizationId_orderId_fkey" FOREIGN KEY ("organizationId","orderId") REFERENCES "ProcurementOrder"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementOrderEvent_values_check' AND conrelid='"ProcurementOrderEvent"'::regclass) THEN
    ALTER TABLE "ProcurementOrderEvent" ADD CONSTRAINT "ProcurementOrderEvent_values_check" CHECK ("beforeRevision">=0 AND "afterRevision"="beforeRevision"+1 AND "requestFingerprint" ~ '^[a-f0-9]{64}$' AND "evidenceHash" ~ '^[a-f0-9]{64}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementReceipt_organizationId_orderId_fkey' AND conrelid='"ProcurementReceipt"'::regclass) THEN
    ALTER TABLE "ProcurementReceipt" ADD CONSTRAINT "ProcurementReceipt_organizationId_orderId_fkey" FOREIGN KEY ("organizationId","orderId") REFERENCES "ProcurementOrder"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementReceipt_values_check' AND conrelid='"ProcurementReceipt"'::regclass) THEN
    ALTER TABLE "ProcurementReceipt" ADD CONSTRAINT "ProcurementReceipt_values_check" CHECK ("documentVersion">0 AND "documentHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("lines")='array' AND jsonb_array_length("lines")>0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementMoneyProof_organizationId_orderId_fkey' AND conrelid='"ProcurementMoneyProof"'::regclass) THEN
    ALTER TABLE "ProcurementMoneyProof" ADD CONSTRAINT "ProcurementMoneyProof_organizationId_orderId_fkey" FOREIGN KEY ("organizationId","orderId") REFERENCES "ProcurementOrder"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementMoneyProof_values_check' AND conrelid='"ProcurementMoneyProof"'::regclass) THEN
    ALTER TABLE "ProcurementMoneyProof" ADD CONSTRAINT "ProcurementMoneyProof_values_check" CHECK (
      "kind" IN ('SETTLEMENT','RECOVERY') AND "status" IN ('PREPARED','APPROVED','CONFIRMED','REJECTED','VOIDED') AND "amountMinor">0 AND "currency"='SAR'
      AND (("status" IN ('REJECTED','VOIDED') AND "activeKey" IS NULL) OR ("status" NOT IN ('REJECTED','VOIDED') AND "activeKey" IS NOT NULL))
      AND ("status" NOT IN ('APPROVED','CONFIRMED') OR "approvedByAccountId" IS NOT NULL)
      AND ("status"<>'CONFIRMED' OR ("documentId" IS NOT NULL AND "documentVersion" IS NOT NULL AND "documentVersion">0 AND "documentHash" IS NOT NULL AND "documentHash" ~ '^[a-f0-9]{64}$'
        AND "bankReferenceKey" IS NOT NULL AND "bankReferenceKey" ~ '^[a-f0-9]{64}$' AND "bankName" IS NOT NULL AND "bankReference" IS NOT NULL AND "transferredAt" IS NOT NULL
        AND "confirmedByAccountId" IS NOT NULL AND "confirmedAt" IS NOT NULL AND "documentSnapshot" IS NOT NULL)));
  END IF;
END $$;
