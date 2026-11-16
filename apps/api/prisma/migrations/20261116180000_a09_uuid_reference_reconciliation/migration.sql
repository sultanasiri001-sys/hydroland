-- Forward-only reconciliation for the isolated A10 PITR database.
-- The historical A09 file remains byte-for-byte unchanged.
BEGIN;

ALTER TABLE public."AdministrativeRecord"
  ADD COLUMN IF NOT EXISTS "managedDocumentId" UUID,
  ADD COLUMN IF NOT EXISTS "managedDocumentVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "managedDocumentContentHash" TEXT;

ALTER TABLE public."AdministrativeRouting"
  ADD COLUMN IF NOT EXISTS "replyText" TEXT,
  ADD COLUMN IF NOT EXISTS "repliedByAccountId" UUID,
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredByAccountId" UUID,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

DO $migration$
DECLARE
  v_type TEXT;
  v_ref RECORD;
  v_invalid BOOLEAN;
  v_needs_conversion BOOLEAN := FALSE;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Account' AND column_name = 'id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: Account.id must be UUID';
  END IF;

  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ManagedDocument' AND column_name = 'id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: ManagedDocument.id must be UUID';
  END IF;

  FOR v_ref IN
    SELECT * FROM (VALUES
      ('AdministrativeRecord', 'managedDocumentId', 'ManagedDocument', 'id'),
      ('AdministrativeRouting', 'repliedByAccountId', 'Account', 'id'),
      ('AdministrativeRouting', 'deliveredByAccountId', 'Account', 'id')
    ) AS refs(child_table, child_column, parent_table, parent_column)
  LOOP
    SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_ref.child_table
      AND column_name = v_ref.child_column;

    IF v_type IS NULL THEN
      RAISE EXCEPTION 'A10 UUID reconciliation stopped: required reference column is missing';
    ELSIF v_type IN ('text', 'character varying', 'character') THEN
      v_needs_conversion := TRUE;

      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I AS c WHERE c.%I IS NOT NULL AND c.%I !~* $1)',
        v_ref.child_table, v_ref.child_column, v_ref.child_column
      ) INTO v_invalid
      USING '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

      IF v_invalid THEN
        RAISE EXCEPTION 'A10 UUID reconciliation stopped: a text reference is not a valid UUID';
      END IF;

      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I AS c LEFT JOIN public.%I AS p ON c.%I::uuid = p.%I WHERE c.%I IS NOT NULL AND p.%I IS NULL)',
        v_ref.child_table, v_ref.parent_table, v_ref.child_column,
        v_ref.parent_column, v_ref.child_column, v_ref.parent_column
      ) INTO v_invalid;
    ELSIF v_type = 'uuid' THEN
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I AS c LEFT JOIN public.%I AS p ON c.%I = p.%I WHERE c.%I IS NOT NULL AND p.%I IS NULL)',
        v_ref.child_table, v_ref.parent_table, v_ref.child_column,
        v_ref.parent_column, v_ref.child_column, v_ref.parent_column
      ) INTO v_invalid;
    ELSE
      RAISE EXCEPTION 'A10 UUID reconciliation stopped: a reference column has an unsupported type';
    END IF;

    IF v_invalid THEN
      RAISE EXCEPTION 'A10 UUID reconciliation stopped: a reference points to a missing parent row';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public."AdministrativeRecord"
    WHERE "managedDocumentId" IS NOT NULL
    GROUP BY "managedDocumentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: duplicate managed document references exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."AdministrativeRecord"
    WHERE NOT (
      ("managedDocumentId" IS NULL AND "managedDocumentVersion" IS NULL AND "managedDocumentContentHash" IS NULL)
      OR
      ("managedDocumentId" IS NOT NULL AND "managedDocumentVersion" IS NOT NULL AND "managedDocumentVersion" > 0 AND "managedDocumentContentHash" IS NOT NULL)
    )
  ) THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: managed-document snapshots are inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."AdministrativeRouting"
    WHERE NOT (
      ("replyText" IS NULL AND "repliedByAccountId" IS NULL AND "repliedAt" IS NULL)
      OR
      ("replyText" IS NOT NULL AND BTRIM("replyText") <> '' AND "repliedByAccountId" IS NOT NULL AND "repliedAt" IS NOT NULL)
    )
  ) THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: routing replies are inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."AdministrativeRouting"
    WHERE NOT (
      ("deliveredByAccountId" IS NULL AND "deliveredAt" IS NULL)
      OR
      ("deliveredByAccountId" IS NOT NULL AND "deliveredAt" IS NOT NULL)
    )
  ) THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: routing delivery snapshots are inconsistent';
  END IF;

  IF v_needs_conversion THEN
    ALTER TABLE public."AdministrativeRecord"
      DROP CONSTRAINT IF EXISTS "AdministrativeRecord_managedDocumentId_fkey";
    ALTER TABLE public."AdministrativeRouting"
      DROP CONSTRAINT IF EXISTS "AdministrativeRouting_repliedByAccountId_fkey";
    ALTER TABLE public."AdministrativeRouting"
      DROP CONSTRAINT IF EXISTS "AdministrativeRouting_deliveredByAccountId_fkey";

    FOR v_ref IN
      SELECT * FROM (VALUES
        ('AdministrativeRecord', 'managedDocumentId'),
        ('AdministrativeRouting', 'repliedByAccountId'),
        ('AdministrativeRouting', 'deliveredByAccountId')
      ) AS refs(child_table, child_column)
    LOOP
      SELECT data_type INTO v_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_ref.child_table
        AND column_name = v_ref.child_column;

      IF v_type IN ('text', 'character varying', 'character') THEN
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I TYPE UUID USING %I::uuid',
          v_ref.child_table, v_ref.child_column, v_ref.child_column
        );
      END IF;
    END LOOP;
  END IF;
