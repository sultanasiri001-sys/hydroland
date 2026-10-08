-- Organization booking ownership and customer-submitted safety reports.
-- Production key columns use PostgreSQL UUID even though Prisma String fields
-- are declared without @db.Uuid in this legacy schema.
DROP INDEX "Booking_tripId_accountId_key";

ALTER TABLE "Booking"
  ADD COLUMN "organizationId" UUID,
  ADD COLUMN "bookingRequestKey" TEXT,
  ADD COLUMN "bookingRequestFingerprint" TEXT;

ALTER TABLE "SafetyIncident" ADD COLUMN "bookingId" UUID;

CREATE UNIQUE INDEX "Booking_bookingRequestKey_key" ON "Booking"("bookingRequestKey");
CREATE INDEX "Booking_organizationId_status_createdAt_idx" ON "Booking"("organizationId","status","createdAt");
CREATE INDEX "Booking_tripId_organizationId_idx" ON "Booking"("tripId","organizationId");
CREATE INDEX "SafetyIncident_bookingId_status_createdAt_idx" ON "SafetyIncident"("bookingId","status","createdAt");

-- Keep one active personal booking per trip and account; permit a distinct
-- organization booking by the same contact and preserve cancelled history.
CREATE UNIQUE INDEX "Booking_personal_active_trip_account_key"
  ON "Booking"("tripId","accountId")
  WHERE "organizationId" IS NULL AND "status" <> 'CANCELLED';
CREATE UNIQUE INDEX "Booking_organization_active_trip_key"
  ON "Booking"("tripId","organizationId")
  WHERE "organizationId" IS NOT NULL AND "status" <> 'CANCELLED';

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyIncident"
  ADD CONSTRAINT "SafetyIncident_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
