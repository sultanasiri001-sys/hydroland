ALTER TABLE "WarehouseStockLot" ADD COLUMN "countedCeiling" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
-- Receipts remain the original quantity. An independently approved positive count difference can increase on-hand.
ALTER TABLE "WarehouseStockLot" DROP CONSTRAINT "WarehouseStockLot_check",
  ADD CONSTRAINT "WarehouseStockLot_onHand_nonnegative" CHECK ("onHand" BETWEEN 0 AND GREATEST("received","countedCeiling"));
CREATE TABLE "WarehouseProcurementAssignment" (
  "organizationId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "employmentId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL, "grantedBy" TEXT NOT NULL, "active" BOOLEAN NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL, PRIMARY KEY ("organizationId","accountId")
);
CREATE TABLE "WarehouseDecisionRequest" (
  "organizationId" TEXT NOT NULL, "id" TEXT NOT NULL, "kind" TEXT NOT NULL CHECK ("kind" IN ('PURCHASE','COUNT','ISSUE')),
  "recommendedBy" TEXT, "recommenderPersonId" TEXT, "recommendation" TEXT CHECK ("recommendation" IN ('APPROVE','DECLINE')),
  "recommendationNote" TEXT, "recommendedAt" TIMESTAMP(3), "finalDecision" TEXT CHECK ("finalDecision" IN ('APPROVE','DECLINE')), "finalNote" TEXT,
  "details" JSONB NOT NULL, "makerId" TEXT NOT NULL, "makerPersonId" TEXT NOT NULL,
  "reviewerId" TEXT, "reviewerPersonId" TEXT, "reviewedAt" TIMESTAMP(3), "finalActorId" TEXT,
  "finalizedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","id"),
  CHECK (("reviewerId" IS NULL) = ("reviewedAt" IS NULL) AND ("reviewerId" IS NULL) = ("reviewerPersonId" IS NULL)),
  CHECK (("finalActorId" IS NULL) = ("finalizedAt" IS NULL) AND ("finalizedAt" IS NULL OR "reviewedAt" IS NOT NULL)),
  CHECK (("recommendedAt" IS NULL) = ("recommendedBy" IS NULL) AND ("recommendedAt" IS NULL) = ("recommendation" IS NULL)
    AND ("recommendedAt" IS NULL) = ("recommendationNote" IS NULL) AND ("recommendedAt" IS NULL) = ("recommenderPersonId" IS NULL)),
  CHECK (("finalizedAt" IS NULL) = ("finalDecision" IS NULL) AND ("finalizedAt" IS NULL) = ("finalNote" IS NULL)),
  CHECK ("finalizedAt" IS NULL OR "recommendedAt" IS NOT NULL),
  CHECK ("recommendedAt" IS NULL OR "reviewedAt" IS NOT NULL),
  CHECK ("makerPersonId" <> "reviewerPersonId" AND "makerPersonId" <> "recommenderPersonId")
);
