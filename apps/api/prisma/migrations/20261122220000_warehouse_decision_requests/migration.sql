ALTER TABLE "WarehouseStockLot" ADD COLUMN "countedCeiling" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
-- Receipts remain the original quantity. An independently approved positive count difference can increase on-hand.
ALTER TABLE "WarehouseStockLot" DROP CONSTRAINT "WarehouseStockLot_check",
  ADD CONSTRAINT "WarehouseStockLot_onHand_nonnegative" CHECK ("onHand" BETWEEN 0 AND GREATEST("received","countedCeiling"));
CREATE TABLE "WarehouseDecisionRequest" (
  "organizationId" TEXT NOT NULL, "id" TEXT NOT NULL, "kind" TEXT NOT NULL CHECK ("kind" IN ('PURCHASE','COUNT','ISSUE')),
  "details" JSONB NOT NULL, "makerId" TEXT NOT NULL, "makerPersonId" TEXT NOT NULL,
  "reviewerId" TEXT, "reviewerPersonId" TEXT, "reviewedAt" TIMESTAMP(3), "finalActorId" TEXT,
  "finalizedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","id"),
  CHECK (("reviewerId" IS NULL) = ("reviewedAt" IS NULL) AND ("reviewerId" IS NULL) = ("reviewerPersonId" IS NULL)),
  CHECK (("finalActorId" IS NULL) = ("finalizedAt" IS NULL) AND ("finalizedAt" IS NULL OR "reviewedAt" IS NOT NULL)),
  CHECK ("makerPersonId" <> "reviewerPersonId")
);
