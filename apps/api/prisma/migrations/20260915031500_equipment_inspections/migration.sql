CREATE TABLE "EquipmentInspection" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "serviceExpiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "reviewedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentInspection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentInspection_status_check" CHECK ("status" IN ('PASS','REVIEW','FAIL'))
);

CREATE INDEX "EquipmentInspection_resourceId_inspectedAt_idx"
  ON "EquipmentInspection"("resourceId", "inspectedAt" DESC);

CREATE INDEX "EquipmentInspection_status_idx"
  ON "EquipmentInspection"("status");
