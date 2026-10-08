-- CANDIDATE ONLY: additive completion after canonical and raw-domain baselines.
-- Preserve existing columns/data and match the installed Organization ID type.
DO $columns$
DECLARE parent_type text;
BEGIN
 SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type
 FROM pg_attribute a WHERE a.attrelid='"Organization"'::regclass AND a.attname='id' AND NOT a.attisdropped;
 IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported Organization ID type: %',parent_type; END IF;
 EXECUTE format('ALTER TABLE "EquipmentBarcode" ADD COLUMN "organizationId" %s',parent_type);
END
$columns$;
ALTER TABLE "EquipmentBarcode" ADD CONSTRAINT "EquipmentBarcode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EquipmentBarcode_organizationId_stockStatus_idx" ON "EquipmentBarcode"("organizationId","stockStatus");
ALTER TABLE "FinanceAccountantShift" ADD COLUMN "reviewedAt" TIMESTAMP(3);
-- Populate legacy synthetic rows from their original offeredAt, preserving request time.
ALTER TABLE "FinanceShiftHandover" ADD COLUMN "requestedAt" TIMESTAMP(3), ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "FinanceShiftHandover" SET "requestedAt"="offeredAt","updatedAt"="createdAt";
ALTER TABLE "FinanceShiftHandover" ALTER COLUMN "requestedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "requestedAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "updatedAt" SET NOT NULL;
-- offeredAt stays available to the current Prisma client. Financial nullability is unchanged.
