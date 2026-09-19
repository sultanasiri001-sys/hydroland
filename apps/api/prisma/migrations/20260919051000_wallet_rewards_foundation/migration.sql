CREATE TYPE "WalletEntryType" AS ENUM ('CREDIT','DEBIT','REFUND','ADJUSTMENT');
CREATE TYPE "RewardEntryType" AS ENUM ('EARN','REDEEM','EXPIRE','ADJUSTMENT');

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "balanceMinor" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WalletEntry" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "WalletEntryType" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "balanceAfterMinor" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RewardAccount" (
  "id" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RewardEntry" (
  "id" TEXT NOT NULL,
  "rewardAccountId" TEXT NOT NULL,
  "type" "RewardEntryType" NOT NULL,
  "points" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Wallet_accountId_key" ON "Wallet"("accountId");
CREATE UNIQUE INDEX "WalletEntry_idempotencyKey_key" ON "WalletEntry"("idempotencyKey");
CREATE INDEX "WalletEntry_walletId_createdAt_idx" ON "WalletEntry"("walletId","createdAt");
CREATE UNIQUE INDEX "RewardAccount_accountId_key" ON "RewardAccount"("accountId");
CREATE UNIQUE INDEX "RewardEntry_idempotencyKey_key" ON "RewardEntry"("idempotencyKey");
CREATE INDEX "RewardEntry_rewardAccountId_createdAt_idx" ON "RewardEntry"("rewardAccountId","createdAt");
CREATE INDEX "RewardEntry_expiresAt_idx" ON "RewardEntry"("expiresAt");
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardAccount" ADD CONSTRAINT "RewardAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_rewardAccountId_fkey" FOREIGN KEY ("rewardAccountId") REFERENCES "RewardAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
