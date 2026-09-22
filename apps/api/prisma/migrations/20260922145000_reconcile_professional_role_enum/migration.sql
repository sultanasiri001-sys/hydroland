-- Reconcile RoleAssignment.role with the Prisma ProfessionalRole enum.
-- The operational foundation originally created RoleAssignment.role as TEXT,
-- while schema.prisma models it as ProfessionalRole. Prisma therefore emits
-- enum-typed bind parameters that PostgreSQL cannot resolve until this type exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ProfessionalRole'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "ProfessionalRole" AS ENUM (
      'DIVER',
      'INSTRUCTOR',
      'DIVE_CENTER',
      'BOAT_OWNER',
      'STAFF',
      'ORGANIZATION',
      'ADMIN',
      'REVIEWER'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'RoleAssignment'
      AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "RoleAssignment"
      ALTER COLUMN "role" TYPE "ProfessionalRole"
      USING "role"::"ProfessionalRole";
  END IF;
END
$$;
