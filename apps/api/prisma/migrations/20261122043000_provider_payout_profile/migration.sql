-- The account key is UUID on older deployments and text on fresh databases.
DO $$
DECLARE account_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO STRICT account_type
    FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  EXECUTE format('CREATE TABLE "ProviderPayoutProfile" (
    "accountId" %s PRIMARY KEY REFERENCES "Account"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "contactEmail" TEXT, holder TEXT, "encryptedIban" TEXT, "lastFour" TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    CHECK (("encryptedIban" IS NULL AND holder IS NULL AND "lastFour" IS NULL) OR
      ("encryptedIban" IS NOT NULL AND holder IS NOT NULL AND "lastFour" IS NOT NULL AND length("lastFour")=4)))',account_type);
END $$;
