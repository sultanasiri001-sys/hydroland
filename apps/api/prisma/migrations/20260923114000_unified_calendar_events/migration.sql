CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "type" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarEvent_referenceType_referenceId_key" ON "CalendarEvent"("referenceType","referenceId");
CREATE INDEX "CalendarEvent_organizationId_startsAt_endsAt_idx" ON "CalendarEvent"("organizationId","startsAt","endsAt");
CREATE INDEX "CalendarEvent_type_status_startsAt_idx" ON "CalendarEvent"("type","status","startsAt");

ALTER TABLE "CalendarAllocation" ADD COLUMN "eventId" TEXT;

INSERT INTO "CalendarEvent" ("id","type","referenceType","referenceId","title","startsAt","endsAt","status","createdAt","updatedAt")
SELECT gen_random_uuid()::text,'TRIP','TRIP',t."id",t."title",t."startsAt",t."endsAt",
       CASE WHEN t."status"::text='CANCELLED' THEN 'CANCELLED' ELSE 'ACTIVE' END,
       CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "Trip" t
WHERE EXISTS (SELECT 1 FROM "CalendarAllocation" ca WHERE ca."tripId"=t."id");

UPDATE "CalendarAllocation" ca
SET "eventId"=ce."id"
FROM "CalendarEvent" ce
WHERE ce."referenceType"='TRIP' AND ce."referenceId"=ca."tripId";

ALTER TABLE "CalendarAllocation" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "CalendarAllocation" DROP CONSTRAINT IF EXISTS "CalendarAllocation_tripId_fkey";
DROP INDEX IF EXISTS "CalendarAllocation_tripId_status_idx";
ALTER TABLE "CalendarAllocation" DROP COLUMN "tripId";
ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CalendarAllocation_eventId_status_idx" ON "CalendarAllocation"("eventId","status");
