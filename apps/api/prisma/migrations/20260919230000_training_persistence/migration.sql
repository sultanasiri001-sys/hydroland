-- Reconcile legacy training persistence safely.
-- Production may already contain an empty legacy TrainingEnrollment table and
-- TrainingEnrollmentStatus enum from an earlier training foundation.
DO $$
BEGIN
  IF to_regclass('"TrainingEnrollment"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "TrainingEnrollment" LIMIT 1)
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='TrainingEnrollment' AND column_name='courseId'
     ) THEN
    DROP TABLE "TrainingEnrollment";
  END IF;
END $$;

DO $ BEGIN
  CREATE TYPE "TrainingEnrollmentStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $;
CREATE TYPE "TrainingRecordStatus" AS ENUM ('NOT_STARTED','SCHEDULED','IN_PROGRESS','COMPLETED','DELAYED','SUSPENDED');
CREATE TYPE "TrainingSessionStatus" AS ENUM ('SCHEDULED','CHECK_IN_OPEN','IN_PROGRESS','COMPLETED','CANCELLED');

CREATE TABLE "TrainingEnrollment" (
 "id" TEXT NOT NULL, "studentAccountId" TEXT NOT NULL, "courseCode" TEXT NOT NULL,
 "centerOrganizationId" TEXT, "instructorAccountId" TEXT, "status" "TrainingEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
 "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), "metadata" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrainingRecord" (
 "id" TEXT NOT NULL, "enrollmentId" TEXT NOT NULL, "status" "TrainingRecordStatus" NOT NULL DEFAULT 'NOT_STARTED',
 "progressPercent" INTEGER NOT NULL DEFAULT 0, "policyVersion" TEXT, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrainingStage" (
 "id" TEXT NOT NULL, "trainingRecordId" TEXT NOT NULL, "stageType" TEXT NOT NULL, "deliveryMode" TEXT NOT NULL,
 "sequence" INTEGER NOT NULL, "progressPercent" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TrainingStage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrainingSkill" (
 "id" TEXT NOT NULL, "trainingStageId" TEXT NOT NULL, "skillCode" TEXT NOT NULL, "name" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'NOT_STARTED', "signedOffByInstructorId" TEXT, "signedOffAt" TIMESTAMP(3),
 "studentAcknowledgedAt" TIMESTAMP(3), "studentObjection" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TrainingSkill_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrainingSession" (
 "id" TEXT NOT NULL, "trainingRecordId" TEXT NOT NULL, "trainingStageId" TEXT, "instructorAccountId" TEXT NOT NULL,
 "facilityOrSiteId" TEXT, "tripId" TEXT, "vesselId" TEXT, "evidence" JSONB,
 "status" "TrainingSessionStatus" NOT NULL DEFAULT 'SCHEDULED', "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingRecord_enrollmentId_key" ON "TrainingRecord"("enrollmentId");
CREATE INDEX "TrainingEnrollment_studentAccountId_status_idx" ON "TrainingEnrollment"("studentAccountId","status");
CREATE INDEX "TrainingEnrollment_centerOrganizationId_status_idx" ON "TrainingEnrollment"("centerOrganizationId","status");
CREATE INDEX "TrainingEnrollment_instructorAccountId_status_idx" ON "TrainingEnrollment"("instructorAccountId","status");
CREATE INDEX "TrainingEnrollment_courseCode_status_idx" ON "TrainingEnrollment"("courseCode","status");
CREATE INDEX "TrainingRecord_status_updatedAt_idx" ON "TrainingRecord"("status","updatedAt");
CREATE UNIQUE INDEX "TrainingStage_trainingRecordId_sequence_key" ON "TrainingStage"("trainingRecordId","sequence");
CREATE INDEX "TrainingStage_trainingRecordId_status_idx" ON "TrainingStage"("trainingRecordId","status");
CREATE UNIQUE INDEX "TrainingSkill_trainingStageId_skillCode_key" ON "TrainingSkill"("trainingStageId","skillCode");
CREATE INDEX "TrainingSkill_trainingStageId_status_idx" ON "TrainingSkill"("trainingStageId","status");
CREATE INDEX "TrainingSession_trainingRecordId_status_startsAt_idx" ON "TrainingSession"("trainingRecordId","status","startsAt");
CREATE INDEX "TrainingSession_instructorAccountId_startsAt_idx" ON "TrainingSession"("instructorAccountId","startsAt");
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingStage" ADD CONSTRAINT "TrainingStage_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingSkill" ADD CONSTRAINT "TrainingSkill_trainingStageId_fkey" FOREIGN KEY ("trainingStageId") REFERENCES "TrainingStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_trainingRecordId_fkey" FOREIGN KEY ("trainingRecordId") REFERENCES "TrainingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
