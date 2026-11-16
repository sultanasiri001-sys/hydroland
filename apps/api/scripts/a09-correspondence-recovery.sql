-- Idempotent completion for the failed A09 correspondence migration.
-- The caller validates the failed migration and marks it applied after this script succeeds.
BEGIN;

DO $$
DECLARE
  link RECORD;
  target_type TEXT;
  source_type TEXT;
  invalid_count BIGINT;
BEGIN
  FOR link IN
    SELECT *
      FROM (VALUES
        ('AdministrativeRecord', 'managedDocumentId', 'ManagedDocument', 'id'),
        ('AdministrativeRouting', 'repliedByAccountId', 'Account', 'id'),
        ('AdministrativeRouting', 'deliveredByAccountId', 'Account', 'id')
      ) AS refs(source_table, source_column, target_table, target_column)
  LOOP
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO target_type
      FROM pg_attribute a
     WHERE a.attrelid = format('%I.%I', current_schema(), link.target_table)::regclass
       AND a.attname = link.target_column
       AND NOT a.attisdropped;
    IF target_type IS NULL OR target_type NOT IN ('text', 'uuid') THEN
      RAISE EXCEPTION 'A09 recovery expected %.% to use text or uuid, found %',
        link.target_table, link.target_column, target_type;
    END IF;

    SELECT format_type(a.atttypid, a.atttypmod)
      INTO source_type
      FROM pg_attribute a
     WHERE a.attrelid = format('%I.%I', current_schema(), link.source_table)::regclass
       AND a.attname = link.source_column
       AND NOT a.attisdropped;

    IF source_type IS NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD COLUMN %I %s',
        current_schema(), link.source_table, link.source_column, target_type
      );
    ELSIF source_type <> target_type THEN
      IF source_type NOT IN ('text', 'uuid') THEN
        RAISE EXCEPTION 'A09 recovery expected %.% to use text or uuid, found %',
          link.source_table, link.source_column, source_type;
      END IF;

      IF source_type = 'text' AND target_type = 'uuid' THEN
        EXECUTE format(
          'SELECT count(*) FROM %I.%I WHERE %I IS NOT NULL AND %I !~* %L',
          current_schema(), link.source_table, link.source_column, link.source_column,
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ) INTO invalid_count;
        IF invalid_count > 0 THEN
          RAISE EXCEPTION 'A09 recovery cannot convert %.% to uuid: non-UUID values exist',
            link.source_table, link.source_column;
        END IF;
        EXECUTE format(
          'ALTER TABLE %I.%I ALTER COLUMN %I TYPE uuid USING %I::uuid',
          current_schema(), link.source_table, link.source_column, link.source_column
        );
      ELSIF source_type = 'uuid' AND target_type = 'text' THEN
        EXECUTE format(
          'ALTER TABLE %I.%I ALTER COLUMN %I TYPE text USING %I::text',
          current_schema(), link.source_table, link.source_column, link.source_column
        );
      END IF;
    END IF;
  END LOOP;
END $$;

ALTER TABLE "AdministrativeRecord"
  ADD COLUMN IF NOT EXISTS "managedDocumentVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "managedDocumentContentHash" TEXT;

ALTER TABLE "AdministrativeRouting"
  ADD COLUMN IF NOT EXISTS "replyText" TEXT,
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = '"AdministrativeRecord"'::regclass
       AND conname = 'AdministrativeRecord_managedDocumentId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRecord"
      ADD CONSTRAINT "AdministrativeRecord_managedDocumentId_fkey"
      FOREIGN KEY ("managedDocumentId") REFERENCES "ManagedDocument"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = '"AdministrativeRouting"'::regclass
       AND conname = 'AdministrativeRouting_repliedByAccountId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_repliedByAccountId_fkey"
      FOREIGN KEY ("repliedByAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = '"AdministrativeRouting"'::regclass
       AND conname = 'AdministrativeRouting_deliveredByAccountId_fkey'
  ) THEN
    ALTER TABLE "AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_deliveredByAccountId_fkey"
      FOREIGN KEY ("deliveredByAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AdministrativeRecord_managedDocumentId_key"
  ON "AdministrativeRecord"("managedDocumentId");
CREATE INDEX IF NOT EXISTS "AdministrativeRecord_organizationId_status_updatedAt_idx"
  ON "AdministrativeRecord"("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "AdministrativeRouting_organizationId_recordId_deliveredAt_idx"
  ON "AdministrativeRouting"("organizationId", "recordId", "deliveredAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = '"AdministrativeRecord"'::regclass
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
     WHERE conrelid = '"AdministrativeRouting"'::regclass
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
     WHERE conrelid = '"AdministrativeRouting"'::regclass
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
END $$;

COMMIT;
