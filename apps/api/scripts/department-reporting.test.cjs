const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {AgentService}=require('../dist/agents/agent.service');
const {AgentRuntimeService}=require('../dist/agents/agent-runtime.service');
const {DepartmentReportingService}=require('../dist/agents/department-reporting.service');
const {DepartmentReportingWorker}=require('../dist/agents/department-reporting.worker');
const {EmailDeliveryService,ReportEmailError}=require('../dist/integrations/email-delivery.service');
const {DEPARTMENT_DIRECTORS,directorDepartment}=require('../dist/agents/department-directors');
const domain=require('../dist/agents/executive-report.domain');
const {PLATFORM_STAFFING_KEY}=require('../dist/hr/staffing-catalog');
const {GOVERNANCE_REVIEW_ORDER}=require('../dist/agents/governance-review.domain');

function fixture(){
 const owner=randomUUID(),other=randomUUID(),tasks=new Map(),settings=new Map(),notifications=new Map(),events=[],controls=new Map();let active=true,calls=0,failEmail=null;
 const audit={record:async e=>{const row={...e,id:randomUUID()};events.push(row);return row;}};
 const agents=new AgentService(audit);for(const a of agents.list())controls.set(a.key,{key:a.key,state:'PAUSED'});
 settings.set(PLATFORM_STAFFING_KEY,{key:PLATFORM_STAFFING_KEY,value:{organizationId:'platform'}});
 const tx={
  $queryRaw:async()=>[{now:new Date()}],$executeRaw:async()=>1,
  account:{findFirst:async({where})=>active&&[owner,other].includes(where.id)?{id:where.id,personId:where.id}:null,findUnique:async()=>({email:'owner@example.invalid'})},
  organization:{findUnique:async()=>({id:'platform',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:owner})},
  operationalSetting:{findUnique:async({where})=>settings.get(where.key)||null,create:async({data})=>{assert(!settings.has(data.key));settings.set(data.key,structuredClone(data));return data;},update:async({where,data})=>{const row={...settings.get(where.key),...structuredClone(data)};settings.set(where.key,row);return row;},findMany:async()=>[...settings.values()].filter(s=>s.key.startsWith(domain.REPORT_PREFIX)&&['REVIEWING','FORMATTING'].includes(s.value.state)).slice(0,1)},
  aiAgentRuntime:{findUnique:async({where})=>controls.get(where.key)||null,update:async({where,data})=>{Object.assign(controls.get(where.key),data);return controls.get(where.key);}},
  aiAgentTask:{
   create:async({data})=>{assert(![...tasks.values()].some(t=>t.requestKey===data.requestKey));const t={id:randomUUID(),revision:randomUUID(),state:'QUEUED',createdAt:new Date(),...data};tasks.set(t.id,t);return t;},
   findUnique:async({where})=>where.id?tasks.get(where.id)||null:[...tasks.values()].find(t=>t.requestKey===where.requestedByAccountId_requestKey.requestKey&&t.requestedByAccountId===where.requestedByAccountId_requestKey.requestedByAccountId)||null,
   count:async({where})=>[...tasks.values()].filter(t=>(!where.agentKey||t.agentKey===where.agentKey)&&(!where.state||where.state.in.includes(t.state))).length,
   update:async({where,data})=>{Object.assign(tasks.get(where.id),data);return tasks.get(where.id);},
  },
  auditEvent:{findMany:async({where})=>events.filter(e=>e.action===where.action&&e.resourceId===where.resourceId&&e.resource===where.resource).slice(0,2)},
  notification:{create:async({data})=>{assert(!notifications.has(data.id));const row={status:'PENDING',createdAt:new Date(),...structuredClone(data)};notifications.set(row.id,row);return row;},findUnique:async({where})=>notifications.get(where.id)||null,findFirst:async()=>[...notifications.values()].find(n=>n.status==='PENDING'&&(!n.payload.nextAttemptAt||Date.parse(n.payload.nextAttemptAt)<=Date.now()))||null,update:async({where,data})=>{Object.assign(notifications.get(where.id),structuredClone(data));return notifications.get(where.id);}},
 };
 const db={...tx,serializable:async fn=>fn(tx)};
 const officeStatuses=new Map();
 const inbox={reportFile:async(_tx,_actor,id)=>({status:officeStatuses.get(id)||'READY_FOR_OWNER',source:{result:tasks.get(id).result},reviews:GOVERNANCE_REVIEW_ORDER.map(agentKey=>({agentKey,state:'COMPLETED',taskId:randomUUID(),revision:'review-v1',review:{decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false}}))})};
 // Stable task identities model an immutable stored review chain.
 for(const key of GOVERNANCE_REVIEW_ORDER){const id=domain.reportId(key);inbox[key]=id;}
 inbox.reportFile=async(_tx,_actor,id)=>({status:officeStatuses.get(id)||'READY_FOR_OWNER',source:{result:tasks.get(id).result},reviews:GOVERNANCE_REVIEW_ORDER.map(agentKey=>({agentKey,state:'COMPLETED',taskId:inbox[agentKey],revision:'review-v1',review:{decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false}}))});
 const reporting=new DepartmentReportingService(db,audit,inbox),email={sendExecutiveReport:async input=>{calls++;assert.equal(input.to,'owner@example.invalid');if(failEmail)throw failEmail;return{provider:'RESEND',messageId:'fixture-provider-message'};}};
 const worker=new DepartmentReportingWorker(db,audit,reporting,inbox,email);
 const request={requestId:randomUUID(),brief:'تقرير أعمال الإدارات',sendEmail:true,reviewed:true,reason:'طلب المالك لدورة التقارير'};
 const completeDirectors=()=>{for(const task of tasks.values()){task.state='COMPLETED';task.result='تقرير المدير بالأدلة المتاحة';}};
 const state=()=>settings.get(domain.REPORT_PREFIX+request.requestId).value;
 return{owner,other,tasks,settings,notifications,events,tx,db,audit,agents,inbox,reporting,worker,request,completeDirectors,state,officeStatuses,calls:()=>calls,revoke:()=>{active=false;},failEmail:e=>{failEmail=e;}};
}

