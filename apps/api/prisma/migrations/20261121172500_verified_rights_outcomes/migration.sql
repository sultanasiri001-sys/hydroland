ALTER TABLE "PersonalDataRequest"
  ADD COLUMN "executionAuditId" TEXT,
  ADD COLUMN "decisionDisposition" TEXT CHECK ("decisionDisposition" IN ('APPLIED','DEFERRED','REFUSED')),
  ADD COLUMN "initialDisposition" TEXT CHECK ("initialDisposition" IN ('APPLIED','DEFERRED','REFUSED'));
CREATE UNIQUE INDEX "PersonalDataRequest_executionAuditId_key" ON "PersonalDataRequest"("executionAuditId");
