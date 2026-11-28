BEGIN;

CREATE TABLE "PrivacyErasureOperation" (
  "id" text PRIMARY KEY,
  "requestId" text,
  "accountId" text NOT NULL,
  "domain" text NOT NULL CHECK ("domain" IN ('ACCOUNT','BOOKINGS','PAYMENTS','SENT_MESSAGES')),
  "recordRef" text NOT NULL,
  "scope" text NOT NULL,
  "state" text NOT NULL DEFAULT 'PREPARED' CHECK ("state" IN ('PREPARED','APPLIED_LOCAL','PUBLISHED','ABORTED')),
  "intent" jsonb NOT NULL,
  "intentHash" text NOT NULL CHECK ("intentHash" ~ '^[a-f0-9]{64}$'),
  "receipt" jsonb,
  "receiptHash" text,
  "executionAuditId" text,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" timestamptz(3),
  "publishedAt" timestamptz(3),
  CHECK (("state" IN ('APPLIED_LOCAL','PUBLISHED')) = ("receipt" IS NOT NULL AND "receiptHash" IS NOT NULL AND "executionAuditId" IS NOT NULL AND "appliedAt" IS NOT NULL)),
  CHECK ("state" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL)
);
CREATE INDEX "PrivacyErasureOperation_requestId_state_idx" ON "PrivacyErasureOperation" ("requestId","state");
CREATE INDEX "PrivacyErasureOperation_domain_recordRef_state_idx" ON "PrivacyErasureOperation" ("domain","recordRef","state");
CREATE TABLE "PrivacyRecordHold" (
  "id" text PRIMARY KEY,
  "requestId" text NOT NULL,
  "accountId" text NOT NULL,
  "domain" text NOT NULL,
  "recordRef" text NOT NULL,
  "reason" text NOT NULL,
  "createdByPersonId" text NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releaseRequestedByPersonId" text,
  "releaseReason" text,
  "releasedByPersonId" text,
  "releasedAt" timestamptz(3),
  CHECK ("releasedAt" IS NULL OR ("releasedByPersonId" IS NOT NULL AND "releaseRequestedByPersonId" IS NOT NULL AND "releasedByPersonId" <> "releaseRequestedByPersonId"))
);
CREATE INDEX "PrivacyRecordHold_accountId_domain_recordRef_releasedAt_idx" ON "PrivacyRecordHold" ("accountId","domain","recordRef","releasedAt");

-- A rolling deployment may keep the previous private-message worker alive.
-- It deletes and records this legacy audit action in the same transaction.
-- Wait for already-written audit transactions, then reject any later legacy
-- purge so its deletion rolls back before establishing the recovery boundary.
LOCK TABLE "AuditEvent" IN ACCESS EXCLUSIVE MODE;
CREATE FUNCTION hydroland_block_unjournaled_private_purge() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Private-message purge requires the external privacy journal';
END
$$;
CREATE TRIGGER hydroland_block_unjournaled_private_purge
BEFORE INSERT ON "AuditEvent"
FOR EACH ROW WHEN (NEW.action = 'message.expired_content_purged')
EXECUTE FUNCTION hydroland_block_unjournaled_private_purge();

-- The encrypted external baseline pins this nonce. Reapplying migrations to
-- a backup older than this installation creates a different nonce and must
-- not silently reopen that restored database.
INSERT INTO "OperationalSetting" ("key","value","updatedAt")
VALUES ('PRIVACY_RECOVERY_BASELINE:v1',jsonb_build_object('nonce',gen_random_uuid()::text,'createdAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),clock_timestamp())
ON CONFLICT ("key") DO NOTHING;

COMMIT;
