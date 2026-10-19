import assert from 'node:assert/strict';
const key=c=>JSON.stringify([c.table_name,c.name]);
const identifier=value=>'"'+value.replaceAll('"','""')+'"';
const literal=value=>"'"+value.replaceAll("'","''")+"'";

// Read-only planning; no cast, UPDATE, ALTER, credentials or source values.
export function planNativeTypePreflight(reference,actualColumns) {
 const actual=new Map(actualColumns.map(c=>[key(c),c]));
 assert.equal(actual.size,actualColumns.length,'Duplicate native preflight columns');
 const uuidColumns=[],timezoneColumns=[],nullabilityColumns=[];
 for(const expected of reference.columns){
  const installed=actual.get(key(expected));if(!installed)continue;
  if(expected.type==='uuid' && installed.type==='text')uuidColumns.push({table:expected.table_name,column:expected.name});
  if(expected.type==='timestamp with time zone' && installed.type==='timestamp(3) without time zone')timezoneColumns.push({table:expected.table_name,column:expected.name,decision:'SOURCE_TIMEZONE_AND_PRECISION_REVIEW_REQUIRED'});
  if(expected.not_null!==installed.not_null)nullabilityColumns.push({table:expected.table_name,column:expected.name,productionNotNull:expected.not_null,candidateNotNull:installed.not_null,decision:'ORM_AND_SERVICE_NULL_HANDLING_REQUIRED'});
 }
 const sql=uuidColumns.map(c=>`SELECT ${literal(c.table)} AS table_name,${literal(c.column)} AS column_name,count(*)::int AS non_null_rows,count(*) FILTER (WHERE NOT pg_input_is_valid(${identifier(c.column)},'uuid'))::int AS invalid_uuid_rows FROM ${identifier(c.table)} WHERE ${identifier(c.column)} IS NOT NULL`).join(' UNION ALL ');
 return {uuidColumns,timezoneColumns,nullabilityColumns,sql,productionAdoptionApproved:false};
}

export function assessNativeTypePreflight(plan,counts) {
 const expected=new Set(plan.uuidColumns.map(c=>JSON.stringify([c.table,c.column])));
 assert.equal(counts.length,expected.size,'Incomplete UUID preflight scan');
 assert.equal(new Set(counts.map(c=>JSON.stringify([c.table_name,c.column_name]))).size,counts.length,'Duplicate UUID scan results');
 for(const c of counts){assert.ok(expected.has(JSON.stringify([c.table_name,c.column_name])));assert.ok(Number.isInteger(c.invalid_uuid_rows) && c.invalid_uuid_rows>=0 && Number.isInteger(c.non_null_rows) && c.non_null_rows>=c.invalid_uuid_rows);}
 const invalidColumns=counts.filter(c=>c.invalid_uuid_rows>0);
 return {scope:'READ_ONLY_NATIVE_TYPE_PREFLIGHT',productionAdoptionApproved:false,inPlaceConversionApproved:false,uuidColumnsScanned:counts.length,invalidColumns,uuidValuesParseable:invalidColumns.length===0,timezoneColumns:plan.timezoneColumns,nullabilityColumns:plan.nullabilityColumns,
  limitations:['Counts only; no identifiers or source values are exported.','Parseable UUID text is necessary but does not prove collision-free conversion, FK/index compatibility or application compatibility.','Timestamp conversion needs an explicit source timezone and precision decision.','Nullable production fields require matching ORM/service behavior before adoption.','This scan does not execute conversions or approve production deployment.']};
}
