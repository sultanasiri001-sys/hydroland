CREATE TABLE "WarehouseStockLot" (
  "organizationId" TEXT NOT NULL, "lotId" TEXT NOT NULL, "locationId" TEXT NOT NULL, "itemId" TEXT NOT NULL,
  "purchaseReference" TEXT NOT NULL, "receiptReference" TEXT NOT NULL, "unitCostMinor" INTEGER NOT NULL CHECK ("unitCostMinor" >= 0),
  "received" INTEGER NOT NULL CHECK ("received" > 0), "onHand" INTEGER NOT NULL,
  CHECK ("onHand" BETWEEN 0 AND "received"),
  PRIMARY KEY ("organizationId","lotId")
);
CREATE TABLE "WarehouseIssuePosting" (
  "organizationId" TEXT NOT NULL, "requestId" TEXT NOT NULL, "lotId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0), "custodianId" TEXT NOT NULL,
  "approvedBy" TEXT NOT NULL, "postedBy" TEXT NOT NULL, "balanceAfter" INTEGER NOT NULL CHECK ("balanceAfter" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","requestId"),
  FOREIGN KEY ("organizationId","lotId") REFERENCES "WarehouseStockLot"("organizationId","lotId") ON DELETE RESTRICT
);
