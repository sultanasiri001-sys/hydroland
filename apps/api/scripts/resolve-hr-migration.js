const { execFileSync } = require('node:child_process');

const migration = '20260916070000_hr_candidate_verification_workflow';

if (process.env.ALLOW_HR_MIGRATION_RECOVERY !== 'true') {
  console.error('Refusing migration recovery: set ALLOW_HR_MIGRATION_RECOVERY=true for this one-time operation.');
  process.exit(1);
}

console.log(`Marking ${migration} as rolled back...`);
execFileSync('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', migration], {
  stdio: 'inherit',
  env: process.env,
});
console.log('Migration recovery completed. Remove this script/flag after validation.');
