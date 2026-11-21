CREATE TABLE "RentalDamageClaim" (
  "id" TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL UNIQUE REFERENCES "EquipmentRentalItem"("id") ON DELETE RESTRICT,
  "organizationId" TEXT NOT NULL,
  "customerAccountId" TEXT NOT NULL,
  "submittedBy" TEXT NOT NULL,
  "handoverReceiptId" TEXT NOT NULL,
  "returnReceiptId" TEXT NOT NULL UNIQUE,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
  "currency" TEXT NOT NULL CHECK ("currency" = 'SAR'),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('ESTIMATE','REPAIR_INVOICE')),
  "pdf" BYTEA NOT NULL CHECK (octet_length("pdf") BETWEEN 5 AND 10000000),
  "sha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_RENTER'
    CHECK ("status" IN ('AWAITING_RENTER','DISPUTED','PAYABLE','DISMISSED','COLLECTED')),
  "disputeReason" TEXT,
  "reviewReason" TEXT,
  "reviewedBy" TEXT,
  "payableAt" TIMESTAMP(3),
  "activeCheckoutId" TEXT UNIQUE REFERENCES "CommerceCheckout"("id") ON DELETE RESTRICT,
  "financeEntryId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("status" IN ('PAYABLE','COLLECTED')) = ("payableAt" IS NOT NULL)),
  CHECK (("status" = 'COLLECTED') = ("financeEntryId" IS NOT NULL))
);
CREATE INDEX "RentalDamageClaim_center" ON "RentalDamageClaim"("organizationId","status");
