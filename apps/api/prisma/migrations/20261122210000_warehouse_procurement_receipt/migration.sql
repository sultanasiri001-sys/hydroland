CREATE TABLE "WarehousePurchaseLine" (
  "organizationId" TEXT NOT NULL, "lineId" TEXT NOT NULL, "purchaseReference" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "unitCostMinor" INTEGER NOT NULL CHECK ("unitCostMinor" >= 0), "received" INTEGER NOT NULL DEFAULT 0,
  "approvalReference" TEXT NOT NULL, PRIMARY KEY ("organizationId","lineId"),
  CHECK ("received" BETWEEN 0 AND "quantity")
);
CREATE TABLE "WarehousePurchaseReceipt" (
  "organizationId" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "lineId" TEXT NOT NULL,
  "receivedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId","receiptId"),
  FOREIGN KEY ("organizationId","lineId") REFERENCES "WarehousePurchaseLine"("organizationId","lineId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("organizationId","receiptId") REFERENCES "WarehouseStockLot"("organizationId","lotId") ON DELETE RESTRICT ON UPDATE CASCADE
);
