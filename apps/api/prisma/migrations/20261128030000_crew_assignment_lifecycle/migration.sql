-- Existing assignments retain their recorded status/history. A NULL snapshot
-- means legacy/unverified, never an inferred qualification or financial term.
ALTER TABLE "CrewAssignment"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requestedByAccountId" TEXT,
  ADD COLUMN "approvedByAccountId" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "replacesRevision" INTEGER,
  ADD COLUMN "qualificationSnapshot" JSONB,
  ADD COLUMN "compensationSnapshot" JSONB,
  ADD COLUMN "approvalAuthority" JSONB,
  ADD COLUMN "decisionReason" TEXT;

CREATE TABLE "CrewAssignmentCommand" (
  "id" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrewAssignmentCommand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CrewAssignmentCommand_actorAccountId_requestId_key"
  ON "CrewAssignmentCommand"("actorAccountId","requestId");
CREATE INDEX "CrewAssignmentCommand_assignmentId_createdAt_idx"
  ON "CrewAssignmentCommand"("assignmentId","createdAt");

-- New, source-backed rows cannot reserve the same person twice, or approve two
-- simultaneous replacements. Legacy data is intentionally not rewritten.
CREATE UNIQUE INDEX "CrewAssignment_f02_active_person"
  ON "CrewAssignment"("tripId","accountId")
  WHERE "qualificationSnapshot" IS NOT NULL
    AND "status" IN ('WAITLISTED','PROPOSED','PENDING','ACCEPTED');
CREATE UNIQUE INDEX "CrewAssignment_f02_pending_replacement"
  ON "CrewAssignment"("replacesAssignmentId")
  WHERE "qualificationSnapshot" IS NOT NULL AND "replacesAssignmentId" IS NOT NULL
    AND "status" IN ('PENDING','ACCEPTED');
