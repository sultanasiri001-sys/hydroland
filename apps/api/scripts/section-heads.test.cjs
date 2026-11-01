const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {AgentService}=require('../dist/agents/agent.service');
const {AgentModelProviderService}=require('../dist/agents/agent-model-provider.service');
const {agentHierarchy}=require('../dist/agents/agent-hierarchy');
const {AGENT_DEPARTMENTS}=require('../dist/agents/agent-runtime.domain');
const {DEPARTMENT_DIRECTORS}=require('../dist/agents/department-directors');
const {DEPARTMENT_SECTIONS,SECTION_HEAD_CATALOG_VERSION,SECTION_HEAD_APPOINTMENT_KEY,isReusedSectionHead}=require('../dist/agents/department-sections');
const {appointmentRequest,appointSectionHeads}=require('../dist/agents/section-head-appointments');

const request=()=>appointmentRequest({catalogVersion:SECTION_HEAD_CATALOG_VERSION,enableNewHeads:true,reason:'تعيين رؤساء الأقسام وفق الهيكل',reviewed:true});
function fixture(){
 const owner=randomUUID(),other=randomUUID(),controls=new Map(),settings=new Map(),events=[];let ready=true;
 const descriptors=new AgentService({}).list();
 for(const agent of descriptors)if(!agent.key.endsWith('_HEAD'))controls.set(agent.key,{key:agent.key,state:'PAUSED',revision:randomUUID(),lastAdminAccountId:other});
 settings.set('PLATFORM_STAFFING_ORGANIZATION:v1',{value:{organizationId:'platform'}});
 const tx={
  $queryRaw:async()=>[],account:{findFirst:async({where})=>[owner,other].includes(where.id)?{id:where.id,personId:where.id}:null},
  organization:{findUnique:async()=>({id:'platform',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner})},
  orgUnit:{findMany:async()=>Object.keys(DEPARTMENT_DIRECTORS).map(code=>({code}))},
  operationalSetting:{findUnique:async({where})=>settings.get(where.key)||null,create:async({data})=>{assert(!settings.has(data.key));settings.set(data.key,data);return data;}},
  aiAgentRuntime:{findUnique:async({where})=>controls.get(where.key)||null,create:async({data})=>{assert(!controls.has(data.key));const row={...data,revision:randomUUID()};controls.set(row.key,row);return row;},update:async({where,data})=>{Object.assign(controls.get(where.key),data);return controls.get(where.key);}},
  aiAgentTask:{create:async()=>{throw new Error('Appointment cannot create tasks');}},
 };
 const audit={record:async event=>events.push(event)},check=async()=>{if(!ready)throw new Error('fixture provider unavailable');};
 return{tx,owner,other,controls,settings,events,audit,check,notReady:()=>{ready=false;}};
}

test('83 unique section heads cover the guide and form an acyclic hierarchy of 14 directors',()=>{
 const expected={HR:8,MARINE_OPERATIONS:7,TRAINING:7,INVENTORY_LOGISTICS:6,FINANCE:6,SAFETY_COMPLIANCE_RISK:6,CUSTOMER_EXPERIENCE:5,MARKETING_GROWTH:7,TECHNOLOGY_CYBERSECURITY:7,FACILITIES_ASSETS_MAINTENANCE:5,ADMIN_AFFAIRS_RECORDS:4,EXECUTIVE_GOVERNANCE:5,RND_MARKET_INTELLIGENCE:4,LEGAL_CONTRACTS_INSURANCE:6};
 assert.equal(DEPARTMENT_SECTIONS.length,83);assert.equal(new Set(DEPARTMENT_SECTIONS.map(s=>s.code)).size,83);assert.equal(new Set(DEPARTMENT_SECTIONS.map(s=>s.agentKey)).size,83);
 assert.deepEqual(Object.fromEntries(Object.keys(expected).map(code=>[code,DEPARTMENT_SECTIONS.filter(s=>s.departmentCode===code).length])),expected);
 const agents=new AgentService({}).list();assert.equal(agents.length,103);assert.equal(new Set(agents.map(a=>a.key)).size,103);
 for(const s of DEPARTMENT_SECTIONS){const a=agents.find(a=>a.key===s.agentKey),h=agentHierarchy(s.agentKey);assert(a);assert.equal(AGENT_DEPARTMENTS[a.key],s.departmentCode);assert.equal(h.reportsToAgentKey,DEPARTMENT_DIRECTORS[s.departmentCode]);assert.notEqual(a.key,h.reportsToAgentKey);assert(!agentHierarchy(h.reportsToAgentKey).section);assert(h.reportingRoles.includes('SECTION_HEAD'));assert(a.allowedActions.includes('DRAFT_REPORT'));assert(a.forbiddenActions.includes('CHANGE_ROLE'));assert(a.forbiddenActions.includes('SIGN_CONTRACT'));}
 for(const key of ['EXECUTIVE','SALES','SOCIAL'])assert.equal(agents.filter(a=>a.key===key).length,1);
 assert.equal(DEPARTMENT_SECTIONS.filter(s=>isReusedSectionHead(s.agentKey)).length,3);
 assert.deepEqual(agentHierarchy('EXECUTIVE').reportingRoles,['EXECUTIVE_SECRETARY','SECTION_HEAD']);
});

