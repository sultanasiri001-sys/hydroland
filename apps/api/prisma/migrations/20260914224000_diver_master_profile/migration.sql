CREATE TABLE "DiverProfile" (
  "id" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "nationality" TEXT,
  "identityType" TEXT,
  "identityLast4" TEXT,
  "identityVerifiedAt" TIMESTAMP(3),
  "primaryPhone" TEXT,
  "secondaryPhone" TEXT,
  "preferredContact" TEXT,
  "emergencyName" TEXT,
  "emergencyRelation" TEXT,
  "emergencyPhone" TEXT,
  "emergencyAltPhone" TEXT,
  "bloodType" TEXT,
  "medicalFitnessStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "medicalClearanceExpiresAt" TIMESTAMP(3),
  "preferredLanguage" TEXT DEFAULT 'ar',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiverProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DiverProfile_accountId_key" ON "DiverProfile"("accountId");
ALTER TABLE "DiverProfile" ADD CONSTRAINT "DiverProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DiverEquipment" (
  "id" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "ownership" TEXT NOT NULL DEFAULT 'OWNED',
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "size" TEXT,
  "serviceDueAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiverEquipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiverEquipment_accountId_category_idx" ON "DiverEquipment"("accountId", "category");
ALTER TABLE "DiverEquipment" ADD CONSTRAINT "DiverEquipment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingParticipant" ADD COLUMN "profileSnapshot" JSONB;
ALTER TABLE "BookingParticipant" ADD COLUMN "equipmentSnapshot" JSONB;
ALTER TABLE "BookingParticipant" ADD COLUMN "emergencySnapshot" JSONB;
ALTER TABLE "BookingParticipant" ADD COLUMN "identitySnapshot" JSONB;
ALTER TABLE "BookingParticipant" ADD COLUMN "snapshotAt" TIMESTAMP(3);
