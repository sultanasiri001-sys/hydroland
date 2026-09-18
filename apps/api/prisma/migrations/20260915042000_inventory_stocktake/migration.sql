CREATE TABLE "InventoryStocktake" (
  "id" TEXT PRIMARY KEY,
  "location" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "startedByAccountId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedByAccountId" TEXT,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE "InventoryStocktakeScan" (
  "id" TEXT PRIMARY KEY,
  "stocktakeId" TEXT NOT NULL,
  "resourceId" TEXT,
  "scannedCode" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "expectedLocation" TEXT,
  "observedLocation" TEXT,
  "scannedByAccountId" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryStocktakeScan_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "InventoryStocktake"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "InventoryStocktakeScan_session_resource_key" ON "InventoryStocktakeScan"("stocktakeId","resourceId") WHERE "resourceId" IS NOT NULL;
CREATE INDEX "InventoryStocktake_status_idx" ON "InventoryStocktake"("status","startedAt");
CREATE INDEX "InventoryStocktakeScan_stocktake_idx" ON "InventoryStocktakeScan"("stocktakeId","scannedAt");
