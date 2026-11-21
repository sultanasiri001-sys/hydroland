CREATE TABLE "CheckoutRefund" (
  "id" TEXT PRIMARY KEY, "checkoutId" TEXT NOT NULL REFERENCES "CommerceCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "claimId" TEXT NOT NULL UNIQUE, "financeEntryId" TEXT NOT NULL UNIQUE, "executorId" TEXT NOT NULL, "approverId" TEXT NOT NULL,
  "preparerId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "originalAmountMinor" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL, "baselineMinor" INTEGER NOT NULL,
  "providerPaymentId" TEXT NOT NULL, "providerInvoiceId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "providerResult" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "postedAt" TIMESTAMP(3),
  CHECK ("amountMinor">0 AND "baselineMinor">=0 AND "baselineMinor"::bigint+"amountMinor"<="originalAmountMinor"),
  CHECK ("executorId"<>"approverId" AND "executorId"<>"preparerId" AND "preparerId"<>"approverId"),
  CHECK ("status" IN ('DISPATCHED','RECONCILIATION_REQUIRED','POSTED'))
);
DO $$ BEGIN
 IF (SELECT atttypid = 'uuid'::regtype FROM pg_attribute WHERE attrelid='"FinanceEntry"'::regclass AND attname='id') THEN
  ALTER TABLE "CheckoutRefund" ALTER COLUMN "financeEntryId" TYPE uuid USING "financeEntryId"::uuid;
 END IF;
END $$;
ALTER TABLE "CheckoutRefund" ADD FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CheckoutRefund_checkoutId_status_idx" ON "CheckoutRefund"("checkoutId","status");
CREATE UNIQUE INDEX "CheckoutRefund_one_unsettled" ON "CheckoutRefund"("checkoutId") WHERE "status"<>'POSTED';
