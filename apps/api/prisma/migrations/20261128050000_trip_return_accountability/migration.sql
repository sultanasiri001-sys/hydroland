BEGIN;
-- Preserve the actual identifier type of each native source installation.
DO $$
DECLARE trip_type text; account_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO trip_type FROM pg_attribute WHERE attrelid='"Trip"'::regclass AND attname='id';
  SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id';
  IF trip_type NOT IN ('text','uuid') OR account_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported native return-accountability identifier type'; END IF;
  EXECUTE format('CREATE TABLE IF NOT EXISTS "TripReturnRecord" (
    "tripId" %s PRIMARY KEY REFERENCES "Trip"("id") ON DELETE RESTRICT,
    "revision" integer NOT NULL CHECK ("revision">0),
    "sourceDigest" text NOT NULL CHECK ("sourceDigest" ~ ''^[a-f0-9]{64}$''),
    "entries" jsonb NOT NULL CHECK (jsonb_typeof("entries")=''array''),
    "observedAt" timestamptz(3) NOT NULL,
    "recordedByAccountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
    "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )', trip_type, account_type);
END $$;
CREATE INDEX IF NOT EXISTS "TripReturnRecord_recordedByAccountId_idx" ON "TripReturnRecord"("recordedByAccountId");
COMMIT;
