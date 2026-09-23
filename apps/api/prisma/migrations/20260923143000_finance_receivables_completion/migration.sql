DO $$ BEGIN
 CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN','PARTIALLY_PAID','PAID','OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 CREATE TYPE "ReceivableInstallmentStatus" AS ENUM ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "Receivable" ("id" UUID PRIMARY KEY,"invoiceId" UUID NOT NULL,"customerAccountId" UUID NOT NULL,"centerOrgUnitId" UUID NOT NULL,"totalMinor" INTEGER NOT NULL,"paidMinor" INTEGER NOT NULL DEFAULT 0,"outstandingMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'SAR',"dueAt" TIMESTAMP(3) NOT NULL,"creditLimitMinor" INTEGER,"status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "Receivable_invoiceId_key" ON "Receivable"("invoiceId");
CREATE INDEX IF NOT EXISTS "Receivable_centerOrgUnitId_status_dueAt_idx" ON "Receivable"("centerOrgUnitId","status","dueAt");
CREATE INDEX IF NOT EXISTS "Receivable_customerAccountId_status_idx" ON "Receivable"("customerAccountId","status");
CREATE TABLE IF NOT EXISTS "ReceivableInstallment" ("id" UUID PRIMARY KEY,"receivableId" UUID NOT NULL,"sequence" INTEGER NOT NULL,"amountMinor" INTEGER NOT NULL,"paidMinor" INTEGER NOT NULL DEFAULT 0,"dueAt" TIMESTAMP(3) NOT NULL,"status" "ReceivableInstallmentStatus" NOT NULL DEFAULT 'PENDING',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "ReceivableInstallment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "ReceivableInstallment_receivableId_sequence_key" ON "ReceivableInstallment"("receivableId","sequence");
CREATE INDEX IF NOT EXISTS "ReceivableInstallment_dueAt_status_idx" ON "ReceivableInstallment"("dueAt","status");
CREATE TABLE IF NOT EXISTS "ReceivablePayment" ("id" UUID PRIMARY KEY,"receivableId" UUID NOT NULL,"installmentId" UUID,"paymentId" UUID NOT NULL,"amountMinor" INTEGER NOT NULL,"receiptNumber" TEXT NOT NULL,"collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ReceivablePayment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE,CONSTRAINT "ReceivablePayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ReceivableInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "ReceivablePayment_paymentId_key" ON "ReceivablePayment"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReceivablePayment_receiptNumber_key" ON "ReceivablePayment"("receiptNumber");
CREATE INDEX IF NOT EXISTS "ReceivablePayment_receivableId_collectedAt_idx" ON "ReceivablePayment"("receivableId","collectedAt");
DO $$ BEGIN ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_centerOrgUnitId_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_amounts_check" CHECK ("totalMinor">0 AND "paidMinor">=0 AND "outstandingMinor">=0 AND "paidMinor"+"outstandingMinor"="totalMinor");
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_amounts_check" CHECK ("amountMinor">0 AND "paidMinor">=0 AND "paidMinor"<="amountMinor");
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_amount_check" CHECK ("amountMinor">0);
