-- Additive internal desk-research lifecycle. No external execution authority.
-- CreateTable
CREATE TABLE "InternalResearchInitiative" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "content" JSONB NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "createdByPersonId" TEXT NOT NULL,
    "currentReviewId" TEXT,
    "proposalReviewId" TEXT,
    "resultReviewId" TEXT,
    "recordDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalResearchInitiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalResearchRevision" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorAccountId" TEXT NOT NULL,
    "previousDigest" TEXT,
    "recordDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalResearchRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalResearchReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "assignedRevision" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "reviewerAccountId" TEXT NOT NULL,
    "reviewerPersonId" TEXT NOT NULL,
    "reviewerBinding" JSONB NOT NULL,
    "authorityBinding" JSONB NOT NULL,
    "issuedByAccountId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "receiptHash" TEXT,
    "recordDigest" TEXT NOT NULL,

    CONSTRAINT "InternalResearchReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalResearchInitiative_organizationId_createdAt_id_idx" ON "InternalResearchInitiative"("organizationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InternalResearchInitiative_organizationId_createdByAccountI_key" ON "InternalResearchInitiative"("organizationId", "createdByAccountId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "InternalResearchRevision_initiativeId_revision_key" ON "InternalResearchRevision"("initiativeId", "revision");

-- CreateIndex
CREATE INDEX "InternalResearchReview_reviewerAccountId_state_expiresAt_idx" ON "InternalResearchReview"("reviewerAccountId", "state", "expiresAt");

-- CreateIndex
CREATE INDEX "InternalResearchReview_initiativeId_issuedAt_idx" ON "InternalResearchReview"("initiativeId", "issuedAt");

-- Adapt only the empty new reference columns to historical parent key types.
-- No existing data, role, employee, review or approval is modified or seeded.
DO $migration$
DECLARE org_type text; account_type text; item text[];
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO org_type FROM pg_attribute WHERE attrelid='"Organization"'::regclass AND attname='id' AND NOT attisdropped;
  SELECT format_type(atttypid,atttypmod) INTO account_type FROM pg_attribute WHERE attrelid='"Account"'::regclass AND attname='id' AND NOT attisdropped;
  IF org_type NOT IN ('text','uuid') OR account_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported internal research identity key type'; END IF;
  FOREACH item SLICE 1 IN ARRAY ARRAY[['InternalResearchInitiative','organizationId'],['InternalResearchReview','organizationId']] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',item[1],item[2],org_type,item[2],org_type);
  END LOOP;
  FOREACH item SLICE 1 IN ARRAY ARRAY[['InternalResearchInitiative','createdByAccountId'],['InternalResearchRevision','actorAccountId'],['InternalResearchReview','reviewerAccountId'],['InternalResearchReview','issuedByAccountId']] LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s',item[1],item[2],account_type,item[2],account_type);
  END LOOP;
END $migration$;

-- AddForeignKey
ALTER TABLE "InternalResearchInitiative" ADD CONSTRAINT "InternalResearchInitiative_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchInitiative" ADD CONSTRAINT "InternalResearchInitiative_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchRevision" ADD CONSTRAINT "InternalResearchRevision_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "InternalResearchInitiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchRevision" ADD CONSTRAINT "InternalResearchRevision_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "InternalResearchInitiative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_issuedByAccountId_fkey" FOREIGN KEY ("issuedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_reviewerAccountId_fkey" FOREIGN KEY ("reviewerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- State/receipt constraints reinforce the service's explicit state machine.
ALTER TABLE "InternalResearchInitiative" ADD CONSTRAINT "InternalResearchInitiative_revision_positive" CHECK ("revision" > 0);
ALTER TABLE "InternalResearchInitiative" ADD CONSTRAINT "InternalResearchInitiative_status_valid" CHECK ("status" IN ('PROPOSED','PROPOSAL_REVIEW','APPROVED','ACTIVE','RESULT_REVIEW','VERIFIED','COMPLETED','ARCHIVED','REJECTED','CANCELLED'));
ALTER TABLE "InternalResearchRevision" ADD CONSTRAINT "InternalResearchRevision_revision_positive" CHECK ("revision" > 0);
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_phase_valid" CHECK ("phase" IN ('PROPOSAL','RESULT'));
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_assignment_bounds" CHECK ("assignedRevision" > 0 AND "expiresAt" > "issuedAt" AND "expiresAt" <= "issuedAt" + INTERVAL '7 days' AND "issuedByAccountId" <> "reviewerAccountId");
ALTER TABLE "InternalResearchReview" ADD CONSTRAINT "InternalResearchReview_state_receipt_valid" CHECK (
  ("state" = 'ACTIVE' AND "decisionNote" IS NULL AND "decidedAt" IS NULL AND "receiptHash" IS NULL)
  OR ("state" = 'REVOKED' AND "decisionNote" IS NOT NULL AND "decidedAt" IS NOT NULL AND "receiptHash" IS NULL)
  OR ("state" IN ('APPROVED','RETURNED','REJECTED') AND "decisionNote" IS NOT NULL AND "decidedAt" IS NOT NULL AND "receiptHash" IS NOT NULL)
);

-- Revision history is append-only, including privileged application SQL paths.
CREATE FUNCTION internal_research_revision_append_only() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
  RAISE EXCEPTION 'InternalResearchRevision is append-only' USING ERRCODE = '55000';
END $guard$;
CREATE TRIGGER internal_research_revision_no_update_delete BEFORE UPDATE OR DELETE ON "InternalResearchRevision" FOR EACH ROW EXECUTE FUNCTION internal_research_revision_append_only();
CREATE TRIGGER internal_research_revision_no_truncate BEFORE TRUNCATE ON "InternalResearchRevision" FOR EACH STATEMENT EXECUTE FUNCTION internal_research_revision_append_only();
