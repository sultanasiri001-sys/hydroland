ALTER TABLE "EquipmentRentalItem"
  ADD COLUMN "returnedAt" TIMESTAMP(3),
  ADD COLUMN "returnCondition" TEXT,
  ADD COLUMN "returnNotes" TEXT;

ALTER TABLE "EquipmentRentalItem"
  ADD CONSTRAINT "EquipmentRentalItem_return_condition_check"
  CHECK ("returnCondition" IS NULL OR "returnCondition" IN ('OK','DAMAGED','REVIEW'));

CREATE INDEX "EquipmentRentalItem_returned_idx"
  ON "EquipmentRentalItem"("rentalId","returnedAt");
