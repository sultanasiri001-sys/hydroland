import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {LEGACY_PRISMA_HASH, LEGACY_SCHEMA_HASH, UPGRADE_LEDGER_SQL, readUpgradeMigrations} from './upgrade.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
export async function prepareSchema({legacySchemaPath}={}) {
  // A pinned historical input is used only by the disposable CI upgrade test.
  // Runtime always builds the current canonical schema.
  if (legacySchemaPath && digest(await readFile(legacySchemaPath))!==LEGACY_PRISMA_HASH) throw new Error('UAT_LEGACY_FIXTURE_SOURCE_CHANGED');
  const cli = path.join(root, 'node_modules/prisma/build/index.js');
  let sql = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', legacySchemaPath || path.join(root, 'apps/api/prisma/schema.prisma'), '--script'], {encoding:'utf8', maxBuffer:32*1024*1024,stdio:'pipe'});
  for (const file of ['bootstrap-equipment-runtime-schema.mjs', 'bootstrap-trip-weather-runtime-schema.mjs', 'bootstrap-messaging-runtime-schema.mjs']) {
    const text = await readFile(path.join(root, 'apps/api/scripts', file), 'utf8');
    const list = text.match(/const migrations\s*=\s*\[([\s\S]*?)\];/);
    if (!list) throw new Error('UAT_RUNTIME_COMPONENTS_MISSING');
    for (const match of list[1].matchAll(/'(20[0-9]{12}_[a-z0-9_]+)'/g)) sql += '\n' + await readFile(path.join(root, 'apps/api/prisma/migrations', match[1], 'migration.sql'), 'utf8');
  }
  const sources = JSON.parse(await readFile(new URL('./schema/sources.json', import.meta.url), 'utf8'));
  for (const item of sources.files) {
    const text = await readFile(new URL('./schema/' + item.file, import.meta.url), 'utf8');
    if (digest(text) !== item.sha256) throw new Error('UAT_SCHEMA_SOURCE_CHANGED');
    sql += '\n' + text;
  }
  const forward = ['20261009003000_receivable_collector_shift_ledger', '20261009010000_finance_shift_close_reviews', '20261009020000_finance_period_close_workflow', '20261010010000_finance_settlement_reconciliation'];
  const checks = [];
  for (const name of forward) {
    const text = await readFile(path.join(root, 'apps/api/prisma/migrations', name, 'migration.sql'), 'utf8');
    sql += '\n' + text;
    // Prisma creates these new tables first; CREATE TABLE IF NOT EXISTS cannot
    // add their SQL-only CHECKs. Preserve the exact expressions from reviewed SQL.
    for (const match of text.matchAll(/CONSTRAINT "([A-Za-z]+)_(values|note)_check" CHECK \(([^\n]+)\)/g)) {
      const expression = match[3].replaceAll("''", "'");
      sql += `\nALTER TABLE "${match[1]}" ADD CONSTRAINT "${match[1]}_${match[2]}_check" CHECK (${expression});\n`;
      checks.push(match[1] + '_' + match[2] + '_check');
    }
  }
  if (checks.length !== 5) throw new Error('UAT_FINANCE_CHECKS_CHANGED');
  sql += '\n' + await readFile(path.join(root, 'apps/api/prisma/migrations/20260930080000_audit_event_append_only/migration.sql'), 'utf8');
  if (!legacySchemaPath) {
    const migrations=await readUpgradeMigrations();
    const partialIndexes=migrations[2].sql.match(/CREATE UNIQUE INDEX "Booking_(?:personal_active_trip_account|organization_active_trip)_key"[\s\S]*?;/g);
    if(partialIndexes?.length!==2) throw new Error('UAT_BOOKING_PARTIAL_INDEXES_MISSING');
    sql+='\n'+partialIndexes.join('\n')+'\n'+UPGRADE_LEDGER_SQL+'\n';
  }
  const schemaHash = digest(sql);
  if(legacySchemaPath && schemaHash!==LEGACY_SCHEMA_HASH) throw new Error('UAT_LEGACY_FIXTURE_SCHEMA_CHANGED');
  // An honest UAT marker, never fabricated production migration history.
  sql += `\nCREATE TABLE "HydrolandUatState" (id integer PRIMARY KEY CHECK (id=1), "schemaHash" text NOT NULL, seeded boolean NOT NULL DEFAULT false);\nINSERT INTO "HydrolandUatState" (id,"schemaHash") VALUES (1,'${schemaHash}');\n`;
  await mkdir(path.join(root, '.uat'), {recursive:true});
  const file = path.join(root, '.uat', legacySchemaPath?'legacy-schema.sql':'schema.sql');
  await writeFile(file, 'BEGIN;\n' + sql + '\nCOMMIT;\n');
  return {file, schemaHash};
}
