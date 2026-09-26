-- Reconcile Notification.status with the canonical Prisma enum.
-- Production historically created this column as TEXT while the current
-- Prisma schema expects public."NotificationStatus".

DO $$
BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Notification"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Notification"
  ALTER COLUMN "status" TYPE "NotificationStatus"
  USING ("status"::"NotificationStatus");

ALTER TABLE "Notification"
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"NotificationStatus";
