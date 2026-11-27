-- Additive native receipts: never stores offline draft bodies or secrets.
DO $migration$
DECLARE account_type text; briefing_type text;
BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO account_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
 SELECT format_type(a.atttypid,a.atttypmod) INTO briefing_type FROM pg_attribute a WHERE a.attrelid='"TripBriefing"'::regclass AND a.attname='id' AND NOT a.attisdropped;
 IF account_type NOT IN ('text','uuid','character varying(36)') OR briefing_type NOT IN ('text','uuid','character varying(36)') THEN RAISE EXCEPTION 'Unsupported offline identity key type'; END IF;
 EXECUTE format('CREATE TABLE "MobileOfflineMutation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE CASCADE,
  "briefingId" %s NOT NULL REFERENCES "TripBriefing"("id") ON DELETE CASCADE,
  "operationId" TEXT NOT NULL CHECK (length("operationId") BETWEEN 16 AND 100),
  "fingerprint" TEXT NOT NULL CHECK ("fingerprint" ~ ''^[a-f0-9]{64}$''),
  "result" JSONB NOT NULL CHECK (jsonb_typeof("result") = ''object''),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("accountId","operationId")
 )',account_type,briefing_type);
END $migration$;
CREATE INDEX "MobileOfflineMutation_briefing_idx" ON "MobileOfflineMutation"("briefingId","createdAt");
