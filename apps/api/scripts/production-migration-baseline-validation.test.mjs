import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = readFileSync(new URL('./production-migration-baseline-validation.mjs', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
for (const scenario of ['append-existing', 'replace-existing-hash', 'remove-existing', 'append-with-sql-edit', 'append-new-sql', 'sql-edit-only']) {
  const root = mkdtempSync(join(tmpdir(), 'hydroland-migration-guard-'));
  try {
    const scripts = join(root, 'apps/api/scripts'), prisma = join(root, 'apps/api/prisma');
    mkdirSync(scripts, { recursive: true });
    const script = join(scripts, 'production-migration-baseline-validation.mjs');
    writeFileSync(script, source);
    const sqlFile = name => join(prisma, 'migrations', name, 'migration.sql');
    const sql = (name, value) => { mkdirSync(join(prisma, 'migrations', name), { recursive: true }); writeFileSync(sqlFile(name), value); return { name, sha256: digest(value) }; };
    const alpha = sql('alpha', 'SELECT 1;\n'), beta = sql('beta', 'SELECT 2;\n');
    const manifest = entries => writeFileSync(join(prisma, 'production-migration-baseline.json'), JSON.stringify({ migrations: entries }));
    const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    manifest([alpha]);
    git(['init', '-b', 'main']); git(['config', 'user.email', 'fixture@example.invalid']); git(['config', 'user.name', 'Isolated guard fixture']);
    git(['add', '.']); git(['commit', '-m', 'base']); git(['checkout', '-b', 'candidate']);
    if (scenario === 'append-existing') manifest([alpha, beta]);
    if (scenario === 'replace-existing-hash') manifest([sql('alpha', 'SELECT 99;\n'), beta]);
    if (scenario === 'remove-existing') manifest([beta]);
    if (scenario === 'append-with-sql-edit') manifest([alpha, sql('beta', 'SELECT 99;\n')]);
    if (scenario === 'append-new-sql') manifest([alpha, beta, sql('gamma', 'SELECT 3;\n')]);
    if (scenario === 'sql-edit-only') sql('alpha', 'SELECT 99;\n');
    git(['add', '.']); git(['commit', '-m', scenario]);
    const result = spawnSync(process.execPath, [script, '--check-release-diff'], { cwd: root, env: { ...process.env, HYDROLAND_MIGRATION_DIFF_BASE: 'main' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, scenario === 'append-existing' ? 0 : 1, scenario + ': ' + result.stdout + result.stderr);
    if (scenario === 'replace-existing-hash' || scenario === 'remove-existing') assert.match(result.stderr, /Existing production baseline entry removed or changed/);
    if (scenario === 'append-with-sql-edit' || scenario === 'append-new-sql') assert.match(result.stderr, /cannot change in the same pull request/);
    if (scenario === 'sql-edit-only') assert.match(result.stderr, /Checksum mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
console.log('Migration baseline guard passed: additive existing-file audit allowed; replacement, removal, concurrent SQL edits, new SQL and standalone tampering denied.');
