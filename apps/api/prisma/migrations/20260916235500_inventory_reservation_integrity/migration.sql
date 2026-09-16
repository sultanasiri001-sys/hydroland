-- Prevent the same equipment asset from being reserved simultaneously by
-- rental and trip workflows. This is additive and does not rewrite history.

CREATE OR REPLACE FUNCTION "enforce_equipment_reservation_integrity"()
RETURNS trigger AS $$
DECLARE
  rental_due_at timestamp(3);
  rental_reserved_at timestamp(3);
BEGIN
  SELECT "dueAt", "reservedAt"
    INTO rental_due_at, rental_reserved_at
  FROM "EquipmentRental"
  WHERE "id" = NEW."rentalId";

  IF EXISTS (
    SELECT 1
    FROM "EquipmentRentalItem" eri
    JOIN "EquipmentRental" er ON er."id" = eri."rentalId"
    WHERE eri."resourceId" = NEW."resourceId"
      AND eri."rentalId" <> NEW."rentalId"
      AND eri."returnedAt" IS NULL
      AND er."status" IN ('RESERVED', 'ACTIVE')
  ) THEN
    RAISE EXCEPTION 'EQUIPMENT_ALREADY_RESERVED_BY_RENTAL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CalendarAllocation" ca
    WHERE ca."resourceId" = NEW."resourceId"
      AND ca."status" = 'ACTIVE'
      AND ca."startsAt" < COALESCE(rental_due_at, 'infinity'::timestamp)
      AND ca."endsAt" > COALESCE(rental_reserved_at, NOW())
  ) THEN
    RAISE EXCEPTION 'EQUIPMENT_ALREADY_ALLOCATED_TO_TRIP';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "equipment_rental_reservation_integrity" ON "EquipmentRentalItem";
CREATE TRIGGER "equipment_rental_reservation_integrity"
BEFORE INSERT OR UPDATE OF "resourceId", "rentalId"
ON "EquipmentRentalItem"
FOR EACH ROW
EXECUTE FUNCTION "enforce_equipment_reservation_integrity"();
