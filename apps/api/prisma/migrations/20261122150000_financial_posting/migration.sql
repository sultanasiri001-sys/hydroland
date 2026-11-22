-- CreateTable
CREATE TABLE "LoyaltyMonth" (
    "id" TEXT NOT NULL,
    "capMinor" INTEGER NOT NULL,
    "issuedMinor" INTEGER NOT NULL DEFAULT 0,
    "forecasts" JSONB NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyOffer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "platformBps" INTEGER NOT NULL,
    "platformCap" INTEGER NOT NULL,
    "centerCap" INTEGER NOT NULL,
    "platformSpent" INTEGER NOT NULL DEFAULT 0,
    "centerSpent" INTEGER NOT NULL DEFAULT 0,
    "centerApprovedBy" TEXT NOT NULL,
    "platformApprovedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReservation" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "heldPoints" INTEGER NOT NULL,
    "topUpMinor" INTEGER NOT NULL,
    "platformBonusMinor" INTEGER NOT NULL,
    "centerBonusMinor" INTEGER NOT NULL,
    "topUpEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorEarningPosting" (
    "earningId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "basisMinor" INTEGER NOT NULL,
    "approvedTerms" JSONB NOT NULL,
    "evidence" TEXT NOT NULL,
    "attemptId" TEXT,
    "confirmedReference" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorEarningPosting_pkey" PRIMARY KEY ("earningId")
);

-- CreateTable
CREATE TABLE "InstructorTransferAttempt" (
    "id" TEXT NOT NULL,
    "earningId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "evidenceId" TEXT,

    CONSTRAINT "InstructorTransferAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorRecovery" (
    "id" TEXT NOT NULL,
    "earningId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "settledEntryId" TEXT,
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyOffer_organizationId_platformApprovedBy_idx" ON "LoyaltyOffer"("organizationId", "platformApprovedBy");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReservation_topUpEntryId_key" ON "LoyaltyReservation"("topUpEntryId");

-- CreateIndex
CREATE INDEX "LoyaltyReservation_offerId_status_idx" ON "LoyaltyReservation"("offerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReservation_accountId_requestKey_key" ON "LoyaltyReservation"("accountId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorEarningPosting_attemptId_key" ON "InstructorEarningPosting"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorEarningPosting_confirmedReference_key" ON "InstructorEarningPosting"("confirmedReference");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorTransferAttempt_evidenceId_key" ON "InstructorTransferAttempt"("evidenceId");

-- CreateIndex
CREATE INDEX "InstructorTransferAttempt_earningId_status_idx" ON "InstructorTransferAttempt"("earningId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorRecovery_settledEntryId_key" ON "InstructorRecovery"("settledEntryId");

-- CreateIndex
CREATE INDEX "InstructorRecovery_earningId_idx" ON "InstructorRecovery"("earningId");

-- AddForeignKey
ALTER TABLE "LoyaltyReservation" ADD CONSTRAINT "LoyaltyReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LoyaltyOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorTransferAttempt" ADD CONSTRAINT "InstructorTransferAttempt_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "InstructorEarningPosting"("earningId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorRecovery" ADD CONSTRAINT "InstructorRecovery_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "InstructorEarningPosting"("earningId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LoyaltyMonth" ADD CHECK ("issuedMinor" BETWEEN 0 AND "capMinor");
ALTER TABLE "LoyaltyOffer" ADD CHECK ("priceMinor" >= "pointsCost" AND "pointsCost" > 0
  AND "platformBps" BETWEEN 0 AND 10000 AND "platformSpent" BETWEEN 0 AND "platformCap" AND "centerSpent" BETWEEN 0 AND "centerCap");
ALTER TABLE "LoyaltyReservation" ADD CHECK ("heldPoints" >= 0 AND "topUpMinor" >= 0 AND "platformBonusMinor" >= 0
  AND "centerBonusMinor" >= 0 AND "status" IN ('HELD','AWAITING_PAYMENT','COMPLETED','CANCELLED','PAYMENT_FAILED'));
ALTER TABLE "InstructorTransferAttempt" ADD CHECK ("status" IN ('PROCESSING','FAILED','SETTLED'));
ALTER TABLE "InstructorRecovery" ADD CHECK ("amountMinor" >= 0 AND "stage" IN ('RETAINED','REVERSED','RECOVERY_REQUIRED','RECOVERED'));
