CREATE TYPE "BriefingStatus" AS ENUM ('DRAFT','REVIEW','PUBLISHED','SUPERSEDED');

CREATE TABLE "TripBriefing" (
  "id" TEXT NOT NULL,
  "tripId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "BriefingStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT,
  "summary" JSONB,
  "createdByAccountId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripBriefing_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DivePlan" ("id" TEXT NOT NULL,"tripId" UUID NOT NULL,"version" INTEGER NOT NULL,"plan" JSONB NOT NULL,"approvedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "DivePlan_pkey" PRIMARY KEY ("id"));
CREATE TABLE "EmergencyPlan" ("id" TEXT NOT NULL,"tripId" UUID NOT NULL,"version" INTEGER NOT NULL,"plan" JSONB NOT NULL,"approvedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "EmergencyPlan_pkey" PRIMARY KEY ("id"));
CREATE TABLE "BriefingTranslation" ("id" TEXT NOT NULL,"briefingId" TEXT NOT NULL,"languageCode" TEXT NOT NULL,"content" JSONB NOT NULL,"level" TEXT NOT NULL,"reviewedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "BriefingTranslation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OfflineTripPackage" ("id" TEXT NOT NULL,"briefingId" TEXT NOT NULL,"manifest" JSONB NOT NULL,"checksum" TEXT,"status" TEXT NOT NULL DEFAULT 'NOT_READY',"generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "OfflineTripPackage_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "TripBriefing_tripId_version_key" ON "TripBriefing"("tripId","version");
CREATE INDEX "TripBriefing_tripId_status_idx" ON "TripBriefing"("tripId","status");
CREATE UNIQUE INDEX "DivePlan_tripId_version_key" ON "DivePlan"("tripId","version");
CREATE UNIQUE INDEX "EmergencyPlan_tripId_version_key" ON "EmergencyPlan"("tripId","version");
CREATE UNIQUE INDEX "BriefingTranslation_briefingId_languageCode_key" ON "BriefingTranslation"("briefingId","languageCode");
CREATE INDEX "OfflineTripPackage_briefingId_status_idx" ON "OfflineTripPackage"("briefingId","status");

ALTER TABLE "TripBriefing" ADD CONSTRAINT "TripBriefing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DivePlan" ADD CONSTRAINT "DivePlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyPlan" ADD CONSTRAINT "EmergencyPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BriefingTranslation" ADD CONSTRAINT "BriefingTranslation_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfflineTripPackage" ADD CONSTRAINT "OfflineTripPackage_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
