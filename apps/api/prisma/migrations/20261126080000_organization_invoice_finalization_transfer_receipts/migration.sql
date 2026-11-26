-- Additive B12 evidence only. Existing payment contracts and financial history
-- are not rewritten. Textual source IDs support both historical TEXT and UUID.
CREATE TABLE IF NOT EXISTS "OrganizationBookingInvoiceFinalization" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "buyerOrganizationId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "collectionEvidenceId" TEXT NOT NULL,
  "collectionFinanceEntryId" TEXT NOT NULL,
  "contractHash" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "finalizedBy" TEXT NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationBookingInvoiceFinalization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationBookingInvoiceFinalization_paymentId_key" ON "OrganizationBookingInvoiceFinalization"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationBookingInvoiceFinalization_invoiceId_key" ON "OrganizationBookingInvoiceFinalization"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationBookingInvoiceFinalization_sellerId_number_key" ON "OrganizationBookingInvoiceFinalization"("sellerId", "number");
CREATE INDEX IF NOT EXISTS "OrganizationBookingInvoiceFinalization_buyer_finalized_idx" ON "OrganizationBookingInvoiceFinalization"("buyerOrganizationId", "finalizedAt");

CREATE TABLE IF NOT EXISTS "CenterServiceTransferReceipt" (
  "id" TEXT NOT NULL,
  "financeEntryId" TEXT NOT NULL,
  "activeFinanceEntryId" TEXT,
  "organizationId" TEXT NOT NULL,
  "centerOrgUnitId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceFinalizationId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankReference" TEXT NOT NULL,
  "bankReferenceKey" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "transferredAt" TIMESTAMP(3) NOT NULL,
  "document" BYTEA NOT NULL,
  "documentSha256" TEXT NOT NULL,
  "evidenceSnapshot" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "submittedBy" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNote" TEXT,
  "receivedAt" TIMESTAMP(3),
  "receiptDocument" BYTEA,
  "receiptDocumentSha256" TEXT,
  CONSTRAINT "CenterServiceTransferReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CenterServiceTransferReceipt_money_check" CHECK ("amountMinor" > 0 AND "currency" = 'SAR'),
  CONSTRAINT "CenterServiceTransferReceipt_status_check" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'REJECTED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "CenterServiceTransferReceipt_activeFinanceEntryId_key" ON "CenterServiceTransferReceipt"("activeFinanceEntryId");
CREATE INDEX IF NOT EXISTS "CenterServiceTransferReceipt_organizationId_financeEntryId_idx" ON "CenterServiceTransferReceipt"("organizationId", "financeEntryId");
CREATE INDEX IF NOT EXISTS "CenterServiceTransferReceipt_centerOrgUnitId_status_idx" ON "CenterServiceTransferReceipt"("centerOrgUnitId", "status");
CREATE INDEX IF NOT EXISTS "CenterServiceTransferReceipt_bankReferenceKey_idx" ON "CenterServiceTransferReceipt"("bankReferenceKey");
