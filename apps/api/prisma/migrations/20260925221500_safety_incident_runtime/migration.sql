CREATE TYPE "SafetyIncidentSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "SafetyIncidentStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED');

CREATE TABLE "SafetyIncident" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tripId" TEXT,
  "reportedByAccountId" TEXT NOT NULL,
  "severity" "SafetyIncidentSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "locationName" TEXT,
  "status" "SafetyIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionNotes" TEXT,
  "resolvedByAccountId" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "SafetyIncident_title_length_check" CHECK (char_length(btrim("title")) BETWEEN 3 AND 160),
  CONSTRAINT "SafetyIncident_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 3 AND 5000),
  CONSTRAINT "SafetyIncident_location_length_check" CHECK ("locationName" IS NULL OR char_length(btrim("locationName")) <= 160)
);

ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_reportedByAccountId_fkey" FOREIGN KEY ("reportedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_resolvedByAccountId_fkey" FOREIGN KEY ("resolvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SafetyIncident_trip_status_created_idx" ON "SafetyIncident" ("tripId","status","createdAt" DESC);
CREATE INDEX "SafetyIncident_reporter_created_idx" ON "SafetyIncident" ("reportedByAccountId","createdAt" DESC);
CREATE INDEX "SafetyIncident_status_severity_created_idx" ON "SafetyIncident" ("status","severity","createdAt" DESC);