END
$migration$;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRecord"'::regclass
      AND conname = 'AdministrativeRecord_managed_document_snapshot_check'
  ) THEN
    ALTER TABLE public."AdministrativeRecord"
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
      AND conname = 'AdministrativeRouting_reply_snapshot_check'
  ) THEN
    ALTER TABLE public."AdministrativeRouting"
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
    ALTER TABLE public."AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_delivery_snapshot_check"
      CHECK (
        ("deliveredByAccountId" IS NULL AND "deliveredAt" IS NULL)
        OR
        ("deliveredByAccountId" IS NOT NULL AND "deliveredAt" IS NOT NULL)
      );
  END IF;
END
$migration$;

DO $migration$
DECLARE
  v_named BOOLEAN;
  v_exact BOOLEAN;
  v_validated BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRecord"'::regclass
      AND conname = 'AdministrativeRecord_managedDocumentId_fkey'
  ) INTO v_named;
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public."AdministrativeRecord"'::regclass
      AND c.conname = 'AdministrativeRecord_managedDocumentId_fkey'
      AND c.contype = 'f'
      AND c.confrelid = 'public."ManagedDocument"'::regclass
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."AdministrativeRecord"'::regclass AND attname = 'managedDocumentId' AND NOT attisdropped)]::smallint[]
      AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."ManagedDocument"'::regclass AND attname = 'id' AND NOT attisdropped)]::smallint[]
      AND c.confdeltype = 'r'
      AND c.confupdtype = 'c'
  ) INTO v_exact;
  IF v_named AND NOT v_exact THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: managed-document foreign key definition differs';
  ELSIF NOT v_named THEN
    ALTER TABLE public."AdministrativeRecord"
      ADD CONSTRAINT "AdministrativeRecord_managedDocumentId_fkey"
      FOREIGN KEY ("managedDocumentId") REFERENCES public."ManagedDocument"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSE
    SELECT convalidated INTO v_validated FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRecord"'::regclass
      AND conname = 'AdministrativeRecord_managedDocumentId_fkey';
    IF NOT v_validated THEN
      ALTER TABLE public."AdministrativeRecord"
        VALIDATE CONSTRAINT "AdministrativeRecord_managedDocumentId_fkey";
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_repliedByAccountId_fkey'
  ) INTO v_named;
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public."AdministrativeRouting"'::regclass
      AND c.conname = 'AdministrativeRouting_repliedByAccountId_fkey'
      AND c.contype = 'f'
      AND c.confrelid = 'public."Account"'::regclass
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."AdministrativeRouting"'::regclass AND attname = 'repliedByAccountId' AND NOT attisdropped)]::smallint[]
      AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."Account"'::regclass AND attname = 'id' AND NOT attisdropped)]::smallint[]
      AND c.confdeltype = 'r'
      AND c.confupdtype = 'c'
  ) INTO v_exact;
  IF v_named AND NOT v_exact THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: reply foreign key definition differs';
  ELSIF NOT v_named THEN
    ALTER TABLE public."AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_repliedByAccountId_fkey"
      FOREIGN KEY ("repliedByAccountId") REFERENCES public."Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSE
    SELECT convalidated INTO v_validated FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_repliedByAccountId_fkey';
    IF NOT v_validated THEN
      ALTER TABLE public."AdministrativeRouting"
        VALIDATE CONSTRAINT "AdministrativeRouting_repliedByAccountId_fkey";
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_deliveredByAccountId_fkey'
  ) INTO v_named;
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public."AdministrativeRouting"'::regclass
      AND c.conname = 'AdministrativeRouting_deliveredByAccountId_fkey'
      AND c.contype = 'f'
      AND c.confrelid = 'public."Account"'::regclass
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."AdministrativeRouting"'::regclass AND attname = 'deliveredByAccountId' AND NOT attisdropped)]::smallint[]
      AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public."Account"'::regclass AND attname = 'id' AND NOT attisdropped)]::smallint[]
      AND c.confdeltype = 'r'
      AND c.confupdtype = 'c'
  ) INTO v_exact;
  IF v_named AND NOT v_exact THEN
    RAISE EXCEPTION 'A10 UUID reconciliation stopped: delivery foreign key definition differs';
  ELSIF NOT v_named THEN
    ALTER TABLE public."AdministrativeRouting"
      ADD CONSTRAINT "AdministrativeRouting_deliveredByAccountId_fkey"
      FOREIGN KEY ("deliveredByAccountId") REFERENCES public."Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  ELSE
    SELECT convalidated INTO v_validated FROM pg_constraint
    WHERE conrelid = 'public."AdministrativeRouting"'::regclass
      AND conname = 'AdministrativeRouting_deliveredByAccountId_fkey';
    IF NOT v_validated THEN
      ALTER TABLE public."AdministrativeRouting"
        VALIDATE CONSTRAINT "AdministrativeRouting_deliveredByAccountId_fkey";
    END IF;
  END IF;
END
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS "AdministrativeRecord_managedDocumentId_key"
  ON public."AdministrativeRecord"("managedDocumentId");
CREATE INDEX IF NOT EXISTS "AdministrativeRecord_organizationId_status_updatedAt_idx"
  ON public."AdministrativeRecord"("organizationId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "AdministrativeRouting_organizationId_recordId_deliveredAt_idx"
  ON public."AdministrativeRouting"("organizationId", "recordId", "deliveredAt");

COMMIT;

