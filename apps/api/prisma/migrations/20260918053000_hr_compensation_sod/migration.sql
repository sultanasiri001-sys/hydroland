-- Add explicit maker/reviewer/approver separation to compensation decisions.
ALTER TABLE "CompensationTerm" ADD COLUMN "requestedByAccountId" TEXT;
ALTER TABLE "CompensationTerm" ADD COLUMN "reviewedByAccountId" TEXT;

-- Existing rows predate the maker/reviewer workflow; preserve them but require maker on new writes at runtime.
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompensationTerm" ADD CONSTRAINT "CompensationTerm_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CompensationTerm_requestedByAccountId_status_idx" ON "CompensationTerm"("requestedByAccountId","status");
