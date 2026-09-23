ALTER TABLE "Organization"
ADD COLUMN "documentLogoUrl" TEXT,
ADD COLUMN "documentBrandNameAr" TEXT,
ADD COLUMN "documentBrandNameEn" TEXT,
ADD COLUMN "documentFooterAr" TEXT,
ADD COLUMN "documentFooterEn" TEXT,
ADD COLUMN "documentBrandVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "DocumentBrandSnapshot" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandVersion" INTEGER NOT NULL,
  "logoUrl" TEXT,
  "brandNameAr" TEXT,
  "brandNameEn" TEXT,
  "footerAr" TEXT,
  "footerEn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentBrandSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentBrandSnapshot_organizationId_brandVersion_key"
ON "DocumentBrandSnapshot"("organizationId","brandVersion");

CREATE INDEX "DocumentBrandSnapshot_organizationId_createdAt_idx"
ON "DocumentBrandSnapshot"("organizationId","createdAt");

ALTER TABLE "DocumentBrandSnapshot"
ADD CONSTRAINT "DocumentBrandSnapshot_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "DocumentBrandSnapshot" (
  "id","organizationId","brandVersion","brandNameAr","brandNameEn","createdAt"
)
SELECT gen_random_uuid()::text, "id", 1, "displayName", "displayName", CURRENT_TIMESTAMP
FROM "Organization";

ALTER TABLE "ManagedDocument"
ADD COLUMN "documentBrandVersion" INTEGER;

UPDATE "ManagedDocument" d
SET "documentBrandVersion" = o."documentBrandVersion"
FROM "Organization" o
WHERE d."organizationId" = o."id";
