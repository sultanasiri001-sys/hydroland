-- Finance deferred invoices may be issued before a payment is attached.
-- PostgreSQL UNIQUE permits multiple NULL values, so the existing unique
-- constraint/index on paymentId remains valid after dropping NOT NULL.
ALTER TABLE "Invoice" ALTER COLUMN "paymentId" DROP NOT NULL;
