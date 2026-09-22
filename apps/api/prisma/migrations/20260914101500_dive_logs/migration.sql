CREATE TYPE "DiveLogStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REJECTED');

CREATE TABLE "DiveLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" UUID NOT NULL,
    "siteName" TEXT NOT NULL,
    "regionCode" TEXT,
    "diveDate" TIMESTAMP(3) NOT NULL,
    "maxDepthM" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "buddyName" TEXT,
    "instructorName" TEXT,
    "notes" TEXT,
    "status" "DiveLogStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiveLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiveLog_accountId_diveDate_idx" ON "DiveLog"("accountId", "diveDate");
CREATE INDEX "DiveLog_accountId_status_idx" ON "DiveLog"("accountId", "status");

ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
