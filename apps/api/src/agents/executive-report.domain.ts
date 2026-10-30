import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization, record, STAFFING_DEPARTMENTS } from '../hr/staffing-catalog';
import { DEPARTMENT_DIRECTORS } from './department-directors';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';
import { uuid } from './agent-runtime.domain';

export const REPORT_PREFIX='AI_DEPARTMENT_REPORT:v1:';
export const REPORT_FINGERPRINT='executive-report:v1:';
export const REPORT_NOTIFICATION='EXECUTIVE_GOVERNANCE_REPORT';
export const REPORT_OFFICE_LABELS:Record<string,string>={
  READY_FOR_OWNER:'توصية المكتب جاهزة لقرار المالك',CORRECTION_REQUIRED:'يلزم تصحيح أو استكمال أدلة',
  EVIDENCE_REQUIRED:'أدلة المراجعة غير مكتملة',OWNER_ESCALATION_REQUIRED:'يلزم قرار المالك',
  REVIEW_STOPPED:'المراجعة متوقفة',INTEGRITY_REVIEW_REQUIRED:'تعذر التحقق من روابط المراجعة',
  DIRECTOR_OUTPUT_UNAVAILABLE:'تقرير المدير غير متاح',
};
export const reportDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function reportId(value:string){
  const h=reportDigest(value);
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export interface ReportCycle {
  version:1;id:string;ownerId:string;brief:string;createdAt:string;sendEmail:boolean;
  state:'REVIEWING'|'FORMATTING'|'EMAIL_PENDING'|'COMPLETE'|'ATTENTION_REQUIRED';
  sources:Array<{departmentCode:string;agentKey:string;taskId:string}>;
  executiveTaskId?:string;bundleDigest?:string;notificationId?:string;reason?:string;
}
export function parseReportCycle(value:unknown):ReportCycle {
  const x=record(value);
  if(x.version!==1||!uuid(x.id)||!uuid(x.ownerId)||typeof x.brief!=='string'||x.brief.length>1000||typeof x.createdAt!=='string'||!Number.isFinite(Date.parse(x.createdAt))||typeof x.sendEmail!=='boolean'||!['REVIEWING','FORMATTING','EMAIL_PENDING','COMPLETE','ATTENTION_REQUIRED'].includes(String(x.state))||!Array.isArray(x.sources)||x.sources.length!==STAFFING_DEPARTMENTS.length)throw new ConflictException('بيانات دورة التقارير غير صالحة.');
  const seen=new Set<string>(),ids=new Set<string>();
  for(const item of x.sources){const source=record(item),department=STAFFING_DEPARTMENTS.find(d=>d.code===source.departmentCode);
    if(!department||source.agentKey!==DEPARTMENT_DIRECTORS[department.code]||!uuid(source.taskId)||seen.has(department.code)||ids.has(source.taskId))throw new ConflictException('يلزم تقرير مستقل لمدير كل إدارة.');
    seen.add(department.code);ids.add(source.taskId);
  }
  return x as unknown as ReportCycle;
}
export async function requireReportOwner(tx:Prisma.TransactionClient,actorId:string){
  const actor=await requireVerifiedAdmin(tx,actorId),organization=await platformOrganization(tx);
  if(!organization||organization.ownerId!==actorId)throw new ForbiddenException('تقارير الإدارات متاحة لمالك هيدرولاند فقط.');
  return actor;
}

export async function readReportBundle(tx:Prisma.TransactionClient,cycle:ReportCycle,inbox:GovernanceReviewInboxService){
  await requireReportOwner(tx,cycle.ownerId);
  const entries=[];
  for(const source of cycle.sources){
    const task=await tx.aiAgentTask.findUnique({where:{id:source.taskId}});
    if(!task||task.agentKey!==source.agentKey||task.requestedByAccountId!==cycle.ownerId||task.action!=='READ_OPERATIONS'||task.language!=='ar-SA')throw new ConflictException('تغير مصدر تقرير الإدارة.');
    const departmentName=STAFFING_DEPARTMENTS.find(d=>d.code===source.departmentCode)!.nameAr;
    if(['FAILED','INTERRUPTED','CANCELLED','REVIEWED'].includes(task.state)){
      entries.push({...source,departmentName,revision:task.revision,officeStatus:'DIRECTOR_OUTPUT_UNAVAILABLE',result:null,reviews:[],ownerApprovalRequired:true});continue;
    }
    if(task.state!=='COMPLETED')return null;
    const file=await inbox.reportFile(tx,cycle.ownerId,task.id);
    if(['NOT_STARTED','WAITING_FOR_REVIEW','REVIEW_IN_PROGRESS','ROUTE_DEFERRED'].includes(file.status))return null;
    // A broken chain is reported as unavailable, never treated as reviewed content.
    const intact=file.status!=='INTEGRITY_REVIEW_REQUIRED';
    entries.push({...source,departmentName,revision:task.revision,officeStatus:file.status,
      result:file.status==='READY_FOR_OWNER'?file.source.result:null,
      reviews:intact?file.reviews.filter(r=>r.state==='COMPLETED'&&r.review).map(r=>({agentKey:r.agentKey,taskId:r.taskId,revision:r.revision,review:r.review})):[],
      ownerApprovalRequired:true});
  }
  return{cycleId:cycle.id,createdAt:cycle.createdAt,brief:cycle.brief,entries,approved:false,scope:'DEPARTMENT_REPORTING_ONLY',finalApproval:'PLATFORM_OWNER'};
}

// Revisions and task identities are verified server-side, not repeated 84 times
// in the formatter's paid context. Preserve every distinct finding without
// truncating evidence or raising the configured token/budget limits.
export function reportModelInput(bundle:NonNullable<Awaited<ReturnType<typeof readReportBundle>>>){
  return{cycleId:bundle.cycleId,createdAt:bundle.createdAt,brief:bundle.brief,approved:false,
    entries:bundle.entries.map(entry=>{
      const reviews=entry.reviews.flatMap(r=>r.review?[r.review]:[]);
      return{agentKey:entry.agentKey,departmentName:entry.departmentName,officeStatus:entry.officeStatus,result:entry.result,
        findings:[...new Set(reviews.flatMap(r=>r.findings))],evidenceGaps:[...new Set(reviews.flatMap(r=>r.evidenceGaps))],
        riskLevel:reviews.some(r=>r.riskLevel==='HIGH')?'HIGH':reviews.some(r=>r.riskLevel==='MEDIUM')?'MEDIUM':reviews.length?'LOW':'UNKNOWN',
        ownerEscalationRequired:reviews.some(r=>r.ownerEscalationRequired)};
    })};
}

export async function executiveReportContext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;action:string;requestedByAccountId:string;requestKey:string;fingerprint:string},inbox:GovernanceReviewInboxService){
  if(task.agentKey!=='EXECUTIVE'||task.action!=='DRAFT_REPORT')throw new ConflictException('مهمة الصياغة التنفيذية غير صالحة.');
  const links=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:task.id,action:'AI_EXECUTIVE_REPORT_QUEUED'},take:2});
  const link=record(links[0]?.metadata);
  if(links.length!==1||!uuid(link.cycleId))throw new ConflictException('مرجع دورة التقرير غير صالح.');
  const setting=await tx.operationalSetting.findUnique({where:{key:REPORT_PREFIX+link.cycleId}}),cycle=parseReportCycle(setting?.value);
  if(cycle.id!==link.cycleId||cycle.ownerId!==task.requestedByAccountId||cycle.executiveTaskId!==task.id||task.requestKey!==reportId(`executive:${cycle.id}`))throw new ConflictException('المهمة غير مرتبطة بدورة المالك.');
  const bundle=await readReportBundle(tx,cycle,inbox);
  if(!bundle||reportDigest(bundle)!==cycle.bundleDigest||task.fingerprint!==REPORT_FINGERPRINT+cycle.bundleDigest)throw new ConflictException('تغيرت أدلة التقرير؛ يلزم إعادة المراجعة.');
  return{cycle,bundle};
}
