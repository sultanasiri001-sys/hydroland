import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { lockAdminIdentities } from '../admin/admin-authorization';
import { requireDepartmentSourceOwner } from './department-source.reader';
import { decisionReason, inputRecord } from './agent-runtime.domain';
import { DEPARTMENT_DIRECTORS } from './department-directors';
import { DEPARTMENT_SECTIONS, isReusedSectionHead, SECTION_HEAD_APPOINTMENT_KEY, SECTION_HEAD_CATALOG_VERSION } from './department-sections';

export function appointmentRequest(body:unknown){
  const value=inputRecord(body,['catalogVersion','enableNewHeads','reason','reviewed']),reason=decisionReason(value);
  if(value.catalogVersion!==SECTION_HEAD_CATALOG_VERSION||typeof value.enableNewHeads!=='boolean')throw new ConflictException('حدّث قائمة الأقسام وحدد حالة الرؤساء الجدد قبل التعيين.');
  return{reason,enableNewHeads:value.enableNewHeads,catalogVersion:SECTION_HEAD_CATALOG_VERSION};
}

// The caller holds the existing runtime serializable guard. No model, task,
// staffing account, role grant, budget change or message is created here.
export async function appointSectionHeads(tx:Prisma.TransactionClient,audit:AuditService,actorId:string,request:ReturnType<typeof appointmentRequest>,checkReadiness:()=>Promise<void>){
  const actor=await lockAdminIdentities(tx,actorId),organization=await requireDepartmentSourceOwner(tx,actorId);
  const existing=await tx.operationalSetting.findUnique({where:{key:SECTION_HEAD_APPOINTMENT_KEY}});
  if(existing){
    const value=existing.value&&typeof existing.value==='object'&&!Array.isArray(existing.value)?existing.value as Record<string,unknown>:null;
    if(!value||value.catalogVersion!==SECTION_HEAD_CATALOG_VERSION||value.organizationId!==organization.id)throw new ConflictException('تغير سجل التعيين؛ تلزم مراجعة النسخة والجهة.');
    return{appointed:true,alreadyAppointed:true,sectionCount:DEPARTMENT_SECTIONS.length,created:0,catalogVersion:SECTION_HEAD_CATALOG_VERSION};
  }
  const departments=await tx.orgUnit.findMany({where:{organizationId:organization.id,type:'DEPARTMENT',active:true,code:{in:Object.keys(DEPARTMENT_DIRECTORS)}},select:{code:true}});
  if(Object.keys(DEPARTMENT_DIRECTORS).some(code=>!departments.some(unit=>unit.code===code)))throw new ConflictException('أكمل تهيئة الإدارات الأربع عشرة قبل تعيين رؤساء الأقسام.');
  for(const key of Object.values(DEPARTMENT_DIRECTORS))if(!await tx.aiAgentRuntime.findUnique({where:{key}}))throw new ConflictException('هيّئ مديري الإدارات قبل تعيين رؤساء الأقسام.');
  if(request.enableNewHeads)await checkReadiness();
  let created=0,enabled=0;
  for(const section of DEPARTMENT_SECTIONS){
    const row=await tx.aiAgentRuntime.findUnique({where:{key:section.agentKey}});
    if(!row){
      await tx.aiAgentRuntime.create({data:{key:section.agentKey,state:request.enableNewHeads&&!isReusedSectionHead(section.agentKey)?'ENABLED':'PAUSED',lastAdminAccountId:actor.id}});created++;
      if(request.enableNewHeads&&!isReusedSectionHead(section.agentKey))enabled++;
    }else if(request.enableNewHeads&&!isReusedSectionHead(section.agentKey)&&row.state==='PAUSED'){
      await tx.aiAgentRuntime.update({where:{key:section.agentKey},data:{state:'ENABLED',revision:randomUUID(),lastAdminAccountId:actor.id}});enabled++;
    }
  }
  const assignments=DEPARTMENT_SECTIONS.map(section=>({sectionCode:section.code,departmentCode:section.departmentCode,agentKey:section.agentKey,reportsToAgentKey:DEPARTMENT_DIRECTORS[section.departmentCode]}));
  const receipt={version:1,catalogVersion:SECTION_HEAD_CATALOG_VERSION,organizationId:organization.id,actorAccountId:actor.id,sectionCount:assignments.length,assignments,created,enabled,createdAt:new Date().toISOString()};
  await tx.operationalSetting.create({data:{key:SECTION_HEAD_APPOINTMENT_KEY,value:receipt}});
  await audit.record({actorId:actor.personId,action:'AI_SECTION_HEADS_APPOINTED',resource:'AiAgentRuntime',resourceId:SECTION_HEAD_APPOINTMENT_KEY,metadata:{...receipt,reason:request.reason,noTasksCreated:true,budgetUnchanged:true,reusedIdentities:['EXECUTIVE','SALES','SOCIAL']}},tx);
  return{appointed:true,alreadyAppointed:false,sectionCount:assignments.length,created,enabled,catalogVersion:SECTION_HEAD_CATALOG_VERSION};
}
