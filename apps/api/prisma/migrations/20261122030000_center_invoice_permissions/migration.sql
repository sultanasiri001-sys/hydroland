CREATE TABLE "InvoicePermissionRequest" (
  "id" TEXT PRIMARY KEY, "sequence" SERIAL NOT NULL UNIQUE, "scopeKey" TEXT NOT NULL, "pendingKey" TEXT,
  "centerId" TEXT NOT NULL, "centerName" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('INSTRUCTOR', 'MARINE_OPERATOR')),
  "targetId" TEXT NOT NULL, "targetName" TEXT NOT NULL, "enable" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL, "requestedBy" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
  "decidedBy" TEXT, "decidedAt" TIMESTAMP(3), "decisionNote" TEXT,
  CHECK (("status"='PENDING' AND "pendingKey" IS NOT NULL AND "pendingKey"="scopeKey" AND "decidedAt" IS NULL AND "decidedBy" IS NULL)
    OR ("status"<>'PENDING' AND "pendingKey" IS NULL AND "decidedAt" IS NOT NULL AND "decidedBy" IS NOT NULL))
);
CREATE UNIQUE INDEX "InvoicePermissionRequest_pendingKey_key" ON "InvoicePermissionRequest"("pendingKey");
CREATE INDEX "InvoicePermissionRequest_scopeKey_status_sequence_idx" ON "InvoicePermissionRequest"("scopeKey","status","sequence");
CREATE INDEX "InvoicePermissionRequest_centerId_requestedAt_idx" ON "InvoicePermissionRequest"("centerId","requestedAt");
CREATE INDEX "InvoicePermissionRequest_status_requestedAt_idx" ON "InvoicePermissionRequest"("status","requestedAt");
