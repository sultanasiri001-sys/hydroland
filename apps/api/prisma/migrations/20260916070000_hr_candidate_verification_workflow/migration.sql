ALTER TYPE "WorkforceHiringRequestStatus" ADD VALUE 'PENDING_HR_REVIEW' BEFORE 'PENDING_EXECUTIVE_APPROVAL';
ALTER TYPE "WorkforceHiringRequestStatus" ADD VALUE 'HR_CHANGES_REQUIRED' BEFORE 'PENDING_EXECUTIVE_APPROVAL';
CREATE TYPE "WorkforceHiringRequestSource" AS ENUM ('CANDIDATE', 'CENTER_MANAGER', 'HUMAN_RESOURCES');

ALTER TABLE "WorkforceHiringRequest"
  ADD COLUMN "hrReviewedById" UUID,
  ADD COLUMN "source" "WorkforceHiringRequestSource" NOT NULL DEFAULT 'HUMAN_RESOURCES',
  ADD COLUMN "hrVerification" JSONB,
  ADD COLUMN "hrNote" TEXT,
  ADD COLUMN "hrReviewedAt" TIMESTAMP(3);

ALTER TABLE "WorkforceHiringRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING_HR_REVIEW';
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_hrReviewedById_fkey" FOREIGN KEY ("hrReviewedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "WorkforceHiringRequest_hrReviewedById_status_idx" ON "WorkforceHiringRequest"("hrReviewedById", "status");
