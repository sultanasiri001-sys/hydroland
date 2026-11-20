-- Match the physical FK types on historical UUID and newer TEXT deployments.
DO $$
DECLARE account_type text; org_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO STRICT account_type FROM pg_attribute
    WHERE attrelid = '"Account"'::regclass AND attname = 'id' AND NOT attisdropped;
  SELECT format_type(atttypid,atttypmod) INTO STRICT org_type FROM pg_attribute
    WHERE attrelid = '"Organization"'::regclass AND attname = 'id' AND NOT attisdropped;
  IF account_type NOT IN ('text','uuid') OR org_type NOT IN ('text','uuid') THEN
    RAISE EXCEPTION 'Unsupported privacy grievance reference type';
  END IF;
  EXECUTE format('CREATE TABLE "PrivacyGrievance" (
    "id" TEXT PRIMARY KEY, "customerId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "requestKey" TEXT NOT NULL, "organizationId" %s NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "departmentCode" TEXT NOT NULL, "description" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT ''CENTER_PENDING'' CHECK ("state" IN (''CENTER_PENDING'',''CENTER_HANDLING'',''DEPARTMENT_PENDING'',''RESOLVED'')),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "centerAction" TEXT, "escalatedAt" TIMESTAMPTZ(3), "resolvedAt" TIMESTAMPTZ(3), "outcome" TEXT
  )',account_type,org_type);
END $$;
CREATE UNIQUE INDEX "PrivacyGrievance_customerId_requestKey_key" ON "PrivacyGrievance"("customerId","requestKey");
CREATE INDEX "PrivacyGrievance_state_dueAt_idx" ON "PrivacyGrievance"("state","dueAt");
CREATE INDEX "PrivacyGrievance_organizationId_state_idx" ON "PrivacyGrievance"("organizationId","state");
CREATE INDEX "PrivacyGrievance_departmentCode_state_idx" ON "PrivacyGrievance"("departmentCode","state");
