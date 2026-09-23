import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma = new PrismaClient();
const HR = '20260923092000_hr_candidate_verification';
const ADMIN = '20260923102000_administrative_affairs_persistence';
const CALENDAR = '20260923114000_unified_calendar_events';

async function columnType(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table, column,
  );
  return rows[0]?.data_type ?? null;
}
async function migrationState(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" WHERE migration_name=$1 ORDER BY started_at DESC LIMIT 1`,
    name,
  );
  return rows[0] ?? null;
}
function resolveApplied(name) {
  execFileSync('npx', ['prisma','migrate','resolve','--applied',name], { stdio:'inherit' });
}
async function execTransaction(statements) {
  await prisma.$transaction(statements.map((sql) => prisma.$executeRawUnsafe(sql)));
}
async function assertUuidFoundation() {
  for (const [table, col] of [['Person','id'],['Account','id'],['Organization','id'],['OrgUnit','id'],['Trip','id'],['FinanceEntry','id']]) {
    if (await columnType(table,col) !== 'uuid') throw new Error(`Refusing recovery: ${table}.${col} is not uuid`);
  }
}
async function recoverHr() {
  const state = await migrationState(HR);
  if (!state || state.finished_at) return;
  if (state.applied_steps_count !== 0) throw new Error('Refusing recovery: HR migration partially applied');
  if (!state.rolled_back_at) throw new Error('Refusing recovery: HR failure must be rolled back first');
}
async function recoverAdmin() {
  const state = await migrationState(ADMIN);
  if (!state || state.finished_at) return;
  if (state.applied_steps_count !== 0) throw new Error('Refusing recovery: admin migration partially applied');
  if (await columnType('AdministrativeRecord','id')) throw new Error('Refusing recovery: AdministrativeRecord unexpectedly exists');
  const s = [
    `CREATE TYPE "AdministrativeRecordDbStatus" AS ENUM ('DRAFT','REGISTERED','ARCHIVED')`,
    `CREATE TABLE "AdministrativeRecord" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"unitId" UUID NOT NULL,"type" TEXT NOT NULL,"referenceNumber" TEXT NOT NULL,"subject" TEXT NOT NULL,"status" "AdministrativeRecordDbStatus" NOT NULL DEFAULT 'DRAFT',"ownerAccountId" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "AdministrativeRecord_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE "AdministrativeRouting" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"recordId" UUID NOT NULL,"fromUnitId" UUID NOT NULL,"toUnitId" UUID NOT NULL,"requestedByAccountId" UUID NOT NULL,"assignedToAccountId" UUID,"decision" TEXT,"decidedByAccountId" UUID,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"decidedAt" TIMESTAMP(3),CONSTRAINT "AdministrativeRouting_pkey" PRIMARY KEY ("id"))`,
    `CREATE TABLE "AdministrativeMeeting" ("id" UUID NOT NULL,"organizationId" UUID NOT NULL,"unitId" UUID NOT NULL,"title" TEXT NOT NULL,"scheduledAt" TIMESTAMP(3) NOT NULL,"organizerAccountId" UUID NOT NULL,"participantAccountIds" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "AdministrativeMeeting_pkey" PRIMARY KEY ("id"))`,
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
  await execTransaction(s);
  resolveApplied(ADMIN);
  console.log('[migration-recovery] administrative affairs recovered');
}
async function recoverCalendar() {
  const state = await migrationState(CALENDAR);
  if (state?.finished_at) return;
  if (state && state.applied_steps_count !== 0) throw new Error('Refusing recovery: calendar migration partially applied');
  if (await columnType('CalendarEvent','id')) throw new Error('Refusing recovery: CalendarEvent unexpectedly exists');
  if (await columnType('CalendarAllocation','tripId') !== 'uuid') throw new Error('Refusing recovery: CalendarAllocation.tripId is not uuid');
  const integrity = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "tripId" IS NULL)::int AS null_trip, COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Trip" t WHERE t.id=ca."tripId"))::int AS orphan_trip FROM "CalendarAllocation" ca`);
  if (integrity[0].null_trip || integrity[0].orphan_trip) throw new Error('Refusing recovery: calendar allocation integrity check failed');
  const s = [
    `CREATE TABLE "CalendarEvent" ("id" UUID NOT NULL,"organizationId" UUID,"type" TEXT NOT NULL,"referenceType" TEXT NOT NULL,"referenceId" TEXT NOT NULL,"title" TEXT NOT NULL,"startsAt" TIMESTAMP(3) NOT NULL,"endsAt" TIMESTAMP(3) NOT NULL,"status" TEXT NOT NULL DEFAULT 'ACTIVE',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX "CalendarEvent_referenceType_referenceId_key" ON "CalendarEvent"("referenceType","referenceId")`,
    `CREATE INDEX "CalendarEvent_organizationId_startsAt_endsAt_idx" ON "CalendarEvent"("organizationId","startsAt","endsAt")`,
    `CREATE INDEX "CalendarEvent_type_status_startsAt_idx" ON "CalendarEvent"("type","status","startsAt")`,
    `ALTER TABLE "CalendarAllocation" ADD COLUMN "eventId" UUID`,
    `INSERT INTO "CalendarEvent" ("id","type","referenceType","referenceId","title","startsAt","endsAt","status","createdAt","updatedAt") SELECT gen_random_uuid(),'TRIP','TRIP',t."id"::text,t."title",t."startsAt",t."endsAt",CASE WHEN t."status"::text='CANCELLED' THEN 'CANCELLED' ELSE 'ACTIVE' END,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Trip" t WHERE EXISTS (SELECT 1 FROM "CalendarAllocation" ca WHERE ca."tripId"=t."id")`,
    `UPDATE "CalendarAllocation" ca SET "eventId"=ce."id" FROM "CalendarEvent" ce WHERE ce."referenceType"='TRIP' AND ce."referenceId"=ca."tripId"::text`,
    `ALTER TABLE "CalendarAllocation" ALTER COLUMN "eventId" SET NOT NULL`,
    `ALTER TABLE "CalendarAllocation" DROP CONSTRAINT IF EXISTS "CalendarAllocation_tripId_fkey"`,
    `DROP INDEX IF EXISTS "CalendarAllocation_tripId_status_idx"`,
    `ALTER TABLE "CalendarAllocation" DROP COLUMN "tripId"`,
    `ALTER TABLE "CalendarAllocation" ADD CONSTRAINT "CalendarAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `CREATE INDEX "CalendarAllocation_eventId_status_idx" ON "CalendarAllocation"("eventId","status")`,
  ];
  await execTransaction(s);
  resolveApplied(CALENDAR);
  console.log('[migration-recovery] unified calendar recovered');
}
async function stageFinance() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "FinanceEntry" ADD COLUMN IF NOT EXISTS "postedByAccountId" UUID`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinanceEntry_postedByAccountId_idx" ON "FinanceEntry"("postedByAccountId")`);
  const fk = await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_constraint WHERE conname='FinanceEntry_postedByAccountId_fkey'`);
  if (!fk.length) await prisma.$executeRawUnsafe(`ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_postedByAccountId_fkey" FOREIGN KEY ("postedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
  console.log('[migration-recovery] finance UUID compatibility staged');
}
async function main() {
  await assertUuidFoundation();
  await recoverHr();
  await recoverAdmin();
  await recoverCalendar();
  await stageFinance();
}
main().finally(()=>prisma.$disconnect());
