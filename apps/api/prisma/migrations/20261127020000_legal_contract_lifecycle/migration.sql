-- B06 follows existing signed contract versions and native journal entries.
-- It neither creates a second contract nor posts or transfers money.
CREATE TABLE "LegalContractLifecycle" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL, "documentVersion" INTEGER NOT NULL, "documentHash" TEXT NOT NULL,
  "revision" INTEGER NOT NULL, "digest" TEXT NOT NULL, "state" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "LegalContractLifecycleEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "lifecycleId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL, "actorAccountId" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "action" TEXT NOT NULL, "beforeRevision" INTEGER NOT NULL, "afterRevision" INTEGER NOT NULL,
  "previousDigest" TEXT, "resultDigest" TEXT NOT NULL, "evidence" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "LegalContractSettlementReference" (
  "financeEntryId" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL,
  "lifecycleId" TEXT NOT NULL, "claimId" TEXT NOT NULL, "ledgerHash" TEXT NOT NULL
);

-- Existing production identifiers may be native uuid or text. Adapt only the
-- new reference columns; preserve the established identity sources.
DO $$
DECLARE item RECORD; source_type TEXT;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('LegalContractLifecycle','organizationId','Organization'),
    ('LegalContractLifecycle','documentId','ManagedDocument'),
    ('LegalContractLifecycle','createdByAccountId','Account'),
    ('LegalContractLifecycleEvent','organizationId','Organization'),
    ('LegalContractLifecycleEvent','actorAccountId','Account'),
    ('LegalContractSettlementReference','financeEntryId','FinanceEntry'),
    ('LegalContractSettlementReference','organizationId','Organization')
  ) AS refs(table_name,column_name,source_name) LOOP
    SELECT format_type(atttypid,atttypmod) INTO source_type FROM pg_attribute
      WHERE attrelid=format('%I',item.source_name)::regclass AND attname='id' AND NOT attisdropped;
    IF source_type IS NULL OR source_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported legal lifecycle source identifier'; END IF;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',item.table_name,item.column_name,source_type,item.column_name,source_type);
  END LOOP;
END $$;

CREATE UNIQUE INDEX "LegalContractLifecycle_org_id_key" ON "LegalContractLifecycle"("organizationId","id");
CREATE UNIQUE INDEX "LegalContractLifecycle_document_version_key" ON "LegalContractLifecycle"("organizationId","documentId","documentVersion");
CREATE INDEX "LegalContractLifecycle_org_updated_idx" ON "LegalContractLifecycle"("organizationId","updatedAt");
CREATE UNIQUE INDEX "LegalContractLifecycleEvent_command_key" ON "LegalContractLifecycleEvent"("organizationId","commandId");
CREATE UNIQUE INDEX "LegalContractLifecycleEvent_revision_key" ON "LegalContractLifecycleEvent"("lifecycleId","afterRevision");
CREATE UNIQUE INDEX "LegalContractLifecycleEvent_evidence_key" ON "LegalContractLifecycleEvent"("organizationId",(("evidence"->'source'->>'id')))
  WHERE "action" NOT IN ('REGISTER','REGISTER_RENEWAL');
CREATE UNIQUE INDEX "LegalContractSettlementReference_claim_key" ON "LegalContractSettlementReference"("organizationId","claimId");

ALTER TABLE "LegalContractLifecycle"
  ADD CONSTRAINT "LegalContractLifecycle_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractLifecycle_doc_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractLifecycle_creator_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractLifecycle_values_check" CHECK (
    "documentVersion">0 AND "revision" BETWEEN 1 AND 2000 AND "documentHash" ~ '^[a-f0-9]{64}$' AND "digest" ~ '^[a-f0-9]{64}$'
    AND "updatedAt">="createdAt" AND jsonb_typeof("state")='object' AND "state" @> '{"schemaVersion":1}'::jsonb
    AND "state"->'contract'->>'id'="documentId"::text AND ("state"->'contract'->>'version')::integer="documentVersion"
    AND "state"->'contract'->>'hash'="documentHash" AND "state"->>'status' IN ('OPEN','RENEWED','TERMINATED','ARCHIVED')
    AND octet_length("state"::text)<=4194304
  );
