CREATE TABLE "StorePayment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "idempotencyKey" TEXT NOT NULL,
  "providerReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorePayment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StoreInvoice" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StorePayment_orderId_key" ON "StorePayment"("orderId");
CREATE UNIQUE INDEX "StorePayment_idempotencyKey_key" ON "StorePayment"("idempotencyKey");
CREATE UNIQUE INDEX "StorePayment_providerReference_key" ON "StorePayment"("providerReference");
CREATE INDEX "StorePayment_accountId_status_idx" ON "StorePayment"("accountId","status");
CREATE UNIQUE INDEX "StoreInvoice_paymentId_key" ON "StoreInvoice"("paymentId");
CREATE UNIQUE INDEX "StoreInvoice_number_key" ON "StoreInvoice"("number");
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreInvoice" ADD CONSTRAINT "StoreInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StorePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
