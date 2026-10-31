const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {DEPARTMENT_SOURCE_SPEC,DEPARTMENT_SOURCE_SPEC_V2,DEPARTMENT_SOURCE_SPEC_V3,DIRECTOR_SOURCE_FINGERPRINT,DIRECTOR_SOURCE_FINGERPRINT_V2,DOCUMENT_COUNT_KEYS,departmentSourceValues,departmentSourceSpec,departmentSourceScope,departmentSourceVersion}=require('../dist/agents/department-source.domain');
const {DEPARTMENT_DIRECTORS}=require('../dist/agents/department-directors');
const {operationsValues,operationsEvidenceDigest,readOperationsEvidence}=require('../dist/agents/agent-operations-evidence');
const value=(department,version=4)=>({version,department,scope:'INTERNAL_PLATFORM_ORGANIZATION',coverage:'PARTIAL',catalog:{revision:'2026-10-25.1',codesDigest:'a'.repeat(64)},documents:Object.fromEntries(DOCUMENT_COUNT_KEYS.map(k=>[k,0])),metrics:Object.fromEntries(departmentSourceSpec(version)[department].metrics.map(k=>[k,2])),missingSources:[departmentSourceSpec(version)[department].gap]});

test('fourteen bounded source packets distinguish missing connectors from measured zero',()=>{
 assert.equal(Object.keys(DEPARTMENT_SOURCE_SPEC).length,14);assert.equal(Object.values(DEPARTMENT_SOURCE_SPEC).filter(s=>s.metrics.length).length,14);
 for(const code of Object.keys(DEPARTMENT_SOURCE_SPEC)){const v=value(code);assert.deepEqual(departmentSourceValues(v,DEPARTMENT_DIRECTORS[code]),v);assert.equal(v.coverage,'PARTIAL');assert.equal(v.missingSources.length,1);}
 assert.equal(Object.values(DEPARTMENT_SOURCE_SPEC_V2).filter(s=>s.metrics.length).length,11);assert.deepEqual(value('INVENTORY_LOGISTICS',2).metrics,{});assert.deepEqual(value('FACILITIES_ASSETS_MAINTENANCE',2).metrics,{});
 assert.deepEqual(value('MARKETING_GROWTH',3).metrics,{});assert.equal(Object.values(DEPARTMENT_SOURCE_SPEC_V3).filter(s=>s.metrics.length).length,13);assert.deepEqual(value('MARKETING_GROWTH',4).metrics,{marketingCampaignDrafts:2,openMarketingCampaignDrafts:2,archivedMarketingCampaignDrafts:2});assert.equal(value('HR').documents.documents,0);
});
test('source versions preserve old adapter shapes and refuse silent upgrades',()=>{
 for(const code of ['INVENTORY_LOGISTICS','FACILITIES_ASSETS_MAINTENANCE']){
  const old=value(code,2),current=value(code,3);assert.deepEqual(departmentSourceValues(old),old);assert.deepEqual(departmentSourceValues(current),current);
  assert.equal(departmentSourceValues({...old,version:3}),null);assert.equal(departmentSourceValues({...current,version:2}),null);
 }
 for(const bad of [1,5,'4',null])assert.equal(departmentSourceValues({...value('HR'),version:bad}),null);
 assert.equal(departmentSourceVersion('department-source:v2:abc'),2);assert.equal(departmentSourceVersion('department-source:v3:abc'),3);assert.equal(departmentSourceVersion('department-source:v4:abc'),4);assert.equal(departmentSourceVersion('department-source:v5:abc'),null);
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
 for(const fingerprint of [DIRECTOR_SOURCE_FINGERPRINT_V2+'pinned',DIRECTOR_SOURCE_FINGERPRINT+'pinned','department-source:v5:future'])assert.deepEqual(await readOperationsEvidence(tx,{...source,fingerprint}),{status:'INVALID'},'A legacy receipt cannot satisfy a supported or unknown pinned contract');
});
for(const version of [2,3,4])test(`v${version} receipt binds the original department, input and exact successful claim`,async()=>{
 const id=randomUUID(),claimId=randomUUID(),revision=randomUUID(),now=new Date(),values=value('HR',version),scope=departmentSourceScope(version),observedAt=now.toISOString(),source={id,claimId,agentKey:'HR_DIRECTOR',action:'READ_OPERATIONS',fingerprint:`department-source:v${version}:pinned`,startedAt:new Date(now-100),finishedAt:new Date(+now+100)};
 const events=[{action:'AI_TASK_STARTED',metadata:{claimId,revision}},{action:'AI_TASK_OPERATIONS_CAPTURED',metadata:{claimId,sourceRevision:revision,agentKey:source.agentKey,scope,observedAt,values,digest:operationsEvidenceDigest(id,claimId,revision,observedAt,values)}}];
 const tx={auditEvent:{findMany:async()=>events}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'RECORDED',scope,observedAt,values});
 assert.deepEqual(await readOperationsEvidence(tx,{...source,fingerprint:'legacy-task'}),{status:'INVALID'},'A historical task cannot be relabeled as new departmental evidence');
 assert.deepEqual(await readOperationsEvidence(tx,{...source,fingerprint:`department-source:v${version===2?4:2}:pinned`}),{status:'INVALID'},'A valid receipt cannot fulfill another pinned version');
 const reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).reverse().map(([k,v])=>[k,reorder(v)])):x;
 events[1].metadata.values=reorder(values);assert.deepEqual(await readOperationsEvidence(tx,source),{status:'RECORDED',scope,observedAt,values},'JSONB key reordering cannot invalidate a valid recorded input');
 events[1].metadata.values={...values,catalog:{...values.catalog,codesDigest:'b'.repeat(64)}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'INVALID'});
 events[1].metadata.values={...values,metrics:{...values.metrics,candidates:9}};assert.deepEqual(await readOperationsEvidence(tx,source),{status:'INVALID'});
 events[1].metadata.values=values;assert.deepEqual(await readOperationsEvidence(tx,{...source,agentKey:'FINANCE_DIRECTOR'}),{status:'INVALID'});
 assert.deepEqual(await readOperationsEvidence(tx,{...source,claimId:randomUUID()}),{status:'INVALID'});
});

test('v4 marketing drafts cannot relabel a historical v3 source or imply publication',()=>{const old=value('MARKETING_GROWTH',3),current=value('MARKETING_GROWTH',4);assert.equal(departmentSourceValues({...old,version:4}),null);assert.equal(departmentSourceValues({...current,version:3}),null);assert.equal(departmentSourceValues({...current,metrics:{...current.metrics,publishedCampaigns:2}}),null);assert.deepEqual(current.missingSources,['CAMPAIGN_PUBLICATION_ANALYTICS']);});
