-- Customer grouping only: every child retains its original payment and ledger.
-- Textual source identities support historical TEXT and UUID native records.
CREATE TABLE IF NOT EXISTS "UnifiedStoreOrder" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "totalMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnifiedStoreOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnifiedStoreOrder_amount_check" CHECK ("totalMinor" >= 0 AND "currency" = 'SAR')
);
CREATE UNIQUE INDEX IF NOT EXISTS "UnifiedStoreOrder_accountId_requestId_key" ON "UnifiedStoreOrder"("accountId","requestId");
CREATE INDEX IF NOT EXISTS "UnifiedStoreOrder_accountId_createdAt_idx" ON "UnifiedStoreOrder"("accountId","createdAt");

CREATE TABLE IF NOT EXISTS "UnifiedStoreOrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "contractSnapshot" JSONB NOT NULL,
  "contractHash" TEXT NOT NULL,
  CONSTRAINT "UnifiedStoreOrderLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnifiedStoreOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "UnifiedStoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UnifiedStoreOrderLine_amount_check" CHECK ("amountMinor" >= 0 AND "currency" = 'SAR'),
  CONSTRAINT "UnifiedStoreOrderLine_source_check" CHECK (
    ("kind"='GOODS' AND "sourceType"='STORE_ORDER') OR
    ("kind"='TRIP' AND "sourceType"='TRIP_BOOKING') OR
    ("kind"='COURSE' AND "sourceType"='TRAINING_ENROLLMENT') OR
    ("kind"='RENTAL' AND "sourceType"='EQUIPMENT_RENTAL'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "UnifiedStoreOrderLine_sourceType_sourceId_key" ON "UnifiedStoreOrderLine"("sourceType","sourceId");
CREATE INDEX IF NOT EXISTS "UnifiedStoreOrderLine_orderId_idx" ON "UnifiedStoreOrderLine"("orderId");

-- Prisma db push creates the same new tables without SQL-only checks. Replays
-- must still install these invariants instead of silently skipping them.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"UnifiedStoreOrder"'::regclass AND conname='UnifiedStoreOrder_amount_check') THEN
    ALTER TABLE "UnifiedStoreOrder" ADD CONSTRAINT "UnifiedStoreOrder_amount_check" CHECK ("totalMinor" >= 0 AND "currency" = 'SAR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"UnifiedStoreOrderLine"'::regclass AND conname='UnifiedStoreOrderLine_amount_check') THEN
    ALTER TABLE "UnifiedStoreOrderLine" ADD CONSTRAINT "UnifiedStoreOrderLine_amount_check" CHECK ("amountMinor" >= 0 AND "currency" = 'SAR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"UnifiedStoreOrderLine"'::regclass AND conname='UnifiedStoreOrderLine_source_check') THEN
    ALTER TABLE "UnifiedStoreOrderLine" ADD CONSTRAINT "UnifiedStoreOrderLine_source_check" CHECK (
      ("kind"='GOODS' AND "sourceType"='STORE_ORDER') OR
      ("kind"='TRIP' AND "sourceType"='TRIP_BOOKING') OR
      ("kind"='COURSE' AND "sourceType"='TRAINING_ENROLLMENT') OR
      ("kind"='RENTAL' AND "sourceType"='EQUIPMENT_RENTAL'));
  END IF;
END $$;
