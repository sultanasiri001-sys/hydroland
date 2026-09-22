CREATE TABLE "CalendarResource" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "referenceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarResource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarResource_type_active_idx" ON "CalendarResource"("type", "active");
CREATE INDEX "CalendarResource_referenceId_idx" ON "CalendarResource"("referenceId");

CREATE TABLE "CalendarAllocation" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarAllocation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarAllocation_resourceId_startsAt_endsAt_idx" ON "CalendarAllocation"("resourceId", "startsAt", "endsAt");
CREATE INDEX "CalendarAllocation_tripId_status_idx" ON "CalendarAllocation"("tripId", "status");
ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "CalendarResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;