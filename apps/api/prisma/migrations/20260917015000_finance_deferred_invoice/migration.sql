-- Finance L2: a deferred invoice may exist before any payment is collected.
-- Forward-only and backward compatible: existing payment-linked invoices remain unchanged.
ALTER TABLE "Invoice" ALTER COLUMN "paymentId" DROP NOT NULL;
