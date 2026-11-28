BEGIN;

-- Polymorphic source references are resolved against the native asset and its
-- current ownership on every request. TEXT here supports legacy UUID and TEXT
-- source identifiers without rewriting either source table.
CREATE TABLE "AssetPassport" (
  "id" TEXT PRIMARY KEY,
  "sourceKind" TEXT NOT NULL CHECK ("sourceKind" IN ('EQUIPMENT', 'MARINE')),
  "sourceId" TEXT NOT NULL,
  "currentVersion" INTEGER NOT NULL CHECK ("currentVersion" > 0),
  "status" TEXT NOT NULL CHECK ("status" IN ('ACTIVE', 'REVOKED')),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sourceKind", "sourceId")
);

CREATE TABLE "AssetPassportRevision" (
  "id" TEXT PRIMARY KEY,
  "passportId" TEXT NOT NULL REFERENCES "AssetPassport"("id") ON DELETE RESTRICT,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "sourceDigest" TEXT NOT NULL CHECK ("sourceDigest" ~ '^[0-9a-f]{64}$'),
  "sourceSnapshot" JSONB NOT NULL,
  "qrToken" TEXT NOT NULL UNIQUE CHECK ("qrToken" ~ '^[0-9a-f]{64}$'),
  "issuedByAccountId" TEXT NOT NULL,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("passportId", "version")
);

CREATE TABLE "AssetPassportCommand" (
  "requestId" TEXT PRIMARY KEY,
  "passportId" TEXT NOT NULL REFERENCES "AssetPassport"("id") ON DELETE RESTRICT,
  "revisionId" TEXT NOT NULL REFERENCES "AssetPassportRevision"("id") ON DELETE RESTRICT,
  "actorAccountId" TEXT NOT NULL,
  "action" TEXT NOT NULL CHECK ("action" IN ('ISSUE', 'UPDATE', 'REVOKE')),
  "payloadDigest" TEXT NOT NULL CHECK ("payloadDigest" ~ '^[0-9a-f]{64}$'),
  "reason" TEXT,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("action" <> 'REVOKE' OR length(trim("reason")) BETWEEN 1 AND 1000)
);
CREATE INDEX "AssetPassportCommand_passport_time_idx" ON "AssetPassportCommand"("passportId", "occurredAt");

CREATE FUNCTION f01_passport_receipt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Asset passport revisions and command receipts are immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "AssetPassportRevision_immutable" BEFORE UPDATE OR DELETE ON "AssetPassportRevision"
FOR EACH ROW EXECUTE FUNCTION f01_passport_receipt_immutable();
CREATE TRIGGER "AssetPassportCommand_immutable" BEFORE UPDATE OR DELETE ON "AssetPassportCommand"
FOR EACH ROW EXECUTE FUNCTION f01_passport_receipt_immutable();

COMMIT;
