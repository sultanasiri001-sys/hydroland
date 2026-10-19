import assert from 'node:assert/strict';

// Restrict this reasoning to plain btree UNIQUE keys with default NULL semantics.
// Expressions, collations, operator classes and NULLS NOT DISTINCT remain unknown.
export function compareUniqueIndexProtection(production,candidate) {
 const identifier='(?:"[A-Za-z_][A-Za-z0-9_]*"|[A-Za-z_][A-Za-z0-9_]*)';
 const expression=new RegExp('^CREATE UNIQUE INDEX '+identifier+' ON public\\.'+identifier+' USING btree \\(('+identifier+'(?:, '+identifier+')*)\\)(?: WHERE \\(('+identifier+') IS NOT NULL\\))?$');
 const parse=object=>{
  const match=object.definition.match(expression);if(!match)return null;
  const keys=match[1].split(',').map(x=>x.trim());
  if(!keys.length || !keys.every(x=>new RegExp('^'+identifier+'$').test(x)))return null;
  const unquote=x=>x.startsWith('"')?x.slice(1,-1):x.toLowerCase();
  const columns=keys.map(unquote),excludedNullColumn=match[2]?unquote(match[2]):null;
  if(excludedNullColumn && !columns.includes(excludedNullColumn))return null;
  return {columns,excludedNullColumn};
 };
 const left=parse(production),right=parse(candidate);
 const uniquenessMatches=!!left && !!right && production.table_name===candidate.table_name && JSON.stringify([...left.columns].sort())===JSON.stringify([...right.columns].sort());
 return {production,candidate,uniquenessMatches,physicalDefinitionMatches:production.definition===candidate.definition,productionAdoptionApproved:false,scope:'DEFAULT_NULL_PLAIN_BTREE_UNIQUENESS_ONLY'};
}

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
 // Conservative triage supplements the exact diff; never hides differences.
 // Only the index identifier may differ for a rename classification.
 const indexShape=definition=>definition.replace(/^CREATE (UNIQUE )?INDEX (?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_]*) ON /,(_,unique)=>'CREATE '+(unique||'')+'INDEX <name> ON ');
 result.review={
  renamedIndexes:result.indexes.missing.map(production=>({production,candidates:result.indexes.extra.filter(candidate=>candidate.table_name===production.table_name && indexShape(candidate.definition)===indexShape(production.definition))})).filter(x=>x.candidates.length),
  updateActionDifferences:result.constraints.changed.filter(x=>x.production.kind==='f' && x.candidate.kind==='f' && x.production.validated===x.candidate.validated && !x.production.definition.includes('ON UPDATE ') && x.candidate.definition.replace(' ON UPDATE CASCADE','')===x.production.definition).map(x=>({table:x.table,name:x.name,productionUpdate:'NO ACTION',candidateUpdate:'CASCADE',behaviorMatches:false})),
  productionAdoptionApproved:false,
 };
 result.review.uniqueIndexProtection=[];
 for(const production of result.indexes.missing)for(const candidate of result.indexes.extra){
  const review=compareUniqueIndexProtection(production,candidate);if(review.uniquenessMatches)result.review.uniqueIndexProtection.push(review);
 }
 for(const difference of result.indexes.changed){
  const review=compareUniqueIndexProtection(difference.production,difference.candidate);if(review.uniquenessMatches)result.review.uniqueIndexProtection.push(review);
 }
 return result;
}