test('appointment rejects unreviewed, stale and extended requests before changing records',()=>{
 const valid={catalogVersion:SECTION_HEAD_CATALOG_VERSION,enableNewHeads:true,reason:'طلب تعيين واضح',reviewed:true};
 for(const body of [{...valid,reviewed:false},{...valid,catalogVersion:'old'},{...valid,enableNewHeads:'true'},{...valid,accountId:'arbitrary'},{...valid,reason:'x'}])assert.throws(()=>appointmentRequest(body));
});

test('only the verified internal platform owner can appoint section heads',async()=>{
 for(const actor of ['unknown','other']){const f=fixture(),before=structuredClone([...f.controls]);await assert.rejects(()=>appointSectionHeads(f.tx,f.audit,actor==='other'?f.other:actor,request(),f.check),e=>e.getStatus()===403);assert.deepEqual([...f.controls],before);assert.equal(f.events.length,0);}
});

test('missing parent department, parent director and provider readiness block activation before writes',async()=>{
 for(const failure of ['department','director','provider']){const f=fixture();if(failure==='department')f.tx.orgUnit.findMany=async()=>[{code:'HR'}];if(failure==='director')f.controls.delete('HR_DIRECTOR');if(failure==='provider')f.notReady();const before=structuredClone([...f.controls]);await assert.rejects(()=>appointSectionHeads(f.tx,f.audit,f.owner,request(),f.check));assert.deepEqual([...f.controls],before);assert.equal(f.settings.has(SECTION_HEAD_APPOINTMENT_KEY),false);}
});

test('appointment adds 80 identities, reuses three and never changes prior controls or task queues',async()=>{
 const f=fixture(),before=structuredClone([...f.controls]);assert.equal(before.length,23);
 const result=await appointSectionHeads(f.tx,f.audit,f.owner,request(),f.check);assert.equal(result.created,80);assert.equal(result.enabled,80);assert.equal(f.controls.size,103);
 for(const [key,row]of before)assert.deepEqual(f.controls.get(key),row);
 assert.equal(f.events.length,1);assert.equal(f.events[0].metadata.noTasksCreated,true);assert.equal(f.events[0].metadata.budgetUnchanged,true);
 const receipt=f.settings.get(SECTION_HEAD_APPOINTMENT_KEY).value;assert.equal(receipt.assignments.length,83);assert.equal(receipt.organizationId,'platform');
 const head=f.controls.get('HR_WORKFORCE_HEAD');head.state='PAUSED';const paused=structuredClone(head);
 const repeated=await appointSectionHeads(f.tx,f.audit,f.owner,request(),f.check);assert.equal(repeated.alreadyAppointed,true);assert.equal(repeated.created,0);assert.deepEqual(f.controls.get(head.key),paused);assert.equal(f.events.length,1);
});

test('already initialized heads can be appointed paused without a provider or budget change',async()=>{
 const f=fixture();f.notReady();const result=await appointSectionHeads(f.tx,f.audit,f.owner,{...request(),enableNewHeads:false},f.check);assert.equal(result.created,80);assert.equal(result.enabled,0);assert([...f.controls.values()].every(c=>c.state==='PAUSED'));
});

test('model instructions bind a head to its section and director without claiming section evidence',async()=>{
 const model=new AgentModelProviderService({}),agent=new AgentService({}).list().find(a=>a.key==='HR_WORKFORCE_HEAD');let input;
 model.request=async(_path,body)=>{input=body.input;throw new Error('fixture prompt captured');};
 await assert.rejects(()=>model.execute({ready:true,model:'fixture'},agent,'DRAFT_REPORT','ar-SA','أعد تقرير القسم'),/fixture prompt captured/);
 const instructions=input[0].content;assert(instructions.includes('HR-01'));assert(instructions.includes('HR_DIRECTOR'));assert(instructions.includes('not section-level performance'));assert(instructions.includes('cannot send messages'));
});
