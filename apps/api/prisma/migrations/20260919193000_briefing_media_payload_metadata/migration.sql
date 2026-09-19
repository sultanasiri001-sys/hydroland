CREATE TABLE "BriefingMedia" (
    "id" TEXT NOT NULL,
    "briefingId" TEXT NOT NULL,
    "mediaKey" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "contentType" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'OPERATIONAL_OFFLINE',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BriefingMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BriefingMedia_briefingId_mediaKey_key" ON "BriefingMedia"("briefingId", "mediaKey");
CREATE INDEX "BriefingMedia_briefingId_status_idx" ON "BriefingMedia"("briefingId", "status");

ALTER TABLE "BriefingMedia"
ADD CONSTRAINT "BriefingMedia_briefingId_fkey"
FOREIGN KEY ("briefingId") REFERENCES "TripBriefing"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