test('fourteen distinct directors preserve existing identities and separate Abdullah and office',()=>{
 const agents=new AgentService({}).list();assert.equal(agents.length,23);
 assert.equal(new Set(Object.values(DEPARTMENT_DIRECTORS)).size,14);
 for(const key of Object.values(DEPARTMENT_DIRECTORS)){assert(agents.some(a=>a.key===key));assert(directorDepartment(key));assert(agents.find(a=>a.key===key).allowedActions.includes('READ_OPERATIONS'));}
 assert(!directorDepartment('EXECUTIVE'));for(const key of GOVERNANCE_REVIEW_ORDER)assert(!directorDepartment(key));
 assert.deepEqual(['EXECUTIVE','MARKETING','SALES','SUPPORT','INVENTORY','SOCIAL','LEGAL_RISK','CYBER_SECURITY'].filter(k=>!agents.some(a=>a.key===k)),[]);
});

test('report start is owner-only, fourteen tasks, idempotent and cannot accept recipient overrides',async()=>{
 const f=fixture();await assert.rejects(()=>f.reporting.start(f.other,f.request),e=>e.getStatus()===403);assert.equal(f.tasks.size,0);
 await assert.rejects(()=>f.reporting.start(f.owner,{...f.request,to:'outsider@example.invalid'}),e=>e.getStatus()===400);
 const cycle=await f.reporting.start(f.owner,f.request);assert.equal(cycle.sources.length,14);assert.equal(f.tasks.size,14);assert([...f.tasks.values()].every(t=>t.state==='QUEUED'));
 assert.equal((await f.reporting.start(f.owner,f.request)).id,cycle.id);assert.equal(f.tasks.size,14);
 await assert.rejects(()=>f.reporting.start(f.owner,{...f.request,brief:'موجز مختلف'}),e=>e.getStatus()===409);
 assert([...f.tasks.values()].every(t=>!t.prompt.includes('owner@example.invalid')));
});

