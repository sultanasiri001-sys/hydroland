CREATE TABLE "CommerceCheckout" (
 "id" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
 "organizationId" TEXT NOT NULL, "customerAccountId" TEXT NOT NULL, "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL,
 "provider" TEXT NOT NULL DEFAULT 'MOYASAR', "idempotencyKey" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL,
 "providerInvoiceId" TEXT, "providerPaymentId" TEXT, "status" TEXT NOT NULL DEFAULT 'RESERVED',
 "contractSnapshot" JSONB NOT NULL, "providerResult" JSONB, "dispatchedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CommerceCheckout_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CommerceCheckout_amount_check" CHECK ("amountMinor" > 0),
 CONSTRAINT "CommerceCheckout_status_check" CHECK ("status" IN ('RESERVED','DISPATCHED','PENDING','CAPTURED','FAILED','CANCELLED','RECONCILIATION_REQUIRED'))
);
CREATE UNIQUE INDEX "CommerceCheckout_idempotencyKey_key" ON "CommerceCheckout"("idempotencyKey");
CREATE UNIQUE INDEX "CommerceCheckout_providerInvoiceId_key" ON "CommerceCheckout"("providerInvoiceId");
CREATE UNIQUE INDEX "CommerceCheckout_providerPaymentId_key" ON "CommerceCheckout"("providerPaymentId");
CREATE UNIQUE INDEX "CommerceCheckout_sourceType_sourceId_key" ON "CommerceCheckout"("sourceType","sourceId");
CREATE INDEX "CommerceCheckout_organizationId_status_createdAt_idx" ON "CommerceCheckout"("organizationId","status","createdAt");
