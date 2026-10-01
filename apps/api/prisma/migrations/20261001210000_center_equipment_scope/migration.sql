ALTER TABLE "EquipmentBarcode" ADD COLUMN "organizationId" UUID;
ALTER TABLE "EquipmentBarcode" ADD CONSTRAINT "EquipmentBarcode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EquipmentBarcode_organizationId_stockStatus_idx" ON "EquipmentBarcode"("organizationId","stockStatus");
