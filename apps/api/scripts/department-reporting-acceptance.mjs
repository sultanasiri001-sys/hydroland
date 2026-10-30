import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';

// Called only from the existing isolated, CI-only, loopback HTTP/PG fixture.
export async function departmentReportingAcceptance({db,service,actor,ordinary,token,otherToken,call,setModelText,payloads,providerCalls}){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
 assert(['127.0.0.1','localhost','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const require=createRequire(import.meta.url);
 const {DatabaseService}=require('../dist/database/database.service.js'),{AuditService}=require('../dist/audit/audit.service.js'),{AgentService}=require('../dist/agents/agent.service.js'),{GovernanceReviewInboxService}=require('../dist/agents/governance-review-inbox.service.js'),{DepartmentReportingService}=require('../dist/agents/department-reporting.service.js'),{DepartmentReportingWorker}=require('../dist/agents/department-reporting.worker.js');
 const runtimeDb=new DatabaseService(),audit=new AuditService(runtimeDb),inbox=new GovernanceReviewInboxService(runtimeDb,new AgentService(audit)),reporting=new DepartmentReportingService(runtimeDb,audit,inbox);
 const key='PLATFORM_STAFFING_ORGANIZATION:v1',prefix='AI_DEPARTMENT_REPORT:v1:',requestId=randomUUID();let organization,sourceCase;const capturedDirectors=new Set();
 const previous=await db.operationalSetting.findUnique({where:{key}});assert.equal(previous,null,'The reporting fixture refuses pre-existing platform ownership');
 const pass={decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false};
 let emailCalls=0,emailText='';const worker=new DepartmentReportingWorker(runtimeDb,audit,reporting,inbox,{sendExecutiveReport:async input=>{emailCalls++;assert.equal(input.to,actor.email);emailText=input.text;return{provider:'RESEND',messageId:'isolated-report-provider-id'};}});
 try{
  organization=await db.organization.create({data:{displayName:'Isolated report owner',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:actor.id}});
  await db.operationalSetting.create({data:{key,value:{organizationId:organization.id}}});
  await db.roleAssignment.create({data:{accountId:ordinary.id,role:'ADMIN',status:'ACTIVE'}});
  await db.aiAgentTask.updateMany({where:{requestedByAccountId:actor.id,state:'QUEUED'},data:{state:'CANCELLED'}});
  await db.aiAgentRuntime.updateMany({where:{lastAdminAccountId:actor.id},data:{state:'ENABLED'}});
  const {departmentSourceAcceptance}=await import('./department-source-acceptance.mjs');
  sourceCase=await departmentSourceAcceptance({db,organization,actor,ordinary,token,otherToken,call,providerCalls});
  // A queued v2 director remains on its original source profile after upgrade.
  const legacy=await db.aiAgentTask.create({data:{agentKey:'INVENTORY',requestedByAccountId:actor.id,requestKey:randomUUID(),fingerprint:'department-source:v2:'+randomUUID(),action:'READ_OPERATIONS',language:'ar-SA',prompt:'Isolated legacy v2 inventory source'}});
  setModelText('Legacy source summary');let legacyClaim=await service.claim();assert.equal(legacyClaim?.task.id,legacy.id);await service.runClaim(legacyClaim);
  const oldInput=JSON.parse(payloads.at(-1).input[1].content).aggregateOperations;assert.equal(oldInput.version,2);assert.deepEqual(oldInput.metrics,{});
  setModelText(JSON.stringify(pass));legacyClaim=await service.claim();assert.equal(legacyClaim?.task.agentKey,'GOV_QUALITY_AUDIT');await service.runClaim(legacyClaim);
  const oldReview=JSON.parse(payloads.at(-1).input[1].content).governanceReview;assert.equal(oldReview.source.operationsEvidence.scope,'DEPARTMENT_AGGREGATE_V2');assert.deepEqual(oldReview.source.operationsEvidence.values.metrics,{});
  await db.aiAgentTask.updateMany({where:{requestedByAccountId:actor.id,state:'QUEUED'},data:{state:'CANCELLED'}});
  const request={requestId,brief:'تقرير الإدارات الأربع عشرة بالأدلة المتاحة',sendEmail:true,reviewed:true,reason:'اختبار دورة تقارير معزولة'};
  assert.equal((await call('/admin/agents/reporting/catalog')).status,401);
  assert.equal((await call('/admin/agents/reporting/catalog',otherToken)).status,403);
  const catalog=await call('/admin/agents/reporting/catalog',token);assert.equal(catalog.status,200);assert.equal(catalog.body.directors.length,14);assert.equal(catalog.body.coordinator,'EXECUTIVE');assert.equal(catalog.cacheControl,'no-store');
  assert.equal((await call('/admin/agents/reporting/cycles',token,{...request,to:ordinary.email})).status,400);
  const denied=await call('/admin/agents/reporting/cycles',otherToken,request);assert.equal(denied.status,403);
  const started=await call('/admin/agents/reporting/cycles',token,request);assert.equal(started.status,201);assert.equal(started.body.sources.length,14);
  assert.equal((await call('/admin/agents/reporting/cycles',token,request)).body.id,requestId);
  assert.equal(await db.auditEvent.count({where:{action:'DEPARTMENT_REPORT_CYCLE_STARTED',resourceId:requestId}}),1);
  let finished=false,executiveTaskId;
  for(let step=0;step<110;step++){
   await reporting.advance();
   const cycle=(await db.operationalSetting.findUniqueOrThrow({where:{key:prefix+requestId}})).value;
   if(cycle.state==='EMAIL_PENDING'){finished=true;executiveTaskId=cycle.executiveTaskId;break;}
   const claim=await service.claim();assert(claim,'A reporting cycle cannot silently skip a queued stage');
   if(claim.task.agentKey.startsWith('GOV_')){
    const link=await db.auditEvent.findFirstOrThrow({where:{action:'GOVERNANCE_REVIEW_QUEUED',resourceId:claim.task.id}}),source=await db.aiAgentTask.findUniqueOrThrow({where:{id:link.metadata.sourceTaskId}});
    setModelText(JSON.stringify(source.agentKey==='HR_DIRECTOR'?{...pass,decision:'RETURN_FOR_CORRECTION',findings:['يلزم استكمال دليل أعمال الموارد البشرية']}:pass));
   }else setModelText(claim.task.agentKey==='EXECUTIVE'?'تقرير عبدالله: مراجعة الإدارات مكتملة، مع طلب استكمال دليل الموارد البشرية.':'تقرير مدير الإدارة ضمن المؤشرات المجمعة المتاحة فقط.');
   await service.runClaim(claim);
   if(started.body.sources.some(s=>s.taskId===claim.task.id)){
    const input=JSON.parse(payloads.at(-1).input[1].content),source=started.body.sources.find(s=>s.taskId===claim.task.id);assert.equal(input.aggregateOperations.version,3);assert.equal(input.aggregateOperations.department,source.departmentCode);assert.equal(input.aggregateOperations.coverage,'PARTIAL');assert(Number.isFinite(Date.parse(input.aggregateOperations.observedAt)));const captured=await db.auditEvent.findFirstOrThrow({where:{resourceId:claim.task.id,action:'AI_TASK_OPERATIONS_CAPTURED'}});assert.equal(input.aggregateOperations.observedAt,captured.metadata.observedAt);capturedDirectors.add(claim.task.agentKey);
    if(claim.task.agentKey==='HR_DIRECTOR')await sourceCase.afterHrCapture(claim.task.id);
    if(claim.task.agentKey==='INVENTORY')await sourceCase.afterInventoryCapture(claim.task.id);
   }
  }
  assert(finished,'The bounded reporting cycle must finish');
  assert.equal(capturedDirectors.size,14,'Every director must use its own captured source packet');
  const hrReviewPayload=payloads.map(p=>JSON.parse(p.input[1].content)).find(p=>p.governanceReview?.source.agentKey==='HR_DIRECTOR');assert.equal(hrReviewPayload.governanceReview.source.operationsEvidence.values.documents.documents,1);
  const currentInventory=payloads.map(p=>JSON.parse(p.input[1].content)).find(p=>p.governanceReview?.source.agentKey==='INVENTORY'&&p.governanceReview.source.operationsEvidence?.values?.version===3);assert.equal(currentInventory.governanceReview.source.operationsEvidence.values.metrics.storeGoodsProducts,4);
  const legacyAfter=await call('/admin/agents/governance-reviews/'+legacy.id,token);assert.equal(legacyAfter.body.source.operationsEvidence.scope,'DEPARTMENT_AGGREGATE_V2');assert.deepEqual(legacyAfter.body.source.operationsEvidence.values.metrics,{});
  const executivePayload=payloads.find(p=>JSON.parse(p.input[1].content).executiveReport?.cycleId===requestId);assert(executivePayload);
  const bundle=JSON.parse(executivePayload.input[1].content).executiveReport;assert.equal(bundle.entries.length,14);assert.equal(bundle.approved,false);assert.equal(bundle.entries.find(e=>e.agentKey==='HR_DIRECTOR').officeStatus,'CORRECTION_REQUIRED');assert.equal(bundle.entries.find(e=>e.agentKey==='HR_DIRECTOR').result,null);
  assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:executiveTaskId}}}),0,'Abdullah formatting must not restart the office loop');
  const outbox=await db.notification.findMany({where:{type:'EXECUTIVE_GOVERNANCE_REPORT',accountId:actor.id}});assert.equal(outbox.length,1);
  const alerts=await call('/notifications',token);assert.equal(alerts.status,200);assert(!alerts.body.some(n=>n.id===outbox[0].id));
  assert.equal((await call('/notifications/'+outbox[0].id+'/read',token,{})).status,404,'In-app reads cannot consume a pending email');
  assert.equal((await db.notification.findUniqueOrThrow({where:{id:outbox[0].id}})).status,'PENDING');
  const stale=await db.notification.create({data:{accountId:actor.id,type:'EXECUTIVE_GOVERNANCE_REPORT',createdAt:new Date(0),payload:{deliveryState:'PENDING',executiveTaskId:randomUUID()}}});
  await worker.deliverNext();assert.equal(emailCalls,0);assert.equal((await db.notification.findUniqueOrThrow({where:{id:stale.id}})).status,'FAILED','A stale oldest report is isolated before the valid report can send');
  await Promise.all([worker.deliverNext(),worker.deliverNext()]);assert.equal(emailCalls,1,'Concurrent workers cannot duplicate the report');
  await worker.deliverNext();assert.equal(emailCalls,1);assert(emailText.includes('استكمال دليل'));assert(emailText.includes('الاعتماد النهائي لسلطان'));
  const detail=await call('/admin/agents/reporting/cycles/'+requestId,token);assert.equal(detail.status,200);assert.equal(detail.body.state,'COMPLETE');assert.equal(detail.body.emailStatus,'PROVIDER_ACCEPTED');assert.equal(detail.body.approved,false);assert.equal(detail.cacheControl,'no-store');
  assert.equal((await call('/admin/agents/reporting/cycles/'+requestId,otherToken)).status,403);
  console.log('Department reporting HTTP/PostgreSQL PASS: 14 directors → linked office reviews including a correction → verified Abdullah context → stale outbox isolated → one concurrent-safe owner-only email; no approval or real provider delivery.');
  console.log('Department sources HTTP/PostgreSQL PASS: 14 isolated v3 packets, 13 operational count adapters, store-goods and marine-only subsets, explicit remaining registry gaps, queued and historical v2 compatibility, owner/role/deactivation guards, foreign and inconsistent relation exclusion, scalar-only privacy, read-only preview, immutable historical source across a live change and all 14 director-to-office inputs. All model traffic was loopback.');
 }finally{
  setModelText(null);
  const notifications=await db.notification.findMany({where:{accountId:actor.id,type:'EXECUTIVE_GOVERNANCE_REPORT'},select:{id:true}});
  await db.auditEvent.deleteMany({where:{OR:[{resource:'DepartmentReport',resourceId:requestId},{resource:'Notification',resourceId:{in:notifications.map(n=>n.id)}}]}});
  await db.notification.deleteMany({where:{id:{in:notifications.map(n=>n.id)}}});
  await db.roleAssignment.deleteMany({where:{accountId:ordinary.id,role:'ADMIN'}});
  await db.operationalSetting.deleteMany({where:{key:{in:[prefix+requestId,key]}}});
  if(sourceCase)await sourceCase.cleanup();
  if(organization)await db.organization.delete({where:{id:organization.id}});
  await runtimeDb.$disconnect();
 }
}
