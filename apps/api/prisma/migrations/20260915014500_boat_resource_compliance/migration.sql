CREATE TABLE "BoatResourceCompliance" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "registrationNumber" TEXT,
  "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "navigationLicenseNumber" TEXT,
  "navigationLicenseExpiresAt" TIMESTAMP(3),
  "safetyCertificateExpiresAt" TIMESTAMP(3),
  "passengerLimit" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BoatResourceCompliance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoatResourceCompliance_resourceId_key" ON "BoatResourceCompliance"("resourceId");
CREATE INDEX "BoatResourceCompliance_registrationStatus_idx" ON "BoatResourceCompliance"("registrationStatus");

ALTER TABLE "BoatResourceCompliance"
ADD CONSTRAINT "BoatResourceCompliance_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
