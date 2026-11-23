BEGIN;
CREATE TABLE IF NOT EXISTS "TrialPushDispatch" (
  "notificationId" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "bindingDigest" TEXT NOT NULL,
  state TEXT NOT NULL,
  "ticketId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrialPushDispatch_ticketId_key" ON "TrialPushDispatch"("ticketId");
COMMIT;
