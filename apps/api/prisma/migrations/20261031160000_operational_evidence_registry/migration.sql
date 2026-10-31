-- Evidence of past events only: no financial/stock/publication/disposal execution.
CREATE TABLE "OperationalEvidence" (
 "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"requestKey" TEXT NOT NULL,"requestDigest" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,"status" TEXT NOT NULL DEFAULT 'DRAFT',"kind" TEXT NOT NULL,"department" TEXT NOT NULL,
 "reference" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL,"proofDocumentId" TEXT NOT NULL,"proofVersion" INTEGER NOT NULL,
 "proofContentHash" TEXT NOT NULL,"details" JSONB NOT NULL,"referenceBindings" JSONB NOT NULL,"createdByAccountId" TEXT NOT NULL,"recordedAt" TIMESTAMP(3),
 "recordDigest" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "OperationalEvidence_revision_bounds" CHECK ("revision" BETWEEN 1 AND 1000000 AND "proofVersion">0),
 CONSTRAINT "OperationalEvidence_status_valid" CHECK ("status" IN ('DRAFT','RECORDED','ARCHIVED') AND ("status"<>'RECORDED' OR "recordedAt" IS NOT NULL)),
 CONSTRAINT "OperationalEvidence_kind_department_valid" CHECK (("department"='INVENTORY_LOGISTICS' AND "kind" IN ('WAREHOUSE_BALANCE','WAREHOUSE_MOVEMENT','PROCUREMENT')) OR ("department"='ADMIN_AFFAIRS_RECORDS' AND "kind" IN ('RECORD_DELIVERY','RECORD_RETENTION','RECORD_DISPOSAL')) OR ("department"='MARKETING_GROWTH' AND "kind" IN ('CAMPAIGN_PUBLICATION','CAMPAIGN_ANALYTICS'))),
 CONSTRAINT "OperationalEvidence_reference_bounds" CHECK (length(btrim("reference")) BETWEEN 1 AND 200),
 CONSTRAINT "OperationalEvidence_request_valid" CHECK ("requestKey" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
 CONSTRAINT "OperationalEvidence_digests_valid" CHECK ("requestDigest" ~ '^[a-f0-9]{64}$' AND "recordDigest" ~ '^[a-f0-9]{64}$' AND "proofContentHash" ~ '^[a-f0-9]{64}$'),
 CONSTRAINT "OperationalEvidence_details_object" CHECK (jsonb_typeof("details")='object')
);
CREATE TABLE "OperationalEvidenceRevision" (
 "id" TEXT PRIMARY KEY,"evidenceId" TEXT NOT NULL,"revision" INTEGER NOT NULL,"snapshot" JSONB NOT NULL,
 "action" TEXT NOT NULL,"reason" TEXT NOT NULL,"actorAccountId" TEXT NOT NULL,"previousDigest" TEXT,"recordDigest" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OperationalEvidenceRevision_revision_valid" CHECK ("revision">0),
 CONSTRAINT "OperationalEvidenceRevision_action_valid" CHECK ("action" IN ('OPERATIONAL_EVIDENCE_CREATED','OPERATIONAL_EVIDENCE_RECORDED','OPERATIONAL_EVIDENCE_ARCHIVED')),
 CONSTRAINT "OperationalEvidenceRevision_reason_valid" CHECK (length(btrim("reason")) BETWEEN 1 AND 500),
 CONSTRAINT "OperationalEvidenceRevision_digests_valid" CHECK ("recordDigest" ~ '^[a-f0-9]{64}$' AND ("previousDigest" IS NULL OR "previousDigest" ~ '^[a-f0-9]{64}$'))
);
CREATE UNIQUE INDEX "OperationalEvidence_org_creator_request_key" ON "OperationalEvidence"("organizationId","createdByAccountId","requestKey");
CREATE UNIQUE INDEX "OperationalEvidence_org_kind_reference_key" ON "OperationalEvidence"("organizationId","kind","reference");
CREATE INDEX "OperationalEvidence_organizationId_department_status_kind_idx" ON "OperationalEvidence"("organizationId","department","status","kind");
CREATE INDEX "OperationalEvidence_organizationId_createdAt_id_idx" ON "OperationalEvidence"("organizationId","createdAt","id");
CREATE UNIQUE INDEX "OperationalEvidenceRevision_evidenceId_revision_key" ON "OperationalEvidenceRevision"("evidenceId","revision");
DO $migration$
DECLARE org_type text; account_type text; document_type text;
BEGIN
 SELECT format_type(atttypid,atttypmod) INTO org_type FROM pg_attribute WHERE attrelid='"Organization"'::regclass AND attname='id' AND NOT attisdropped;
 SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
 SELECT format_type(atttypid,atttypmod) INTO document_type FROM pg_attribute WHERE attrelid='"ManagedDocument"'::regclass AND attname='id' AND NOT attisdropped;
 IF org_type IS NULL OR account_type IS NULL OR document_type IS NULL OR org_type NOT IN ('text','uuid') OR account_type NOT IN ('text','uuid') OR document_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported evidence parent identity types'; END IF;
 EXECUTE format('ALTER TABLE "OperationalEvidence" ALTER COLUMN "organizationId" TYPE %s USING "organizationId"::%s',org_type,org_type);
 EXECUTE format('ALTER TABLE "OperationalEvidence" ALTER COLUMN "createdByAccountId" TYPE %s USING "createdByAccountId"::%s',account_type,account_type);
 EXECUTE format('ALTER TABLE "OperationalEvidence" ALTER COLUMN "proofDocumentId" TYPE %s USING "proofDocumentId"::%s',document_type,document_type);
 EXECUTE format('ALTER TABLE "OperationalEvidenceRevision" ALTER COLUMN "actorAccountId" TYPE %s USING "actorAccountId"::%s',account_type,account_type);
END $migration$;
ALTER TABLE "OperationalEvidence" ADD CONSTRAINT "OperationalEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalEvidence" ADD CONSTRAINT "OperationalEvidence_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalEvidence" ADD CONSTRAINT "OperationalEvidence_proofDocumentId_fkey" FOREIGN KEY ("proofDocumentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalEvidenceRevision" ADD CONSTRAINT "OperationalEvidenceRevision_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "OperationalEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalEvidenceRevision" ADD CONSTRAINT "OperationalEvidenceRevision_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION operational_evidence_revision_append_only() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN RAISE EXCEPTION 'OperationalEvidenceRevision is append-only' USING ERRCODE='55000'; END $guard$;
CREATE TRIGGER operational_evidence_revision_no_update_delete BEFORE UPDATE OR DELETE ON "OperationalEvidenceRevision" FOR EACH ROW EXECUTE FUNCTION operational_evidence_revision_append_only();
CREATE TRIGGER operational_evidence_revision_no_truncate BEFORE TRUNCATE ON "OperationalEvidenceRevision" FOR EACH STATEMENT EXECUTE FUNCTION operational_evidence_revision_append_only();
