-- Additive snapshot on the canonical HR contract; existing evidence references remain unchanged.
ALTER TABLE "EmploymentContract" ADD COLUMN "librarySnapshot" JSONB;
