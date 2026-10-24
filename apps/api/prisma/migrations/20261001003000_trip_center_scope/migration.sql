ALTER TABLE "Trip" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Trip_organizationId_status_startsAt_idx" ON "Trip"("organizationId","status","startsAt");
