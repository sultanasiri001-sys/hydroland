DO $$ BEGIN CREATE TYPE "FinanceSettlementImportStatus" AS ENUM ('SUBMITTED','APPROVED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "moyasarPaymentId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_moyasarPaymentId_key" ON "Payment"("moyasarPaymentId");

DO $$ DECLARE center_type TEXT; account_type TEXT; BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO center_type FROM pg_attribute a WHERE a.attrelid='"OrgUnit"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  SELECT format_type(a.atttypid,a.atttypmod) INTO account_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  EXECUTE format('CREATE TABLE IF NOT EXISTS "FinanceSettlementImport" (
    "id" %1$s PRIMARY KEY,
    "centerOrgUnitId" %1$s NOT NULL,
    "providerSettlementId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "grossAmountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "matchedLineCount" INTEGER NOT NULL,
    "mismatchedLineCount" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "status" "FinanceSettlementImportStatus" NOT NULL DEFAULT ''SUBMITTED'',
    "importedByAccountId" %2$s NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "FinanceSettlementImport_center_settlement_hash_key" UNIQUE ("centerOrgUnitId","providerSettlementId","contentHash"),
    CONSTRAINT "FinanceSettlementImport_values_check" CHECK ("grossAmountMinor">=0 AND "matchedLineCount">=0 AND "mismatchedLineCount">=0 AND length("providerSettlementId") BETWEEN 1 AND 100 AND length("contentHash")=64)
  )',center_type,account_type);
  EXECUTE format('CREATE TABLE IF NOT EXISTS "FinanceSettlementReview" (
    "id" %2$s PRIMARY KEY,
    "importId" %1$s NOT NULL,
    "reviewerAccountId" %2$s NOT NULL,
    "decision" "FinancePeriodCloseApprovalDecision" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceSettlementReview_import_reviewer_key" UNIQUE ("importId","reviewerAccountId"),
    CONSTRAINT "FinanceSettlementReview_note_check" CHECK ("note" IS NULL OR length("note")<=1000)
  )',center_type,account_type);
END $$;

CREATE INDEX IF NOT EXISTS "FinanceSettlementImport_center_status_submittedAt_idx" ON "FinanceSettlementImport"("centerOrgUnitId","status","submittedAt");
CREATE INDEX IF NOT EXISTS "FinanceSettlementImport_importer_status_idx" ON "FinanceSettlementImport"("importedByAccountId","status");
CREATE INDEX IF NOT EXISTS "FinanceSettlementReview_reviewer_decision_createdAt_idx" ON "FinanceSettlementReview"("reviewerAccountId","decision","createdAt");
DO $$ BEGIN ALTER TABLE "FinanceSettlementImport" ADD CONSTRAINT "FinanceSettlementImport_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlementImport" ADD CONSTRAINT "FinanceSettlementImport_importedByAccountId_fkey" FOREIGN KEY ("importedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlementReview" ADD CONSTRAINT "FinanceSettlementReview_importId_fkey" FOREIGN KEY ("importId") REFERENCES "FinanceSettlementImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinanceSettlementReview" ADD CONSTRAINT "FinanceSettlementReview_reviewerAccountId_fkey" FOREIGN KEY ("reviewerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
