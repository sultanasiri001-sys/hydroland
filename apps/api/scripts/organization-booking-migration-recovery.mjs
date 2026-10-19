import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ORGANIZATION_BOOKING_MIGRATION = '20261005130000_organization_booking_safety';
export const EXPECTED_ORGANIZATION_BOOKING_CHECKSUM = 'fe561ded137754d9cdc24f9320fa5f20ab18ff57cfca9992074eb0c16f638804';
const ORIGINAL_INDEX = 'Booking_tripId_accountId_key';
const REPLACEMENT_INDEX = 'Booking_trip_account_recovery_replacement';
const migrationFile = new URL(`../prisma/migrations/${ORGANIZATION_BOOKING_MIGRATION}/migration.sql`, import.meta.url);
const require = createRequire(import.meta.url);
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const fail = reason => { throw new Error(`Organization booking recovery refused: ${reason}`); };
const qualified = (schema, name) => `${quote(schema)}.${quote(name)}`;

async function context(db) {
  const [row] = await db.$queryRawUnsafe('SELECT current_schema() AS schema');
  if (!row?.schema) fail('no current database schema');
  return { schema: row.schema, booking: qualified(row.schema, 'Booking'), ledger: qualified(row.schema, '_prisma_migrations') };
}

async function openFailure(db, ctx) {
  const [present] = await db.$queryRawUnsafe('SELECT to_regclass($1) IS NOT NULL AS present', ctx.ledger);
  if (!present.present) return null;
  const rows = await db.$queryRawUnsafe(`SELECT id, migration_name, checksum, applied_steps_count, logs
    FROM ${ctx.ledger} WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at, id`);
  if (!rows.some(row => row.migration_name === ORGANIZATION_BOOKING_MIGRATION)) return null;
  if (rows.length !== 1) fail('other unresolved migrations exist');
  const failed = rows[0];
  const [latest] = await db.$queryRawUnsafe(`SELECT id FROM ${ctx.ledger} WHERE migration_name=$1 ORDER BY started_at DESC, id DESC LIMIT 1`, ORGANIZATION_BOOKING_MIGRATION);
  if (latest?.id !== failed.id) fail('the failed migration is not its latest ledger entry');
  if (failed.checksum !== EXPECTED_ORGANIZATION_BOOKING_CHECKSUM) fail('failed migration checksum differs from the immutable source');
  if (Number(failed.applied_steps_count) !== 0) fail('migration reports applied steps');
  const logs = failed.logs || '';
  const expectedConstraint = logs.includes(`constraint ${ORIGINAL_INDEX} on table "Booking" requires it`)
    || logs.includes(`constraint "${ORIGINAL_INDEX}" on table "Booking" requires it`);
  if (!/\b2BP01\b/.test(logs) || !logs.includes(`cannot drop index "${ORIGINAL_INDEX}"`) || !expectedConstraint) {
    fail('failure is not the verified constraint-owned index error');
  }
  return failed;
}

