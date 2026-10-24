-- Preserve existing documents while reconciling the legacy TEXT column
-- with the DocumentStatus enum required by Prisma.
-- A single statement keeps type creation and conversion atomic. Unknown
-- legacy values abort the migration instead of being silently rewritten.
DO $migration$
BEGIN
  BEGIN
    CREATE TYPE "DocumentStatus" AS ENUM
      ('UPLOADED', 'QUARANTINED', 'AVAILABLE', 'REJECTED', 'ARCHIVED');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "Document"
    ALTER COLUMN "status" TYPE "DocumentStatus"
    USING ("status"::text::"DocumentStatus");
  ALTER TABLE "Document"
    ALTER COLUMN "status" SET DEFAULT 'UPLOADED'::"DocumentStatus";
END
$migration$;
