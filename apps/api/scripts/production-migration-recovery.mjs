import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma = new PrismaClient();
const HR = '20260923092000_hr_candidate_verification';
const ADMIN = '20260923102000_administrative_affairs_persistence';

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

  const financeStatements = [
    `ALTER TABLE "FinanceEntry" ADD COLUMN IF NOT EXISTS "postedByAccountId" UUID`,
    `CREATE INDEX IF NOT EXISTS "FinanceEntry_postedByAccountId_idx" ON "FinanceEntry"("postedByAccountId")`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FinanceEntry_postedByAccountId_fkey') THEN
        ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_postedByAccountId_fkey"
        FOREIGN KEY ("postedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$`,
  ];
  await prisma.$transaction(financeStatements.map((sql) => prisma.$executeRawUnsafe(sql)));
  console.log('[migration-recovery] HR recovered; finance UUID compatibility staged');
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

async function main() {
  await recoverHr();
  await recoverAdministrativeAffairs();
}

main().finally(() => prisma.$disconnect());
