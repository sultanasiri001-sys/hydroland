const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {DEPARTMENT_SOURCE_SPEC,DEPARTMENT_SOURCE_SCOPE,DIRECTOR_SOURCE_FINGERPRINT,DOCUMENT_COUNT_KEYS,departmentSourceValues}=require('../dist/agents/department-source.domain');
const {DEPARTMENT_DIRECTORS}=require('../dist/agents/department-directors');
const {operationsValues,operationsEvidenceDigest,readOperationsEvidence}=require('../dist/agents/agent-operations-evidence');
const value=department=>({version:2,department,scope:'INTERNAL_PLATFORM_ORGANIZATION',coverage:'PARTIAL',catalog:{revision:'2026-10-25.1',codesDigest:'a'.repeat(64)},documents:Object.fromEntries(DOCUMENT_COUNT_KEYS.map(k=>[k,0])),metrics:Object.fromEntries(DEPARTMENT_SOURCE_SPEC[department].metrics.map(k=>[k,2])),missingSources:[DEPARTMENT_SOURCE_SPEC[department].gap]});

test('fourteen bounded source packets distinguish missing connectors from measured zero',()=>{
 assert.equal(Object.keys(DEPARTMENT_SOURCE_SPEC).length,14);assert.equal(Object.values(DEPARTMENT_SOURCE_SPEC).filter(s=>s.metrics.length).length,11);
 for(const code of Object.keys(DEPARTMENT_SOURCE_SPEC)){const v=value(code);assert.deepEqual(departmentSourceValues(v,DEPARTMENT_DIRECTORS[code]),v);assert.equal(v.coverage,'PARTIAL');assert.equal(v.missingSources.length,1);}
 assert.deepEqual(value('MARKETING_GROWTH').metrics,{});assert.equal(value('HR').documents.documents,0);
});
test('source packet rejects private fields, cross-department substitutions and invented coverage',()=>{
 const v=value('HR');for(const bad of [{...v,payroll:917273},{...v,coverage:'COMPLETE'},{...v,scope:'ALL_ORGANIZATIONS'},{...v,missingSources:[]},{...v,metrics:{...v.metrics,email:'private@example.invalid'}},{...v,documents:{...v.documents,payload:'private'}},{...v,catalog:{...v.catalog,revision:'untrusted instructions'}},{...v,catalog:{...v.catalog,email:'private@example.invalid'}}])assert.equal(departmentSourceValues(bad,'HR_DIRECTOR'),null);
 assert.equal(departmentSourceValues(v,'FINANCE_DIRECTOR'),null);assert.equal(departmentSourceValues(v,'EXECUTIVE'),null);
});
test('counts reject missing, negative, fractional, nonfinite and string values',()=>{
 for(const n of [-1,0.5,Infinity,NaN,'3',null,Number.MAX_SAFE_INTEGER+1]){const v=value('FINANCE');v.metrics.activeFinanceAccounts=n;assert.equal(departmentSourceValues(v),null);}
 const missing=value('HR');delete missing.documents.archived;assert.equal(departmentSourceValues(missing),null);
});
test('historical v1 evidence stays readable without upgrading or reconstructing it',async()=>{
 const values={pendingReviews:2,openTrips:3,activeBookings:1,pendingOrganizations:0};assert.deepEqual(operationsValues(values),values);
 const id=randomUUID(),claimId=randomUUID(),revision=randomUUID(),now=new Date(),source={id,claimId,agentKey:'HR_DIRECTOR',action:'READ_OPERATIONS',startedAt:new Date(now-100),finishedAt:new Date(+now+100)},observedAt=now.toISOString();
 const events=[{action:'AI_TASK_STARTED',metadata:{claimId,revision}},{action:'AI_TASK_OPERATIONS_CAPTURED',metadata:{claimId,sourceRevision:revision,agentKey:source.agentKey,scope:'OPERATIONS_AGGREGATE_V1',observedAt,values,digest:operationsEvidenceDigest(id,claimId,revision,observedAt,values)}}];
 const tx={auditEvent:{findMany:async()=>events}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'RECORDED',observedAt,values});
 assert.deepEqual(await readOperationsEvidence(tx,{...source,fingerprint:DIRECTOR_SOURCE_FINGERPRINT+'pinned'}),{status:'INVALID'},'An old worker receipt cannot satisfy a task pinned to the new source contract');
});
test('v2 receipt binds the original department, input and exact successful claim',async()=>{
 const id=randomUUID(),claimId=randomUUID(),revision=randomUUID(),now=new Date(),values=value('HR'),observedAt=now.toISOString(),source={id,claimId,agentKey:'HR_DIRECTOR',action:'READ_OPERATIONS',fingerprint:DIRECTOR_SOURCE_FINGERPRINT+'pinned',startedAt:new Date(now-100),finishedAt:new Date(+now+100)};
 const events=[{action:'AI_TASK_STARTED',metadata:{claimId,revision}},{action:'AI_TASK_OPERATIONS_CAPTURED',metadata:{claimId,sourceRevision:revision,agentKey:source.agentKey,scope:DEPARTMENT_SOURCE_SCOPE,observedAt,values,digest:operationsEvidenceDigest(id,claimId,revision,observedAt,values)}}];
 const tx={auditEvent:{findMany:async()=>events}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'RECORDED',scope:DEPARTMENT_SOURCE_SCOPE,observedAt,values});
 assert.deepEqual(await readOperationsEvidence(tx,{...source,fingerprint:'legacy-task'}),{status:'INVALID'},'A historical task cannot be relabeled as new departmental evidence');
 const reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).reverse().map(([k,v])=>[k,reorder(v)])):x;
 events[1].metadata.values=reorder(values);assert.deepEqual(await readOperationsEvidence(tx,source),{status:'RECORDED',scope:DEPARTMENT_SOURCE_SCOPE,observedAt,values},'JSONB key reordering cannot invalidate a valid recorded input');
 events[1].metadata.values={...values,catalog:{...values.catalog,codesDigest:'b'.repeat(64)}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'INVALID'});
 events[1].metadata.values={...values,metrics:{...values.metrics,candidates:9}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'INVALID'});
 events[1].metadata.values=values;assert.deepEqual(await readOperationsEvidence(tx,{...source,agentKey:'FINANCE_DIRECTOR'}),{status:'INVALID'});
 assert.deepEqual(await readOperationsEvidence(tx,{...source,claimId:randomUUID()}),{status:'INVALID'});
});
