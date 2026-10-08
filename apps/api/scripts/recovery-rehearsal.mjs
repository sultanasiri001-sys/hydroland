import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFreshInstallCandidate, baselineName } from './fresh-install-candidate.mjs';
import { verifyRawDomainCompletion, completionName } from './raw-domain-completion.mjs';
import { probeOrganizationForwardUpgrade, organizationRevision } from './organization-forward-recovery-probe.mjs';

// This is a local, synthetic restore rehearsal, never a production restore.
// Refuse other hosts/databases and verify the exact disposable Docker boundary
// before generating a schema, connecting with Prisma, or issuing any SQL.
const SOURCE = 'hydroland_rehearsal_source';
const TARGETS = ['hydroland_rehearsal_restore_1', 'hydroland_rehearsal_restore_2'];
const CONTAINER = 'phase11-postgres';
assert.equal(process.env.NODE_ENV, 'test', 'Recovery rehearsal requires NODE_ENV=test');
assert.equal(process.env.RECOVERY_REHEARSAL_CONFIRM, 'DISPOSABLE_LOCAL_ONLY', 'Explicit disposable-rehearsal confirmation required');
const baselineSource = process.env.RECOVERY_BASELINE_SOURCE || 'GENERATED_REFERENCE';
assert.ok(['GENERATED_REFERENCE', 'VERSIONED_CANDIDATE', 'VERSIONED_CANDIDATE_WITH_ORGANIZATIONS'].includes(baselineSource), 'Unknown baseline source');
const usesCandidate = baselineSource !== 'GENERATED_REFERENCE';
const sourceUrl = new URL(process.env.DATABASE_URL || '');
assert.equal(sourceUrl.protocol, 'postgresql:');
assert.equal(sourceUrl.hostname, '127.0.0.1', 'Remote database hosts are prohibited');
assert.equal(sourceUrl.port, '5432');
assert.equal(sourceUrl.username, 'hydroland');
assert.equal(sourceUrl.pathname, '/' + SOURCE, 'Only the disposable rehearsal database is allowed');
assert.equal(sourceUrl.search, '?schema=public');
const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', timeout: 120_000, maxBuffer: 128 * 1024 * 1024, ...options,
});
const docker = (args, options) => run('docker', args, options);
const inspection = JSON.parse(docker(['inspect', CONTAINER]))[0];
assert.equal(inspection.Name, '/' + CONTAINER);
assert.equal(inspection.Config.Labels?.['hydroland.recovery'], 'disposable-local');
assert.equal(inspection.State.Running, true);
assert.ok(inspection.Config.Env.includes('POSTGRES_DB=' + SOURCE));
const binding = inspection.HostConfig.PortBindings?.['5432/tcp'];
assert.ok(binding?.length === 1 && binding[0].HostIp === '127.0.0.1' && binding[0].HostPort === '5432', 'Rehearsal must bind only to loopback');

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(apiRoot, '../..');
const prismaCli = join(repoRoot, 'node_modules/prisma/build/index.js');
const evidenceDir = join(repoRoot, 'phase11-recovery-evidence');
await mkdir(evidenceDir, { recursive: true });
const report = {
  scope: 'SYNTHETIC_LOCAL_LOGICAL_RESTORE', sourceCommit: process.env.GITHUB_SHA || 'local',
  runId: process.env.GITHUB_RUN_ID || 'local', startedAt: new Date().toISOString(),
  status: 'RUNNING', productionRecoveryVerified: false, historicalProductionReplayVerified: false,
  baselineSource, freshInstallCandidateVerified: false,
  notes: ['No production credentials, records or provider were used.',
    'CI baseline migrations are actually executed; no migrate resolve or fabricated historical records.',
    'This tests a logical backup/restore of the current canonical schema plus its raw-SQL extensions.',
    'Provider PITR, real production backup restore and historical UUID/TEXT replay remain independent.'],
  checks: [],
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (name, condition) => { assert.ok(condition, name); report.checks.push({ name, status: 'PASS' }); };
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
async function assertAuditAppendOnly(client, label) {
  for (const query of ['UPDATE "AuditEvent" SET "action"=\'REHEARSAL_TAMPER\'', 'DELETE FROM "AuditEvent"', 'TRUNCATE "AuditEvent"']) {
    await assert.rejects(() => client.$executeRawUnsafe(query), error => String(error.message).includes('append-only'));
  }
  check(label + ':audit_update_delete_truncate_denied', true);
}
function sql(database, query) {
  assert.ok([SOURCE, ...TARGETS].includes(database));
  return docker(['exec', CONTAINER, 'psql', '-X', '-U', 'hydroland', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At', '-c', query]).trim();
}
function rows(database, query) {
  return JSON.parse(sql(database, `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM (${query}) t`));
}
function databaseUrl(name) { const value = new URL(sourceUrl); value.pathname = '/' + name; return value.href; }
function prisma(args, database = SOURCE) {
  return run(process.execPath, [prismaCli, ...args], { cwd: repoRoot, env: { ...process.env, DATABASE_URL: databaseUrl(database) } });
}
const schemaQueries = {
  tables: `SELECT c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.relreplident FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')`,
  columns: `SELECT table_name,column_name,ordinal_position,is_nullable,data_type,udt_schema,udt_name,column_default,character_maximum_length,numeric_precision,numeric_scale,datetime_precision,is_identity,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public'`,
  constraints: `SELECT c.relname AS table_name,co.conname,co.contype,co.convalidated,pg_get_constraintdef(co.oid,true) AS definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`,
  indexes: `SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'`,
  enums: `SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'`,
  sequences: `SELECT sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public'`,
  triggers: `SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`,
  functions: `SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')`,
  views: `SELECT viewname,definition FROM pg_views WHERE schemaname='public'`,
  policies: `SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public'`,
};
function snapshot(database) {
  const schema = Object.fromEntries(Object.entries(schemaQueries).map(([name, query]) => [name, rows(database, query)]));
  const tables = rows(database, "SELECT tablename FROM pg_tables WHERE schemaname='public'").map(row => row.tablename);
  const contents = rows(database, tables.map(table => `SELECT ${literal(table)} AS table_name,COUNT(*)::int AS row_count,md5(COALESCE(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY to_jsonb(r)::text),'')) AS content_digest FROM ${identifier(table)} r`).join(' UNION ALL '));
  const history = rows(database, 'SELECT * FROM "_prisma_migrations"');
  return { schema, contents, history };
}
let work, db;
try {
  check('disposable_source_is_empty', Number(sql(SOURCE, "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'")) === 0);
  work = await mkdtemp(join(tmpdir(), 'hydroland-restore-rehearsal-'));
  const schemaPath = join(work, 'schema.prisma');
  const schemaSource = await readFile(join(apiRoot, 'prisma/schema.prisma'), 'utf8');
  await writeFile(schemaPath, schemaSource);
  await mkdir(join(work, 'migrations'));
  await writeFile(join(work, 'migrations/migration_lock.toml'), 'provider = "postgresql"\n');
  const baseline = prisma(['migrate', 'diff', '--from-empty', '--to-schema-datamodel', join(apiRoot, 'prisma/schema.prisma'), '--script']);
  check('canonical_baseline_has_tables', baseline.includes('CREATE TABLE'));
  let migrations = [{ name: '00000000000000_ci_canonical_baseline', sql: baseline, source: 'generated from current Prisma schema' }];
  // Use the same exact operational-extension lists as the existing API suite.
  for (const file of ['bootstrap-equipment-runtime-schema.mjs', 'bootstrap-trip-weather-runtime-schema.mjs', 'bootstrap-messaging-runtime-schema.mjs']) {
    const bootstrap = await readFile(join(apiRoot, 'scripts', file), 'utf8');
    const list = bootstrap.match(/const migrations\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(list, 'Missing operational migration list: ' + file);
    const names = [...list[1].matchAll(/'(20[0-9]{12}_[a-z0-9_]+)'/g)].map(match => match[1]);
    assert.ok(names.length, 'Empty operational migration list: ' + file);
    for (const name of names) migrations.push({ name, sql: await readFile(join(apiRoot, 'prisma/migrations', name, 'migration.sql'), 'utf8'), source: file });
  }
  const appendOnlyAuditName = '20260930080000_audit_event_append_only';
  migrations.push({ name: appendOnlyAuditName, sql: await readFile(join(apiRoot, 'prisma/migrations', appendOnlyAuditName, 'migration.sql'), 'utf8'), source: 'phase4 append-only audit ledger' });
  if (usesCandidate) {
    const candidate = await verifyFreshInstallCandidate();
    check('versioned_candidate_matches_canonical_schema_and_exact_raw_sql', true);
    migrations = [{ name: baselineName, sql: await readFile(join(candidate.candidate, 'migrations', baselineName, 'migration.sql'), 'utf8'), source: 'versioned fresh-install candidate; separate migration ledger' }];
    report.candidateBaselineSha256 = candidate.baselineSha256;
  }
  const completion = await verifyRawDomainCompletion();
  migrations.push({ name: completionName, sql: completion.sql, source: 'versioned raw domain completion; schema-only production catalog' });
  report.rawDomainCompletionSha256 = completion.manifest.migrationSha256;
  check('migration_names_are_unique', new Set(migrations.map(item => item.name)).size === migrations.length);
  for (const migration of migrations) {
    await mkdir(join(work, 'migrations', migration.name));
    await writeFile(join(work, 'migrations', migration.name, 'migration.sql'), migration.sql);
  }
  const manifest = migrations.map(({ name, sql: text, source }) => ({ name, sha256: digest(text), source }));
  await writeFile(join(evidenceDir, 'fixture-migration-manifest.json'), JSON.stringify(manifest, null, 2));
  report.schemaSha256 = digest(schemaSource); report.migrationCount = manifest.length;
  prisma(['migrate', 'deploy', '--schema', schemaPath]);
  const applied = rows(SOURCE, 'SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count FROM "_prisma_migrations"');
  check('real_migrations_executed_with_correct_checksums', applied.length === manifest.length && manifest.every(item => applied.some(row => row.migration_name === item.name && row.checksum === item.sha256 && row.finished_at && !row.rolled_back_at && row.applied_steps_count > 0)));
  for (const file of ['bootstrap-equipment-runtime-schema.mjs', 'bootstrap-trip-weather-runtime-schema.mjs', 'bootstrap-messaging-runtime-schema.mjs']) {
    run(process.execPath, [join(apiRoot, 'scripts', file)], { cwd: repoRoot, env: { ...process.env, DATABASE_URL: databaseUrl(SOURCE) } });
  }
  check('operational_extension_contracts_pass', true);

  const { PrismaClient } = await import('@prisma/client');
  db = new PrismaClient({ datasourceUrl: databaseUrl(SOURCE) });
  const person = await db.person.create({ data: { firstName: 'تجربة', lastName: 'استعادة معزولة' } });
  const account = await db.account.create({ data: { personId: person.id, email: 'rehearsal@example.invalid', passwordHash: 'not-a-login-hash', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  await db.roleAssignment.create({ data: { accountId: account.id, role: 'DIVER', status: 'ACTIVE' } });
  await db.session.create({ data: { accountId: account.id, tokenHash: digest('NON_AUTHENTICATING_REHEARSAL_RECORD'), expiresAt: new Date('2020-01-01'), revokedAt: new Date('2020-01-01') } });
  await db.diverProfile.create({ data: { accountId: account.id, preferredLanguage: 'ar', notes: 'بيانات اصطناعية فقط', medicalFitnessStatus: 'UNKNOWN' } });
  const credential = await db.credential.create({ data: { personId: person.id, issuer: 'REHEARSAL ONLY', title: 'اختبار حفظ العلاقات', verificationStatus: 'PENDING' } });
  const bytes = Buffer.from('HYDROLAND synthetic binary restore sentinel\nبيانات اختبار فقط\n');
  const hash = digest(bytes);
  await db.document.create({ data: { credentialId: credential.id, ownerId: account.id, storageKey: 'synthetic/no-provider-object', originalName: 'rehearsal-fixture.txt', mimeType: 'text/plain', byteSize: bytes.length, sha256: hash, status: 'UPLOADED' } });
  const organization = await db.organization.create({ data: { ownerId: account.id, displayName: 'RESTORE FIXTURE ONLY', kind: 'REHEARSAL', status: 'DRAFT' } });
  const asset = await db.organizationDocumentAsset.create({ data: { organizationId: organization.id, kind: 'REHEARSAL_BINARY', mimeType: 'text/plain', byteSize: bytes.length, sha256: hash, content: bytes } });
  const trip = await db.trip.create({ data: { title: 'LOCAL RESTORE FIXTURE', type: 'TEST', startsAt: new Date('2030-01-01T07:00:00Z'), endsAt: new Date('2030-01-01T08:00:00Z'), capacity: 1, status: 'DRAFT' } });
  const booking = await db.booking.create({ data: { accountId: account.id, tripId: trip.id, seats: 1, status: 'PENDING' } });
  const payment = await db.payment.create({ data: { bookingId: booking.id, accountId: account.id, amountMinor: 12345, status: 'CREATED', idempotencyKey: 'synthetic-restore-only' } });
  await db.invoice.create({ data: { paymentId: payment.id, number: 'REHEARSAL-NOT-AN-INVOICE', status: 'DRAFT' } });
  await db.auditEvent.create({ data: { actorId: person.id, action: 'REHEARSAL_FIXTURE', resource: 'Credential', resourceId: credential.id, metadata: { synthetic: true, text: 'استعادة الحروف العربية والعلاقات' } } });
  await db.safetyIncident.create({ data: { tripId: trip.id, reportedByAccountId: account.id, severity: 'LOW', title: 'SYNTHETIC LOCAL FIXTURE', description: 'Not a real incident. No external transmission.', status: 'OPEN' } });
  await db.operationalSetting.create({ data: { key: 'CI_RESTORE_SENTINEL', value: { synthetic: true, integrity: 'restore-ok' } } });
  await db.$executeRaw`INSERT INTO "TripOperationalLocation" ("tripId","locationName","latitude","longitude") VALUES (${trip.id},'LOCAL FIXTURE',0,0)`;
  const conversationId = randomUUID();
  await db.$executeRaw`INSERT INTO "Conversation" ("id","title","createdByAccountId") VALUES (${conversationId},'LOCAL RESTORE FIXTURE',${account.id})`;
  await db.$executeRaw`INSERT INTO "ConversationParticipant" ("conversationId","accountId") VALUES (${conversationId},${account.id})`;
  await db.$executeRaw`INSERT INTO "Message" ("conversationId","senderAccountId","kind","body") VALUES (${conversationId},${account.id},'TEXT','رسالة اصطناعية معزولة')`;
  if (baselineSource === 'VERSIONED_CANDIDATE_WITH_ORGANIZATIONS') {
    const forward = await probeOrganizationForwardUpgrade({ repoRoot, work, db, prisma, account, organization, trip, booking, payment, check });
    const finalManifest = [...manifest, ...forward];
    const history = rows(SOURCE, 'SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"');
    check('organization_forward_migrations_have_real_checksum_matched_ledger_entries', history.length === finalManifest.length && finalManifest.every(item => history.some(row => row.migration_name === item.name && row.checksum === item.sha256 && row.finished_at && !row.rolled_back_at)));
    report.organizationCandidateRevision = organizationRevision;
    report.organizationForwardUpgradeVerified = true;
    report.migrationCount = finalManifest.length;
    await writeFile(join(evidenceDir, 'fixture-migration-manifest.json'), JSON.stringify(finalManifest, null, 2));
  }
  // Synthetic raw-domain relationship graph; no production data is copied.
  const rawIds = Object.fromEntries(completion.catalog.tables.map((t,i) => [t.name, '10000000-0000-4000-8000-' + String(i+1).padStart(12,'0')]));
  const parentIds = { ...rawIds, Account: account.id, Organization: organization.id, Trip: trip.id };
  for (const name of ['WorkforceDepartment','WorkforcePosition','WorkforceSeat','WorkforceCenterDepartment','WorkforceHiringRequest','TrainingCourse','ComplianceAssessment','ComplianceEvidence']) {
    const values = new Map();
    for (const column of completion.catalog.columns.filter(c => c.table_name === name)) {
      const ref = completion.catalog.constraints.find(c => c.kind === 'f' && c.table_name === name && c.columns.includes(column.name));
      const parent = ref?.referenced_table.replaceAll('"','');
      if (column.name === 'id') values.set(column.name, literal(rawIds[name]) + '::uuid');
      else if (ref && parentIds[parent] && parent !== name) values.set(column.name, literal(parentIds[parent]));
      else if (column.not_null && column.default_sql === null) {
        if (column.type.startsWith('timestamp')) values.set(column.name, 'CURRENT_TIMESTAMP');
        else if (column.type === 'jsonb') values.set(column.name, "'[]'::jsonb");
        else if (column.type === '"WorkforcePositionTier"') values.set(column.name, "'MANAGER'");
        else { assert.equal(column.type, 'text', 'Unhandled required raw fixture column'); values.set(column.name, literal('REHEARSAL_' + name + '_' + column.name)); }
      }
    }
    if (name === 'WorkforceSeat') values.set('scope', "'EXTERNAL_CENTER'");
    sql(SOURCE, `INSERT INTO ${identifier(name)} (${[...values.keys()].map(identifier).join(',')}) VALUES (${[...values.values()].join(',')})`);
  }
  check('all_eight_raw_domains_have_synthetic_relationship_rows', completion.catalog.tables.every(t => Number(sql(SOURCE, `SELECT count(*) FROM ${identifier(t.name)}`)) === 1));
  await assertAuditAppendOnly(db, SOURCE);
  await db.$disconnect(); db = null;
  const completedColumns = rows(SOURCE, `SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_sql FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped`);
  for (const column of completion.catalog.columns) {
    const actual = completedColumns.find(c => c.table_name === column.table_name && c.name === column.name);
    const ref = completion.catalog.constraints.find(c => c.kind === 'f' && c.table_name === column.table_name && c.columns.includes(column.name) && !completion.catalog.tables.some(t => c.referenced_table === identifier(t.name)));
    const expectedType = ref ? completedColumns.find(c => identifier(c.table_name) === ref.referenced_table && c.name === ref.referenced_columns[0]).type : column.type;
    check('raw_domain_column:' + column.table_name + '.' + column.name, actual && actual.type === expectedType && actual.not_null === column.not_null && actual.default_sql === column.default_sql);
  }
  const before = snapshot(SOURCE);
  for (const constraint of completion.catalog.constraints.filter(c => c.kind !== 'n')) check('raw_domain_constraint:' + constraint.name, before.schema.constraints.some(c => c.table_name === constraint.table_name && c.conname === constraint.name && c.contype === constraint.kind && c.convalidated && c.definition === constraint.definition));
  for (const index of completion.catalog.indexes) check('raw_domain_index:' + index.name, before.schema.indexes.some(i => i.tablename === index.table_name && i.indexname === index.name && i.indexdef === index.definition));
  for (const enumeration of completion.catalog.enums) assert.deepEqual(before.schema.enums.filter(e => e.typname === enumeration.name).sort((a,b) => a.enumsortorder-b.enumsortorder).map(e => e.enumlabel), enumeration.values);
  check('raw_domain_completion_schema_matches_catalog_with_parent_id_adaptation', true);
  report.tableCount = before.contents.length;
  report.populatedTables = before.contents.filter(row => row.row_count > 0).map(row => row.table_name);
  check('representative_data_and_raw_extensions_seeded', ['Account','Credential','Document','OrganizationDocumentAsset','RoleAssignment','Session','Booking','Payment','Invoice','AuditEvent','SafetyIncident','Conversation','Message','TripOperationalLocation'].every(name => report.populatedTables.includes(name)));
  const dump = docker(['exec', CONTAINER, 'pg_dump', '-U', 'hydroland', '-d', SOURCE, '--format=custom', '--no-owner', '--no-acl'], { encoding: null });
  check('custom_format_backup_created', dump.length > 1000 && dump.subarray(0, 5).toString() === 'PGDMP');
  report.backupBytes = dump.length; report.backupSha256 = digest(dump);
  report.targets = [];
  for (const target of TARGETS) {
    docker(['exec', CONTAINER, 'createdb', '-U', 'hydroland', '--template=template0', target]);
    check(target + ':empty_target', Number(sql(target, "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'")) === 0);
    docker(['exec', '-i', CONTAINER, 'pg_restore', '-U', 'hydroland', '-d', target, '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl'], { input: dump });
    const recovered = snapshot(target);
    check(target + ':schema_identical', JSON.stringify(recovered.schema) === JSON.stringify(before.schema));
    check(target + ':all_table_data_identical', JSON.stringify(recovered.contents) === JSON.stringify(before.contents));
    check(target + ':entire_real_migration_history_identical', JSON.stringify(recovered.history) === JSON.stringify(before.history));
    prisma(['migrate', 'deploy', '--schema', schemaPath], target);
    check(target + ':migration_rerun_is_noop', JSON.stringify(snapshot(target)) === JSON.stringify(before));
    db = new PrismaClient({ datasourceUrl: databaseUrl(target) });
    const restored = await db.booking.findUnique({ where: { id: booking.id }, include: { trip: true, account: { include: { person: true, roleAssignments: true, diverProfile: true } }, payments: { include: { invoice: true } } } });
    check(target + ':application_orm_reads_relationships', restored?.account.person.firstName === 'تجربة' && restored.account.roleAssignments[0]?.role === 'DIVER' && restored.account.diverProfile?.preferredLanguage === 'ar' && restored.trip.id === trip.id && restored.payments[0]?.amountMinor === 12345 && restored.payments[0]?.invoice?.number === 'REHEARSAL-NOT-AN-INVOICE');
    const restoredCredential = await db.credential.findUnique({ where: { id: credential.id }, include: { documents: true, person: true } });
    check(target + ':credential_document_relations', restoredCredential?.person.id === person.id && restoredCredential.documents[0]?.sha256 === hash);
    const restoredAsset = await db.organizationDocumentAsset.findUnique({ where: { id: asset.id } });
    check(target + ':binary_bytes_preserved', digest(restoredAsset.content) === hash);
    await assert.rejects(() => db.booking.create({ data: { tripId: trip.id, accountId: randomUUID(), seats: 1 } }), error => error.code === 'P2003');
    check(target + ':foreign_key_enforced', true);
    await assert.rejects(() => db.roleAssignment.create({ data: { accountId: account.id, role: 'DIVER', status: 'ACTIVE' } }), error => error.code === 'P2002');
    check(target + ':unique_constraint_enforced', true);
    await assertAuditAppendOnly(db, target);
    await db.$disconnect(); db = null;
    report.targets.push({ name: target, status: 'PASS', dataDigest: digest(JSON.stringify(recovered.contents)), schemaDigest: digest(JSON.stringify(recovered.schema)) });
    if (target === TARGETS[0]) {
      sql(target, `UPDATE "OperationalSetting" SET "value"='{"synthetic":true,"integrity":"TAMPERED"}'::jsonb WHERE "key"='CI_RESTORE_SENTINEL'`);
      check('negative_control_detects_corrupted_restored_data', JSON.stringify(snapshot(target).contents) !== JSON.stringify(before.contents));
    }
  }
  check('source_unchanged_by_both_restores', JSON.stringify(snapshot(SOURCE)) === JSON.stringify(before));
  report.freshInstallCandidateVerified = usesCandidate;
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = String(error?.message || error).slice(0, 2500);
  process.exitCode = 1;
} finally {
  if (db) await db.$disconnect();
  report.finishedAt = new Date().toISOString();
  await writeFile(join(evidenceDir, 'recovery-drill-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (work) await rm(work, { recursive: true, force: true });
}
