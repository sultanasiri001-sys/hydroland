-- Follow the deployed asset key type (canonical TEXT or recovered UUID).
DO $$
DECLARE asset_key_type text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO asset_key_type
  FROM pg_attribute WHERE attrelid='"OrganizationDocumentAsset"'::regclass AND attname='id' AND NOT attisdropped;
  IF asset_key_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported organization asset key type'; END IF;
  EXECUTE format('ALTER TABLE "AdministrativeRecord" ADD COLUMN "licenseAssetId" %s', asset_key_type);
END $$;
ALTER TABLE "AdministrativeRecord"
  ADD COLUMN "licenseIssuedAt" TIMESTAMP(3),
  ADD COLUMN "licenseExpiresAt" TIMESTAMP(3),
  ADD CONSTRAINT "AdministrativeRecord_licenseAssetId_fkey" FOREIGN KEY ("licenseAssetId") REFERENCES "OrganizationDocumentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "AdministrativeRecord_license_dates_check" CHECK (
    ("licenseAssetId" IS NULL AND "licenseIssuedAt" IS NULL AND "licenseExpiresAt" IS NULL) OR
    ("licenseAssetId" IS NOT NULL AND "licenseIssuedAt" IS NOT NULL AND "licenseExpiresAt" IS NOT NULL AND "licenseExpiresAt">"licenseIssuedAt")
  );