test('incomplete director or pending office cannot reach Abdullah',async()=>{
 const f=fixture();await f.reporting.start(f.owner,f.request);await f.reporting.advance();assert.equal(f.tasks.size,14);
 f.completeDirectors();f.officeStatuses.set(f.state().sources[0].taskId,'WAITING_FOR_REVIEW');await f.reporting.advance();assert.equal(f.tasks.size,14);assert.equal(f.state().state,'REVIEWING');
});

test('office corrections and integrity failures remain explicit and never expose unreviewed drafts',async()=>{
 const f=fixture();await f.reporting.start(f.owner,f.request);f.completeDirectors();
 const cycle=f.state();f.officeStatuses.set(cycle.sources[0].taskId,'CORRECTION_REQUIRED');f.officeStatuses.set(cycle.sources[1].taskId,'INTEGRITY_REVIEW_REQUIRED');
 const bundle=await domain.readReportBundle(f.tx,cycle,f.inbox);assert.equal(bundle.entries.length,14);assert.equal(bundle.approved,false);
 assert.equal(bundle.entries[0].result,null);assert.equal(bundle.entries[0].officeStatus,'CORRECTION_REQUIRED');assert.deepEqual(bundle.entries[1].reviews,[]);assert.equal(bundle.entries[1].result,null);
 await f.reporting.advance();assert.equal(f.state().state,'FORMATTING');assert.equal([...f.tasks.values()].filter(t=>t.agentKey==='EXECUTIVE').length,1);
});

test('runtime gives Abdullah the verified fourteen-entry bundle and does not restart governance',async()=>{
 const f=fixture();await f.reporting.start(f.owner,f.request);f.completeDirectors();await f.reporting.advance();
 const task=f.tasks.get(f.state().executiveTaskId);Object.assign(task,{state:'RUNNING',claimId:randomUUID(),leaseExpiresAt:new Date(Date.now()+90000),dispatchedAt:null});let captured;
 const model={execute:async(...args)=>{captured=args[8];return{text:'تقرير عبدالله الموحد',inputTokens:40,outputTokens:20,estimatedCostMicroUsd:1};}};
 const runtime=new AgentRuntimeService(f.db,f.audit,f.agents,model,{},f.inbox);
 await runtime.runClaim({task:{...task},config:{},agent:f.agents.list().find(a=>a.key==='EXECUTIVE')});
 assert.equal(captured.entries.length,14);assert.equal(captured.approved,false);assert.equal(task.state,'COMPLETED');
 assert.equal(f.events.filter(e=>e.action==='GOVERNANCE_REVIEW_QUEUED').length,0);assert.equal(f.events.filter(e=>e.action==='AI_EXECUTIVE_REPORT_FORMATTED').length,1);
 await f.reporting.advance();assert.equal(f.notifications.size,1);assert.equal(f.state().state,'EMAIL_PENDING');await f.reporting.advance();assert.equal(f.notifications.size,1);
 await f.worker.deliverNext();await f.worker.deliverNext();assert.equal(f.calls(),1);assert.equal(f.state().state,'COMPLETE');assert.equal([...f.notifications.values()][0].payload.deliveryState,'PROVIDER_ACCEPTED');
});

test('source mutation, forged bundle digest or a duplicate queue receipt cannot reach the model',async()=>{
 const f=fixture();await f.reporting.start(f.owner,f.request);f.completeDirectors();await f.reporting.advance();const task=f.tasks.get(f.state().executiveTaskId);
 const source=f.tasks.get(f.state().sources[0].taskId);source.revision=randomUUID();await assert.rejects(()=>domain.executiveReportContext(f.tx,task,f.inbox));
 const clone={...f.state(),sources:f.state().sources.map(s=>({...s}))};clone.sources[1]=clone.sources[0];assert.throws(()=>domain.parseReportCycle(clone));
 const receipt=f.events.find(e=>e.action==='AI_EXECUTIVE_REPORT_QUEUED');f.events.push({...receipt});await assert.rejects(()=>domain.executiveReportContext(f.tx,task,f.inbox));
});

async function pendingEmail(f){await f.reporting.start(f.owner,f.request);f.completeDirectors();await f.reporting.advance();const task=f.tasks.get(f.state().executiveTaskId);Object.assign(task,{state:'COMPLETED',result:'تقرير عبدالله الموحد'});await f.reporting.advance();}