ALTER TABLE "LegalContractLifecycleEvent"
  ADD CONSTRAINT "LegalContractLifecycleEvent_record_fkey" FOREIGN KEY ("organizationId","lifecycleId") REFERENCES "LegalContractLifecycle"("organizationId","id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractLifecycleEvent_actor_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractLifecycleEvent_values_check" CHECK (
    "beforeRevision">=0 AND "afterRevision"="beforeRevision"+1 AND "afterRevision"<=2000
    AND "requestHash" ~ '^[a-f0-9]{64}$' AND "resultDigest" ~ '^[a-f0-9]{64}$'
    AND (("beforeRevision"=0 AND "previousDigest" IS NULL AND "action" IN ('REGISTER','REGISTER_RENEWAL'))
      OR ("beforeRevision">0 AND "previousDigest" ~ '^[a-f0-9]{64}$' AND "action" NOT IN ('REGISTER','REGISTER_RENEWAL')))
    AND "action" IN ('REGISTER','REGISTER_RENEWAL','ADD_OBLIGATION','FULFILL_OBLIGATION','VERIFY_OBLIGATION','REJECT_OBLIGATION','REOPEN_OBLIGATION',
      'ADD_POLICY','CANCEL_POLICY','OPEN_CLAIM','APPROVE_CLAIM','REJECT_CLAIM','REOPEN_CLAIM','LINK_SETTLEMENT','RENEW','TERMINATE','ARCHIVE')
    AND jsonb_typeof("evidence")='object' AND octet_length("evidence"::text)<=8388608
  );
ALTER TABLE "LegalContractSettlementReference"
  ADD CONSTRAINT "LegalContractSettlementReference_record_fkey" FOREIGN KEY ("organizationId","lifecycleId") REFERENCES "LegalContractLifecycle"("organizationId","id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractSettlementReference_entry_fkey" FOREIGN KEY ("financeEntryId") REFERENCES "FinanceEntry"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "LegalContractSettlementReference_hash_check" CHECK ("ledgerHash" ~ '^[a-f0-9]{64}$');

CREATE FUNCTION "legal_contract_evidence_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Legal contract evidence is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER "LegalContractLifecycleEvent_immutable" BEFORE UPDATE OR DELETE ON "LegalContractLifecycleEvent"
  FOR EACH ROW EXECUTE FUNCTION "legal_contract_evidence_immutable"();
CREATE TRIGGER "LegalContractSettlementReference_immutable" BEFORE UPDATE OR DELETE ON "LegalContractSettlementReference"
  FOR EACH ROW EXECUTE FUNCTION "legal_contract_evidence_immutable"();
CREATE TRIGGER "LegalContractLifecycleEvent_no_truncate" BEFORE TRUNCATE ON "LegalContractLifecycleEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION "legal_contract_evidence_immutable"();
CREATE TRIGGER "LegalContractSettlementReference_no_truncate" BEFORE TRUNCATE ON "LegalContractSettlementReference"
  FOR EACH STATEMENT EXECUTE FUNCTION "legal_contract_evidence_immutable"();
CREATE TRIGGER "LegalContractLifecycle_no_truncate" BEFORE TRUNCATE ON "LegalContractLifecycle"
  FOR EACH STATEMENT EXECUTE FUNCTION "legal_contract_evidence_immutable"();
CREATE FUNCTION "legal_contract_source_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' OR NEW."id"<>OLD."id" OR NEW."organizationId"<>OLD."organizationId" OR NEW."documentId"<>OLD."documentId"
    OR NEW."documentVersion"<>OLD."documentVersion" OR NEW."documentHash"<>OLD."documentHash"
    OR NEW."createdByAccountId"<>OLD."createdByAccountId" OR NEW."createdAt"<>OLD."createdAt" OR NEW."revision"<>OLD."revision"+1
    OR OLD."state"->>'status'='ARCHIVED'
  THEN RAISE EXCEPTION 'Legal contract source and archived records are immutable' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "LegalContractLifecycle_source_immutable" BEFORE UPDATE OR DELETE ON "LegalContractLifecycle"
  FOR EACH ROW EXECUTE FUNCTION "legal_contract_source_immutable"();
