-- Additive preparation and audit links only. No seed, authority, publication,
-- payment or rewrite of MarketingCampaignDraft / its historical digests.
CREATE TABLE IF NOT EXISTS "MarketingCampaignLifecycle" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "campaignDraftId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL, "status" TEXT NOT NULL, "boundDraftRevision" INTEGER NOT NULL, "boundDraftDigest" TEXT NOT NULL,
  "rightsDocumentId" TEXT NOT NULL, "rightsVersion" INTEGER NOT NULL, "rightsHash" TEXT NOT NULL, "rightsSnapshot" JSONB NOT NULL,
  "budgetDocumentId" TEXT NOT NULL, "budgetVersion" INTEGER NOT NULL, "budgetHash" TEXT NOT NULL, "budgetSnapshot" JSONB NOT NULL,
  "financeAccountId" TEXT NOT NULL, "budgetAmountMinor" INTEGER NOT NULL, "budgetTaxMinor" INTEGER NOT NULL,
  "budgetCurrency" TEXT NOT NULL, "budgetTaxBasis" TEXT NOT NULL, "validFrom" TIMESTAMP(3) NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL,
  "recommendation" TEXT NOT NULL, "ownerBinding" JSONB NOT NULL, "decision" JSONB NOT NULL, "evidenceBindings" JSONB NOT NULL,
  "recordDigest" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "MarketingCampaignLifecycleEvent" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "lifecycleId" TEXT NOT NULL, "campaignDraftId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL, "actorAccountId" TEXT NOT NULL, "actorPersonId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "afterRevision" INTEGER NOT NULL, "reason" TEXT NOT NULL, "previousDigest" TEXT, "snapshot" JSONB NOT NULL,
  "eventDigest" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $types$
DECLARE item record; parent_type text; child_type text;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('MarketingCampaignLifecycle','organizationId','Organization'),
    ('MarketingCampaignLifecycle','campaignDraftId','MarketingCampaignDraft'),
    ('MarketingCampaignLifecycle','rightsDocumentId','ManagedDocument'),
    ('MarketingCampaignLifecycle','budgetDocumentId','ManagedDocument'),
    ('MarketingCampaignLifecycle','financeAccountId','FinanceAccount'),
    ('MarketingCampaignLifecycleEvent','organizationId','Organization'),
    ('MarketingCampaignLifecycleEvent','campaignDraftId','MarketingCampaignDraft'),
    ('MarketingCampaignLifecycleEvent','actorAccountId','Account'),
    ('MarketingCampaignLifecycleEvent','actorPersonId','Person')
  ) AS target(table_name,column_name,parent_table) LOOP
    SELECT format_type(atttypid,atttypmod) INTO parent_type FROM pg_attribute WHERE attrelid=format('%I',item.parent_table)::regclass AND attname='id' AND NOT attisdropped;
    SELECT format_type(atttypid,atttypmod) INTO child_type FROM pg_attribute WHERE attrelid=format('%I',item.table_name)::regclass AND attname=item.column_name AND NOT attisdropped;
    IF parent_type IS NULL OR parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported campaign parent identity type'; END IF;
    IF child_type IS DISTINCT FROM parent_type THEN EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',item.table_name,item.column_name,parent_type,item.column_name,parent_type); END IF;
  END LOOP;
