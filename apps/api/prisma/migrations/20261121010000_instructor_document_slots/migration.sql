DO $migration$
DECLARE account_type text; center_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO STRICT account_type FROM pg_attribute
    WHERE attrelid = '"Account"'::regclass AND attname = 'id' AND NOT attisdropped;
  SELECT format_type(atttypid,atttypmod) INTO STRICT center_type FROM pg_attribute
    WHERE attrelid = '"Organization"'::regclass AND attname = 'id' AND NOT attisdropped;
  IF account_type NOT IN ('text','uuid') OR center_type NOT IN ('text','uuid') THEN
    RAISE EXCEPTION 'Unsupported instructor document reference type';
  END IF;
  EXECUTE format('CREATE TABLE "InstructorDocument" (
  "id" TEXT PRIMARY KEY,
  "accountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "centerId" %s NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN (''NATIONAL_LICENSE'',''PROFESSIONAL_LICENSE'',''MEDICAL_EXAM'',''LIABILITY_WAIVER'')),
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "status" TEXT NOT NULL DEFAULT ''CENTER_PENDING'' CHECK ("status" IN (''CENTER_PENDING'',''PLATFORM_PENDING'',''RETURNED'',''APPROVED'')),
  "storageKey" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "centerReviewerId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
)', account_type, center_type);
END
$migration$;
CREATE UNIQUE INDEX "InstructorDocument_storageKey_key" ON "InstructorDocument" ("storageKey");
CREATE UNIQUE INDEX "InstructorDocument_accountId_kind_revision_key" ON "InstructorDocument" ("accountId","kind","revision");
CREATE INDEX "InstructorDocument_centerId_status_idx" ON "InstructorDocument" ("centerId","status");
CREATE INDEX "InstructorDocument_status_updatedAt_idx" ON "InstructorDocument" ("status","updatedAt");