test('revoked owner and mutated executive output prevent email',async()=>{
 const f=fixture();await pendingEmail(f);f.revoke();await assert.rejects(()=>f.worker.deliverNext());assert.equal(f.calls(),0);
 const g=fixture();await pendingEmail(g);g.tasks.get(g.state().executiveTaskId).revision=randomUUID();await assert.rejects(()=>g.worker.deliverNext());assert.equal(g.calls(),0);
});

test('uncertain email and expired in-flight attempt are never resent automatically',async()=>{
 const f=fixture();await pendingEmail(f);f.failEmail(new ReportEmailError('UNCERTAIN'));await f.worker.deliverNext();await f.worker.deliverNext();assert.equal(f.calls(),1);assert.equal(f.state().state,'ATTENTION_REQUIRED');
 const g=fixture();await pendingEmail(g);const n=[...g.notifications.values()][0];Object.assign(n.payload,{deliveryState:'ATTEMPTING',nextAttemptAt:new Date(0).toISOString()});await g.worker.deliverNext();assert.equal(g.calls(),0);assert.equal(n.payload.deliveryState,'UNCERTAIN');assert.equal(n.status,'FAILED');
});

test('definite transient rejection gets a bounded retry with one stable notification identity',async()=>{
 const f=fixture();await pendingEmail(f);f.failEmail(new ReportEmailError('RETRYABLE'));await f.worker.deliverNext();const n=[...f.notifications.values()][0];assert.equal(n.payload.deliveryState,'DEFERRED');await f.worker.deliverNext();assert.equal(f.calls(),1);
 n.payload.nextAttemptAt=new Date(0).toISOString();f.failEmail(null);await f.worker.deliverNext();assert.equal(f.calls(),2);assert.equal(n.payload.deliveryState,'PROVIDER_ACCEPTED');assert.equal(f.notifications.size,1);
});

test('email renderer escapes model HTML, pins recipient and idempotency, classifies failures without network',async()=>{
 const before=global.fetch,env={...process.env};const requests=[];
 Object.assign(process.env,{NODE_ENV:'test',HYDROLAND_EMAIL_PROVIDER:'RESEND',RESEND_API_KEY:'fixture-only',HYDROLAND_EMAIL_FROM:'test@example.invalid',HYDROLAND_PUBLIC_WEB_ORIGIN:'https://example.invalid',RESEND_API_BASE_URL:'http://127.0.0.1:3399'});delete process.env.HYDROLAND_EMAIL_TEST_RECIPIENT;
 const service=new EmailDeliveryService({requireOperational:()=>{}},{});const input={notificationId:randomUUID(),to:'owner@example.invalid',text:'<img src=x onerror=alert(1)> تقرير'};
 try{
  global.fetch=async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify({id:'provider-id'}),{status:200});};
  await service.sendExecutiveReport(input);const request=requests[0],body=JSON.parse(request.options.body);assert.deepEqual(body.to,[input.to]);assert(body.html.includes('&lt;img'));assert(!body.html.includes('<img'));assert(body.html.includes('dir="rtl"'));assert.equal(body.text,input.text);assert.equal(request.options.headers['Idempotency-Key'],'hydroland-report/'+input.notificationId);assert.equal(request.options.redirect,'error');
  global.fetch=async()=>new Response('',{status:429});await assert.rejects(()=>service.sendExecutiveReport(input),e=>e.disposition==='RETRYABLE');
  global.fetch=async()=>{throw new Error('network ambiguity');};await assert.rejects(()=>service.sendExecutiveReport(input),e=>e.disposition==='UNCERTAIN');
  global.fetch=async()=>new Response('{}',{status:200});await assert.rejects(()=>service.sendExecutiveReport(input),e=>e.disposition==='UNCERTAIN');
  process.env.RESEND_API_BASE_URL='https://unexpected.example.invalid';await assert.rejects(()=>service.sendExecutiveReport(input),e=>e.disposition==='PERMANENT');
 }finally{global.fetch=before;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
});
