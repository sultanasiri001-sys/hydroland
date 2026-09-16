-- Finance accountant shifts: additive/forward-only migration.
-- Keeps canonical Payment/Invoice untouched and attributes branch cash operations to an isolated accountant shift.

CREATE TYPE "FinanceShiftStatus" AS ENUM ('OPEN', 'HANDOVER_PENDING', 'HANDED_OVER', 'CLOSED');
CREATE TYPE "FinanceEntryType" AS ENUM ('REVENUE', 'EXPENSE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "FinanceHandoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "FinanceAccountantShift" (
  "id" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "accountantAccountId" TEXT NOT NULL,
  "status" "FinanceShiftStatus" NOT NULL DEFAULT 'OPEN',
  "openingBalanceMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "reviewedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccountantShift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceAccountantShift_opening_nonnegative" CHECK ("openingBalanceMinor" >= 0)
);

CREATE TABLE "FinanceShiftEntry" (
  "id" TEXT NOT NULL,
  "shiftId" TEXT NOT NULL,
  "type" "FinanceEntryType" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "paymentId" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "description" TEXT,
  "recordedByAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceShiftEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceShiftEntry_amount_positive" CHECK ("amountMinor" > 0)
);

CREATE TABLE "FinanceShiftHandover" (
  "id" TEXT NOT NULL,
  "fromShiftId" TEXT NOT NULL,
  "toShiftId" TEXT NOT NULL,
  "fromAccountantId" TEXT NOT NULL,
  "toAccountantId" TEXT NOT NULL,
  "expectedCashMinor" INTEGER NOT NULL,
  "actualCashMinor" INTEGER NOT NULL,
  "varianceMinor" INTEGER NOT NULL,
  "varianceReason" TEXT,
  "status" "FinanceHandoverStatus" NOT NULL DEFAULT 'PENDING',
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceShiftHandover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinanceShiftHandover_distinct_accounts" CHECK ("fromAccountantId" <> "toAccountantId"),
  CONSTRAINT "FinanceShiftHandover_distinct_shifts" CHECK ("fromShiftId" <> "toShiftId"),
  CONSTRAINT "FinanceShiftHandover_cash_nonnegative" CHECK ("expectedCashMinor" >= 0 AND "actualCashMinor" >= 0),
  CONSTRAINT "FinanceShiftHandover_variance_consistent" CHECK ("varianceMinor" = "actualCashMinor" - "expectedCashMinor")
);

CREATE INDEX "FinanceAccountantShift_center_status_idx" ON "FinanceAccountantShift"("centerOrgUnitId", "status");
CREATE INDEX "FinanceAccountantShift_accountant_status_idx" ON "FinanceAccountantShift"("accountantAccountId", "status");
CREATE INDEX "FinanceShiftEntry_shift_created_idx" ON "FinanceShiftEntry"("shiftId", "createdAt");
CREATE INDEX "FinanceShiftEntry_payment_idx" ON "FinanceShiftEntry"("paymentId");
CREATE INDEX "FinanceShiftHandover_from_status_idx" ON "FinanceShiftHandover"("fromShiftId", "status");
CREATE INDEX "FinanceShiftHandover_to_status_idx" ON "FinanceShiftHandover"("toShiftId", "status");

ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_center_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_accountant_fkey" FOREIGN KEY ("accountantAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAccountantShift" ADD CONSTRAINT "FinanceAccountantShift_reviewer_fkey" FOREIGN KEY ("reviewedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_shift_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_payment_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftEntry" ADD CONSTRAINT "FinanceShiftEntry_recorded_by_fkey" FOREIGN KEY ("recordedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_from_shift_fkey" FOREIGN KEY ("fromShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_to_shift_fkey" FOREIGN KEY ("toShiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_from_account_fkey" FOREIGN KEY ("fromAccountantId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceShiftHandover" ADD CONSTRAINT "FinanceShiftHandover_to_account_fkey" FOREIGN KEY ("toAccountantId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One accountant cannot have two simultaneous OPEN/HANDOVER_PENDING shifts in the same center.
CREATE UNIQUE INDEX "FinanceAccountantShift_one_active_per_account_center"
ON "FinanceAccountantShift"("centerOrgUnitId", "accountantAccountId")
WHERE "status" IN ('OPEN', 'HANDOVER_PENDING');

-- A canonical payment can be attributed only once to a shift entry when paymentId is present.
CREATE UNIQUE INDEX "FinanceShiftEntry_payment_unique"
ON "FinanceShiftEntry"("paymentId")
WHERE "paymentId" IS NOT NULL;
