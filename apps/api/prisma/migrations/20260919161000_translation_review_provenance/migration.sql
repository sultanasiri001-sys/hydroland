ALTER TABLE "BriefingTranslation" ADD COLUMN "reviewedByAccountId" TEXT;
ALTER TABLE "BriefingTranslation" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "BriefingTranslation" ADD COLUMN "createdByAccountId" TEXT;
CREATE INDEX "BriefingTranslation_reviewStatus_idx" ON "BriefingTranslation"("reviewStatus");
