-- Additive warehouse location registry. No seeds, grants, stock movement or operating authority.
CREATE TABLE "WarehouseLocation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'RECORDED',
  "title" TEXT NOT NULL,
  "locationDescription" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "recordDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseLocation_revision_positive" CHECK ("revision">0 AND "revision"<=1000000),
  CONSTRAINT "WarehouseLocation_status_valid" CHECK ("status" IN ('RECORDED','ARCHIVED')),
  CONSTRAINT "WarehouseLocation_content_bounds" CHECK (length(btrim("title")) BETWEEN 1 AND 160 AND length(btrim("locationDescription")) BETWEEN 1 AND 1000),
  CONSTRAINT "WarehouseLocation_code_valid" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'),
  CONSTRAINT "WarehouseLocation_request_key_valid" CHECK ("requestKey" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
  CONSTRAINT "WarehouseLocation_digests_valid" CHECK ("requestDigest" ~ '^[a-f0-9]{64}$' AND "recordDigest" ~ '^[a-f0-9]{64}$')
);
CREATE TABLE "WarehouseLocationRevision" (
  "id" TEXT PRIMARY KEY,
  "warehouseLocationId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "previousDigest" TEXT,
  "recordDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseLocationRevision_reason_valid" CHECK (length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "WarehouseLocationRevision_revision_positive" CHECK ("revision">0),
  CONSTRAINT "WarehouseLocationRevision_action_valid" CHECK ("action" IN ('WAREHOUSE_LOCATION_CREATED','WAREHOUSE_LOCATION_EDITED','WAREHOUSE_LOCATION_ARCHIVED','WAREHOUSE_LOCATION_RESTORED')),
  CONSTRAINT "WarehouseLocationRevision_digests_valid" CHECK ("recordDigest" ~ '^[a-f0-9]{64}$' AND ("previousDigest" IS NULL OR "previousDigest" ~ '^[a-f0-9]{64}$'))
);
CREATE UNIQUE INDEX "WarehouseLocation_org_creator_request_key" ON "WarehouseLocation"("organizationId","createdByAccountId","requestKey");
CREATE UNIQUE INDEX "WarehouseLocation_org_code_key" ON "WarehouseLocation"("organizationId","code");
CREATE INDEX "WarehouseLocation_organizationId_createdAt_id_idx" ON "WarehouseLocation"("organizationId","createdAt","id");
CREATE UNIQUE INDEX "WarehouseLocationRevision_warehouseLocationId_revision_key" ON "WarehouseLocationRevision"("warehouseLocationId","revision");
DO $migration$
DECLARE org_type text; account_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO org_type FROM pg_attribute WHERE attrelid='"Organization"'::regclass AND attname='id' AND NOT attisdropped;
  SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF org_type NOT IN ('text','uuid') OR account_type NOT IN ('text','uuid') OR org_type IS NULL OR account_type IS NULL THEN RAISE EXCEPTION 'Unsupported warehouse location parent identity types'; END IF;
  EXECUTE format('ALTER TABLE "WarehouseLocation" ALTER COLUMN "organizationId" TYPE %s USING "organizationId"::%s',org_type,org_type);
  EXECUTE format('ALTER TABLE "WarehouseLocation" ALTER COLUMN "createdByAccountId" TYPE %s USING "createdByAccountId"::%s',account_type,account_type);
  EXECUTE format('ALTER TABLE "WarehouseLocationRevision" ALTER COLUMN "actorAccountId" TYPE %s USING "actorAccountId"::%s',account_type,account_type);
END $migration$;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationRevision" ADD CONSTRAINT "WarehouseLocationRevision_warehouseLocationId_fkey" FOREIGN KEY ("warehouseLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLocationRevision" ADD CONSTRAINT "WarehouseLocationRevision_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION warehouse_location_revision_append_only() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN RAISE EXCEPTION 'WarehouseLocationRevision is append-only' USING ERRCODE='55000'; END $guard$;
CREATE TRIGGER warehouse_location_revision_no_update_delete BEFORE UPDATE OR DELETE ON "WarehouseLocationRevision" FOR EACH ROW EXECUTE FUNCTION warehouse_location_revision_append_only();
CREATE TRIGGER warehouse_location_revision_no_truncate BEFORE TRUNCATE ON "WarehouseLocationRevision" FOR EACH STATEMENT EXECUTE FUNCTION warehouse_location_revision_append_only();
