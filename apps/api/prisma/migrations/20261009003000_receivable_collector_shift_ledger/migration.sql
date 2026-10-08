ALTER TABLE "ReceivablePayment" ADD COLUMN IF NOT EXISTS "shiftId" UUID;
ALTER TABLE "ReceivablePayment" ADD COLUMN IF NOT EXISTS "collectedByAccountId" UUID;
DO $$ BEGIN ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "FinanceAccountantShift"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_collectedByAccountId_fkey" FOREIGN KEY ("collectedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "ReceivablePayment_shiftId_collectedAt_idx" ON "ReceivablePayment"("shiftId","collectedAt");