async function inspect(db, ctx) {
  const tables = await db.$queryRawUnsafe(`SELECT c.relname AS name, c.relkind::text AS kind,
    c.relpersistence::text AS persistence, c.relreplident::text AS replica_identity,
    c.relispartition AS partition, EXISTS (SELECT 1 FROM pg_inherits h WHERE h.inhrelid=c.oid OR h.inhparent=c.oid) AS inherited
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relname IN ('Booking','Organization','SafetyIncident')`, ctx.schema);
  if (tables.length !== 3 || tables.some(row => row.kind !== 'r' || row.partition || row.inherited)) fail('base tables are missing or have an unsupported table shape');
  const bookingTable = tables.find(row => row.name === 'Booking');
  if (bookingTable.persistence !== 'p' || bookingTable.replica_identity !== 'd') fail('Booking has unexpected persistence or replica identity');
  const columns = await db.$queryRawUnsafe(`SELECT c.relname AS table_name, a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS not_null
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND a.attnum>0 AND NOT a.attisdropped
      AND c.relname IN ('Booking','Organization','SafetyIncident')`, ctx.schema);
  const column = (table, name) => columns.find(row => row.table_name === table && row.column_name === name);
  for (const [table, names] of [['Booking', ['organizationId','bookingRequestKey','bookingRequestFingerprint']], ['SafetyIncident', ['bookingId']]]) {
    if (names.some(name => column(table, name))) fail('migration columns already exist; partial application requires separate review');
  }
  for (const [table, name] of [['Organization','id'],['Booking','id'],['Booking','tripId'],['Booking','accountId']]) {
    const value = column(table, name);
    if (!value || !['uuid','text'].includes(value.type) || !value.not_null) fail(`unsupported ${table}.${name} definition`);
  }
  const newObjects = await db.$queryRawUnsafe(`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relname IN (
      'Booking_bookingRequestKey_key','Booking_organizationId_status_createdAt_idx','Booking_tripId_organizationId_idx',
      'SafetyIncident_bookingId_status_createdAt_idx','Booking_personal_active_trip_account_key','Booking_organization_active_trip_key', $2)
    UNION ALL SELECT c.conname AS name FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname=$1 AND c.conname IN ('Booking_organizationId_fkey','SafetyIncident_bookingId_fkey', $2)`, ctx.schema, REPLACEMENT_INDEX);
  if (newObjects.length) fail('migration objects or the replacement name already exist');
  const indexes = await db.$queryRawUnsafe(`SELECT i.indexrelid::text AS oid, t.relname AS table_name, am.amname AS method,
    i.indisunique AS unique, i.indisvalid AS valid, i.indisready AS ready, i.indislive AS live,
    i.indisprimary AS primary, i.indimmediate AS immediate, i.indisreplident AS replica_identity,
    i.indisclustered AS clustered, i.indnullsnotdistinct AS nulls_not_distinct,
    i.indnatts::int AS attributes, i.indnkeyatts::int AS key_attributes,
    i.indexprs IS NOT NULL AS expressions, i.indpred IS NOT NULL AS partial,
    x.reloptions IS NOT NULL AS storage_options, x.reltablespace::text AS tablespace,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    NOT EXISTS (SELECT 1 FROM unnest(i.indoption) v WHERE v<>0) AS default_order,
    NOT EXISTS (SELECT 1 FROM unnest(i.indclass) v JOIN pg_opclass op ON op.oid=v WHERE NOT op.opcdefault) AS default_opclasses,
    NOT EXISTS (SELECT 1 FROM unnest(i.indkey, i.indcollation) v(attnum,collation_oid)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=v.attnum WHERE v.collation_oid<>a.attcollation) AS default_collations
    FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=x.relnamespace JOIN pg_am am ON am.oid=x.relam
    WHERE n.nspname=$1 AND x.relname=$2`, ctx.schema, ORIGINAL_INDEX);
  const index = indexes[0];
  if (indexes.length !== 1 || index.table_name !== 'Booking' || index.method !== 'btree'
      || !index.unique || !index.valid || !index.ready || !index.live || !index.immediate
      || index.primary || index.replica_identity || index.clustered || index.nulls_not_distinct
      || index.attributes !== 2 || index.key_attributes !== 2 || index.expressions || index.partial
      || index.storage_options || index.tablespace !== '0' || !index.default_order || !index.default_opclasses || !index.default_collations
      || JSON.stringify(index.columns) !== JSON.stringify(['tripId','accountId'])) fail('legacy unique index has an unexpected definition');
  const constraints = await db.$queryRawUnsafe(`SELECT conname AS name, contype::text AS type,
    conrelid=to_regclass($1) AS on_booking, conindid=$2::oid AS on_index,
    convalidated AS valid, condeferrable AS deferrable, condeferred AS deferred,
    conislocal AS local, coninhcount::int AS inherited_count, conparentid::text AS parent
    FROM pg_constraint WHERE conindid=$2::oid OR (conrelid=to_regclass($1) AND conname=$3)`, ctx.booking, index.oid, ORIGINAL_INDEX);
  if (constraints.some(row => row.type === 'f')) fail('foreign keys depend on the legacy unique index');
  if (constraints.length > 1 || constraints.some(row => row.type !== 'u' || row.name !== ORIGINAL_INDEX
      || !row.on_booking || !row.on_index || !row.valid || row.deferrable || row.deferred
      || !row.local || row.inherited_count !== 0 || row.parent !== '0')) fail('legacy uniqueness constraint has an unexpected definition');
  return { owned: constraints.length === 1 };
}

