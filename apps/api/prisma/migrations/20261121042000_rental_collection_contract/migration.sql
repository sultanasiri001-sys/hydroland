-- Nullable only for existing rentals. Do not fabricate an original handover
-- date, issuer, acceptance or cancellation agreement for a legacy reservation.
ALTER TABLE "EquipmentRental" ADD COLUMN "scheduledHandoverAt" TIMESTAMP(3);
ALTER TABLE "EquipmentRental" ADD COLUMN "contractSnapshot" JSONB;
ALTER TABLE "EquipmentRental" ADD CONSTRAINT "EquipmentRental_contract_pair_check"
  CHECK (("scheduledHandoverAt" IS NULL AND "contractSnapshot" IS NULL)
    OR ("scheduledHandoverAt" IS NOT NULL AND "contractSnapshot" IS NOT NULL
      AND jsonb_typeof("contractSnapshot")='object' AND "scheduledHandoverAt">"reservedAt"
      AND "dueAt" IS NOT NULL AND "scheduledHandoverAt"<"dueAt"));
