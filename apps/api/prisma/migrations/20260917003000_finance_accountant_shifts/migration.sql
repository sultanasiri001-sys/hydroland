-- Finance branch-shift controls. Forward-only; no destructive changes.
CREATE TYPE "FinanceShiftStatus" AS ENUM ('OPEN','HANDOVER_PENDING','HANDED_OVER','CLOSED');
CREATE TYPE "FinanceEntryType" AS ENUM ('REVENUE','EXPENSE','REFUND','ADJUSTMENT');
CREATE TYPE "FinanceHandoverStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','REVIEW_REQUIRED');

CREATE TABLE "FinanceAccountantShift" (
  "id" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "accountantAccountId" TEXT NOT NULL,
  "hrShiftAssignmentId" TEXT,
  "status" "FinanceShiftStatus" NOT NULL DEFAULT 'OPEN',
  "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
  "expectedCashMinor" INTEGER NOT NULL DEFAULT 0,
  "actualCashMinor" INTEGER,
  "varianceMinor" INTEGER,
  "varianceReason" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccountantShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceShiftEntry" (
  "id" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL,
  "type" "FinanceEntryType" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "paymentId" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "recordedByAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceShiftEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCashHandover" (
  "id" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "fromShiftId" TEXT NOT NULL,
  "toShiftId" TEXT NOT NULL,
  "fromAccountantAccountId" TEXT NOT NULL,
  "toAccountantAccountId" TEXT NOT NULL,
  "expectedCashMinor" INTEGER NOT NULL,
  "actualCashMinor" INTEGER NOT NULL,
  "varianceMinor" INTEGER NOT NULL DEFAULT 0,
  "varianceReason" TEXT,
  "status" "FinanceHandoverStatus" NOT NULL DEFAULT 'PENDING',
  "acceptedByAccountId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceCashHandover_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceAccountantShift_centerOrgUnitId_status_idx" ON "FinanceAccountantShift"("centerOrgUnitId","status");
CREATE INDEX "FinanceAccountantShift_accountantAccountId_openedAt_idx" ON "FinanceAccountantShift"("accountantAccountId","openedAt");
CREATE UNIQUE INDEX "FinanceAccountantShift_hrShiftAssignmentId_key" ON "FinanceAccountantShift"("hrShiftAssignmentId");
CREATE INDEX "FinanceShiftEntry_shiftId_createdAt_idx" ON "FinanceShiftEntry"("shiftId","createdAt");
CREATE INDEX "FinanceShiftEntry_recordedByAccountId_createdAt_idx" ON "FinanceShiftEntry"("recordedByAccountId","createdAt");
CREATE UNIQUE INDEX "FinanceShiftEntry_paymentId_key" ON "FinanceShiftEntry"("paymentId");
CREATE INDEX "FinanceCashHandover_centerOrgUnitId_status_idx" ON "FinanceCashHandover"("centerOrgUnitId","status");
CREATE INDEX "FinanceCashHandover_fromAccountantAccountId_createdAt_idx" ON "FinanceCashHandover"("fromAccountantAccountId","createdAt");
CREATE INDEX "FinanceCashHandover_toAccountantAccountId_createdAt_idx" ON "FinanceCashHandover"("toAccountantAccountId","createdAt");

ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_accountantAccountId_fkey" FOREIGN KEY ("accountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_hrShiftAssignmentId_fkey" FOREIGN KEY ("hrShiftAssignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_recordedByAccountId_fkey" FOREIGN KEY ("recordedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_fromShiftId_fkey" FOREIGN KEY ("fromShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_toShiftId_fkey" FOREIGN KEY ("toShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_fromAccountantAccountId_fkey" FOREIGN KEY ("fromAccountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_toAccountantAccountId_fkey" FOREIGN KEY ("toAccountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_acceptedByAccountId_fkey" FOREIGN KEY ("acceptedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_amounts_check" CHECK ("openingBalanceMinor" >= 0 AND "expectedCashMinor" >= 0 AND ("actualCashMinor" IS NULL OR "actualCashMinor" >= 0));
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_amount_check" CHECK ("amountMinor" > 0);
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_amounts_check" CHECK ("expectedCashMinor" >= 0 AND "actualCashMinor" >= 0);
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_distinct_accountants_check" CHECK ("fromAccountantAccountId" <> "toAccountantAccountId");
ALTER TABLE "FinanceCashHandover" ADD CONSTRAINT "FinanceCashHandover_distinct_shifts_check" CHECK ("fromShiftId" <> "toShiftId");
