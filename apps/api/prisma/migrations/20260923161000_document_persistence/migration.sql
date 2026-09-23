-- Persist the unified document/template lifecycle domain.
CREATE TYPE "ManagedDocumentStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED');
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('ACTIVE','INACTIVE');

CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  "printable" BOOLEAN NOT NULL DEFAULT true,
  "fields" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentTemplate_organizationId_code_version_key" ON "DocumentTemplate"("organizationId","code","version");
CREATE INDEX "DocumentTemplate_organizationId_department_status_idx" ON "DocumentTemplate"("organizationId","department","status");
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ManagedDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "status" "ManagedDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "contentHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "approvedByAccountId" TEXT,
  "signedByAccountId" TEXT,
  "archivedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ManagedDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedDocument_organizationId_referenceNumber_key" ON "ManagedDocument"("organizationId","referenceNumber");
CREATE INDEX "ManagedDocument_organizationId_department_status_idx" ON "ManagedDocument"("organizationId","department","status");
CREATE INDEX "ManagedDocument_templateId_status_idx" ON "ManagedDocument"("templateId","status");
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_signedByAccountId_fkey" FOREIGN KEY ("signedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_archivedByAccountId_fkey" FOREIGN KEY ("archivedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DocumentLifecycleEvent" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "ManagedDocumentStatus",
  "toStatus" "ManagedDocumentStatus" NOT NULL,
  "version" INTEGER NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentLifecycleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentLifecycleEvent_documentId_occurredAt_idx" ON "DocumentLifecycleEvent"("documentId","occurredAt");
CREATE INDEX "DocumentLifecycleEvent_actorAccountId_occurredAt_idx" ON "DocumentLifecycleEvent"("actorAccountId","occurredAt");
ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
