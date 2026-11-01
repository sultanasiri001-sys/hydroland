import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Extends the existing CI-only, loopback HTTP/PostgreSQL acceptance fixture.
export async function sectionHeadAppointmentAcceptance({db,service,runtime,actor,token,otherToken,call,providerCalls}){
 assert.equal(process.env.CI,'true');assert.equal(process.env.NODE_ENV,'test');assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
 const require=createRequire(import.meta.url),{DEPARTMENT_SECTIONS,SECTION_HEAD_CATALOG_VERSION,SECTION_HEAD_APPOINTMENT_KEY,isReusedSectionHead}=require('../dist/agents/department-sections');
 const newKeys=DEPARTMENT_SECTIONS.filter(s=>!isReusedSectionHead(s.agentKey)).map(s=>s.agentKey),reused=await db.aiAgentRuntime.findMany({where:{key:{in:['EXECUTIVE','SALES','SOCIAL']}}});
 const beforeCalls=providerCalls(),tasks=await db.aiAgentTask.count();
 assert.equal(await db.operationalSetting.findUnique({where:{key:SECTION_HEAD_APPOINTMENT_KEY}}),null);
 await db.aiAgentRuntime.deleteMany({where:{key:{in:newKeys}}});
 const request={catalogVersion:SECTION_HEAD_CATALOG_VERSION,enableNewHeads:true,reason:'تعيين رؤساء الأقسام في اختبار معزول',reviewed:true};
 assert.equal((await call('/admin/agents/section-head-appointments',undefined,request)).status,401);
 assert.equal((await call('/admin/agents/section-head-appointments',otherToken,request)).status,403);
 assert.equal((await call('/admin/agents/section-head-appointments',token,{...request,catalogVersion:'stale'})).status,409);
 await service.heartbeat();
 const broken=runtime({record:async()=>{throw new Error('Injected section appointment audit failure');}});
 await assert.rejects(()=>broken.appointSectionHeads(actor.id,request),/Injected section appointment audit failure/);
 assert.equal(await db.aiAgentRuntime.count({where:{key:{in:newKeys}}}),0);assert.equal(await db.operationalSetting.findUnique({where:{key:SECTION_HEAD_APPOINTMENT_KEY}}),null);
 const results=await Promise.all([call('/admin/agents/section-head-appointments',token,request),call('/admin/agents/section-head-appointments',token,request)]);
 assert(results.every(r=>r.status===201&&r.body.appointed));assert.equal(results.reduce((n,r)=>n+r.body.created,0),80);assert.equal(results.filter(r=>r.body.alreadyAppointed).length,1);
 assert.equal(await db.aiAgentRuntime.count(),103);assert.equal(await db.aiAgentRuntime.count({where:{key:{in:newKeys},state:'ENABLED'}}),80);
 assert.deepEqual(await db.aiAgentRuntime.findMany({where:{key:{in:['EXECUTIVE','SALES','SOCIAL']}},orderBy:{key:'asc'}}),reused.sort((a,b)=>a.key.localeCompare(b.key)));
 const catalog=await call('/admin/agents',token);assert.equal(catalog.body.sectionHeads.appointed,true);assert.equal(catalog.body.items.filter(item=>item.section).length,83);assert.equal(catalog.body.items.filter(item=>item.reportingRole==='DEPARTMENT_DIRECTOR').length,14);
 const head=catalog.body.items.find(a=>a.key==='HR_WORKFORCE_HEAD');assert.equal(head.reportsToAgentKey,'HR_DIRECTOR');assert.equal(head.section.code,'HR-01');
 assert.equal((await call('/admin/agents/HR_WORKFORCE_HEAD/control',token,{state:'PAUSED',expectedRevision:head.revision,reason:'إيقاف رئيس قسم لاختبار ثبات الحالة',reviewed:true},'PATCH')).status,200);
 assert.equal((await call('/admin/agents/section-head-appointments',token,request)).body.alreadyAppointed,true);assert.equal((await db.aiAgentRuntime.findUniqueOrThrow({where:{key:head.key}})).state,'PAUSED');
 assert.equal(await db.auditEvent.count({where:{action:'AI_SECTION_HEADS_APPOINTED',resourceId:SECTION_HEAD_APPOINTMENT_KEY}}),1);assert.equal(await db.aiAgentTask.count(),tasks);assert.deepEqual(providerCalls(),beforeCalls);
}
