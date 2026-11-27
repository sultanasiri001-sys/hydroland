-- Native D01 participation evidence; no historical decisions are rewritten.
CREATE TABLE IF NOT EXISTS "ParticipationCase" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL,
  "bookingParticipantId" TEXT, "trainingEnrollmentId" TEXT,
  "participantAccountId" TEXT, "guardianAccountId" TEXT,
  "policyDocumentId" TEXT NOT NULL, "identityDocumentId" TEXT NOT NULL,
  "guardianDocumentId" TEXT, "medicalDocumentId" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1, "digest" TEXT NOT NULL, "state" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "ParticipationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "caseId" TEXT NOT NULL, "actorAccountId" TEXT NOT NULL, "actorPersonId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL, "action" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL,
  "beforeRevision" INTEGER NOT NULL, "afterRevision" INTEGER NOT NULL,
  "previousDigest" TEXT, "resultDigest" TEXT NOT NULL, "evidenceHash" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Adopt only the new FK column types, matching either historical UUID or TEXT
-- identities without changing the referenced business tables.
DO $$
DECLARE r RECORD; target_type TEXT; actual_type TEXT;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('ParticipationCase','organizationId','Organization'),
    ('ParticipationCase','bookingParticipantId','BookingParticipant'),
    ('ParticipationCase','trainingEnrollmentId','TrainingEnrollment'),
    ('ParticipationCase','participantAccountId','Account'),
    ('ParticipationCase','guardianAccountId','Account'),
    ('ParticipationCase','createdByAccountId','Account'),
    ('ParticipationCase','policyDocumentId','ManagedDocument'),
    ('ParticipationCase','identityDocumentId','ManagedDocument'),
    ('ParticipationCase','guardianDocumentId','ManagedDocument'),
    ('ParticipationCase','medicalDocumentId','ManagedDocument'),
    ('ParticipationEvent','actorAccountId','Account'),
    ('ParticipationEvent','actorPersonId','Person'),
    ('ParticipationEvent','caseId','ParticipationCase')
  ) AS refs(table_name,column_name,target_name) LOOP
    SELECT format_type(atttypid,atttypmod) INTO target_type FROM pg_attribute
      WHERE attrelid=format('%I',r.target_name)::regclass AND attname='id' AND NOT attisdropped;
    SELECT format_type(atttypid,atttypmod) INTO actual_type FROM pg_attribute
      WHERE attrelid=format('%I',r.table_name)::regclass AND attname=r.column_name AND NOT attisdropped;
    IF target_type NOT IN ('text','uuid') OR target_type IS NULL THEN RAISE EXCEPTION 'Unsupported participation identity type'; END IF;
    IF actual_type IS DISTINCT FROM target_type THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',r.table_name,r.table_name||'_'||r.column_name||'_fkey');
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',r.table_name,r.column_name,target_type,r.column_name,target_type);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=format('%I',r.table_name)::regclass AND conname=r.table_name||'_'||r.column_name||'_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE RESTRICT ON UPDATE CASCADE',r.table_name,r.table_name||'_'||r.column_name||'_fkey',r.column_name,r.target_name);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ParticipationCase_bookingParticipantId_key" ON "ParticipationCase"("bookingParticipantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipationCase_trainingEnrollmentId_key" ON "ParticipationCase"("trainingEnrollmentId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_organizationId_updatedAt_idx" ON "ParticipationCase"("organizationId","updatedAt");
CREATE INDEX IF NOT EXISTS "ParticipationCase_participantAccountId_idx" ON "ParticipationCase"("participantAccountId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_guardianAccountId_idx" ON "ParticipationCase"("guardianAccountId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_policyDocumentId_idx" ON "ParticipationCase"("policyDocumentId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_identityDocumentId_idx" ON "ParticipationCase"("identityDocumentId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_guardianDocumentId_idx" ON "ParticipationCase"("guardianDocumentId");
CREATE INDEX IF NOT EXISTS "ParticipationCase_medicalDocumentId_idx" ON "ParticipationCase"("medicalDocumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipationEvent_actorAccountId_requestId_key" ON "ParticipationEvent"("actorAccountId","requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParticipationEvent_caseId_afterRevision_key" ON "ParticipationEvent"("caseId","afterRevision");
CREATE INDEX IF NOT EXISTS "ParticipationEvent_caseId_createdAt_idx" ON "ParticipationEvent"("caseId","createdAt");

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='"ParticipationCase"'::regclass AND conname='ParticipationCase_scope_check') THEN
    ALTER TABLE "ParticipationCase" ADD CONSTRAINT "ParticipationCase_scope_check" CHECK (
      num_nonnulls("bookingParticipantId","trainingEnrollmentId")=1
      AND "revision">0 AND "digest" ~ '^[a-f0-9]{64}$'
      AND jsonb_typeof("state")='object' AND "state" @> '{"schemaVersion":1}'::jsonb
      AND "state" ?& ARRAY['subjectType','subjectId','organizationId']
      AND "state"->>'subjectType' IS NOT NULL AND "state"->>'subjectId' IS NOT NULL AND "state"->>'organizationId' IS NOT NULL
      AND octet_length("state"::text)<=262144
      AND (("bookingParticipantId" IS NOT NULL AND "state"->>'subjectType'='BOOKING_PARTICIPANT' AND "state"->>'subjectId'="bookingParticipantId"::text)
        OR ("trainingEnrollmentId" IS NOT NULL AND "state"->>'subjectType'='TRAINING_ENROLLMENT' AND "state"->>'subjectId'="trainingEnrollmentId"::text))
      AND "state"->>'organizationId'="organizationId"::text);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='"ParticipationEvent"'::regclass AND conname='ParticipationEvent_evidence_check') THEN
    ALTER TABLE "ParticipationEvent" ADD CONSTRAINT "ParticipationEvent_evidence_check" CHECK (
      "beforeRevision">=0 AND "afterRevision"="beforeRevision"+1
      AND "requestFingerprint" ~ '^[a-f0-9]{64}$' AND "resultDigest" ~ '^[a-f0-9]{64}$' AND "evidenceHash" ~ '^[a-f0-9]{64}$'
      AND (("beforeRevision"=0 AND "previousDigest" IS NULL AND "action"='CREATE')
        OR ("beforeRevision">0 AND "previousDigest" IS NOT NULL AND "previousDigest" ~ '^[a-f0-9]{64}$' AND "action"<>'CREATE'))
      AND "action" IN ('CREATE','LINK_EVIDENCE','SIGN_CONSENT','WITHDRAW_CONSENT','REVIEW','REVOKE','REPLACE_SOURCES','SOURCE_REVOKED')
      AND jsonb_typeof("payload")='object' AND octet_length("payload"::text)<=262144);
  END IF;
END $$;
CREATE OR REPLACE FUNCTION participation_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Participation evidence is append-only' USING ERRCODE='55000'; END $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='"ParticipationEvent"'::regclass AND tgname='ParticipationEvent_immutable' AND NOT tgisinternal) THEN
    CREATE TRIGGER "ParticipationEvent_immutable" BEFORE UPDATE OR DELETE ON "ParticipationEvent" FOR EACH ROW EXECUTE FUNCTION participation_event_immutable();
  END IF;
END $$;
