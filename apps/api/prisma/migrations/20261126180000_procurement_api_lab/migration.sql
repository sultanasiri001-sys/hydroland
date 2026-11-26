-- Owner-only synthetic sessions and provider-neutral API preparation metadata.
-- No organization, document, ledger, money proof, or external connection is created.
CREATE TABLE IF NOT EXISTS "ProcurementLabSession" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerAccountId" TEXT NOT NULL,
  "scenario" TEXT NOT NULL DEFAULT 'STANDARD_V1', "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "revision" INTEGER NOT NULL DEFAULT 1, "digest" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL, "state" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "ProcurementLabEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerAccountId" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "role" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL,
  "beforeRevision" INTEGER NOT NULL, "afterRevision" INTEGER NOT NULL, "previousDigest" TEXT,
  "resultDigest" TEXT NOT NULL, "evidenceHash" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "ProcurementApiProfile" (
  "id" TEXT NOT NULL PRIMARY KEY, "ownerAccountId" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
  "configHash" TEXT NOT NULL, "settings" JSONB NOT NULL, "history" JSONB NOT NULL, "lastCheck" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Historical Account identity storage can be TEXT or UUID. Adapt only these
-- new references before creating their FKs; never rewrite the Account table.
DO $$
DECLARE account_type TEXT; current_type TEXT; table_name TEXT;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute
    WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF account_type IS NULL OR account_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported procurement lab Account identity type'; END IF;
  FOR table_name IN SELECT unnest(ARRAY['ProcurementLabSession','ProcurementLabEvent','ProcurementApiProfile']) LOOP
    SELECT format_type(atttypid,atttypmod) INTO current_type FROM pg_attribute
      WHERE attrelid=format('%I',table_name)::regclass AND attname='ownerAccountId' AND NOT attisdropped;
    IF current_type IS DISTINCT FROM account_type THEN
      ALTER TABLE "ProcurementLabEvent" DROP CONSTRAINT IF EXISTS "ProcurementLabEvent_ownerAccountId_sessionId_fkey";
      IF table_name <> 'ProcurementLabEvent' THEN
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',table_name,table_name||'_ownerAccountId_fkey');
      END IF;
      EXECUTE format('ALTER TABLE %I ALTER COLUMN "ownerAccountId" TYPE %s USING "ownerAccountId"::%s',table_name,account_type,account_type);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION "procurement_lab_event_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Procurement lab occurrences are append-only' USING ERRCODE='55000';
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ProcurementLabEvent_immutable' AND tgrelid='"ProcurementLabEvent"'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER "ProcurementLabEvent_immutable" BEFORE UPDATE OR DELETE ON "ProcurementLabEvent" FOR EACH ROW EXECUTE FUNCTION "procurement_lab_event_immutable"();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementLabSession_ownerAccountId_id_key" ON "ProcurementLabSession"("ownerAccountId","id");
CREATE INDEX IF NOT EXISTS "ProcurementLabSession_ownerAccountId_createdAt_idx" ON "ProcurementLabSession"("ownerAccountId","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementLabEvent_ownerAccountId_requestId_key" ON "ProcurementLabEvent"("ownerAccountId","requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementLabEvent_sessionId_afterRevision_key" ON "ProcurementLabEvent"("sessionId","afterRevision");
CREATE INDEX IF NOT EXISTS "ProcurementLabEvent_ownerAccountId_sessionId_createdAt_idx" ON "ProcurementLabEvent"("ownerAccountId","sessionId","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementApiProfile_ownerAccountId_key" ON "ProcurementApiProfile"("ownerAccountId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementLabSession_ownerAccountId_fkey' AND conrelid='"ProcurementLabSession"'::regclass) THEN
    ALTER TABLE "ProcurementLabSession" ADD CONSTRAINT "ProcurementLabSession_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementApiProfile_ownerAccountId_fkey' AND conrelid='"ProcurementApiProfile"'::regclass) THEN
    ALTER TABLE "ProcurementApiProfile" ADD CONSTRAINT "ProcurementApiProfile_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementLabEvent_ownerAccountId_sessionId_fkey' AND conrelid='"ProcurementLabEvent"'::regclass) THEN
    ALTER TABLE "ProcurementLabEvent" ADD CONSTRAINT "ProcurementLabEvent_ownerAccountId_sessionId_fkey" FOREIGN KEY ("ownerAccountId","sessionId") REFERENCES "ProcurementLabSession"("ownerAccountId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementLabSession_values_check' AND conrelid='"ProcurementLabSession"'::regclass) THEN
    ALTER TABLE "ProcurementLabSession" ADD CONSTRAINT "ProcurementLabSession_values_check" CHECK (
      "scenario"='STANDARD_V1' AND "revision" BETWEEN 1 AND 160 AND "amountMinor">0 AND "digest" ~ '^[a-f0-9]{64}$'
      AND "status" IN ('REQUESTED','RECOMMENDED','APPROVED','DECLINED','CANCELLED','SETTLED','REVERSED','RECOVERY_REQUIRED','RECOVERED')
      AND jsonb_typeof("state")='object' AND "state" @> '{"synthetic":true,"schemaVersion":1}'::jsonb
      AND octet_length("state"::text)<=262144);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementLabEvent_values_check' AND conrelid='"ProcurementLabEvent"'::regclass) THEN
    ALTER TABLE "ProcurementLabEvent" ADD CONSTRAINT "ProcurementLabEvent_values_check" CHECK (
      "beforeRevision">=0 AND "afterRevision"="beforeRevision"+1 AND "afterRevision"<=160
      AND "requestFingerprint" ~ '^[a-f0-9]{64}$' AND "resultDigest" ~ '^[a-f0-9]{64}$' AND "evidenceHash" ~ '^[a-f0-9]{64}$'
      AND (("beforeRevision"=0 AND "previousDigest" IS NULL AND "action"='CREATE' AND "role"='MAKER')
        OR ("beforeRevision">0 AND "previousDigest" IS NOT NULL AND "previousDigest" ~ '^[a-f0-9]{64}$' AND "action"<>'CREATE'))
      AND "action" IN ('CREATE','RECOMMEND','APPROVE','INVOICE','RECEIVE','RECEIPT_ACCEPTANCE','PREPARE_SETTLEMENT','APPROVE_SETTLEMENT','CONFIRM_SETTLEMENT','CANCEL','REVERSE','PREPARE_RECOVERY','APPROVE_RECOVERY','CONFIRM_RECOVERY','ACCEPTANCE')
      AND "role" IN ('MAKER','RECOMMENDER','OWNER','ACCOUNTANT','RECEIVER','TREASURER','ACCEPTOR')
      AND jsonb_typeof("payload")='object' AND octet_length("payload"::text)<=65536);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ProcurementApiProfile_values_check' AND conrelid='"ProcurementApiProfile"'::regclass) THEN
    ALTER TABLE "ProcurementApiProfile" ADD CONSTRAINT "ProcurementApiProfile_values_check" CHECK (
      "revision">0 AND "configHash" ~ '^[a-f0-9]{64}$' AND jsonb_typeof("settings")='object' AND octet_length("settings"::text)<=32768
      AND jsonb_typeof("history")='array' AND jsonb_array_length("history")<=100
      AND ("lastCheck" IS NULL OR (jsonb_typeof("lastCheck")='object' AND octet_length("lastCheck"::text)<=32768)));
  END IF;
END $$;
