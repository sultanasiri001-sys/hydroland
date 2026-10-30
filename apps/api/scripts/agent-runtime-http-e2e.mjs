import assert from 'node:assert/strict';
import {randomUUID,scryptSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {PrismaClient} from '@prisma/client';
const base=process.env.AI_E2E_BASE_URL||'http://127.0.0.1:3110/api/v1',modelUrl=new URL(process.env.HYDROLAND_AI_TEST_BASE_URL||'http://127.0.0.1:3321/v1');
for(const value of [base,process.env.DATABASE_URL,modelUrl])assert(['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname),'AI fixtures require loopback API, DB and model');
assert.equal(process.env.NODE_ENV,'test');assert(process.env.CI==='true');assert.equal(process.env.HYDROLAND_AI_TEST_MANUAL_WORKER,'1');
const require=createRequire(import.meta.url),{DatabaseService}=require('../dist/database/database.service.js'),{AuditService}=require('../dist/audit/audit.service.js'),{AdminService}=require('../dist/admin/admin.service.js'),{IntegrationService}=require('../dist/integrations/integration.service.js'),{AgentService}=require('../dist/agents/agent.service.js'),{AgentModelProviderService}=require('../dist/agents/agent-model-provider.service.js'),{AgentRuntimeService}=require('../dist/agents/agent-runtime.service.js');
const db=new PrismaClient(),runtimeDb=new DatabaseService(),audit=new AuditService(runtimeDb),admin=new AdminService(runtimeDb,audit),integrations=new IntegrationService(audit),agents=new AgentService(audit),provider=new AgentModelProviderService(integrations);
const {GovernanceReviewInboxService}=require('../dist/agents/governance-review-inbox.service.js');
const runtime=(writer=audit,model=provider)=>new AgentRuntimeService(runtimeDb,writer,agents,model,admin,new GovernanceReviewInboxService(runtimeDb,agents)),service=runtime();
const people=[],accounts=[],suffix=randomUUID(),password='Ai-runtime-fixture-only-2026!',salt='ai-runtime-fixture',passwordHash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;
let initialized=false,modelCalls=0,countCalls=0,metadataCalls=0,release,modelEntered=false,hold=false,breakConnection=false,tokenCount=64,invalidOutput=false,modelText=null;
let providerFailure=null;
const payloads=[];
const model=createServer(async(req,res)=>{
 let text='';for await(const chunk of req)text+=chunk;const data=JSON.parse(text||'{}');
 if(req.url==='/v1/models/fixture-model'){metadataCalls++;assert.equal(req.method,'GET');assert.equal(text,'');return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({object:'model',id:'fixture-model'}));}
 if(req.url==='/v1/responses/input_tokens'){countCalls++;if(providerFailure?.stage==='INPUT_TOKENS')return res.writeHead(providerFailure.status||429,{'content-type':'application/json',...providerFailure.headers}).end(JSON.stringify({error:{code:providerFailure.code,message:providerFailure.message}}));return res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({object:'response.input_tokens',input_tokens:tokenCount}));}
 if(req.url!=='/v1/responses')return res.writeHead(404).end();modelCalls++;payloads.push(data);modelEntered=true;
 if(providerFailure?.stage==='GENERATION')return res.writeHead(providerFailure.status||429,{'content-type':'application/json',...providerFailure.headers}).end(JSON.stringify({error:{code:providerFailure.code,message:providerFailure.message}}));
 if(breakConnection){req.socket.destroy();return;}if(hold)await new Promise(resolve=>{release=resolve;});
 res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({id:'resp_fixture_'+modelCalls,status:'completed',output:[{type:'reasoning',summary:[]},{type:'message',role:'assistant',content:[{type:'output_text',text:invalidOutput?'':modelText??`مسودة اختبار آمنة ${modelCalls} <img src=x onerror=alert(1)>`}]}],usage:{input_tokens:64,output_tokens:32}}));
});
await new Promise(resolve=>model.listen(Number(modelUrl.port),'127.0.0.1',resolve));
const call=async(path,token,body,method=body?'POST':'GET')=>{const response=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json().catch(()=>null),cacheControl:response.headers.get('cache-control')};};
const fixture=async(label,role)=>{const person=await db.person.create({data:{firstName:'Agent fixture',lastName:label}});people.push(person.id);const account=await db.account.create({data:{personId:person.id,email:`ai-${label}-${suffix}@example.invalid`,passwordHash,status:'ACTIVE',emailVerifiedAt:new Date()}});accounts.push(account.id);if(role)await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE'}});return account;};
const login=async account=>{const response=await call('/auth/login',null,{email:account.email,password});assert.equal(response.status,200);return response.body;};
const safe=value=>{if(!value||typeof value!=='object')return;for(const[key,child]of Object.entries(value)){assert(!/password|apikey|authorization|secret|claimId|fingerprint/i.test(key),`Private field returned: ${key}`);safe(child);}};
const until=async(fn)=>{const deadline=Date.now()+10000;while(!await fn()){assert(Date.now()<deadline,'Fixture condition timed out');await new Promise(r=>setTimeout(r,10));}};
let token,actor;
const catalog=async()=>{const response=await call('/admin/agents',token);assert.equal(response.status,200);safe(response.body);return response.body;};
const control=async(state,key='SUPPORT',extra={})=>{const row=(await catalog()).items.find(a=>a.key===key);return call(`/admin/agents/${key}/control`,token,{state,expectedRevision:row.revision,reason:'Isolated runtime decision',reviewed:true,...extra},'PATCH');};
const enqueue=async(prompt='مهمة اختبار معزولة',key='SUPPORT',extra={})=>call(`/admin/agents/${key}/tasks`,token,{action:'DRAFT_MESSAGE',language:'ar-SA',prompt,reason:'Isolated runtime task',reviewed:true,requestId:randomUUID(),...extra});
try{
 assert.equal(await db.aiAgentRuntime.count(),0,'Refuse a database containing pre-existing agent runtimes');
 actor=await fixture('admin','ADMIN');const ordinary=await fixture('ordinary','STAFF');token=(await login(actor)).accessToken;const other=(await login(ordinary)).accessToken;
 assert.equal((await call('/admin/agents')).status,401);assert.equal((await call('/admin/agents',other)).status,403);
 for(const path of ['/admin/agents/governance-reviews','/admin/agents/governance-reviews/'+randomUUID()]){assert.equal((await call(path)).status,401);assert.equal((await call(path,other)).status,403);}
 const emptyInbox=await call('/admin/agents/governance-reviews',token);assert.equal(emptyInbox.status,200);assert.deepEqual(emptyInbox.body.items,[]);assert.equal(emptyInbox.body.readOnly,true);assert.equal(emptyInbox.cacheControl,'no-store');
 assert.equal((await call('/admin/agents/provider-connection')).status,401);assert.equal((await call('/admin/agents/provider-connection',other)).status,403);assert.equal(metadataCalls,0);
 const connection=await call('/admin/agents/provider-connection',token);assert.equal(connection.status,200);assert.equal(connection.body.connected,true);assert.equal(connection.body.scope,'MODEL_ACCESS_ONLY');assert.equal(connection.body.generationTested,false);safe(connection.body);assert.equal(metadataCalls,1);assert.equal(modelCalls,0);assert.equal(countCalls,0);assert.equal(await db.aiAgentRuntime.count(),0);assert.equal(await db.aiAgentTask.count(),0,'A connection check creates no agent controls or tasks');
 assert.equal((await call('/admin/agents/initialize',other,{reason:'Denied fixture',reviewed:true})).status,403);
 const before=await catalog();assert.equal(before.initialized,false);assert.equal(before.items.length,23);assert.equal(before.items.filter(x=>x.reportingRole==='DEPARTMENT_DIRECTOR').length,14);assert.equal(new Set(before.items.filter(x=>x.reportingRole==='DEPARTMENT_DIRECTOR').map(x=>x.departmentCode)).size,14);assert(before.items.every(x=>x.counts===null&&x.workload==='UNAVAILABLE'&&x.state==='UNINITIALIZED'));
 const broken=runtime({record:async()=>{throw new Error('Injected runtime audit failure');}});
 await assert.rejects(()=>broken.initialize(actor.id,{reason:'Rollback fixture',reviewed:true}),/Injected/);assert.equal(await db.aiAgentRuntime.count(),0);
 assert.equal((await call('/admin/agents/initialize',token,{reason:'Isolated runtime setup',reviewed:true})).status,201);initialized=true;
 assert.equal((await call('/admin/agents/initialize',token,{reason:'Isolated repeated setup',reviewed:true})).status,201);assert.equal(await db.aiAgentRuntime.count(),23);assert.equal(await db.auditEvent.count({where:{action:'AI_RUNTIME_INITIALIZED'}}),1);
 assert.equal((await control('ENABLED')).status,409);await service.heartbeat();assert.equal((await catalog()).provider.ready,true);
 assert.equal((await enqueue('بريد اختبار','SUPPORT',{action:'CHANGE_ROLE'})).status,400);assert.equal((await enqueue('بريد اختبار','SUPPORT',{reviewed:false})).status,400);
 const requestId=randomUUID();const repeated=await Promise.all([enqueue('مهمة واحدة','SUPPORT',{requestId}),enqueue('مهمة واحدة','SUPPORT',{requestId})]);assert(repeated.every(x=>x.status===201));assert.equal(repeated[0].body.id,repeated[1].body.id);assert.equal((await enqueue('مهمة مختلفة','SUPPORT',{requestId})).status,409);
 const first=repeated[0].body;safe(first);assert.equal(await service.claim(),null);assert.equal(modelCalls,0);
 const support=(await catalog()).items.find(a=>a.key==='SUPPORT'),sameRevision=support.revision;
 const concurrent=await Promise.all([control('ENABLED','SUPPORT',{expectedRevision:sameRevision}),control('ENABLED','SUPPORT',{expectedRevision:sameRevision})]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
 const claimed=await Promise.all([service.claim(),runtime().claim()]);assert.equal(claimed.filter(Boolean).length,1);const claim=claimed.find(Boolean);assert.equal(claim.task.id,first.id);
 hold=true;const execution=Promise.all([service.runClaim(claim),runtime().runClaim(claim)]);await until(()=>modelEntered);assert.equal(modelCalls,1);assert.equal(countCalls,1);
 const queued=[];for(let i=0;i<3;i++){const response=await enqueue('مهمة تنتظر '+i);assert.equal(response.status,201);queued.push(response.body.id);}
 const loaded=(await catalog()).items.find(a=>a.key==='SUPPORT');assert.equal(loaded.counts.running,1);assert.equal(loaded.counts.queued,3);assert.equal(loaded.workload,'HIGH');
 assert.equal((await control('PAUSED')).status,200);assert.equal(await runtime().claim(),null);hold=false;release();await execution;
 assert.equal(modelCalls,1);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:first.id}})).state,'COMPLETED');assert.equal(await db.aiAgentTask.count({where:{id:{in:queued},state:'QUEUED'}}),3);const governanceQueued=await db.aiAgentTask.findMany({where:{agentKey:'GOV_QUALITY_AUDIT',requestedByAccountId:actor.id,state:'QUEUED'}});assert.equal(governanceQueued.length,1);assert.equal(governanceQueued[0].action,'READ_OPERATIONS');assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',resourceId:governanceQueued[0].id}}),1);
 assert.equal(await runtime().claim(),null,'New service instance must retain the paused state');await service.heartbeat();assert.equal((await control('ENABLED')).status,200);
 for(let i=0;i<3;i++){const next=await runtime().claim();assert(next);await runtime().runClaim(next);}assert.equal(modelCalls,4);assert.equal((await catalog()).items.find(a=>a.key==='SUPPORT').workload,'AVAILABLE');
 for(const payload of payloads){assert.equal(payload.store,false);assert.deepEqual(payload.tools,[]);assert.equal(payload.tool_choice,'none');assert.equal(payload.max_output_tokens,512);assert(!JSON.stringify(payload).includes(actor.email));}
 const taskAudit=await db.auditEvent.findMany({where:{resourceId:first.id}});assert.equal(taskAudit.filter(e=>e.action==='AI_TASK_STARTED').length,1);assert.equal(taskAudit.filter(e=>e.action==='AI_TASK_DISPATCHED').length,1);assert.equal(taskAudit.filter(e=>e.action==='AI_TASK_COMPLETED').length,1);
 const budgetHeld=await enqueue('مهمة يمنعها حد التكلفة');assert.equal(budgetHeld.status,201);const reservation=await db.aiAgentTask.aggregate({_sum:{reservedCostMicroUsd:true}});const limited={configuration:()=>({...provider.configuration(),dailyBudgetMicroUsd:reservation._sum.reservedCostMicroUsd})};assert.equal(await runtime(audit,limited).claim(),null);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:budgetHeld.body.id}})).state,'QUEUED');assert.equal(modelCalls,4);
 assert.equal((await call('/admin/agents/tasks/'+budgetHeld.body.id+'/decision',token,{action:'CANCEL',expectedRevision:budgetHeld.body.revision,reason:'Cancel retained budget fixture',reviewed:true},'PATCH')).status,200);
 const unchanged=(await catalog()).items.find(x=>x.key==='SUPPORT');await assert.rejects(()=>broken.control(actor.id,'SUPPORT',{state:'PAUSED',expectedRevision:unchanged.revision,reason:'Rollback control',reviewed:true}),/Injected/);assert.equal((await catalog()).items.find(x=>x.key==='SUPPORT').revision,unchanged.revision);
 const taskCount=await db.aiAgentTask.count();await assert.rejects(()=>broken.enqueue(actor.id,'SUPPORT',{action:'DRAFT_MESSAGE',language:'ar-SA',prompt:'فشل تدقيق معزول',requestId:randomUUID(),reason:'Rollback enqueue',reviewed:true}),/Injected/);assert.equal(await db.aiAgentTask.count(),taskCount);
 assert.equal((await control('PAUSED')).status,200);await db.operationalSetting.update({where:{key:'AI_RUNTIME_HEARTBEAT:v1'},data:{value:{observedAt:'2000-01-01T00:00:00Z',configuration:'stale'}}});const stale=await catalog();assert.equal(stale.provider.reason,'WORKER_STALE');assert(stale.items.every(x=>x.counts===null&&x.workload==='UNAVAILABLE'));assert.equal((await control('ENABLED')).status,409);await service.heartbeat();
 // A lost process leaves one durable attempt; it is never automatically sent again.
 const crashed=await enqueue('انقطاع قبل الإرسال');assert.equal((await control('ENABLED')).status,200);const lost=await service.claim();assert.equal(lost.task.id,crashed.body.id);await db.aiAgentTask.update({where:{id:lost.task.id},data:{leaseExpiresAt:new Date(0)}});await runtime().heartbeat();assert.equal(modelCalls,4);const interrupted=await db.aiAgentTask.findUniqueOrThrow({where:{id:lost.task.id}});assert.equal(interrupted.state,'INTERRUPTED');assert.equal(await runtime().claim(),null);
 const reviewed=await call('/admin/agents/tasks/'+interrupted.id+'/decision',token,{action:'ACKNOWLEDGE',expectedRevision:interrupted.revision,reason:'Reviewed uncertain fixture without replay',reviewed:true},'PATCH');assert.equal(reviewed.status,200);assert.equal(reviewed.body.state,'REVIEWED');
 // A response arriving after lease recovery is retained without reviving the task.
 const lateTask=await enqueue('نتيجة متأخرة');assert.equal((await control('ENABLED')).status,200);hold=true;modelEntered=false;const lateClaim=await service.claim(),lateExecution=service.runClaim(lateClaim);await until(()=>modelEntered);await db.aiAgentTask.update({where:{id:lateTask.body.id},data:{leaseExpiresAt:new Date(0)}});await runtime().heartbeat();hold=false;release();await lateExecution;const late=await db.aiAgentTask.findUniqueOrThrow({where:{id:lateTask.body.id}});assert.equal(late.state,'INTERRUPTED');assert(late.result.includes('مسودة اختبار'));assert.equal(modelCalls,5);
 breakConnection=true;const networkTask=await enqueue('انقطاع اتصال النموذج');assert.equal((await control('ENABLED')).status,200);await service.runClaim(await service.claim());breakConnection=false;const network=await db.aiAgentTask.findUniqueOrThrow({where:{id:networkTask.body.id}});assert.equal(network.state,'INTERRUPTED');assert.equal(modelCalls,6);assert.equal(await service.claim(),null);
 tokenCount=100000;const oversized=await enqueue('تجاوز الحد');assert.equal((await control('ENABLED')).status,200);await service.runClaim(await service.claim());tokenCount=64;assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:oversized.body.id}})).errorCode,'INPUT_TOKEN_LIMIT');assert.equal(modelCalls,6);
 invalidOutput=true;const badOutput=await enqueue('نتيجة غير صالحة');assert.equal((await control('ENABLED')).status,200);await service.runClaim(await service.claim());invalidOutput=false;assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:badOutput.body.id}})).state,'INTERRUPTED');assert.equal(modelCalls,7);
 const revoked=await enqueue('مهمة مدير سُحبت صلاحيته');assert.equal((await control('ENABLED')).status,200);await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});assert.equal((await call('/admin/agents',token)).status,403);await assert.rejects(()=>service.enqueue(actor.id,'SUPPORT',{action:'DRAFT_MESSAGE',language:'ar-SA',prompt:'مرفوض',reason:'Revoked fixture',reviewed:true,requestId:randomUUID()}),e=>e.getStatus?.()===403);assert.equal(await service.claim(),null);assert.equal((await db.aiAgentTask.findUniqueOrThrow({where:{id:revoked.body.id}})).errorCode,'REQUESTER_AUTH_REVOKED');assert.equal(modelCalls,7);await db.roleAssignment.update({where:{accountId_role:{accountId:actor.id,role:'ADMIN'}},data:{status:'ACTIVE'}});
 const missing=provider.configuration;provider.configuration=()=>({...missing.call(provider),ready:false,reason:'CREDENTIALS_MISSING'});assert.equal(await service.claim(),null);assert((await service.catalog(actor.id)).items.every(x=>x.counts===null&&x.workload==='UNAVAILABLE'));provider.configuration=missing;
 const {governanceRuntimeAcceptance}=await import('./governance-runtime-acceptance.mjs');
 await governanceRuntimeAcceptance({db,service,runtime,audit,provider,actor,ordinary,token,call,catalog,control,enqueue,setModelText:value=>{modelText=value;},payloads,providerCalls:()=>({generation:modelCalls,count:countCalls})});
 if(process.env.AI_E2E_BROWSER==='1'){
  const {browserAcceptance}=await import('./agent-runtime-browser-fixture.mjs');
  await browserAcceptance({db,actor,session:await login(actor),getCalls:()=>modelCalls,holdGeneration:()=>{hold=true;modelEntered=false},waitGeneration:()=>until(()=>modelEntered),releaseGeneration:()=>{hold=false;release?.()}});
 }
 const {governanceCorrectionAcceptance}=await import('./governance-correction-acceptance.mjs');
 await governanceCorrectionAcceptance({db,service,runtime,audit,provider,actor,token,call,catalog,control,enqueue,setModelText:text=>{modelText=text},payloads,providerCalls:()=>({modelCalls,countCalls})});
 const {departmentReportingAcceptance}=await import('./department-reporting-acceptance.mjs');
 await departmentReportingAcceptance({db,service,actor,ordinary,token,otherToken:other,call,setModelText:text=>{modelText=text},payloads});
 const {providerRecoveryAcceptance}=await import('./agent-provider-recovery-acceptance.mjs');
 await providerRecoveryAcceptance({db,service,runtime,audit,provider,actor,token,otherToken:other,call,catalog,control,enqueue,setFailure:value=>{providerFailure=value;},setModelText:value=>{modelText=value;},calls:()=>({generation:modelCalls,count:countCalls})});
 // Dedicated historical fixtures do not dispatch or depend on worker readiness.
 const metricKey='MARKETING',metricBefore=await db.aiAgentTask.count({where:{agentKey:metricKey}});
 await db.aiAgentTask.createMany({data:[
  {state:'COMPLETED',startedAt:new Date('2026-01-01T00:00:00Z'),finishedAt:new Date('2026-01-01T00:00:02Z'),dispatchedAt:new Date('2026-01-01T00:00:00Z'),reservedCostMicroUsd:100,estimatedCostMicroUsd:60},
  {state:'COMPLETED',startedAt:new Date('2026-01-01T00:00:00Z'),finishedAt:new Date('2026-01-01T00:00:04Z'),dispatchedAt:new Date('2026-01-01T00:00:00Z'),reservedCostMicroUsd:100,estimatedCostMicroUsd:0},
  {state:'REVIEWED',dispatchedAt:new Date('2026-01-01T00:00:00Z'),reservedCostMicroUsd:100,estimatedCostMicroUsd:null},
  {state:'CANCELLED',reservedCostMicroUsd:0,estimatedCostMicroUsd:null}
 ].map(x=>({...x,agentKey:metricKey,requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'historical-performance',action:'DRAFT_REPORT',language:'ar-SA',prompt:'Isolated historical performance fixture'}))});
 const callsBeforeMetrics={modelCalls,countCalls},metricCatalog=await catalog(),metric=metricCatalog.items.find(x=>x.key===metricKey).performance;
 const sourceRows=await db.aiAgentTask.findMany({where:{agentKey:metricKey}});
 assert.equal(sourceRows.length,metricBefore+4);assert.equal(metric.completed,sourceRows.filter(x=>x.state==='COMPLETED').length);
 assert.equal(metric.unknownEstimates,sourceRows.filter(x=>x.dispatchedAt&&x.estimatedCostMicroUsd===null).length);
 assert.equal(metric.knownEstimatedMicroUsd,sourceRows.reduce((sum,x)=>sum+(x.estimatedCostMicroUsd??0),0));
 assert.equal(metric.reservedMicroUsd,sourceRows.reduce((sum,x)=>sum+(x.reservedCostMicroUsd??0),0));
 const samples=sourceRows.filter(x=>x.state==='COMPLETED'&&x.startedAt&&x.finishedAt&&x.finishedAt>=x.startedAt);
 assert.equal(metric.durationSamples,samples.length);assert(Math.abs(metric.averageExecutionMs-samples.reduce((n,x)=>n+(x.finishedAt.getTime()-x.startedAt.getTime()),0)/samples.length)<0.001);
 assert.equal(metric.acceptanceRate,null);assert.equal(metric.acceptanceStatus,'REQUIRES_LINKED_FINAL_REVIEW');assert.deepEqual({modelCalls,countCalls},callsBeforeMetrics);
 console.log('Agent historical performance HTTP/PostgreSQL passed: actual aggregates, duration denominator, zero known cost, unknown dispatched estimate, cancellation, no model calls and no inferred acceptance.');
 console.log('AI runtime HTTP/PostgreSQL passed: private catalog; atomic setup/control/queue audit; idempotent requests; duplicate-dispatch fencing; real queued/running/high pressure; pause with in-flight completion; persisted resume; conservative budget; stale metrics; crash and late-result preservation; no uncertain replay; token/output bounds; revoked administrator and scoped actions. Model traffic was loopback only.');
}finally{
 if(release)release();await new Promise(resolve=>model.close(resolve));model.closeAllConnections?.();
 const taskIds=(await db.aiAgentTask.findMany({where:{requestedByAccountId:{in:accounts}},select:{id:true}})).map(x=>x.id);
 if(initialized){await db.aiAgentTask.deleteMany({where:{id:{in:taskIds}}});await db.aiAgentRuntime.deleteMany({where:{lastAdminAccountId:{in:accounts}}});await db.operationalSetting.deleteMany({where:{key:{in:['AI_RUNTIME_HEARTBEAT:v1','AI_RUNTIME_SERIALIZATION:v1','AI_PROVIDER_GATE:v1']}}});}
 await db.session.deleteMany({where:{accountId:{in:accounts}}});await db.roleAssignment.deleteMany({where:{accountId:{in:accounts}}});await db.auditEvent.deleteMany({where:{OR:[{actorId:{in:people}},{resource:'AiAgentTask',resourceId:{in:taskIds}}]}});await db.account.deleteMany({where:{id:{in:accounts}}});await db.person.deleteMany({where:{id:{in:people}}});await db.$disconnect();await runtimeDb.$disconnect();
}
