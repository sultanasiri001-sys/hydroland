-- Reconcile legacy training enum values in a separate committed migration.
-- PostgreSQL requires newly-added enum values to be committed before a later
-- transaction can use them as defaults.
DO $$ BEGIN
  ALTER TYPE "TrainingEnrollmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
  ALTER TYPE "TrainingEnrollmentStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
EXCEPTION WHEN undefined_object THEN
  CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','COMPLETED','CANCELLED');
END $$;
