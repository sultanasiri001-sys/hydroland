CREATE TABLE "EquipmentRental" (
  "id" TEXT PRIMARY KEY,
  "renterAccountId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "totalHalala" BIGINT NOT NULL DEFAULT 0,
  "invoiceNumber" TEXT NOT NULL UNIQUE,
  "whatsappPhone" TEXT,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "returnedAt" TIMESTAMP(3),
  "createdByAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentRental_status_check" CHECK ("status" IN ('RESERVED','ACTIVE','RETURNED','CANCELLED')),
  CONSTRAINT "EquipmentRental_payment_check" CHECK ("paymentStatus" IN ('PENDING','PAID','REFUNDED'))
);
CREATE INDEX "EquipmentRental_renter_idx" ON "EquipmentRental"("renterAccountId","createdAt" DESC);

CREATE TABLE "EquipmentRentalItem" (
  "id" TEXT PRIMARY KEY,
  "rentalId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "equipmentType" TEXT,
  "size" TEXT,
  "unitPriceHalala" BIGINT NOT NULL DEFAULT 0,
  "assetCodeSnapshot" TEXT NOT NULL,
  "equipmentNameSnapshot" TEXT NOT NULL,
  "serialNumberSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentRentalItem_rental_fk" FOREIGN KEY ("rentalId") REFERENCES "EquipmentRental"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "EquipmentRentalItem_rental_resource_uq" ON "EquipmentRentalItem"("rentalId","resourceId");
CREATE INDEX "EquipmentRentalItem_resource_idx" ON "EquipmentRentalItem"("resourceId");
