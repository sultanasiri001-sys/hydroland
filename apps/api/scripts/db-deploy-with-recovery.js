const { execFileSync } = require('node:child_process');

const migration = '20260916070000_hr_candidate_verification_workflow';

function prisma(args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit', env: process.env });
}

try {
  prisma(['migrate', 'resolve', '--rolled-back', migration]);
  console.log(`Recovery marker applied for ${migration}.`);
} catch (error) {
  console.log(`Recovery marker was not applied (likely already resolved); continuing to migrate deploy.`);
}

prisma(['migrate', 'deploy']);
