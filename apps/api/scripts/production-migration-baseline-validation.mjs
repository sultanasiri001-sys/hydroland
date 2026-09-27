import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const manifestPath = resolve(repositoryRoot, 'apps/api/prisma/production-migration-baseline.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedByPath = new Map();
const errors = [];

for (const entry of manifest.migrations) {
  const relativePath = `apps/api/prisma/migrations/${entry.name}/migration.sql`;
  if (expectedByPath.has(relativePath)) errors.push(`Duplicate baseline entry: ${relativePath}`);
  expectedByPath.set(relativePath, entry.sha256);

  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`Missing production-applied migration file: ${relativePath}`);
    continue;
  }

  const actual = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
  if (actual !== entry.sha256) errors.push(`Checksum mismatch for ${relativePath}: expected ${entry.sha256}, got ${actual}`);
}

if (process.argv.includes('--check-release-diff')) {
  const base = process.env.HYDROLAND_MIGRATION_DIFF_BASE || 'origin/main';
  const changedText = execFileSync('git', [
    'diff', '--name-only', '--diff-filter=MDR', `${base}...HEAD`, '--',
    'apps/api/prisma/migrations/*/migration.sql',
  ], { cwd: repositoryRoot, encoding: 'utf8' });
  const changedPaths = changedText.split(/\r?\n/).filter(Boolean);

  for (const relativePath of changedPaths) {
    if (!expectedByPath.has(relativePath)) {
      errors.push(`Unapproved historical migration change: ${relativePath}`);
      continue;
    }
    if (!existsSync(resolve(repositoryRoot, relativePath))) {
      errors.push(`Approved migration restoration was deleted: ${relativePath}`);
    }
  }

  if (!errors.length) console.log(`Release diff verified: ${changedPaths.length} historical changes match the production-applied checksum baseline.`);
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Validated ${manifest.migrations.length} production-applied Prisma migration checksums.`);
}
