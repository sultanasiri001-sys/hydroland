-- Match deployed Account keys without rewriting historical migrations.
DO $$
DECLARE account_key_type text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO account_key_type
  FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF account_key_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported account key type'; END IF;
  EXECUTE format('ALTER TABLE "AdministrativeRecord" ADD COLUMN "licenseReviewSubmittedById" %s, ADD COLUMN "licenseReviewDecidedById" %s', account_key_type, account_key_type);
END $$;
ALTER TABLE "AdministrativeRecord"
 ADD COLUMN "licenseReviewStatus" TEXT,
 ADD COLUMN "licenseReviewSubmittedAt" TIMESTAMP(3),
 ADD COLUMN "licenseReviewDecidedAt" TIMESTAMP(3),
 ADD COLUMN "licenseReviewReason" TEXT,
 ADD CONSTRAINT "AdministrativeRecord_licenseReviewSubmittedById_fkey" FOREIGN KEY ("licenseReviewSubmittedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT "AdministrativeRecord_licenseReviewDecidedById_fkey" FOREIGN KEY ("licenseReviewDecidedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT "AdministrativeRecord_license_review_check" CHECK (
  ("licenseReviewStatus" IS NULL AND "licenseReviewSubmittedAt" IS NULL AND "licenseReviewSubmittedById" IS NULL AND "licenseReviewDecidedAt" IS NULL AND "licenseReviewDecidedById" IS NULL AND "licenseReviewReason" IS NULL) OR
  ("licenseReviewStatus" IS NOT NULL AND "licenseReviewStatus" IN ('PENDING','APPROVED','REJECTED') AND "licenseReviewSubmittedAt" IS NOT NULL AND "licenseReviewSubmittedById" IS NOT NULL AND
   (("licenseReviewStatus"='PENDING' AND "licenseReviewDecidedAt" IS NULL AND "licenseReviewDecidedById" IS NULL AND "licenseReviewReason" IS NULL) OR
    ("licenseReviewStatus" IN ('APPROVED','REJECTED') AND "licenseReviewDecidedAt" IS NOT NULL AND "licenseReviewDecidedById" IS NOT NULL AND "licenseReviewDecidedById"<>"licenseReviewSubmittedById" AND
     ("licenseReviewStatus"='APPROVED' OR ("licenseReviewReason" IS NOT NULL AND length(trim("licenseReviewReason"))>=5)))))
 );
CREATE INDEX "CenterLicense_platform_review_queue_idx" ON "AdministrativeRecord"("licenseReviewStatus","licenseReviewSubmittedAt");
