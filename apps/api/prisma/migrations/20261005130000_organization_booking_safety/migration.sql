-- Organization booking ownership and customer-submitted safety reports.
-- Follow actual referenced key types: production UUID and clean-schema TEXT
-- must both retain valid foreign keys without changing existing columns.
DROP INDEX "Booking_tripId_accountId_key";

DO $$
DECLARE
  organization_key_type TEXT;
  booking_key_type TEXT;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO organization_key_type
  FROM pg_attribute WHERE attrelid = '"Organization"'::regclass AND attname = 'id' AND NOT attisdropped;
  SELECT format_type(atttypid, atttypmod) INTO booking_key_type
  FROM pg_attribute WHERE attrelid = '"Booking"'::regclass AND attname = 'id' AND NOT attisdropped;
  IF organization_key_type NOT IN ('text', 'uuid') OR booking_key_type NOT IN ('text', 'uuid')
     OR organization_key_type IS NULL OR booking_key_type IS NULL THEN
    RAISE EXCEPTION 'Unsupported organization or booking key type';
  END IF;
  EXECUTE format('ALTER TABLE "Booking" ADD COLUMN "organizationId" %s, ADD COLUMN "bookingRequestKey" TEXT, ADD COLUMN "bookingRequestFingerprint" TEXT', organization_key_type);
  EXECUTE format('ALTER TABLE "SafetyIncident" ADD COLUMN "bookingId" %s', booking_key_type);
END $$;

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
