import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma = new PrismaClient();
const HR = '20260923092000_hr_candidate_verification';
const ADMIN = '20260923102000_administrative_affairs_persistence';
const CALENDAR = '20260923114000_unified_calendar_events';
const FINANCE = '20260923133000_finance_completion_gate';
const DOCUMENTS = '20260923161000_document_persistence';
const DOCUMENT_COUNTER = '20260923163000_document_reference_counter';
const DOCUMENT_REVISIONS = '20260923213000_document_revision_history';
const DOCUMENT_BRANDING = '20260923220000_document_branding';

async function migrationFailure(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
       FROM "_prisma_migrations" WHERE migration_name=$1 ORDER BY started_at DESC LIMIT 1`,
    name,
  );
  const migration = rows[0];
  if (!migration || migration.finished_at || migration.rolled_back_at) return null;
  return migration;
}

async function columnType(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table, column,
  );
  return rows[0]?.data_type ?? null;
}

async function requireUuidColumns(pairs) {
  for (const [table, column] of pairs) {
    if (await columnType(table, column) !== 'uuid') {
      throw new Error(`Refusing recovery: ${table}.${column} is not uuid`);
    }
  }
}

async function requireTablesAbsent(tables) {
  for (const table of tables) {
    if (await columnType(table, 'id')) {
      throw new Error(`Refusing recovery: ${table} already exists`);
    }
  }
}

function markApplied(name) {
  execFileSync('npx', ['prisma', 'migrate', 'resolve', '--applied', name], { stdio: 'inherit' });
}

function markRolledBack(name) {
  execFileSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', name], { stdio: 'inherit' });
}

async function recoverDocumentPersistence() {
  const failed = await migrationFailure(DOCUMENTS);
  if (!failed) {
    console.log('[migration-recovery] no open document-persistence failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) throw new Error('Refusing recovery: document migration partially applied');
  await requireUuidColumns([['Organization','id'],['Account','id']]);
  await requireTablesAbsent(['DocumentTemplate','ManagedDocument','DocumentLifecycleEvent','DocumentReferenceCounter','DocumentRevision','DocumentBrandSnapshot','OrganizationDocumentAsset']);
  const enumRows = await prisma.$queryRawUnsafe(`SELECT typname FROM pg_type WHERE typname IN ('ManagedDocumentStatus','DocumentTemplateStatus')`);
  if (enumRows.length) throw new Error('Refusing recovery: document enum types already exist');

  const sql = [
    `CREATE TYPE "ManagedDocumentStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ARCHIVED')`,
    `CREATE TYPE "DocumentTemplateStatus" AS ENUM ('ACTIVE','INACTIVE')`,
    `CREATE TABLE "DocumentTemplate" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"code" TEXT NOT NULL,"titleAr" TEXT NOT NULL,"titleEn" TEXT NOT NULL,"department" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"status" "DocumentTemplateStatus" NOT NULL DEFAULT 'ACTIVE',"printable" BOOLEAN NOT NULL DEFAULT true,"fields" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "DocumentTemplate_organizationId_code_version_key" ON "DocumentTemplate"("organizationId","code","version")`,
    `CREATE INDEX "DocumentTemplate_organizationId_department_status_idx" ON "DocumentTemplate"("organizationId","department","status")`,
    `ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE TABLE "ManagedDocument" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"templateId" UUID NOT NULL,"referenceNumber" TEXT NOT NULL,"department" TEXT NOT NULL,"status" "ManagedDocumentStatus" NOT NULL DEFAULT 'DRAFT',"version" INTEGER NOT NULL DEFAULT 1,"contentHash" TEXT NOT NULL,"documentBrandVersion" INTEGER,"payload" JSONB NOT NULL,"createdByAccountId" UUID NOT NULL,"approvedByAccountId" UUID,"signedByAccountId" UUID,"archivedByAccountId" UUID,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,"approvedAt" TIMESTAMP(3),"signedAt" TIMESTAMP(3),"archivedAt" TIMESTAMP(3),CONSTRAINT "ManagedDocument_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "ManagedDocument_organizationId_referenceNumber_key" ON "ManagedDocument"("organizationId","referenceNumber")`,
    `CREATE INDEX "ManagedDocument_organizationId_department_status_idx" ON "ManagedDocument"("organizationId","department","status")`,
    `CREATE INDEX "ManagedDocument_templateId_status_idx" ON "ManagedDocument"("templateId","status")`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_signedByAccountId_fkey" FOREIGN KEY ("signedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_archivedByAccountId_fkey" FOREIGN KEY ("archivedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE TABLE "DocumentLifecycleEvent" ("id" UUID NOT NULL,"documentId" UUID NOT NULL,"actorAccountId" UUID NOT NULL,"action" TEXT NOT NULL,"fromStatus" "ManagedDocumentStatus","toStatus" "ManagedDocumentStatus" NOT NULL,"version" INTEGER NOT NULL,"metadata" JSONB,"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DocumentLifecycleEvent_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX "DocumentLifecycleEvent_documentId_occurredAt_idx" ON "DocumentLifecycleEvent"("documentId","occurredAt")`,
    `CREATE INDEX "DocumentLifecycleEvent_actorAccountId_occurredAt_idx" ON "DocumentLifecycleEvent"("actorAccountId","occurredAt")`,
    `ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "DocumentLifecycleEvent" ADD CONSTRAINT "DocumentLifecycleEvent_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE TABLE "DocumentReferenceCounter" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"department" TEXT NOT NULL,"year" INTEGER NOT NULL,"lastNumber" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "DocumentReferenceCounter_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "DocumentReferenceCounter_organizationId_department_year_key" ON "DocumentReferenceCounter"("organizationId","department","year")`,
    `CREATE INDEX "DocumentReferenceCounter_organizationId_year_idx" ON "DocumentReferenceCounter"("organizationId","year")`,
    `ALTER TABLE "DocumentReferenceCounter" ADD CONSTRAINT "DocumentReferenceCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE TABLE "DocumentRevision" ("id" UUID NOT NULL,"documentId" UUID NOT NULL,"version" INTEGER NOT NULL,"contentHash" TEXT NOT NULL,"payload" JSONB NOT NULL,"createdByAccountId" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "DocumentRevision_documentId_version_key" ON "DocumentRevision"("documentId","version")`,
    `CREATE INDEX "DocumentRevision_documentId_createdAt_idx" ON "DocumentRevision"("documentId","createdAt")`,
    `CREATE INDEX "DocumentRevision_createdByAccountId_createdAt_idx" ON "DocumentRevision"("createdByAccountId","createdAt")`,
    `ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "Organization" ADD COLUMN "documentLogoUrl" TEXT, ADD COLUMN "documentBrandNameAr" TEXT, ADD COLUMN "documentBrandNameEn" TEXT, ADD COLUMN "documentFooterAr" TEXT, ADD COLUMN "documentFooterEn" TEXT, ADD COLUMN "documentBrandVersion" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "documentLogoAssetId" TEXT`,
    `CREATE TABLE "DocumentBrandSnapshot" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"brandVersion" INTEGER NOT NULL,"logoUrl" TEXT,"logoAssetId" TEXT,"brandNameAr" TEXT,"brandNameEn" TEXT,"footerAr" TEXT,"footerEn" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DocumentBrandSnapshot_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "DocumentBrandSnapshot_organizationId_brandVersion_key" ON "DocumentBrandSnapshot"("organizationId","brandVersion")`,
    `CREATE INDEX "DocumentBrandSnapshot_organizationId_createdAt_idx" ON "DocumentBrandSnapshot"("organizationId","createdAt")`,
    `ALTER TABLE "DocumentBrandSnapshot" ADD CONSTRAINT "DocumentBrandSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `INSERT INTO "DocumentBrandSnapshot" ("id","organizationId","brandVersion","brandNameAr","brandNameEn","createdAt") SELECT gen_random_uuid(),"id",1,"displayName","displayName",CURRENT_TIMESTAMP FROM "Organization"`,
    `CREATE TABLE "OrganizationDocumentAsset" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"kind" TEXT NOT NULL,"mimeType" TEXT NOT NULL,"byteSize" INTEGER NOT NULL,"sha256" TEXT NOT NULL,"content" BYTEA NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "OrganizationDocumentAsset_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "OrganizationDocumentAsset_organizationId_sha256_key" ON "OrganizationDocumentAsset"("organizationId","sha256")`,
    `CREATE INDEX "OrganizationDocumentAsset_organizationId_kind_createdAt_idx" ON "OrganizationDocumentAsset"("organizationId","kind","createdAt")`,
    `ALTER TABLE "OrganizationDocumentAsset" ADD CONSTRAINT "OrganizationDocumentAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
  ];
  await prisma.$transaction(sql.map((statement) => prisma.$executeRawUnsafe(statement)));
  markApplied(DOCUMENTS);
  markApplied(DOCUMENT_COUNTER);
  markApplied(DOCUMENT_REVISIONS);
  markApplied(DOCUMENT_BRANDING);
  console.log('[migration-recovery] document persistence chain recovered with UUID-compatible schema');
}

async function recoverHr() {
  const failed = await migrationFailure(HR);
  if (!failed) {
    console.log('[migration-recovery] no open HR failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) {
    throw new Error('Refusing recovery: HR migration partially applied');
  }

  await requireUuidColumns([
    ['Person', 'id'], ['Account', 'id'], ['Organization', 'id'], ['OrgUnit', 'id'],
    ['Trip', 'id'], ['FinanceEntry', 'id'],
  ]);
  await requireTablesAbsent(['HrCandidate']);

  const hrStatements = [
    `CREATE TABLE "HrCandidate" (
      "id" UUID NOT NULL,
      "organizationId" UUID NOT NULL,
      "personId" UUID NOT NULL,
      "status" "HrRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
      "verifiedByAccountId" UUID,
      "verifiedAt" TIMESTAMP(3),
      "verificationNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "HrCandidate_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX "HrCandidate_organizationId_status_idx" ON "HrCandidate"("organizationId","status")`,
    `CREATE UNIQUE INDEX "HrCandidate_organizationId_personId_key" ON "HrCandidate"("organizationId","personId")`,
    `ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_verifiedByAccountId_fkey" FOREIGN KEY ("verifiedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  ];
  await prisma.$transaction(hrStatements.map((sql) => prisma.$executeRawUnsafe(sql)));
  markApplied(HR);
  console.log('[migration-recovery] HR recovered');
}

async function recoverFinance() {
  const failed = await migrationFailure(FINANCE);
  if (!failed) {
    console.log('[migration-recovery] no open finance failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) {
    throw new Error('Refusing recovery: finance migration partially applied');
  }

  await requireUuidColumns([
    ['Account', 'id'], ['FinanceEntry', 'id'],
  ]);

  const postedByType = await columnType('FinanceEntry', 'postedByAccountId');
  if (postedByType && postedByType !== 'text' && postedByType !== 'uuid') {
    throw new Error(`Refusing recovery: FinanceEntry.postedByAccountId has unexpected type ${postedByType}`);
  }

  if (postedByType === 'text') {
    const invalidValues = await prisma.$queryRawUnsafe(
      `SELECT 1
         FROM "FinanceEntry"
        WHERE "postedByAccountId" IS NOT NULL
          AND "postedByAccountId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        LIMIT 1`,
    );
    if (invalidValues.length) {
      throw new Error('Refusing recovery: FinanceEntry.postedByAccountId contains a non-UUID value');
    }
  }

  const financeStatements = [];
  if (!postedByType) {
    financeStatements.push(
      `ALTER TABLE "FinanceEntry" ADD COLUMN "postedByAccountId" UUID`,
    );
  } else if (postedByType === 'text') {
    financeStatements.push(
      `ALTER TABLE "FinanceEntry" ALTER COLUMN "postedByAccountId" TYPE UUID USING "postedByAccountId"::uuid`,
    );
  }
  financeStatements.push(
    `CREATE INDEX IF NOT EXISTS "FinanceEntry_postedByAccountId_idx" ON "FinanceEntry"("postedByAccountId")`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FinanceEntry_postedByAccountId_fkey') THEN
        ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_postedByAccountId_fkey"
        FOREIGN KEY ("postedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$`,
  );

  await prisma.$transaction(financeStatements.map((sql) => prisma.$executeRawUnsafe(sql)));
  if (await columnType('FinanceEntry', 'postedByAccountId') !== 'uuid') {
    throw new Error('Finance recovery failed: FinanceEntry.postedByAccountId is not uuid');
  }
  markApplied(FINANCE);
  console.log('[migration-recovery] finance posting recovered with UUID-compatible provenance');
}

async function recoverAdministrativeAffairs() {
  const failed = await migrationFailure(ADMIN);
  if (!failed) {
    console.log('[migration-recovery] no open administrative-affairs failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) {
    throw new Error('Refusing recovery: administrative-affairs migration partially applied');
  }

  await requireUuidColumns([
    ['Organization', 'id'], ['OrgUnit', 'id'], ['Account', 'id'],
  ]);
  await requireTablesAbsent([
    'AdministrativeRecord', 'AdministrativeRouting', 'AdministrativeMeeting',
  ]);

  const adminStatements = [
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='AdministrativeRecordDbStatus') THEN
        CREATE TYPE "AdministrativeRecordDbStatus" AS ENUM ('DRAFT','REGISTERED','ARCHIVED');
      END IF;
    END $$`,
    `CREATE TABLE "AdministrativeRecord" (
      "id" UUID NOT NULL,
      "organizationId" UUID NOT NULL,
      "unitId" UUID NOT NULL,
      "type" TEXT NOT NULL,
      "referenceNumber" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "status" "AdministrativeRecordDbStatus" NOT NULL DEFAULT 'DRAFT',
      "ownerAccountId" UUID NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AdministrativeRecord_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE "AdministrativeRouting" (
      "id" UUID NOT NULL,
      "organizationId" UUID NOT NULL,
      "recordId" UUID NOT NULL,
      "fromUnitId" UUID NOT NULL,
      "toUnitId" UUID NOT NULL,
      "requestedByAccountId" UUID NOT NULL,
      "assignedToAccountId" UUID,
      "decision" TEXT,
      "decidedByAccountId" UUID,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "decidedAt" TIMESTAMP(3),
      CONSTRAINT "AdministrativeRouting_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE "AdministrativeMeeting" (
      "id" UUID NOT NULL,
      "organizationId" UUID NOT NULL,
      "unitId" UUID NOT NULL,
      "title" TEXT NOT NULL,
      "scheduledAt" TIMESTAMP(3) NOT NULL,
      "organizerAccountId" UUID NOT NULL,
      "participantAccountIds" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AdministrativeMeeting_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX "AdministrativeRecord_organizationId_referenceNumber_key" ON "AdministrativeRecord"("organizationId","referenceNumber")`,
    `CREATE INDEX "AdministrativeRecord_organizationId_unitId_status_idx" ON "AdministrativeRecord"("organizationId","unitId","status")`,
    `CREATE INDEX "AdministrativeRouting_organizationId_recordId_idx" ON "AdministrativeRouting"("organizationId","recordId")`,
    `CREATE INDEX "AdministrativeRouting_assignedToAccountId_decision_idx" ON "AdministrativeRouting"("assignedToAccountId","decision")`,
    `CREATE INDEX "AdministrativeMeeting_organizationId_unitId_scheduledAt_idx" ON "AdministrativeMeeting"("organizationId","unitId","scheduledAt")`,
    `ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRecord" ADD CONSTRAINT "AdministrativeRecord_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AdministrativeRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_assignedToAccountId_fkey" FOREIGN KEY ("assignedToAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeRouting" ADD CONSTRAINT "AdministrativeRouting_decidedByAccountId_fkey" FOREIGN KEY ("decidedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "AdministrativeMeeting" ADD CONSTRAINT "AdministrativeMeeting_organizerAccountId_fkey" FOREIGN KEY ("organizerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
  ];

  await prisma.$transaction(adminStatements.map((sql) => prisma.$executeRawUnsafe(sql)));
  markApplied(ADMIN);
  console.log('[migration-recovery] administrative affairs recovered with UUID-compatible schema');
}

async function recoverUnifiedCalendar() {
  const failed = await migrationFailure(CALENDAR);
  if (!failed) {
    console.log('[migration-recovery] no open unified-calendar failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) {
    throw new Error('Refusing recovery: unified-calendar migration partially applied');
  }

  if (await columnType('Trip', 'id') !== 'uuid') {
    throw new Error('Refusing recovery: Trip.id is not uuid');
  }
  if (await columnType('CalendarAllocation', 'tripId') !== 'uuid') {
    throw new Error('Refusing recovery: CalendarAllocation.tripId is not uuid');
  }
  if (await columnType('CalendarAllocation', 'id') !== 'text') {
    throw new Error('Refusing recovery: CalendarAllocation.id is not text');
  }
  if (await columnType('CalendarEvent', 'id')) {
    throw new Error('Refusing recovery: CalendarEvent already exists');
  }
  if (await columnType('CalendarAllocation', 'eventId')) {
    throw new Error('Refusing recovery: CalendarAllocation.eventId already exists');
  }

  const calendarStatements = [
    `CREATE TABLE "CalendarEvent" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT,
      "type" TEXT NOT NULL,
      "referenceType" TEXT NOT NULL,
      "referenceId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "startsAt" TIMESTAMP(3) NOT NULL,
      "endsAt" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX "CalendarEvent_referenceType_referenceId_key" ON "CalendarEvent"("referenceType","referenceId")`,
    `CREATE INDEX "CalendarEvent_organizationId_startsAt_endsAt_idx" ON "CalendarEvent"("organizationId","startsAt","endsAt")`,
    `CREATE INDEX "CalendarEvent_type_status_startsAt_idx" ON "CalendarEvent"("type","status","startsAt")`,
    `ALTER TABLE "CalendarAllocation" ADD COLUMN "eventId" TEXT`,
    `INSERT INTO "CalendarEvent" ("id","type","referenceType","referenceId","title","startsAt","endsAt","status","createdAt","updatedAt")
     SELECT gen_random_uuid()::text,'TRIP','TRIP',t."id"::text,t."title",t."startsAt",t."endsAt",
            CASE WHEN t."status"::text='CANCELLED' THEN 'CANCELLED' ELSE 'ACTIVE' END,
            CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
       FROM "Trip" t
      WHERE EXISTS (SELECT 1 FROM "CalendarAllocation" ca WHERE ca."tripId"=t."id")`,
    `UPDATE "CalendarAllocation" ca
        SET "eventId"=ce."id"
       FROM "CalendarEvent" ce
      WHERE ce."referenceType"='TRIP' AND ce."referenceId"=ca."tripId"::text`,
    `ALTER TABLE "CalendarAllocation" ALTER COLUMN "eventId" SET NOT NULL`,
    `ALTER TABLE "CalendarAllocation" DROP CONSTRAINT IF EXISTS "CalendarAllocation_tripId_fkey"`,
    `DROP INDEX IF EXISTS "CalendarAllocation_tripId_status_idx"`,
    `ALTER TABLE "CalendarAllocation" DROP COLUMN "tripId"`,
    `ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE INDEX "CalendarAllocation_eventId_status_idx" ON "CalendarAllocation"("eventId","status")`,
  ];

  await prisma.$transaction(calendarStatements.map((sql) => prisma.$executeRawUnsafe(sql)));
  markApplied(CALENDAR);
  console.log('[migration-recovery] unified calendar recovered with explicit UUID-to-text conversion');
}

async function main() {
  await recoverHr();
  await recoverAdministrativeAffairs();
  await recoverUnifiedCalendar();
  await recoverFinance();
  await recoverDocumentPersistence();
}

main().finally(() => prisma.$disconnect());
