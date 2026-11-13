ALTER TABLE "AdministrativeRecord"
  ADD COLUMN "managedDocumentId" TEXT,
  ADD COLUMN "managedDocumentVersion" INTEGER,
  ADD COLUMN "managedDocumentContentHash" TEXT;

ALTER TABLE "AdministrativeRecord"
  ADD CONSTRAINT "AdministrativeRecord_managedDocumentId_fkey"
  FOREIGN KEY ("managedDocumentId") REFERENCES "ManagedDocument"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AdministrativeRecord_managedDocumentId_key"
  ON "AdministrativeRecord"("managedDocumentId");
CREATE INDEX IF NOT EXISTS "AdministrativeRecord_organizationId_status_updatedAt_idx"
  ON "AdministrativeRecord"("organizationId", "status", "updatedAt");

ALTER TABLE "AdministrativeRecord"
  ADD CONSTRAINT "AdministrativeRecord_managed_document_snapshot_check"
  CHECK (
    ("managedDocumentId" IS NULL AND "managedDocumentVersion" IS NULL AND "managedDocumentContentHash" IS NULL)
    OR
    ("managedDocumentId" IS NOT NULL AND "managedDocumentVersion" IS NOT NULL AND "managedDocumentVersion" > 0 AND "managedDocumentContentHash" IS NOT NULL)
  );

ALTER TABLE "AdministrativeRouting"
  ADD COLUMN "replyText" TEXT,
  ADD COLUMN "repliedByAccountId" TEXT,
  ADD COLUMN "repliedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredByAccountId" TEXT,
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

ALTER TABLE "AdministrativeRouting"
  ADD CONSTRAINT "AdministrativeRouting_repliedByAccountId_fkey"
  FOREIGN KEY ("repliedByAccountId") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdministrativeRouting"
  ADD CONSTRAINT "AdministrativeRouting_deliveredByAccountId_fkey"
  FOREIGN KEY ("deliveredByAccountId") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AdministrativeRouting_organizationId_recordId_deliveredAt_idx"
  ON "AdministrativeRouting"("organizationId", "recordId", "deliveredAt");

ALTER TABLE "AdministrativeRouting"
  ADD CONSTRAINT "AdministrativeRouting_reply_snapshot_check"
  CHECK (
    ("replyText" IS NULL AND "repliedByAccountId" IS NULL AND "repliedAt" IS NULL)
    OR
    ("replyText" IS NOT NULL AND BTRIM("replyText") <> '' AND "repliedByAccountId" IS NOT NULL AND "repliedAt" IS NOT NULL)
  );

ALTER TABLE "AdministrativeRouting"
  ADD CONSTRAINT "AdministrativeRouting_delivery_snapshot_check"
  CHECK (
    ("deliveredByAccountId" IS NULL AND "deliveredAt" IS NULL)
    OR
    ("deliveredByAccountId" IS NOT NULL AND "deliveredAt" IS NOT NULL)
  );
