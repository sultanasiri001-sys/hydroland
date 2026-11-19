-- Existing unpaid quotes were issued without an exclusive hold or a time limit.
ALTER TABLE "EquipmentRental" ADD COLUMN "holdExpiresAt" TIMESTAMPTZ(3);
