-- Keep the three account/document references aligned with UUID keys in the restored database.
-- Idempotent guards allow reconciliation when a prior attempt left schema objects behind.
ALTER TABLE "AdministrativeRecord"
  ADD COLUMN IF NOT EXISTS "managedDocumentId" UUID,
  ADD COLUMN IF NOT EXISTS "managedDocumentVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "managedDocumentContentHash" TEXT;

ALTER TABLE "AdministrativeRouting"
  ADD COLUMN IF NOT EXISTS "replyText" TEXT,
  ADD COLUMN IF NOT EXISTS "repliedByAccountId" UUID,
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredByAccountId" UUID,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRecord"'::regclass
      AND conname = 'AdministrativeRecord_managedDocumentId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRecord"
      ADD CONSTRAINT "AdministrativeRecord_managedDocumentId_fkey"
      FOREIGN KEY ("managedDocumentId") REFERENCES "ManagedDocument"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRecord"'::regclass
      AND conname = 'AdministrativeRecord_managed_document_snapshot_check'
  ) THEN
    ALTER TABLE "AdministrativeRecord"
      ADD CONSTRAINT "AdministrativeRecord_managed_document_snapshot_check"
      CHECK (
        ("managedDocumentId" IS NULL AND "managedDocumentVersion" IS NULL AND "managedDocumentContentHash" IS NULL)
        OR
        ("managedDocumentId" IS NOT NULL AND "managedDocumentVersion" IS NOT NULL AND "managedDocumentVersion" > 0 AND "managedDocumentContentHash" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_repliedByAccountId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_repliedByAccountId_fkey"
      FOREIGN KEY ("repliedByAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_deliveredByAccountId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_deliveredByAccountId_fkey"
      FOREIGN KEY ("deliveredByAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_reply_snapshot_check'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_reply_snapshot_check"
      CHECK (
        ("replyText" IS NULL AND "repliedByAccountId" IS NULL AND "repliedAt" IS NULL)
        OR
        ("replyText" IS NOT NULL AND BTRIM("replyText") <> '' AND "repliedByAccountId" IS NOT NULL AND "repliedAt" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_delivery_snapshot_check'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_delivery_snapshot_check"
      CHECK (
        ("deliveredByAccountId" IS NULL AND "deliveredAt" IS NULL)
        OR
        ("deliveredByAccountId" IS NOT NULL AND "deliveredAt" IS NOT NULL)
      );
  END IF;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS "AdministrativeRecord_managedDocumentId_key"
  ON "AdministrativeRecord"("managedDocumentId");
CREATE INDEX IF NOT EXISTS "AdministrativeRecord_organizationId_status_updatedAt_idx"
  ON "AdministrativeRecord"("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "AdministrativeRouting_organizationId_recordId_deliveredAt_idx"
  ON "AdministrativeRouting"("organizationId", "recordId", "deliveredAt");
