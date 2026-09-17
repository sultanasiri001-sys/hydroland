-- Canonical Finance accountant-shift schema for production reconciliation.
-- This is the only accountant-shift migration introduced on the reconciliation branch.

CREATE TYPE "FinanceShiftStatus" AS ENUM ('OPEN', 'HANDOVER_PENDING', 'HANDED_OVER', 'CLOSED');
CREATE TYPE "FinanceEntryType" AS ENUM ('REVENUE', 'EXPENSE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "FinanceHandoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "FinanceAccountantShift" (
  "id" UUID NOT NULL,
  "accountantAccountId" UUID NOT NULL,
  "centerOrgUnitId" UUID NOT NULL,
  "status" "FinanceShiftStatus" NOT NULL DEFAULT 'OPEN',
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedByAccountId" UUID,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccountantShift_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceShiftEntry" (
  "id" UUID NOT NULL,
  "shiftId" UUID NOT NULL,
  "type" "FinanceEntryType" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "paymentId" UUID,
  "referenceType" TEXT,
  "referenceId" UUID,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceShiftEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceShiftHandover" (
  "id" UUID NOT NULL,
  "fromShiftId" UUID NOT NULL,
  "toShiftId" UUID NOT NULL,
  "fromAccountantAccountId" UUID NOT NULL,
  "toAccountantAccountId" UUID NOT NULL,
  "status" "FinanceHandoverStatus" NOT NULL DEFAULT 'PENDING',
  "expectedCashMinor" INTEGER NOT NULL,
  "actualCashMinor" INTEGER,
  "varianceMinor" INTEGER,
  "varianceReason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceShiftHandover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceAccountantShift_active_accountant_center_key"
ON "FinanceAccountantShift"("accountantAccountId", "centerOrgUnitId")
WHERE "status" IN ('OPEN', 'HANDOVER_PENDING');
CREATE INDEX "FinanceAccountantShift_center_status_idx" ON "FinanceAccountantShift"("centerOrgUnitId", "status");
CREATE INDEX "FinanceAccountantShift_accountant_status_idx" ON "FinanceAccountantShift"("accountantAccountId", "status");
CREATE UNIQUE INDEX "FinanceShiftEntry_paymentId_key" ON "FinanceShiftEntry"("paymentId") WHERE "paymentId" IS NOT NULL;
CREATE INDEX "FinanceShiftEntry_shift_createdAt_idx" ON "FinanceShiftEntry"("shiftId", "createdAt");
CREATE INDEX "FinanceShiftEntry_reference_idx" ON "FinanceShiftEntry"("referenceType", "referenceId");
CREATE UNIQUE INDEX "FinanceShiftHandover_pending_fromShift_key" ON "FinanceShiftHandover"("fromShiftId") WHERE "status" = 'PENDING';
CREATE INDEX "FinanceShiftHandover_toShift_status_idx" ON "FinanceShiftHandover"("toShiftId", "status");
CREATE INDEX "FinanceShiftHandover_receiver_status_idx" ON "FinanceShiftHandover"("toAccountantAccountId", "status");

ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_accountantAccountId_fkey" FOREIGN KEY ("accountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_reviewedByAccountId_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_fromShiftId_fkey" FOREIGN KEY ("fromShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_toShiftId_fkey" FOREIGN KEY ("toShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_fromAccountantAccountId_fkey" FOREIGN KEY ("fromAccountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_toAccountantAccountId_fkey" FOREIGN KEY ("toAccountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_openingBalance_nonnegative" CHECK ("openingBalanceMinor" >= 0);
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_expectedCash_nonnegative" CHECK ("expectedCashMinor" >= 0);
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_actualCash_nonnegative" CHECK ("actualCashMinor" IS NULL OR "actualCashMinor" >= 0);
