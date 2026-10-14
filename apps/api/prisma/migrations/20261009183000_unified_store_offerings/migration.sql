-- Additive migration: match the deployed Organization key type (TEXT in clean
-- Prisma databases, UUID in older production databases).
CREATE TYPE "StoreProductKind" AS ENUM ('GOODS', 'SERVICE');
ALTER TABLE "StoreProduct" ADD COLUMN "kind" "StoreProductKind" NOT NULL DEFAULT 'GOODS';
DO $$
DECLARE key_type TEXT;
BEGIN
 SELECT format_type(a.atttypid, a.atttypmod) INTO key_type
 FROM pg_attribute a WHERE a.attrelid='"Organization"'::regclass AND a.attname='id';
 EXECUTE format('ALTER TABLE "StoreProduct" ADD COLUMN "organizationId" %s', key_type);
 EXECUTE format('CREATE TABLE "StoreCourseOffer" (
   "id" TEXT PRIMARY KEY, "organizationId" %s NOT NULL,
   "courseCode" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
   "locationName" TEXT NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL,
   "endsAt" TIMESTAMP(3) NOT NULL, "capacity" INTEGER NOT NULL,
   "priceMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT ''SAR'',
   "status" "StoreProductStatus" NOT NULL DEFAULT ''DRAFT'',
   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
   "updatedAt" TIMESTAMP(3) NOT NULL,
   CONSTRAINT "StoreCourseOffer_capacity_check" CHECK ("capacity">0),
   CONSTRAINT "StoreCourseOffer_price_check" CHECK ("priceMinor">=0),
   CONSTRAINT "StoreCourseOffer_dates_check" CHECK ("endsAt">"startsAt")
 )', key_type);
END $$;
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_organizationId_fkey"
 FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StoreCourseOffer" ADD CONSTRAINT "StoreCourseOffer_organizationId_fkey"
 FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingEnrollment" ADD COLUMN "storeCourseOfferId" TEXT;
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_storeCourseOfferId_fkey"
 FOREIGN KEY ("storeCourseOfferId") REFERENCES "StoreCourseOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "StoreProduct_organizationId_status_idx" ON "StoreProduct"("organizationId","status");
CREATE INDEX "StoreCourseOffer_organizationId_status_idx" ON "StoreCourseOffer"("organizationId","status");
CREATE INDEX "StoreCourseOffer_status_startsAt_idx" ON "StoreCourseOffer"("status","startsAt");
CREATE INDEX "TrainingEnrollment_storeOffer_student_status_idx"
 ON "TrainingEnrollment"("storeCourseOfferId","studentAccountId","status");
