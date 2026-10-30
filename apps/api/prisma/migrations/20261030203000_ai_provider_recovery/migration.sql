-- Preserve logical task identities and every conservative reservation. No roles,
-- credentials, prompts or historical outputs are changed by this migration.
BEGIN;
ALTER TABLE "AiAgentTask"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0 CHECK ("attemptCount">=0),
  ADD COLUMN "unknownCostAttempts" INTEGER NOT NULL DEFAULT 0 CHECK ("unknownCostAttempts">=0),
  ADD COLUMN "retryNotBefore" TIMESTAMP(3),
  ADD COLUMN "retryStartedAt" TIMESTAMP(3);
CREATE TABLE "AiAgentTaskAttempt" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL REFERENCES "AiAgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "attemptNumber" INTEGER NOT NULL CHECK ("attemptNumber">0),
  "claimId" TEXT NOT NULL,
  "state" TEXT NOT NULL CHECK ("state" IN ('RUNNING','COMPLETED','REJECTED','FAILED','INTERRUPTED','LATE_RESULT')),
  "startedAt" TIMESTAMP(3) NOT NULL,
  "dispatchedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "reservationDate" DATE NOT NULL,
  "reservedCostMicroUsd" INTEGER NOT NULL CHECK ("reservedCostMicroUsd">=0),
  "estimatedCostMicroUsd" INTEGER CHECK ("estimatedCostMicroUsd">=0),
  "inputTokens" INTEGER CHECK ("inputTokens">=0),
  "outputTokens" INTEGER CHECK ("outputTokens">=0),
  "errorCode" TEXT,
  "providerStage" TEXT,
  "providerLimits" JSONB
);
CREATE UNIQUE INDEX "AiAgentTaskAttempt_claimId_key" ON "AiAgentTaskAttempt"("claimId");
CREATE UNIQUE INDEX "AiAgentTaskAttempt_taskId_attemptNumber_key" ON "AiAgentTaskAttempt"("taskId","attemptNumber");
CREATE INDEX "AiAgentTaskAttempt_reservationDate_idx" ON "AiAgentTaskAttempt"("reservationDate");
CREATE INDEX "AiAgentTask_state_retryNotBefore_createdAt_idx" ON "AiAgentTask"("state","retryNotBefore","createdAt");
INSERT INTO "AiAgentTaskAttempt" ("id","taskId","attemptNumber","claimId","state","startedAt","dispatchedAt","finishedAt","reservationDate","reservedCostMicroUsd","estimatedCostMicroUsd","inputTokens","outputTokens","errorCode")
SELECT 'legacy:'||"id","id",1,COALESCE("claimId",'legacy:'||"id"),
  CASE WHEN "state"='RUNNING' THEN 'RUNNING' WHEN "state"='COMPLETED' THEN 'COMPLETED' WHEN "state"='FAILED' THEN 'FAILED' ELSE 'INTERRUPTED' END,
  COALESCE("startedAt","createdAt"),"dispatchedAt","finishedAt",COALESCE("reservationDate","startedAt"::date,"createdAt"::date),
  "reservedCostMicroUsd","estimatedCostMicroUsd","inputTokens","outputTokens","errorCode"
FROM "AiAgentTask" WHERE "startedAt" IS NOT NULL OR "dispatchedAt" IS NOT NULL OR "reservedCostMicroUsd">0;
UPDATE "AiAgentTask" t SET "attemptCount"=1,"retryStartedAt"=COALESCE(t."startedAt",t."createdAt"),
  "unknownCostAttempts"=CASE WHEN t."dispatchedAt" IS NOT NULL AND t."estimatedCostMicroUsd" IS NULL THEN 1 ELSE 0 END
WHERE EXISTS (SELECT 1 FROM "AiAgentTaskAttempt" a WHERE a."taskId"=t."id");
COMMIT;