function resolveWithInstalledPrisma() {
  try {
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'resolve', '--rolled-back', ORGANIZATION_BOOKING_MIGRATION], {
      cwd: fileURLToPath(new URL('..', import.meta.url)), env: process.env, stdio: 'pipe', timeout: 60000,
    });
  } catch {
    throw new Error('Organization booking recovery: installed Prisma CLI could not resolve the verified failed migration; protected diagnostics require review');
  }
}

export async function recoverOrganizationBookingMigration({ db, resolveMigration = resolveWithInstalledPrisma }) {
  const ctx = await context(db);
  const failed = await openFailure(db, ctx);
  if (!failed) return { status: 'no-open-failure', normalized: false };
  const actualChecksum = createHash('sha256').update(readFileSync(migrationFile)).digest('hex');
  if (actualChecksum !== EXPECTED_ORGANIZATION_BOOKING_CHECKSUM) fail('migration source checksum changed');
  const normalized = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout='30s'");
    await tx.$executeRawUnsafe(`LOCK TABLE ${ctx.booking} IN ACCESS EXCLUSIVE MODE`);
    const current = await openFailure(tx, ctx);
    if (!current || current.id !== failed.id) fail('failed migration changed while acquiring the table lock');
    const state = await inspect(tx, ctx);
    if (!state.owned) return false; // Previous normalization committed before Prisma resolve completed.
    await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX ${quote(REPLACEMENT_INDEX)} ON ${ctx.booking}("tripId","accountId")`);
    await tx.$executeRawUnsafe(`ALTER TABLE ${ctx.booking} DROP CONSTRAINT ${quote(ORIGINAL_INDEX)} RESTRICT`);
    await tx.$executeRawUnsafe(`ALTER INDEX ${qualified(ctx.schema, REPLACEMENT_INDEX)} RENAME TO ${quote(ORIGINAL_INDEX)}`);
    if ((await inspect(tx, ctx)).owned) fail('normalization did not yield the expected standalone unique index');
    return true;
  }, { maxWait: 10000, timeout: 45000 });
  // The catalog change is committed before the separate Prisma CLI connection
  // updates its ledger. A CLI failure is safely resumable with the same guard.
  const beforeResolve = await openFailure(db, ctx);
  if (!beforeResolve || beforeResolve.id !== failed.id) fail('failed migration changed before Prisma resolution');
  await inspect(db, ctx);
  await resolveMigration(ORGANIZATION_BOOKING_MIGRATION);
  const [resolved] = await db.$queryRawUnsafe(`SELECT checksum, finished_at, rolled_back_at FROM ${ctx.ledger} WHERE id=$1`, failed.id);
  if (!resolved || resolved.checksum !== EXPECTED_ORGANIZATION_BOOKING_CHECKSUM || resolved.finished_at || !resolved.rolled_back_at) {
    fail('Prisma did not mark the exact failed attempt rolled back');
  }
  return { status: 'resolved-for-retry', normalized };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const db = new PrismaClient();
  try {
    const result = await recoverOrganizationBookingMigration({ db });
    console.log(`[organization-booking-recovery] ${result.status}; immutable migration will be handled by prisma migrate deploy`);
  } finally { await db.$disconnect(); }
}
