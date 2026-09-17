const { execFileSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const migration = '20260917173000_compliance_assessment_persistence';

function runPrisma(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit', env: process.env });
}

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    WHERE migration_name = '${migration}'
    ORDER BY started_at DESC
  `);

  if (!rows.length || rows.some((row) => row.finished_at && !row.rolled_back_at)) {
    console.log(`[db] ${migration} has no failed state requiring recovery.`);
    return;
  }

  const failed = rows.find((row) => !row.finished_at && !row.rolled_back_at);
  if (!failed) {
    console.log(`[db] ${migration} has no unresolved failed attempt.`);
    return;
  }

  console.log(`[db] Recovering failed ${migration}: removing only its new partial tables.`);
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ComplianceEvidence" CASCADE');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ComplianceAssessment" CASCADE');
  runPrisma(['migrate', 'resolve', '--rolled-back', migration]);
  console.log(`[db] ${migration} marked rolled back; corrected migration can now deploy.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
