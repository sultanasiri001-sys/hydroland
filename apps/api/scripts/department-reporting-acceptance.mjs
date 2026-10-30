import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';

// Called only from the existing isolated, CI-only, loopback HTTP/PG fixture.
export async function departmentReportingAcceptance({db,service,actor,ordinary,token,otherToken,call,setModelText,payloads}){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');
 assert(['127.0.0.1','localhost','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const require=createRequire(import.meta.url);
 const {DatabaseService}=require('../dist/database/database.service.js'),{AuditService}=require('../dist/audit/audit.service.js'),{AgentService}=require('../dist/agents/agent.service.js'),{GovernanceReviewInboxService}=require('../dist/agents/governance-review-inbox.service.js'),{DepartmentReportingService}=require('../dist/agents/department-reporting.service.js'),{DepartmentReportingWorker}=require('../dist/agents/department-reporting.worker.js');
 const runtimeDb=new DatabaseService(),audit=new AuditService(runtimeDb),inbox=new GovernanceReviewInboxService(runtimeDb,new AgentService(audit)),reporting=new DepartmentReportingService(runtimeDb,audit,inbox);
 const key='PLATFORM_STAFFING_ORGANIZATION:v1',prefix='AI_DEPARTMENT_REPORT:v1:',requestId=randomUUID();let organization;
 const previous=await db.operationalSetting.findUnique({where:{key}});assert.equal(previous,null,'The reporting fixture refuses pre-existing platform ownership');
 const pass={decision:'PASS',riskLevel:'LOW',findings:[],evidenceGaps:[],ownerEscalationRequired:false};
 let emailCalls=0,emailText='';const worker=new DepartmentReportingWorker(runtimeDb,audit,reporting,inbox,{sendExecutiveReport:async input=>{emailCalls++;assert.equal(input.to,actor.email);emailText=input.text;return{provider:'RESEND',messageId:'isolated-report-provider-id'};}});
 try{
  organization=await db.organization.create({data:{displayName:'Isolated report owner',kind:'HYDROLAND_INTERNAL_PLATFORM',status:'ACTIVE',ownerId:actor.id}});
  await db.operationalSetting.create({data:{key,value:{organizationId:organization.id}}});
  await db.aiAgentTask.updateMany({where:{requestedByAccountId:actor.id,state:'QUEUED'},data:{state:'CANCELLED'}});
  await db.aiAgentRuntime.updateMany({where:{lastAdminAccountId:actor.id},data:{state:'ENABLED'}});
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
  }
  assert(finished,'The bounded reporting cycle must finish');
  const executivePayload=payloads.find(p=>JSON.parse(p.input[1].content).executiveReport?.cycleId===requestId);assert(executivePayload);
  const bundle=JSON.parse(executivePayload.input[1].content).executiveReport;assert.equal(bundle.entries.length,14);assert.equal(bundle.approved,false);assert.equal(bundle.entries.find(e=>e.agentKey==='HR_DIRECTOR').officeStatus,'CORRECTION_REQUIRED');assert.equal(bundle.entries.find(e=>e.agentKey==='HR_DIRECTOR').result,null);
  assert.equal(await db.auditEvent.count({where:{action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:executiveTaskId}}}),0,'Abdullah formatting must not restart the office loop');
  const outbox=await db.notification.findMany({where:{type:'EXECUTIVE_GOVERNANCE_REPORT',accountId:actor.id}});assert.equal(outbox.length,1);
  await Promise.all([worker.deliverNext(),worker.deliverNext()]);assert.equal(emailCalls,1,'Concurrent workers cannot duplicate the report');
  await worker.deliverNext();assert.equal(emailCalls,1);assert(emailText.includes('استكمال دليل'));assert(emailText.includes('الاعتماد النهائي لسلطان'));
  const detail=await call('/admin/agents/reporting/cycles/'+requestId,token);assert.equal(detail.status,200);assert.equal(detail.body.state,'COMPLETE');assert.equal(detail.body.emailStatus,'PROVIDER_ACCEPTED');assert.equal(detail.body.approved,false);assert.equal(detail.cacheControl,'no-store');
  assert.equal((await call('/admin/agents/reporting/cycles/'+requestId,otherToken)).status,403);
  console.log('Department reporting HTTP/PostgreSQL PASS: 14 directors → linked office reviews including a correction → verified Abdullah context → one concurrent-safe owner-only email; no approval or real provider delivery.');
 }finally{
  setModelText(null);
  const notifications=await db.notification.findMany({where:{accountId:actor.id,type:'EXECUTIVE_GOVERNANCE_REPORT'},select:{id:true}});
  await db.auditEvent.deleteMany({where:{OR:[{resource:'DepartmentReport',resourceId:requestId},{resource:'Notification',resourceId:{in:notifications.map(n=>n.id)}}]}});
  await db.notification.deleteMany({where:{id:{in:notifications.map(n=>n.id)}}});
  await db.operationalSetting.deleteMany({where:{key:{in:[prefix+requestId,key]}}});
  if(organization)await db.organization.delete({where:{id:organization.id}});
  await runtimeDb.$disconnect();
 }
}
