-- Finance L2 receivables: additive/forward-only persistence for deferred/partial invoices.
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN','PARTIALLY_PAID','PAID','OVERDUE');
CREATE TYPE "ReceivableInstallmentStatus" AS ENUM ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');

CREATE TABLE "Receivable" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "totalMinor" INTEGER NOT NULL,
  "paidMinor" INTEGER NOT NULL DEFAULT 0,
  "outstandingMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "creditLimitMinor" INTEGER,
  "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Receivable_invoice_key" UNIQUE ("invoiceId"),
  CONSTRAINT "Receivable_amounts_valid" CHECK ("totalMinor" > 0 AND "paidMinor" >= 0 AND "outstandingMinor" >= 0 AND "paidMinor" + "outstandingMinor" = "totalMinor"),
  CONSTRAINT "Receivable_credit_limit_valid" CHECK ("creditLimitMinor" IS NULL OR "creditLimitMinor" >= 0)
);

CREATE TABLE "ReceivableInstallment" (
  "id" TEXT NOT NULL,
  "receivableId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "paidMinor" INTEGER NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "ReceivableInstallmentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceivableInstallment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceivableInstallment_amounts_valid" CHECK ("amountMinor" > 0 AND "paidMinor" >= 0 AND "paidMinor" <= "amountMinor"),
  CONSTRAINT "ReceivableInstallment_sequence_positive" CHECK ("sequence" > 0),
  CONSTRAINT "ReceivableInstallment_receivable_sequence_key" UNIQUE ("receivableId","sequence")
);

CREATE TABLE "ReceivablePayment" (
  "id" TEXT NOT NULL,
  "receivableId" TEXT NOT NULL,
  "installmentId" TEXT,
  "paymentId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReceivablePayment_payment_key" UNIQUE ("paymentId"),
  CONSTRAINT "ReceivablePayment_receipt_key" UNIQUE ("receiptNumber"),
  CONSTRAINT "ReceivablePayment_amount_positive" CHECK ("amountMinor" > 0)
);

CREATE INDEX "Receivable_center_status_due_idx" ON "Receivable"("centerOrgUnitId","status","dueAt");
CREATE INDEX "Receivable_customer_status_idx" ON "Receivable"("customerAccountId","status");
CREATE INDEX "ReceivableInstallment_due_status_idx" ON "ReceivableInstallment"("dueAt","status");
CREATE INDEX "ReceivablePayment_receivable_collected_idx" ON "ReceivablePayment"("receivableId","collectedAt");

ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_invoice_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_customer_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_center_fkey" FOREIGN KEY ("centerOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceivableInstallment" ADD CONSTRAINT "ReceivableInstallment_receivable_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_receivable_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_installment_fkey" FOREIGN KEY ("installmentId") REFERENCES "ReceivableInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_payment_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
