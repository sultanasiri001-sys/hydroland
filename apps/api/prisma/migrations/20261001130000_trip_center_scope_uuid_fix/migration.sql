ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "organizationId" UUID;
DO $$ BEGIN
  ALTER TABLE "Trip" ADD CONSTRAINT "Trip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Trip_organizationId_status_startsAt_idx" ON "Trip"("organizationId","status","startsAt");
