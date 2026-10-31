-- Additive internal planning registry. No seeds, grants or publication authority.
CREATE TABLE "MarketingCampaignDraft" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "channels" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "recordDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaignDraft_revision_positive" CHECK ("revision">0 AND "revision"<=1000000),
  CONSTRAINT "MarketingCampaignDraft_status_valid" CHECK ("status" IN ('DRAFT','ARCHIVED')),
  CONSTRAINT "MarketingCampaignDraft_content_bounds" CHECK (length(btrim("title")) BETWEEN 1 AND 160 AND length(btrim("objective")) BETWEEN 1 AND 2000),
  CONSTRAINT "MarketingCampaignDraft_channels_valid" CHECK (jsonb_typeof("channels")='array' AND jsonb_array_length("channels") BETWEEN 1 AND 7 AND "channels" <@ '["APP","WEB","EMAIL","SMS","WHATSAPP","SOCIAL","PAID_ADS"]'::jsonb),
  CONSTRAINT "MarketingCampaignDraft_digests_valid" CHECK ("requestDigest" ~ '^[a-f0-9]{64}$' AND "recordDigest" ~ '^[a-f0-9]{64}$')
);
CREATE TABLE "MarketingCampaignDraftRevision" (
  "id" TEXT PRIMARY KEY,
  "campaignDraftId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "previousDigest" TEXT,
  "recordDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingCampaignDraftRevision_revision_positive" CHECK ("revision">0),
  CONSTRAINT "MarketingCampaignDraftRevision_action_valid" CHECK ("action" IN ('MARKETING_CAMPAIGN_DRAFT_CREATED','MARKETING_CAMPAIGN_DRAFT_EDITED','MARKETING_CAMPAIGN_DRAFT_ARCHIVED','MARKETING_CAMPAIGN_DRAFT_RESTORED')),
  CONSTRAINT "MarketingCampaignDraftRevision_digests_valid" CHECK ("recordDigest" ~ '^[a-f0-9]{64}$' AND ("previousDigest" IS NULL OR "previousDigest" ~ '^[a-f0-9]{64}$'))
);
CREATE UNIQUE INDEX "MarketingCampaignDraft_organizationId_createdByAccountId_req_key" ON "MarketingCampaignDraft"("organizationId","createdByAccountId","requestKey");
CREATE INDEX "MarketingCampaignDraft_organizationId_createdAt_id_idx" ON "MarketingCampaignDraft"("organizationId","createdAt","id");
CREATE UNIQUE INDEX "MarketingCampaignDraftRevision_campaignDraftId_revision_key" ON "MarketingCampaignDraftRevision"("campaignDraftId","revision");
DO $migration$
DECLARE org_type text; account_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO org_type FROM pg_attribute WHERE attrelid='"Organization"'::regclass AND attname='id' AND NOT attisdropped;
  SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF org_type NOT IN ('text','uuid') OR account_type NOT IN ('text','uuid') OR org_type IS NULL OR account_type IS NULL THEN RAISE EXCEPTION 'Unsupported marketing draft parent identity types'; END IF;
  EXECUTE format('ALTER TABLE "MarketingCampaignDraft" ALTER COLUMN "organizationId" TYPE %s USING "organizationId"::%s',org_type,org_type);
  EXECUTE format('ALTER TABLE "MarketingCampaignDraft" ALTER COLUMN "createdByAccountId" TYPE %s USING "createdByAccountId"::%s',account_type,account_type);
  EXECUTE format('ALTER TABLE "MarketingCampaignDraftRevision" ALTER COLUMN "actorAccountId" TYPE %s USING "actorAccountId"::%s',account_type,account_type);
END $migration$;
ALTER TABLE "MarketingCampaignDraft" ADD CONSTRAINT "MarketingCampaignDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignDraft" ADD CONSTRAINT "MarketingCampaignDraft_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignDraftRevision" ADD CONSTRAINT "MarketingCampaignDraftRevision_campaignDraftId_fkey" FOREIGN KEY ("campaignDraftId") REFERENCES "MarketingCampaignDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignDraftRevision" ADD CONSTRAINT "MarketingCampaignDraftRevision_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION marketing_campaign_draft_revision_append_only() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN RAISE EXCEPTION 'MarketingCampaignDraftRevision is append-only' USING ERRCODE='55000'; END $guard$;
CREATE TRIGGER marketing_campaign_draft_revision_no_update_delete BEFORE UPDATE OR DELETE ON "MarketingCampaignDraftRevision" FOR EACH ROW EXECUTE FUNCTION marketing_campaign_draft_revision_append_only();
CREATE TRIGGER marketing_campaign_draft_revision_no_truncate BEFORE TRUNCATE ON "MarketingCampaignDraftRevision" FOR EACH STATEMENT EXECUTE FUNCTION marketing_campaign_draft_revision_append_only();
