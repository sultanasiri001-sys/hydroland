import assert from 'node:assert/strict';

// Pure schema metadata comparison; never executes SQL or authorizes deployment.
export function compareProductionRelations(reference,candidate) {
 const key = x => JSON.stringify([x.table_name,x.name]);
 const result={scope:'CONSTRAINT_AND_INDEX_METADATA_ONLY',productionAdoptionApproved:false,counts:{},constraints:null,indexes:null,
 limitations:['Exact names/SQL expressions are compared; equivalent renamed objects still differ.','Native column types, enum values, triggers, functions, views, policies and sequences require independent checks.','Matching metadata does not certify a real production backup or authorize migration-ledger replacement.']};
 for (const kind of ['constraints','indexes']) {
  const expected=reference[kind],actual=candidate[kind];
  for(const inventory of [expected,actual]) assert.equal(new Set(inventory.map(key)).size,inventory.length,'Duplicate '+kind+' metadata');
  const expectedMap=new Map(expected.map(x=>[key(x),x])),actualMap=new Map(actual.map(x=>[key(x),x]));
  const missing=expected.filter(x=>!actualMap.has(key(x))),extra=actual.filter(x=>!expectedMap.has(key(x))),changed=[];
  for(const object of expected) {
   const installed=actualMap.get(key(object));if(!installed)continue;
   const attributes=kind==='constraints'?['definition','kind','validated']:['definition'];
   const changes=attributes.filter(a=>object[a]!==installed[a]);
   if(changes.length)changed.push({table:object.table_name,name:object.name,attributes:changes,production:object,candidate:installed});
  }
  result[kind]={missing,extra,changed};
  result.counts[kind]={production:expected.length,candidate:actual.length,missing:missing.length,extra:extra.length,changed:changed.length};
 }
 result.metadataMatches=Object.values(result.counts).every(c=>!c.missing&&!c.extra&&!c.changed);
 return result;
}
