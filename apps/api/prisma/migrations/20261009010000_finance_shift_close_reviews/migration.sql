DO $$ BEGIN CREATE TYPE "FinanceShiftCloseSubmissionStatus" AS ENUM ('SUBMITTED','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ DECLARE id_type TEXT; shift_type TEXT; center_type TEXT; account_type TEXT; BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO id_type FROM pg_attribute a WHERE a.attrelid='"FinanceAccountantShift"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO shift_type FROM pg_attribute a WHERE a.attrelid='"FinanceAccountantShift"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO center_type FROM pg_attribute a WHERE a.attrelid='"OrgUnit"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO account_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  EXECUTE format('CREATE TABLE IF NOT EXISTS "FinanceShiftCloseSubmission" (
  "id" %s PRIMARY KEY,
  "shiftId" %s NOT NULL,
  "centerOrgUnitId" %s NOT NULL,
  "revision" INTEGER NOT NULL,
  "submittedByAccountId" %s NOT NULL,
  "reviewedByAccountId" %s,
  "openingBalanceMinor" INTEGER NOT NULL,
  "revenueMinor" INTEGER NOT NULL,
  "expenseMinor" INTEGER NOT NULL,
  "refundMinor" INTEGER NOT NULL,
  "adjustmentMinor" INTEGER NOT NULL,
  "expectedCashMinor" INTEGER NOT NULL,
  "actualCashMinor" INTEGER NOT NULL,
  "varianceMinor" INTEGER NOT NULL,
  "unresolvedPaymentCount" INTEGER NOT NULL DEFAULT 0,
  "varianceReason" TEXT,
  "status" "FinanceShiftCloseSubmissionStatus" NOT NULL DEFAULT ''SUBMITTED'',
  "reviewNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceShiftCloseSubmission_shift_revision_key" UNIQUE ("shiftId","revision"),
  CONSTRAINT "FinanceShiftCloseSubmission_values_check" CHECK ("revision">0 AND "openingBalanceMinor">=0 AND "revenueMinor">=0 AND "expenseMinor">=0 AND "refundMinor">=0 AND "adjustmentMinor">=0 AND "actualCashMinor">=0 AND "unresolvedPaymentCount">=0 AND "varianceMinor"="actualCashMinor"-"expectedCashMinor")
)',id_type,shift_type,center_type,account_type,account_type);
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "FinanceShiftCloseSubmission_one_pending_per_shift_key" ON "FinanceShiftCloseSubmission"("shiftId") WHERE "status"='SUBMITTED';
CREATE INDEX IF NOT EXISTS "FinanceShiftCloseSubmission_center_status_submittedAt_idx" ON "FinanceShiftCloseSubmission"("centerOrgUnitId","status","submittedAt");
CREATE INDEX IF NOT EXISTS "FinanceShiftCloseSubmission_submitter_status_idx" ON "FinanceShiftCloseSubmission"("submittedByAccountId","status");
DO $$ BEGIN ALTER TABLE "FinanceShiftCloseSubmission" ADD CONSTRAINT "FinanceShiftCloseSubmission_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceShiftCloseSubmission" ADD CONSTRAINT "FinanceShiftCloseSubmission_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceShiftCloseSubmission" ADD CONSTRAINT "FinanceShiftCloseSubmission_submittedByAccountId_fkey" FOREIGN KEY ("submittedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceShiftCloseSubmission" ADD CONSTRAINT "FinanceShiftCloseSubmission_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
