ALTER TABLE "WarehouseDecisionRequest"
  DROP CONSTRAINT "WarehouseDecisionRequest_kind_check",
  ADD CONSTRAINT "WarehouseDecisionRequest_kind_check" CHECK ("kind" IN ('PURCHASE','COUNT','ISSUE','TRANSFER','RETURN')),
  ADD COLUMN "postedAt" TIMESTAMP(3), ADD COLUMN "postedBy" TEXT,
  ADD CONSTRAINT "WarehouseDecisionRequest_physical_post" CHECK (("postedAt" IS NULL) = ("postedBy" IS NULL)
    AND ("postedAt" IS NULL OR ("finalDecision" = 'APPROVE' AND "finalizedAt" IS NOT NULL)));
ALTER TABLE "WarehouseIssuePosting" ADD COLUMN "returned" INTEGER NOT NULL DEFAULT 0 CHECK ("returned" BETWEEN 0 AND "quantity");
ALTER TABLE "WarehouseStockLot" ADD COLUMN "parentLotId" TEXT,
  ADD FOREIGN KEY ("organizationId","parentLotId") REFERENCES "WarehouseStockLot"("organizationId","lotId") ON DELETE RESTRICT ON UPDATE CASCADE;
