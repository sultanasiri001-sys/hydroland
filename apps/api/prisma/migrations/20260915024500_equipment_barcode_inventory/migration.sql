CREATE TABLE "EquipmentBarcode" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "assetCode" TEXT NOT NULL,
  "barcodeValue" TEXT NOT NULL,
  "qrValue" TEXT NOT NULL,
  "serialNumber" TEXT,
  "sku" TEXT,
  "location" TEXT,
  "stockStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentBarcode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentBarcode_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EquipmentBarcode_resourceId_key" ON "EquipmentBarcode"("resourceId");
CREATE UNIQUE INDEX "EquipmentBarcode_assetCode_key" ON "EquipmentBarcode"("assetCode");
CREATE UNIQUE INDEX "EquipmentBarcode_barcodeValue_key" ON "EquipmentBarcode"("barcodeValue");
CREATE UNIQUE INDEX "EquipmentBarcode_qrValue_key" ON "EquipmentBarcode"("qrValue");
CREATE INDEX "EquipmentBarcode_stockStatus_idx" ON "EquipmentBarcode"("stockStatus");
CREATE INDEX "EquipmentBarcode_serialNumber_idx" ON "EquipmentBarcode"("serialNumber");

CREATE TABLE "EquipmentMovement" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "fromLocation" TEXT,
  "toLocation" TEXT,
  "tripId" TEXT,
  "assignedAccountId" TEXT,
  "notes" TEXT,
  "actorAccountId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentMovement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EquipmentMovement_resourceId_occurredAt_idx" ON "EquipmentMovement"("resourceId","occurredAt");
CREATE INDEX "EquipmentMovement_tripId_idx" ON "EquipmentMovement"("tripId");
CREATE INDEX "EquipmentMovement_assignedAccountId_idx" ON "EquipmentMovement"("assignedAccountId");
