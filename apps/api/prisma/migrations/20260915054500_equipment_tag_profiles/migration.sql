ALTER TABLE "EquipmentBarcode"
  ADD COLUMN "tagMethod" TEXT NOT NULL DEFAULT 'ADHESIVE_LABEL',
  ADD COLUMN "tagPlacement" TEXT,
  ADD COLUMN "tagMaterial" TEXT,
  ADD COLUMN "tagNotes" TEXT;

ALTER TABLE "EquipmentBarcode"
  ADD CONSTRAINT "EquipmentBarcode_tag_method_check"
  CHECK ("tagMethod" IN ('ADHESIVE_LABEL','HANG_TAG','MICRO_QR','DATA_MATRIX','NFC_RFID'));

CREATE INDEX "EquipmentBarcode_tag_method_idx"
  ON "EquipmentBarcode"("tagMethod");
