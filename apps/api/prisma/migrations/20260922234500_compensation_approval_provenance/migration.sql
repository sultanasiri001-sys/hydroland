ALTER TABLE "CompensationTerm"
  ADD COLUMN "requestedByAccountId" TEXT,
  ADD COLUMN "reviewedByAccountId" TEXT;

ALTER TABLE "CompensationTerm"
  ADD CONSTRAINT "CompensationTerm_requestedByAccountId_fkey"
  FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompensationTerm"
  ADD CONSTRAINT "CompensationTerm_reviewedByAccountId_fkey"
  FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CompensationTerm_requestedByAccountId_idx" ON "CompensationTerm"("requestedByAccountId");
CREATE INDEX "CompensationTerm_reviewedByAccountId_idx" ON "CompensationTerm"("reviewedByAccountId");
