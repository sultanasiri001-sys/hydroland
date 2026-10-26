import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {assertUatEnvironment} from './guard.mjs';

export const LEGACY_SCHEMA_HASH = '87bf3eadfb4e06a697baf76d10c0d647d65ebf79f9516f0faaba05d34e85610b';
export const LEGACY_PRISMA_HASH = 'd6e3d8ecfe9e3754957f142335da5ddbd8787c22073bcd9b490735c0bf352c28';
export const CURRENT_SCHEMA_HASH = 'dac77738890d60a25db17992e9a047a3ea73d4b40833f6abf0ae8a3e3421766c';
export const UPGRADE_ID = '20261020_current_release';
export const MIGRATIONS = [
  ['20261005000000_marine_asset_document_storage', 'dd3c2bfe03f84191f2e481b89947d4dd90caf88348c316bc7d3d52e2cad44c20'],
  ['20261005090000_customer_case_organization_relation', '2028fec2d985196211610d9f25a6df79f025d417c35541a230d4accebc6df3b6'],
  ['20261005130000_organization_booking_safety', 'fe561ded137754d9cdc24f9320fa5f20ab18ff57cfca9992074eb0c16f638804'],
];
export const UPGRADE_LEDGER_SQL = `CREATE TABLE "HydrolandUatUpgrade" (
  id text PRIMARY KEY,
  "fromSchemaHash" text NOT NULL,
  "toSchemaHash" text NOT NULL,
  "sourceChecksums" jsonb NOT NULL,
  "appliedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;
export const ADDED_COLUMNS = {
  MarineAssetDocument: {storageKey:'text',originalName:'text',mimeType:'text',byteSize:'integer',sha256:'text'},
  Booking: {organizationId:'text',bookingRequestKey:'text',bookingRequestFingerprint:'text'},
  SafetyIncident: {bookingId:'text'},
};
const indexes = [
  ['MarineAssetDocument_storageKey_key','MarineAssetDocument',['storageKey'],true,null],
  ['MarineAssetDocument_sha256_key','MarineAssetDocument',['sha256'],true,null],
  ['Booking_bookingRequestKey_key','Booking',['bookingRequestKey'],true,null],
  ['Booking_organizationId_status_createdAt_idx','Booking',['organizationId','status','createdAt'],false,null],
  ['Booking_tripId_organizationId_idx','Booking',['tripId','organizationId'],false,null],
  ['SafetyIncident_bookingId_status_createdAt_idx','SafetyIncident',['bookingId','status','createdAt'],false,null],
  ['Booking_personal_active_trip_account_key','Booking',['tripId','accountId'],true,'(("organizationId" IS NULL) AND (status <> \'CANCELLED\'::"BookingStatus"))'],
  ['Booking_organization_active_trip_key','Booking',['tripId','organizationId'],true,'(("organizationId" IS NOT NULL) AND (status <> \'CANCELLED\'::"BookingStatus"))'],
];
const foreignKeys = [
  ['CustomerCase_organizationId_fkey','CustomerCase','organizationId','Organization'],
  ['Booking_organizationId_fkey','Booking','organizationId','Organization'],
  ['SafetyIncident_bookingId_fkey','SafetyIncident','bookingId','Booking'],
];
const digest = value => createHash('sha256').update(value).digest('hex');
const quote = name => '"' + name.replaceAll('"','""') + '"';
const check = (condition, reason) => { if (!condition) throw new Error('UAT_UPGRADE_REFUSED: ' + reason); };

export async function readUpgradeMigrations() {
  return Promise.all(MIGRATIONS.map(async ([name, checksum]) => {
    const sql = await readFile(new URL('../../apps/api/prisma/migrations/'+name+'/migration.sql',import.meta.url),'utf8');
    check(digest(sql) === checksum, 'immutable migration checksum differs: '+name);
    check(!sql.includes('$hydroland_uat_upgrade$'), 'unexpected migration delimiter');
    return {name, checksum, sql};
  }));
}

async function columns(tx) {
  return tx.$queryRawUnsafe(`SELECT c.relname AS table_name,a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,
    pg_get_expr(d.adbin,d.adrelid) AS default_value
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
      AND c.relname IN ('MarineAssetDocument','Booking','SafetyIncident','Organization','CustomerCase')`);
}
async function indexDefinitions(tx) {
  return tx.$queryRawUnsafe(`SELECT x.relname AS name,t.relname AS table_name,am.amname AS method,
    i.indisunique AS unique,i.indisvalid AS valid,i.indisready AS ready,i.indislive AS live,
    i.indisprimary AS primary,i.indimmediate AS immediate,i.indnkeyatts::int AS key_attributes,
    i.indnatts::int AS attributes,i.indexprs IS NOT NULL AS expressions,
    pg_get_expr(i.indpred,i.indrelid) AS predicate,
    EXISTS(SELECT 1 FROM pg_constraint co WHERE co.conindid=i.indexrelid) AS constraint_backed,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=x.relnamespace JOIN pg_am am ON am.oid=x.relam
    WHERE n.nspname='public' AND t.relname IN ('MarineAssetDocument','Booking','SafetyIncident')`);
}
async function relationDefinitions(tx) {
  return tx.$queryRawUnsafe(`SELECT co.conname AS name,t.relname AS table_name,r.relname AS referenced_table,
    co.convalidated AS valid,co.condeferrable AS deferrable,co.confupdtype::text AS update_action,
    co.confdeltype::text AS delete_action,
    ARRAY(SELECT a.attname::text FROM unnest(co.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    ARRAY(SELECT a.attname::text FROM unnest(co.confkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=k.num ORDER BY k.ord) AS referenced_columns
    FROM pg_constraint co JOIN pg_class t ON t.oid=co.conrelid JOIN pg_class r ON r.oid=co.confrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND co.contype='f'
    AND t.relname IN ('Booking','CustomerCase','SafetyIncident')`);
}
async function assertLegacyShape(tx) {
  const actualColumns = await columns(tx);
  for (const [table, entries] of Object.entries(ADDED_COLUMNS)) {
    check(!actualColumns.some(row=>row.table_name===table && Object.hasOwn(entries,row.column_name)), 'target columns already exist');
  }
  for (const [table,name] of [['Booking','id'],['Booking','tripId'],['Booking','accountId'],['Organization','id'],['CustomerCase','organizationId']]) {
    check(actualColumns.some(row=>row.table_name===table && row.column_name===name && row.type==='text'), 'unexpected native key type');
  }
  const actualIndexes = await indexDefinitions(tx);
  check(!actualIndexes.some(row=>indexes.some(([name])=>name===row.name)), 'target indexes already exist');
  const legacy=actualIndexes.find(row=>row.name==='Booking_tripId_accountId_key');
  check(legacy?.table_name==='Booking' && legacy.method==='btree' && legacy.unique && legacy.valid && legacy.ready
    && legacy.live && legacy.immediate && !legacy.primary && !legacy.expressions && !legacy.predicate
    && !legacy.constraint_backed && legacy.attributes===2 && legacy.key_attributes===2
    && JSON.stringify(legacy.columns)===JSON.stringify(['tripId','accountId']), 'legacy unique index shape is not the exact standalone UAT shape');
  check(!(await relationDefinitions(tx)).some(row=>foreignKeys.some(([name])=>name===row.name)), 'target foreign keys already exist');
  const [objects]=await tx.$queryRawUnsafe(`SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS production_history,
    to_regclass('public."HydrolandUatUpgrade"') IS NOT NULL AS upgrade_history`);
  check(!objects.production_history && !objects.upgrade_history, 'unexpected migration history');
}

export async function assertCurrentShape(tx) {
  const actualColumns=await columns(tx);
  for(const [table,entries] of Object.entries(ADDED_COLUMNS)) for(const [name,type] of Object.entries(entries)) {
    check(actualColumns.some(row=>row.table_name===table && row.column_name===name && row.type===type
      && !row.not_null && row.default_value===null), 'target column does not match '+table+'.'+name);
  }
  const actualIndexes=await indexDefinitions(tx);
  check(!actualIndexes.some(row=>row.name==='Booking_tripId_accountId_key'), 'legacy all-status uniqueness remains');
  for(const [name,table,keys,unique,predicate] of indexes) {
    const actual=actualIndexes.find(row=>row.name===name);
    check(actual?.table_name===table && actual.method==='btree' && actual.valid && actual.ready && actual.live
      && actual.immediate && !actual.primary && !actual.expressions && !actual.constraint_backed
      && actual.unique===unique && actual.attributes===keys.length && actual.key_attributes===keys.length
      && actual.predicate===predicate && JSON.stringify(actual.columns)===JSON.stringify(keys), 'target index does not match '+name);
  }
  const actualKeys=await relationDefinitions(tx);
  for(const [name,table,column,reference] of foreignKeys) {
    check(actualKeys.some(row=>row.name===name && row.table_name===table && row.referenced_table===reference
      && row.valid && !row.deferrable && row.update_action==='c' && row.delete_action==='r'
      && JSON.stringify(row.columns)===JSON.stringify([column]) && JSON.stringify(row.referenced_columns)===JSON.stringify(['id'])),
    'target foreign key does not match '+name);
  }
}

export async function applicationTables(tx) {
  const rows=await tx.$queryRawUnsafe(`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT IN ('HydrolandUatState','HydrolandUatUpgrade') ORDER BY c.relname`);
  return rows.map(row=>row.name);
}
export async function applicationFingerprint(tx, names, excludeNewColumns=false) {
  const result={};
  for(const name of names) {
    const exclude=excludeNewColumns?Object.keys(ADDED_COLUMNS[name]??{}):[];
    const [row]=await tx.$queryRawUnsafe(`SELECT count(*)::text AS count,
      md5(COALESCE(string_agg(r::text,'|' ORDER BY r::text),'')) AS digest
      FROM (SELECT to_jsonb(t)-$1::text[] AS r FROM public.${quote(name)} t) snapshot_rows`,exclude);
    result[name]=row;
  }
  return result;
}

// The caller owns the bootstrap transaction and advisory lock. This is an
// explicit synthetic UAT upgrade, never adoption of production Prisma history.
export async function upgradeExistingUat(tx,{fromSchemaHash,toSchemaHash,env=process.env}) {
  const {database}=assertUatEnvironment(env);
  check(fromSchemaHash===LEGACY_SCHEMA_HASH && toSchemaHash===CURRENT_SCHEMA_HASH, 'unsupported schema version');
  const [identity]=await tx.$queryRawUnsafe('SELECT current_database() AS name,current_schema() AS schema');
  check(identity.name===database && identity.schema==='public', 'unexpected database identity');
  const sources=await readUpgradeMigrations();
  await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
  await tx.$executeRawUnsafe("SET LOCAL statement_timeout='30s'");
  const names=await applicationTables(tx);
  check(names.length>0,'application tables missing');
  // Preserve every existing application row, including sessions, audit history,
  // finance movements and file bytes, during the one atomic upgrade.
  await tx.$executeRawUnsafe('LOCK TABLE '+names.map(name=>'public.'+quote(name)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  const state=await tx.$queryRawUnsafe('SELECT "schemaHash" FROM "HydrolandUatState" WHERE id=1 FOR UPDATE');
  check(state.length===1 && state[0].schemaHash===fromSchemaHash,'source marker changed');
  await assertLegacyShape(tx);
  const before=await applicationFingerprint(tx,names);
  // PostgreSQL runs the unchanged, checksummed migration statements in one
  // DO command inside this transaction. A nested DO in the original SQL is kept.
  await tx.$executeRawUnsafe('DO $hydroland_uat_upgrade$\nBEGIN\n'+sources.map(item=>item.sql).join('\n')+'\nEND;\n$hydroland_uat_upgrade$;');
  await tx.$executeRawUnsafe(UPGRADE_LEDGER_SQL);
  await assertCurrentShape(tx);
  assert.deepEqual(await applicationFingerprint(tx,names,true),before,'UAT_UPGRADE_DATA_CHANGED');
  await tx.$executeRawUnsafe(`INSERT INTO "HydrolandUatUpgrade" (id,"fromSchemaHash","toSchemaHash","sourceChecksums")
    VALUES ($1,$2,$3,$4::jsonb)`,UPGRADE_ID,fromSchemaHash,toSchemaHash,JSON.stringify(Object.fromEntries(MIGRATIONS)));
  check(await tx.$executeRawUnsafe('UPDATE "HydrolandUatState" SET "schemaHash"=$1 WHERE id=1 AND "schemaHash"=$2',toSchemaHash,fromSchemaHash)===1,
    'schema marker did not advance');
  return {status:'upgraded',id:UPGRADE_ID,tablesPreserved:names.length,rowsPreserved:Object.values(before).reduce((sum,row)=>sum+Number(row.count),0),dataFingerprint:digest(JSON.stringify(before))};
}

export async function verifyCurrentUat(tx,schemaHash) {
  check(schemaHash===CURRENT_SCHEMA_HASH,'unreviewed target schema');
  await assertCurrentShape(tx);
  const rows=await tx.$queryRawUnsafe('SELECT id,"fromSchemaHash","toSchemaHash","sourceChecksums" FROM "HydrolandUatUpgrade"');
  check(rows.length<=1,'unexpected UAT upgrade records');
  if(rows.length) {
    const row=rows[0];
    check(row.id===UPGRADE_ID && row.fromSchemaHash===LEGACY_SCHEMA_HASH && row.toSchemaHash===CURRENT_SCHEMA_HASH
      && JSON.stringify(Object.entries(row.sourceChecksums).sort())===JSON.stringify([...MIGRATIONS].sort()), 'UAT upgrade evidence differs');
  }
}
