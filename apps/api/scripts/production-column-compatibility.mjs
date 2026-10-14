import assert from 'node:assert/strict';

// Pure metadata comparison. No database connection or migration operation.
export function compareProductionColumns(reference, candidate) {
  const key = c => JSON.stringify([c.table_name,c.name]);
  for (const inventory of [reference,candidate]) {
    assert.equal(new Set(inventory.tables).size, inventory.tables.length, 'Duplicate table metadata');
    assert.equal(new Set(inventory.columns.map(key)).size, inventory.columns.length, 'Duplicate column metadata');
    assert.ok(inventory.columns.every(c => inventory.tables.includes(c.table_name)), 'Column has no inventoried table');
  }
  const production = new Map(reference.columns.map(c => [key(c),c]));
  const installed = new Map(candidate.columns.map(c => [key(c),c]));
  const missingTables = reference.tables.filter(t => !candidate.tables.includes(t)).sort();
  const extraTables = candidate.tables.filter(t => !reference.tables.includes(t)).sort();
  const missingColumns = reference.columns.filter(c => !installed.has(key(c))).map(c => ({table:c.table_name,column:c.name}));
  const extraColumns = candidate.columns.filter(c => !production.has(key(c))).map(c => ({table:c.table_name,column:c.name}));
  const differences = [];
  for (const expected of reference.columns) {
    const actual = installed.get(key(expected));
    if (!actual) continue;
    for (const attribute of ['type','not_null','default_sql']) if (expected[attribute] !== actual[attribute]) {
      differences.push({table:expected.table_name,column:expected.name,attribute,production:expected[attribute],candidate:actual[attribute]});
    }
  }
  differences.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const columnMetadataMatches = !missingTables.length && !extraTables.length && !missingColumns.length && !extraColumns.length && !differences.length;
  return { scope:'COLUMN_METADATA_ONLY', productionAdoptionApproved:false, productionBackupRestoreVerified:false,
    columnMetadataMatches, migrationLedgerTransition:'NOT_AUTHORIZED',
    counts:{productionTables:reference.tables.length,candidateTables:candidate.tables.length,productionColumns:reference.columns.length,candidateColumns:candidate.columns.length,missingTables:missingTables.length,extraTables:extraTables.length,missingColumns:missingColumns.length,extraColumns:extraColumns.length,typeDifferences:differences.filter(d=>d.attribute==='type').length,nullabilityDifferences:differences.filter(d=>d.attribute==='not_null').length,defaultDifferences:differences.filter(d=>d.attribute==='default_sql').length},
    missingTables,extraTables,missingColumns,extraColumns,differences,
    limitations:['Exact SQL expression comparison; equivalent defaults may be reported as differences.','Constraints, indexes, triggers, functions, policies and sequences are outside this comparison.','A metadata match does not authorize migration-ledger changes or production cutover.'] };
}
