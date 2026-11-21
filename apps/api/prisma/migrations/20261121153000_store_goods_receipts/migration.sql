CREATE TABLE "StoreGoodsDelivery" (
  "id" TEXT PRIMARY KEY, "itemId" TEXT NOT NULL REFERENCES "StoreOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "organizationId" TEXT NOT NULL, "customerAccountId" TEXT NOT NULL, "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "receivedAt" TIMESTAMP(3) NOT NULL, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "policyVersion" TEXT NOT NULL
);
CREATE INDEX "StoreGoodsDelivery_itemId_idx" ON "StoreGoodsDelivery"("itemId");
CREATE TABLE "StoreGoodsReturn" (
  "id" TEXT PRIMARY KEY, "deliveryId" TEXT NOT NULL REFERENCES "StoreGoodsDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0), "reason" TEXT NOT NULL CHECK ("reason" IN ('CHANGE_OF_MIND','DEFECT','NON_CONFORMITY','WARRANTY')),
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sellerReceivedAt" TIMESTAMP(3), "sellerRecordedAt" TIMESTAMP(3), "sellerAccountId" TEXT,
  CHECK (("sellerReceivedAt" IS NULL AND "sellerRecordedAt" IS NULL AND "sellerAccountId" IS NULL)
      OR ("sellerReceivedAt" IS NOT NULL AND "sellerRecordedAt" IS NOT NULL AND "sellerAccountId" IS NOT NULL))
);
CREATE INDEX "StoreGoodsReturn_deliveryId_idx" ON "StoreGoodsReturn"("deliveryId");
