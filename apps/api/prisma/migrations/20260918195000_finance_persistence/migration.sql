CREATE TYPE "FinanceEntryType" AS ENUM ('EXPENSE','SETTLEMENT','ADJUSTMENT');
CREATE TYPE "FinanceEntryStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','POSTED','REJECTED','VOIDED');

CREATE TABLE "FinanceAccount" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceEntry" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "financeAccountId" UUID NOT NULL,
  "type" "FinanceEntryType" NOT NULL,
  "status" "FinanceEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "description" TEXT,
  "requestedByAccountId" UUID NOT NULL,
  "approvedByAccountId" UUID,
  "approvedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceApproval" (
  "id" UUID NOT NULL,
  "financeEntryId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "requestedByAccountId" UUID NOT NULL,
  "decidedByAccountId" UUID,
  "decisionNote" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceAccount_organizationId_active_idx" ON "FinanceAccount"("organizationId","active");
CREATE INDEX "FinanceEntry_organizationId_status_createdAt_idx" ON "FinanceEntry"("organizationId","status","createdAt");
CREATE INDEX "FinanceEntry_referenceType_referenceId_idx" ON "FinanceEntry"("referenceType","referenceId");
CREATE INDEX "FinanceEntry_financeAccountId_status_idx" ON "FinanceEntry"("financeAccountId","status");
CREATE INDEX "FinanceApproval_financeEntryId_status_idx" ON "FinanceApproval"("financeEntryId","status");
CREATE INDEX "FinanceApproval_requestedByAccountId_status_idx" ON "FinanceApproval"("requestedByAccountId","status");
CREATE INDEX "FinanceApproval_decidedByAccountId_status_idx" ON "FinanceApproval"("decidedByAccountId","status");

ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceApproval" ADD CONSTRAINT "FinanceApproval_financeEntryId_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
