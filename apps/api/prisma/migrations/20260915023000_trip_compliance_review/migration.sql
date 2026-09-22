CREATE TABLE "TripComplianceReview" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "regulatoryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "permitStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "permitReference" TEXT,
  "authorityReference" TEXT,
  "notes" TEXT,
  "reviewedByAccountId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripComplianceReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripComplianceReview_tripId_key" ON "TripComplianceReview"("tripId");
CREATE INDEX "TripComplianceReview_regulatoryStatus_permitStatus_idx" ON "TripComplianceReview"("regulatoryStatus","permitStatus");
ALTER TABLE "TripComplianceReview" ADD CONSTRAINT "TripComplianceReview_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripComplianceReview" ADD CONSTRAINT "TripComplianceReview_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
