import test from 'node:test';
import assert from 'node:assert/strict';
import { compareProductionColumns } from './production-column-compatibility.mjs';
const reference = {tables:['Account'],columns:[{table_name:'Account',name:'id',type:'uuid',not_null:true,default_sql:null}]};
test('matching metadata never authorizes production adoption or ledger transition', () => {
 const result=compareProductionColumns(reference,structuredClone(reference));
 assert.equal(result.columnMetadataMatches,true); assert.equal(result.productionAdoptionApproved,false); assert.equal(result.migrationLedgerTransition,'NOT_AUTHORIZED');
});
test('UUID to TEXT and nullability/default drift remain visible with identical table counts', () => {
 const candidate=structuredClone(reference);Object.assign(candidate.columns[0],{type:'text',not_null:false,default_sql:"'test'::text"});
 const result=compareProductionColumns(reference,candidate);
 assert.equal(result.columnMetadataMatches,false);assert.deepEqual(result.differences.map(d=>d.attribute).sort(),['default_sql','not_null','type']);assert.equal(result.counts.typeDifferences,1);
});
test('same column count does not hide a renamed field', () => {
 const candidate=structuredClone(reference);candidate.columns[0].name='other';const result=compareProductionColumns(reference,candidate);
 assert.deepEqual(result.missingColumns,[{table:'Account',column:'id'}]);assert.deepEqual(result.extraColumns,[{table:'Account',column:'other'}]);
});
test('missing and extra tables are reported', () => {
 const result=compareProductionColumns(reference,{tables:['Other'],columns:[]});assert.deepEqual(result.missingTables,['Account']);assert.deepEqual(result.extraTables,['Other']);
});
test('duplicate metadata is rejected', () => {
 assert.throws(()=>compareProductionColumns(reference,{tables:['Account'],columns:[...reference.columns,...reference.columns]}),/Duplicate column/);
});
