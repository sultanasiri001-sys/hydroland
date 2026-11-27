-- Existing assets keep their recorded identity; a hull number is not inferred
-- from a registration number or required retroactively.
ALTER TABLE "MarineAsset" ADD COLUMN "hullNumber" TEXT;
CREATE UNIQUE INDEX "MarineAsset_hullNumber_key" ON "MarineAsset"("hullNumber");
