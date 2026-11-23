BEGIN;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "pushTokenHash" TEXT,
                      ADD COLUMN IF NOT EXISTS "pushTokenCiphertext" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Session_pushTokenHash_key" ON "Session" ("pushTokenHash");
-- Logout, rotation, administrator revocation and password reset use the same session table.
CREATE FUNCTION hl_forget_revoked_push_token() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."revokedAt" IS NOT NULL THEN
    NEW."pushTokenHash" := NULL;
    NEW."pushTokenCiphertext" := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hl_forget_revoked_push_token BEFORE INSERT OR UPDATE ON "Session"
FOR EACH ROW EXECUTE FUNCTION hl_forget_revoked_push_token();
COMMIT;
