import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';

const prisma = new PrismaClient();
const HR = '20260923092000_hr_candidate_verification';

async function columnType(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table, column,
  );
  return rows[0]?.data_type ?? null;
}

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
       FROM "_prisma_migrations" WHERE migration_name=$1 ORDER BY started_at DESC LIMIT 1`,
    HR,
  );
  const failed = rows[0];
  if (!failed || failed.finished_at || failed.rolled_back_at) {
    console.log('[migration-recovery] no open HR failure; no-op');
    return;
  }
  if (failed.applied_steps_count !== 0) throw new Error('Refusing recovery: HR migration partially applied');

  for (const [table, col] of [['Person','id'],['Account','id'],['Organization','id'],['OrgUnit','id'],['Trip','id'],['FinanceEntry','id']]) {
    if (await columnType(table,col) !== 'uuid') throw new Error(`Refusing recovery: ${table}.${col} is not uuid`);
  }
  if (await columnType('HrCandidate','id')) throw new Error('Refusing recovery: HrCandidate already exists');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "HrCandidate" (
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
    );
    CREATE INDEX "HrCandidate_organizationId_status_idx" ON "HrCandidate"("organizationId","status");
    CREATE UNIQUE INDEX "HrCandidate_organizationId_personId_key" ON "HrCandidate"("organizationId","personId");
    ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_verifiedByAccountId_fkey" FOREIGN KEY ("verifiedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  `);

  execFileSync('npx', ['prisma','migrate','resolve','--applied',HR], { stdio:'inherit' });

  // Pre-create UUID-compatible structures so immutable historical migrations become idempotent/no-op where possible.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FinanceEntry" ADD COLUMN IF NOT EXISTS "postedByAccountId" UUID;
    CREATE INDEX IF NOT EXISTS "FinanceEntry_postedByAccountId_idx" ON "FinanceEntry"("postedByAccountId");
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FinanceEntry_postedByAccountId_fkey') THEN
        ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_postedByAccountId_fkey"
        FOREIGN KEY ("postedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('[migration-recovery] HR recovered; finance UUID compatibility staged');
}
main().finally(()=>prisma.$disconnect());
