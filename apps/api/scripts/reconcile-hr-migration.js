const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const migration = '20260916191500_hr_candidate_verification_fields';

function runPrisma(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit', env: process.env });
}

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
    FROM "_prisma_migrations"
    WHERE migration_name = '${migration}'
    ORDER BY started_at DESC
  `);

  if (rows.some((row) => row.finished_at && !row.rolled_back_at)) {
    console.log(`[db] ${migration} already applied; reconciliation skipped.`);
    return;
  }

  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WorkforceHiringRequest'
      AND column_name IN ('hrReviewedById','source','hrVerification','hrNote','hrReviewedAt')
  `);
  const names = new Set(columns.map((row) => row.column_name));
  const required = ['hrReviewedById','source','hrVerification','hrNote','hrReviewedAt'];
  if (!required.every((name) => names.has(name))) {
    throw new Error('HR migration cannot be reconciled: expected physical columns are incomplete.');
  }

  const fk = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM pg_constraint
    WHERE conname='WorkforceHiringRequest_hrReviewedById_fkey'
  `);
  const idx = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='WorkforceHiringRequest'
      AND indexname='WorkforceHiringRequest_hrReviewedById_status_idx'
  `);
  const defaultRows = await prisma.$queryRawUnsafe(`
    SELECT column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='WorkforceHiringRequest' AND column_name='status'
  `);
  const statusDefault = String(defaultRows[0]?.column_default || '');
  if (!fk.length || !idx.length || !statusDefault.includes('PENDING_HR_REVIEW')) {
    throw new Error('HR migration cannot be reconciled: FK/index/status default do not match the intended migration.');
  }

  console.log(`[db] Physical HR schema verified; marking ${migration} applied.`);
  runPrisma(['migrate', 'resolve', '--applied', migration]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
