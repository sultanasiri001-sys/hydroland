DO $$ BEGIN CREATE TYPE "FinancePeriodType" AS ENUM ('MONTH','QUARTER','YEAR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancePeriodCloseStatus" AS ENUM ('SUBMITTED','CLOSED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancePeriodCloseApprovalDecision" AS ENUM ('APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancePeriodCloseReviewerRole" AS ENUM ('CENTRAL_FINANCE','FINANCE_MANAGER','EXECUTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ DECLARE center_type TEXT; account_type TEXT; BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO center_type FROM pg_attribute a WHERE a.attrelid='"OrgUnit"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO account_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  EXECUTE format('CREATE TABLE IF NOT EXISTS "FinancePeriodCloseSubmission" (
    "id" %1$s PRIMARY KEY,
    "centerOrgUnitId" %1$s NOT NULL,
    "periodType" "FinancePeriodType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "submittedByAccountId" %2$s NOT NULL,
    "status" "FinancePeriodCloseStatus" NOT NULL DEFAULT ''SUBMITTED'',
    "readinessSnapshot" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "FinancePeriodCloseSubmission_revision_key" UNIQUE ("centerOrgUnitId","periodType","periodKey","revision"),
    CONSTRAINT "FinancePeriodCloseSubmission_values_check" CHECK ("revision">0 AND ("periodType"<>''MONTH'' OR "periodKey" ~ ''^[0-9]{4}-(0[1-9]|1[0-2])$'') AND ("periodType"<>''QUARTER'' OR "periodKey" ~ ''^[0-9]{4}-Q[1-4]$'') AND ("periodType"<>''YEAR'' OR "periodKey" ~ ''^[0-9]{4}$''))
  )',center_type,account_type);
  EXECUTE format('CREATE TABLE IF NOT EXISTS "FinancePeriodCloseApproval" (
    "id" %2$s PRIMARY KEY,
    "submissionId" %1$s NOT NULL,
    "reviewerAccountId" %2$s NOT NULL,
    "reviewerRole" "FinancePeriodCloseReviewerRole" NOT NULL,
    "decision" "FinancePeriodCloseApprovalDecision" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePeriodCloseApproval_submission_reviewer_key" UNIQUE ("submissionId","reviewerAccountId"),
    CONSTRAINT "FinancePeriodCloseApproval_note_check" CHECK ("note" IS NULL OR length("note")<=1000)
  )',center_type,account_type);
END $$;

CREATE INDEX IF NOT EXISTS "FinancePeriodCloseSubmission_center_status_submittedAt_idx" ON "FinancePeriodCloseSubmission"("centerOrgUnitId","status","submittedAt");
CREATE INDEX IF NOT EXISTS "FinancePeriodCloseSubmission_submitter_status_idx" ON "FinancePeriodCloseSubmission"("submittedByAccountId","status");
CREATE INDEX IF NOT EXISTS "FinancePeriodCloseApproval_reviewer_decision_createdAt_idx" ON "FinancePeriodCloseApproval"("reviewerAccountId","decision","createdAt");
DO $$ BEGIN ALTER TABLE "FinancePeriodCloseSubmission" ADD CONSTRAINT "FinancePeriodCloseSubmission_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinancePeriodCloseSubmission" ADD CONSTRAINT "FinancePeriodCloseSubmission_submittedByAccountId_fkey" FOREIGN KEY ("submittedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinancePeriodCloseApproval" ADD CONSTRAINT "FinancePeriodCloseApproval_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FinancePeriodCloseSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinancePeriodCloseApproval" ADD CONSTRAINT "FinancePeriodCloseApproval_reviewerAccountId_fkey" FOREIGN KEY ("reviewerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
