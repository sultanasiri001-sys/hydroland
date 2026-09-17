ALTER TABLE "EquipmentRental"
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "extensionRequestedUntil" TIMESTAMP(3),
  ADD COLUMN "extensionStatus" TEXT,
  ADD COLUMN "extensionRequestedAt" TIMESTAMP(3),
  ADD COLUMN "extensionReviewedAt" TIMESTAMP(3),
  ADD COLUMN "extensionReviewedByAccountId" TEXT,
  ADD COLUMN "returnIntentAt" TIMESTAMP(3);

ALTER TABLE "EquipmentRental"
  ADD CONSTRAINT "EquipmentRental_extension_status_check"
  CHECK ("extensionStatus" IS NULL OR "extensionStatus" IN ('PENDING','APPROVED','REJECTED'));

CREATE INDEX "EquipmentRental_due_idx" ON "EquipmentRental"("status","dueAt");
CREATE INDEX "EquipmentRental_extension_idx" ON "EquipmentRental"("extensionStatus","extensionRequestedAt");
