ALTER TABLE "EquipmentBarcode"
ADD COLUMN "acquisitionCostHalala" BIGINT;

ALTER TABLE "EquipmentBarcode"
ADD CONSTRAINT "EquipmentBarcode_acquisitionCostHalala_check"
CHECK ("acquisitionCostHalala" IS NULL OR "acquisitionCostHalala" >= 0);
