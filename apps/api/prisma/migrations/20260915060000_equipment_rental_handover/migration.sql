ALTER TABLE "EquipmentRentalItem"
  ADD COLUMN "handedOverAt" TIMESTAMP(3);

UPDATE "EquipmentRentalItem" i
SET "handedOverAt" = r."paidAt"
FROM "EquipmentRental" r
WHERE i."rentalId" = r."id"
  AND r."status" IN ('ACTIVE','RETURNED')
  AND r."paidAt" IS NOT NULL;

CREATE INDEX "EquipmentRentalItem_rental_handover_idx"
  ON "EquipmentRentalItem"("rentalId","handedOverAt");
