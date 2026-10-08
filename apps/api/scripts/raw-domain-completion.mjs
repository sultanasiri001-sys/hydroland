import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../prisma-fresh-install-candidate/raw-domain-extension');
export const completionName = '00000000000001_raw_domain_completion';
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
const hash = value => createHash('sha256').update(value).digest('hex');
export async function expectedCompletion() {
  const bytes = await readFile(join(root, 'catalog.json'), 'utf8');
  const catalog = JSON.parse(bytes);
  assert.equal(catalog.tables.length, 8);
  assert.equal(catalog.columns.length, 98);
  assert.equal(catalog.constraints.length, 99);
  assert.equal(catalog.indexes.length, 27);
  assert.equal(catalog.enums.length, 9);
  assert.equal(catalog.triggerCount, 0); assert.equal(catalog.policyCount, 0);
  const names = new Set(catalog.tables.map(t => t.name));
  const external = catalog.constraints.filter(c => c.kind === 'f' && !names.has(c.referenced_table.replaceAll('"', '')));
  let sql = '-- CANDIDATE: new installation only; never applies to production.\n-- Internal UUIDs retained; external references use the installed parent ID type.\n';
  for (const e of catalog.enums) sql += `CREATE TYPE ${quote(e.name)} AS ENUM (${e.values.map(literal).join(', ')});\n`;
  for (const table of catalog.tables) {
    assert.equal(table.relrowsecurity, false); assert.equal(table.relforcerowsecurity, false);
    const refs = external.filter(c => c.table_name === table.name);
    const columns = catalog.columns.filter(c => c.table_name === table.name).sort((a,b) => a.position-b.position);
    const definitions = columns.map(c => `${quote(c.name)} ${refs.some(r => r.columns.includes(c.name)) ? '%s' : c.type}${c.default_sql === null ? '' : ' DEFAULT ' + c.default_sql}${c.not_null ? ' NOT NULL' : ''}`);
    const ddl = `CREATE TABLE ${quote(table.name)} (\n  ${definitions.join(',\n  ')}\n)`;
    if (!refs.length) { sql += ddl + ';\n'; continue; }
    const ordered = columns.flatMap(c => refs.filter(r => r.columns.includes(c.name)));
    assert.ok(ordered.every(r => r.columns.length === 1 && r.referenced_columns.length === 1));
    sql += 'DO $completion$\nDECLARE parent_type text; parent_types text[] := ARRAY[]::text[];\nBEGIN\n';
    for (const ref of ordered) {
      sql += `  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid=${literal(ref.referenced_table)}::regclass AND a.attname=${literal(ref.referenced_columns[0])} AND NOT a.attisdropped;\n  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;\n  parent_types := array_append(parent_types,parent_type);\n`;
    }
    sql += `  EXECUTE format(${literal(ddl)}, ${ordered.map((_,i) => `parent_types[${i+1}]`).join(', ')});\nEND\n$completion$;\n`;
  }
  for (const c of catalog.constraints.filter(c => c.kind !== 'n')) sql += `ALTER TABLE ${quote(c.table_name)} ADD CONSTRAINT ${quote(c.name)} ${c.definition};\n`;
  for (const i of catalog.indexes) sql += i.definition + ';\n';
  return { sql, catalog, manifest: { status: 'CANDIDATE_NOT_PRODUCTION_APPROVED', migrationName: completionName, catalogSha256: hash(bytes), migrationSha256: hash(sql), externalReferenceTypePolicy: 'MATCH_INSTALLED_PARENT_TEXT_OR_UUID', historicalLedgerReplacementApproved: false } };
}
export async function verifyRawDomainCompletion() {
  const expected = await expectedCompletion();
  assert.equal(await readFile(join(root, 'migration.sql'), 'utf8'), expected.sql, 'Raw domain completion SQL drift');
  assert.deepEqual(JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')), expected.manifest, 'Raw domain completion manifest drift');
  return expected;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(['--write','--verify'].includes(process.argv[2]));
  if (process.argv[2] === '--write') {
    const expected = await expectedCompletion();
    await writeFile(join(root,'migration.sql'), expected.sql);
    await writeFile(join(root,'manifest.json'), JSON.stringify(expected.manifest,null,2)+'\n');
  }
  const expected = await verifyRawDomainCompletion();
  console.log(JSON.stringify({ status:'PASS', ...expected.manifest, tableCount: expected.catalog.tables.length }));
}