END $types$;
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignLifecycle_campaignDraftId_key" ON "MarketingCampaignLifecycle"("campaignDraftId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignLifecycle_organizationId_id_key" ON "MarketingCampaignLifecycle"("organizationId","id");
CREATE INDEX IF NOT EXISTS "MarketingCampaignLifecycle_organizationId_status_updatedAt_idx" ON "MarketingCampaignLifecycle"("organizationId","status","updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignLifecycleEvent_organizationId_requestId_key" ON "MarketingCampaignLifecycleEvent"("organizationId","requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignLifecycleEvent_lifecycleId_afterRevision_key" ON "MarketingCampaignLifecycleEvent"("lifecycleId","afterRevision");
CREATE INDEX IF NOT EXISTS "CampaignLifecycleEvent_org_campaign_created_idx" ON "MarketingCampaignLifecycleEvent"("organizationId","campaignDraftId","createdAt");
DO $constraints$
DECLARE item record;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('MarketingCampaignLifecycle','organizationId','Organization'),
    ('MarketingCampaignLifecycle','campaignDraftId','MarketingCampaignDraft'),
    ('MarketingCampaignLifecycle','rightsDocumentId','ManagedDocument'),
    ('MarketingCampaignLifecycle','budgetDocumentId','ManagedDocument'),
    ('MarketingCampaignLifecycle','financeAccountId','FinanceAccount'),
    ('MarketingCampaignLifecycleEvent','actorAccountId','Account'),
    ('MarketingCampaignLifecycleEvent','actorPersonId','Person'),
    ('MarketingCampaignLifecycleEvent','campaignDraftId','MarketingCampaignDraft')
  ) AS target(table_name,column_name,parent_table) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=format('%I',item.table_name)::regclass AND conname=item.table_name||'_'||item.column_name||'_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("id") ON DELETE RESTRICT ON UPDATE CASCADE',item.table_name,item.table_name||'_'||item.column_name||'_fkey',item.column_name,item.parent_table);
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"MarketingCampaignLifecycleEvent"'::regclass AND conname='MarketingCampaignLifecycleEvent_organizationId_lifecycleId_fkey') THEN
    ALTER TABLE "MarketingCampaignLifecycleEvent" ADD CONSTRAINT "MarketingCampaignLifecycleEvent_organizationId_lifecycleId_fkey" FOREIGN KEY ("organizationId","lifecycleId") REFERENCES "MarketingCampaignLifecycle"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"MarketingCampaignLifecycle"'::regclass AND conname='CampaignLifecycle_values_check') THEN
    ALTER TABLE "MarketingCampaignLifecycle" ADD CONSTRAINT "CampaignLifecycle_values_check" CHECK (
      "revision" BETWEEN 1 AND 1000000 AND "boundDraftRevision">0 AND "rightsVersion">0 AND "budgetVersion">0
      AND "status" IN ('PREPARED','APPROVED','DECLINED','REVOKED') AND "validUntil">"validFrom"
      AND "budgetAmountMinor">=0 AND "budgetTaxMinor" BETWEEN 0 AND "budgetAmountMinor" AND "budgetCurrency" ~ '^[A-Z]{3}$'
      AND "budgetTaxBasis" IN ('TAX_INCLUDED','ZERO_RATED','EXEMPT','NO_SPEND')
      AND (("budgetTaxBasis"='TAX_INCLUDED' AND "budgetTaxMinor">0) OR ("budgetTaxBasis"<>'TAX_INCLUDED' AND "budgetTaxMinor"=0))
      AND (("budgetAmountMinor"=0 AND "budgetTaxBasis"='NO_SPEND') OR ("budgetAmountMinor">0 AND "budgetTaxBasis"<>'NO_SPEND'))
      AND "boundDraftDigest" ~ '^[a-f0-9]{64}$' AND "rightsHash" ~ '^[a-f0-9]{64}$' AND "budgetHash" ~ '^[a-f0-9]{64}$' AND "recordDigest" ~ '^[a-f0-9]{64}$'
      AND length(btrim("recommendation")) BETWEEN 1 AND 2000 AND jsonb_typeof("ownerBinding")='object' AND jsonb_typeof("evidenceBindings")='array');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='"MarketingCampaignLifecycleEvent"'::regclass AND conname='CampaignLifecycleEvent_values_check') THEN
    ALTER TABLE "MarketingCampaignLifecycleEvent" ADD CONSTRAINT "CampaignLifecycleEvent_values_check" CHECK (
      "afterRevision">0 AND "action" IN ('PREPARE','APPROVE','DECLINE','REVOKE','BIND_EVIDENCE')
      AND "requestFingerprint" ~ '^[a-f0-9]{64}$' AND "eventDigest" ~ '^[a-f0-9]{64}$'
      AND ("previousDigest" IS NULL OR "previousDigest" ~ '^[a-f0-9]{64}$') AND length(btrim("reason")) BETWEEN 1 AND 2000);
  END IF;
END $constraints$;
CREATE OR REPLACE FUNCTION campaign_lifecycle_event_append_only() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN RAISE EXCEPTION 'MarketingCampaignLifecycleEvent is append-only' USING ERRCODE='55000'; END $guard$;
DO $triggers$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='"MarketingCampaignLifecycleEvent"'::regclass AND tgname='campaign_lifecycle_event_no_update_delete') THEN
    CREATE TRIGGER campaign_lifecycle_event_no_update_delete BEFORE UPDATE OR DELETE ON "MarketingCampaignLifecycleEvent" FOR EACH ROW EXECUTE FUNCTION campaign_lifecycle_event_append_only();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='"MarketingCampaignLifecycleEvent"'::regclass AND tgname='campaign_lifecycle_event_no_truncate') THEN
    CREATE TRIGGER campaign_lifecycle_event_no_truncate BEFORE TRUNCATE ON "MarketingCampaignLifecycleEvent" FOR EACH STATEMENT EXECUTE FUNCTION campaign_lifecycle_event_append_only();
  END IF;
END $triggers$;
