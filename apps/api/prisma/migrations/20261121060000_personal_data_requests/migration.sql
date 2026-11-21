DO $$
DECLARE account_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO STRICT account_type
  FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF account_type NOT IN ('text','uuid') THEN
    RAISE EXCEPTION 'Unsupported Account key type';
  END IF;
  EXECUTE format('CREATE TABLE "PersonalDataRequest" (
    "id" TEXT PRIMARY KEY,
    "accountId" %s NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "requestKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL CHECK ("kind" IN (''CORRECTION'',''ERASURE'')),
    "domain" TEXT NOT NULL CHECK ("domain" IN (''ACCOUNT'',''BOOKINGS'',''PAYMENTS'',''SENT_MESSAGES'')),
    "recordRef" TEXT,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT ''RECEIVED'',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )', account_type);
END $$;
CREATE UNIQUE INDEX "PersonalDataRequest_accountId_requestKey_key" ON "PersonalDataRequest"("accountId","requestKey");
CREATE INDEX "PersonalDataRequest_accountId_createdAt_id_idx" ON "PersonalDataRequest"("accountId","createdAt","id");
