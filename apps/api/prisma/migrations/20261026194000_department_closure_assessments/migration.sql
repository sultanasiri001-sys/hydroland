-- Additive only; no seeded assessments, decisions, participants or grants.
-- Deployed historical databases may use UUID keys while the canonical schema
-- uses TEXT. Keep each new FK column identical to the referenced key type.
DO $$
DECLARE organization_key_type text; account_key_type text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO organization_key_type FROM pg_attribute
    WHERE attrelid = '"Organization"'::regclass AND attname = 'id' AND NOT attisdropped;
  SELECT format_type(atttypid, atttypmod) INTO account_key_type FROM pg_attribute
    WHERE attrelid = '"Account"'::regclass AND attname = 'id' AND NOT attisdropped;
  IF organization_key_type NOT IN ('text','uuid') OR account_key_type NOT IN ('text','uuid') THEN
    RAISE EXCEPTION 'Unsupported department assessment reference key type';
  END IF;
  EXECUTE format('CREATE TABLE "DepartmentClosureAssessment" (
    "id" TEXT PRIMARY KEY, "organizationId" %s NOT NULL, "department" TEXT NOT NULL,
    "revision" INTEGER NOT NULL CHECK ("revision" > 0),
    "policyVersion" TEXT NOT NULL, "specificationVersion" TEXT NOT NULL,
    "state" TEXT NOT NULL, "gates" JSONB NOT NULL,
    "sourceDigest" TEXT NOT NULL, "authorityDigest" TEXT NOT NULL,
    "createdByAccountId" %s NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordDigest" TEXT NOT NULL, "previousAssessmentId" TEXT,
    CONSTRAINT "DepartmentClosureAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DepartmentClosureAssessment_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )', organization_key_type, account_key_type);
END $$;
CREATE UNIQUE INDEX "DepartmentClosureAssessment_organizationId_department_revision_key" ON "DepartmentClosureAssessment"("organizationId", "department", "revision");
CREATE INDEX "DepartmentClosureAssessment_organizationId_department_createdAt_idx" ON "DepartmentClosureAssessment"("organizationId", "department", "createdAt");
