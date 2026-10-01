CREATE TABLE "InventoryLocation" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"type" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "InventoryItem" (
 "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"sku" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"serialized" BOOLEAN NOT NULL DEFAULT false,"qrCode" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id"));
CREATE TABLE "InventoryStock" (
 "id" TEXT NOT NULL,"itemId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"onHand" INTEGER NOT NULL DEFAULT 0,"reserved" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "InventoryStock_pkey" PRIMARY KEY ("id"),CONSTRAINT "InventoryStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "InventoryStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "InventoryStock_nonnegative" CHECK ("onHand">=0 AND "reserved">=0 AND "reserved"<="onHand"));
CREATE UNIQUE INDEX "InventoryItem_organizationId_sku_key" ON "InventoryItem"("organizationId","sku");
CREATE UNIQUE INDEX "InventoryStock_itemId_locationId_key" ON "InventoryStock"("itemId","locationId");
CREATE INDEX "InventoryLocation_organizationId_active_idx" ON "InventoryLocation"("organizationId","active");
CREATE INDEX "InventoryItem_organizationId_status_idx" ON "InventoryItem"("organizationId","status");
