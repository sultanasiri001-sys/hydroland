CREATE TABLE "AccountInvoiceDocument" (
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "buyerOrganizationId" TEXT,
  "number" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "attachedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("sourceType", "sourceId"),
  CHECK (octet_length("content") BETWEEN 1 AND 5000000)
);
CREATE UNIQUE INDEX "AccountInvoiceDocument_sellerId_number_key" ON "AccountInvoiceDocument" ("sellerId", "number");
