CREATE TABLE "DocumentReferenceCounter" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "department" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentReferenceCounter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentReferenceCounter_organizationId_department_year_key" ON "DocumentReferenceCounter"("organizationId","department","year");
CREATE INDEX "DocumentReferenceCounter_organizationId_year_idx" ON "DocumentReferenceCounter"("organizationId","year");
ALTER TABLE "DocumentReferenceCounter" ADD CONSTRAINT "DocumentReferenceCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
