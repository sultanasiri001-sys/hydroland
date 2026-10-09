import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Offline artifact preparation/verification only. Never connects to a database.
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(apiRoot, '../..');
const candidate = join(apiRoot, 'prisma-fresh-install-candidate');
export const baselineName = '00000000000000_fresh_install_baseline';
const digest = text => createHash('sha256').update(text).digest('hex');

async function expectedArtifact() {
  const schema = await readFile(join(apiRoot, 'prisma/schema.prisma'), 'utf8');
  const core = execFileSync(process.execPath, [join(repoRoot, 'node_modules/prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', join(apiRoot, 'prisma/schema.prisma'), '--script'], { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  assert.ok(core.includes('CREATE TABLE'), 'Canonical baseline has no tables');
  const components = [{ source: 'prisma/schema.prisma', sha256: digest(core) }];
  let sql = '-- CANDIDATE: empty installations only; not an existing-database migration.\n' + core;
  const names = [];
  for (const file of ['bootstrap-equipment-runtime-schema.mjs', 'bootstrap-trip-weather-runtime-schema.mjs', 'bootstrap-messaging-runtime-schema.mjs']) {
    const source = await readFile(join(apiRoot, 'scripts', file), 'utf8');
    const list = source.match(/const migrations\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(list, 'Missing operational migration list: ' + file);
    const found = [...list[1].matchAll(/'(20[0-9]{12}_[a-z0-9_]+)'/g)].map(match => match[1]);
    assert.ok(found.length, 'Empty operational migration list: ' + file);
    names.push(...found);
  }
  names.push('20260930080000_audit_event_append_only');
  assert.equal(new Set(names).size, names.length, 'Duplicate raw SQL components');
  for (const name of names) {
    const text = await readFile(join(apiRoot, 'prisma/migrations', name, 'migration.sql'), 'utf8');
    components.push({ source: 'prisma/migrations/' + name + '/migration.sql', sha256: digest(text) });
    sql += '\n-- Exact raw SQL component: ' + name + '\n' + text + '\n';
  }
  return { schema, sql, manifest: { status: 'CANDIDATE_NOT_PRODUCTION_APPROVED', baselineName, schemaSha256: digest(schema), baselineSha256: digest(sql), components, historicalLedgerReplacementApproved: false } };
}

export async function verifyFreshInstallCandidate() {
  const expected = await expectedArtifact();
  assert.equal(await readFile(join(candidate, 'schema.prisma'), 'utf8'), expected.schema, 'Candidate schema drift: future migrations/transition need review');
  assert.equal(await readFile(join(candidate, 'migrations', baselineName, 'migration.sql'), 'utf8'), expected.sql, 'Candidate SQL differs from canonical schema/raw SQL components');
  assert.deepEqual(JSON.parse(await readFile(join(candidate, 'manifest.json'), 'utf8')), expected.manifest, 'Candidate checksum manifest differs');
  assert.equal(await readFile(join(candidate, 'migrations/migration_lock.toml'), 'utf8'), 'provider = "postgresql"\n');
  return { candidate, ...expected.manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(['--write', '--verify'].includes(process.argv[2]), 'Use --write or --verify');
  if (process.argv[2] === '--write') {
    const expected = await expectedArtifact();
    await mkdir(join(candidate, 'migrations', baselineName), { recursive: true });
    await writeFile(join(candidate, 'schema.prisma'), expected.schema);
    await writeFile(join(candidate, 'migrations', baselineName, 'migration.sql'), expected.sql);
    await writeFile(join(candidate, 'migrations/migration_lock.toml'), 'provider = "postgresql"\n');
    await writeFile(join(candidate, 'manifest.json'), JSON.stringify(expected.manifest, null, 2) + '\n');
  }
  const verified = await verifyFreshInstallCandidate();
  console.log(JSON.stringify({ status: 'PASS', baselineName, schemaSha256: verified.schemaSha256, baselineSha256: verified.baselineSha256, rawComponentCount: verified.components.length - 1, productionApproved: false }));
}
