-- C05 uses the existing asset, calendar and B05 stock sources. No second asset or stock ledger.
CREATE TABLE "MaintenancePreventivePlan" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "marineAssetId" TEXT,
  "equipmentResourceId" TEXT,
  "intervalDays" INTEGER NOT NULL CHECK ("intervalDays" BETWEEN 1 AND 3650),
  "nextDueAt" TIMESTAMPTZ NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (("marineAssetId" IS NOT NULL)::int + ("equipmentResourceId" IS NOT NULL)::int = 1)
);
CREATE TABLE "MaintenanceWorkOrder" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "marineAssetId" TEXT,
  "equipmentResourceId" TEXT,
  "maintenanceRecordId" TEXT UNIQUE,
  "planId" TEXT REFERENCES "MaintenancePreventivePlan"("id") ON DELETE RESTRICT,
  "planDueAt" TIMESTAMPTZ,
  "status" TEXT NOT NULL CHECK ("status" IN ('REQUESTED','APPROVED','SCHEDULED','IN_PROGRESS','AWAITING_INSPECTION','INSPECTED','CLOSED','REJECTED')),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
  "startsAt" TIMESTAMPTZ,
  "endsAt" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (("marineAssetId" IS NOT NULL)::int + ("equipmentResourceId" IS NOT NULL)::int = 1),
  CHECK (("marineAssetId" IS NULL)=("maintenanceRecordId" IS NULL)),
  CHECK (("planId" IS NULL)=("planDueAt" IS NULL)),
  CHECK (("startsAt" IS NULL AND "endsAt" IS NULL) OR ("startsAt" IS NOT NULL AND "endsAt" IS NOT NULL AND "endsAt">"startsAt")),
  CHECK ("status" NOT IN ('SCHEDULED','IN_PROGRESS','AWAITING_INSPECTION','INSPECTED','CLOSED') OR "startsAt" IS NOT NULL)
);
CREATE INDEX "MaintenanceWorkOrder_org_status" ON "MaintenanceWorkOrder"("organizationId","status","createdAt");
CREATE INDEX "MaintenanceWorkOrder_marine" ON "MaintenanceWorkOrder"("marineAssetId","status");
CREATE INDEX "MaintenanceWorkOrder_equipment" ON "MaintenanceWorkOrder"("equipmentResourceId","status");
CREATE INDEX "MaintenancePreventivePlan_due" ON "MaintenancePreventivePlan"("organizationId","active","nextDueAt");
CREATE UNIQUE INDEX "MaintenanceWorkOrder_plan_cycle" ON "MaintenanceWorkOrder"("planId","planDueAt") WHERE "planId" IS NOT NULL;
CREATE UNIQUE INDEX "MaintenanceWorkOrder_active_plan" ON "MaintenanceWorkOrder"("planId") WHERE "planId" IS NOT NULL AND "status" NOT IN ('CLOSED','REJECTED');
CREATE TABLE "MaintenancePartUsage" (
  "organizationId" TEXT NOT NULL,
  "issueRequestId" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL REFERENCES "MaintenanceWorkOrder"("id") ON DELETE RESTRICT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("organizationId","issueRequestId")
);
CREATE TABLE "MaintenanceCommand" (
  "organizationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorPersonId" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL CHECK (length("requestDigest")=64),
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("organizationId","requestId")
);
CREATE INDEX "MaintenanceCommand_history" ON "MaintenanceCommand"("organizationId","subjectId","createdAt");
CREATE FUNCTION "maintenance_evidence_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Maintenance evidence is append-only'; END $$;
CREATE TRIGGER "MaintenanceCommand_no_rewrite" BEFORE UPDATE OR DELETE OR TRUNCATE ON "MaintenanceCommand" FOR EACH STATEMENT EXECUTE FUNCTION "maintenance_evidence_append_only"();
CREATE TRIGGER "MaintenancePartUsage_no_rewrite" BEFORE UPDATE OR DELETE OR TRUNCATE ON "MaintenancePartUsage" FOR EACH STATEMENT EXECUTE FUNCTION "maintenance_evidence_append_only"();

-- Historical installs use either TEXT or UUID identities. Match only new
-- reference columns to their canonical source. Never rewrite existing identities.
DO $$
DECLARE r RECORD; source_type TEXT;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('MaintenancePreventivePlan','organizationId','Organization','id'),
 ('MaintenancePreventivePlan','marineAssetId','MarineAsset','id'),
 ('MaintenancePreventivePlan','equipmentResourceId','CalendarResource','id'),
 ('MaintenanceWorkOrder','organizationId','Organization','id'),
 ('MaintenanceWorkOrder','marineAssetId','MarineAsset','id'),
 ('MaintenanceWorkOrder','equipmentResourceId','CalendarResource','id'),
 ('MaintenanceWorkOrder','maintenanceRecordId','MarineMaintenanceRecord','id'),
 ('MaintenanceCommand','organizationId','Organization','id'),
 ('MaintenanceCommand','actorId','Account','id'),
 ('MaintenanceCommand','actorPersonId','Person','id'),
 ('MaintenancePartUsage','organizationId','WarehouseIssuePosting','organizationId')
 ) AS x(table_name,column_name,source_table,source_column) LOOP
  SELECT format_type(atttypid,atttypmod) INTO source_type FROM pg_attribute
    WHERE attrelid=format('%I',r.source_table)::regclass AND attname=r.source_column AND NOT attisdropped;
  IF source_type IS NULL OR source_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported maintenance identity type'; END IF;
  IF source_type<>'text' THEN
   EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',r.table_name,r.column_name,source_type,r.column_name,source_type);
  END IF;
  IF r.table_name<>'MaintenancePartUsage' THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE RESTRICT',r.table_name,r.table_name||'_'||r.column_name||'_fkey',r.column_name,r.source_table,r.source_column);
  END IF;
 END LOOP;
END $$;
ALTER TABLE "MaintenancePartUsage" ADD CONSTRAINT "MaintenancePartUsage_issue_fkey"
 FOREIGN KEY ("organizationId","issueRequestId") REFERENCES "WarehouseIssuePosting"("organizationId","requestId") ON DELETE RESTRICT;
