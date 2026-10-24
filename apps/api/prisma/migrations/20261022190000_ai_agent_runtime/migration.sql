-- Additive agent execution records. Canonical production Account identifiers are
-- UUID; clean and legacy installations may use TEXT. Preserve either identity.
DO $migration$
DECLARE account_type TEXT;
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO account_type
  FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id'
    AND a.atttypid IN ('uuid'::regtype,'text'::regtype,'varchar'::regtype);
  IF account_type IS NULL THEN RAISE EXCEPTION 'Unsupported canonical Account identifier type'; END IF;
  EXECUTE format('CREATE TABLE "AiAgentRuntime" (
    "key" TEXT PRIMARY KEY,
    "state" TEXT NOT NULL DEFAULT ''PAUSED'' CHECK ("state" IN (''PAUSED'',''ENABLED'')),
    "revision" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAdminAccountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )',account_type);
  EXECUTE format('CREATE TABLE "AiAgentTask" (
    "id" TEXT PRIMARY KEY,
    "agentKey" TEXT NOT NULL REFERENCES "AiAgentRuntime"("key") ON DELETE RESTRICT ON UPDATE CASCADE,
    "requestedByAccountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT ''QUEUED'' CHECK ("state" IN (''QUEUED'',''RUNNING'',''COMPLETED'',''FAILED'',''INTERRUPTED'',''CANCELLED'',''REVIEWED'')),
    "revision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "claimId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "executionPolicy" JSONB,
    "model" TEXT,
    "reservedCostMicroUsd" INTEGER NOT NULL DEFAULT 0 CHECK ("reservedCostMicroUsd">=0),
    "reservationDate" DATE,
    "inputTokens" INTEGER CHECK ("inputTokens">=0),
    "outputTokens" INTEGER CHECK ("outputTokens">=0),
    "estimatedCostMicroUsd" INTEGER CHECK ("estimatedCostMicroUsd">=0),
    "result" TEXT,
    "errorCode" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAccountId" %s REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )',account_type,account_type);
END $migration$;
CREATE UNIQUE INDEX "AiAgentTask_requestedByAccountId_requestKey_key" ON "AiAgentTask"("requestedByAccountId","requestKey");
CREATE INDEX "AiAgentTask_agentKey_state_createdAt_idx" ON "AiAgentTask"("agentKey","state","createdAt");
CREATE INDEX "AiAgentTask_state_leaseExpiresAt_idx" ON "AiAgentTask"("state","leaseExpiresAt");
CREATE INDEX "AiAgentTask_reservationDate_idx" ON "AiAgentTask"("reservationDate");
