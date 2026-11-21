ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "withdrawnAt" timestamptz;
CREATE INDEX IF NOT EXISTS "Message_withdrawnAt_idx" ON "Message" ("withdrawnAt") WHERE "withdrawnAt" IS NOT NULL;
CREATE TABLE IF NOT EXISTS "WithdrawnMessageContent" (
  "messageId" text PRIMARY KEY,
  "kind" text NOT NULL,
  "body" text,
  "mediaUrl" text,
  "durationSec" integer
);
CREATE TABLE IF NOT EXISTS "MessageAbuseEvidence" (
  "caseId" text PRIMARY KEY,
  "messageId" text NOT NULL,
  "reporterId" text NOT NULL,
  "releasePersonId" text,
  "releaseReason" text,
  "releasedAt" timestamptz,
  UNIQUE ("messageId", "reporterId")
);
CREATE INDEX IF NOT EXISTS "MessageAbuseEvidence_active" ON "MessageAbuseEvidence" ("messageId") WHERE "releasedAt" IS NULL;
