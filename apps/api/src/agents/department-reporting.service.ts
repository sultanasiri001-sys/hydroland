import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { lockAdminIdentities } from '../admin/admin-authorization';
import { STAFFING_DEPARTMENTS, record } from '../hr/staffing-catalog';
import { DEPARTMENT_DIRECTORS } from './department-directors';
import { decisionReason, inputRecord, QUEUE_LIMIT, RUNTIME_GUARD_KEY, uuid } from './agent-runtime.domain';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';
import { executiveReportContext, parseReportCycle, readReportBundle, ReportCycle, reportDigest, reportId, REPORT_FINGERPRINT, REPORT_NOTIFICATION, REPORT_PREFIX, requireReportOwner } from './executive-report.domain';
import { DIRECTOR_SOURCE_FINGERPRINT } from './department-source.domain';
import { requireDepartmentSourceOwner } from './department-source.reader';

const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value));

@Injectable()
export class DepartmentReportingService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly inbox:GovernanceReviewInboxService){}

  private async guard(tx:Prisma.TransactionClient){
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.ai-runtime')::bigint)`;
    await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES (${RUNTIME_GUARD_KEY},'{}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp()`;
  }

  async catalog(actorId:string){
    return this.db.serializable(async tx=>{
      await requireReportOwner(tx,actorId);
      return{directors:STAFFING_DEPARTMENTS.map(d=>({...d,agentKey:DEPARTMENT_DIRECTORS[d.code]})),
        office:'GOVERNANCE_COMPLIANCE_QUALITY',coordinator:'EXECUTIVE',coordinatorNameAr:'عبدالله',
        recipient:'VERIFIED_PLATFORM_OWNER',finalApproval:'PLATFORM_OWNER'};
    });
  }

  async start(actorId:string,body:unknown){
    const value=inputRecord(body,['requestId','brief','sendEmail','reviewed','reason']),reason=decisionReason(value);
    if(!uuid(value.requestId)||typeof value.brief!=='string'||value.brief.trim().length<3||value.brief.length>1000||typeof value.sendEmail!=='boolean')throw new BadRequestException('أدخل مرجع الدورة وموجز التقرير وخيار الإرسال.');
    const id=value.requestId,brief=value.brief.trim(),sendEmail=value.sendEmail;
    return this.db.serializable(async tx=>{
      await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId);await requireReportOwner(tx,actorId);
      const previous=await tx.operationalSetting.findUnique({where:{key:REPORT_PREFIX+id}});
      if(previous){const cycle=parseReportCycle(previous.value);if(cycle.ownerId!==actorId||cycle.brief!==brief||cycle.sendEmail!==sendEmail)throw new ConflictException('مرجع الدورة مستخدم لطلب مختلف.');return cycle;}
      const organization=await requireDepartmentSourceOwner(tx,actorId),units=await tx.orgUnit.findMany({where:{organizationId:organization.id,type:'DEPARTMENT',active:true,code:{in:STAFFING_DEPARTMENTS.map(d=>d.code)}},select:{code:true}});
      if(new Set(units.map(u=>u.code)).size!==STAFFING_DEPARTMENTS.length)throw new ConflictException('فعّل إدارات الهيكل الداخلي الأربع عشرة قبل بدء دورة جديدة.');
      const sources:ReportCycle['sources']=[];
      for(const department of STAFFING_DEPARTMENTS){
        const agentKey=DEPARTMENT_DIRECTORS[department.code];
        if(!await tx.aiAgentRuntime.findUnique({where:{key:agentKey}}))throw new ConflictException('هيئ مديري الإدارات قبل بدء الدورة.');
        if(await tx.aiAgentTask.count({where:{agentKey,state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)throw new ConflictException('طابور أحد المديرين ممتلئ.');
        const prompt=`تقرير مدير ${department.nameAr}. أعد تقريرًا ضمن مسؤولية إدارتك فقط استنادًا إلى الأدلة المقدمة. بيّن الإنجاز والملاحظات والقرارات المطلوبة والبيانات غير المتاحة دون اختلاق مؤشرات. موجز المالك: ${brief}`;
        const task=await tx.aiAgentTask.create({data:{agentKey,requestedByAccountId:actorId,requestKey:reportId(`director:${id}:${department.code}`),fingerprint:DIRECTOR_SOURCE_FINGERPRINT+reportDigest({cycleId:id,agentKey,prompt}),action:'READ_OPERATIONS',language:'ar-SA',prompt}});
        sources.push({departmentCode:department.code,agentKey,taskId:task.id});
        await this.audit.record({actorId:actor.personId,action:'AI_TASK_QUEUED',resource:'AiAgentTask',resourceId:task.id,metadata:{reason,agentKey,action:task.action,requesterAccountId:actorId,cycleId:id,to:'QUEUED',reportingOnly:true}},tx);
      }
      const cycle:ReportCycle={version:1,id,ownerId:actorId,brief,sendEmail,createdAt:new Date().toISOString(),sources,state:'REVIEWING'};
      await tx.operationalSetting.create({data:{key:REPORT_PREFIX+id,value:json(cycle)}});
      await this.audit.record({actorId:actor.personId,action:'DEPARTMENT_REPORT_CYCLE_STARTED',resource:'DepartmentReport',resourceId:id,metadata:{reason,departmentCount:sources.length,sendEmail,recipient:'VERIFIED_PLATFORM_OWNER',approved:false}},tx);
      return cycle;
    });
  }

  async detail(actorId:string,id:string){
    if(!uuid(id))throw new BadRequestException('مرجع دورة التقرير غير صالح.');
    return this.db.serializable(async tx=>{
      await requireReportOwner(tx,actorId);
      const row=await tx.operationalSetting.findUnique({where:{key:REPORT_PREFIX+id}});
      if(!row)throw new NotFoundException('دورة التقرير غير موجودة.');
      const cycle=parseReportCycle(row.value);if(cycle.ownerId!==actorId)throw new NotFoundException('دورة التقرير غير موجودة.');
      const task=cycle.executiveTaskId?await tx.aiAgentTask.findUnique({where:{id:cycle.executiveTaskId},select:{id:true,state:true,result:true,errorCode:true}}):null;
      const notification=cycle.notificationId?await tx.notification.findUnique({where:{id:cycle.notificationId},select:{status:true,payload:true}}):null;
      return{...cycle,executiveTask:task,emailStatus:notification?record(notification.payload).deliveryState:null,approved:false};
    });
  }

  async list(actorId:string){
    return this.db.serializable(async tx=>{
      await requireReportOwner(tx,actorId);
      const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:REPORT_PREFIX},value:{path:['ownerId'],equals:actorId}},orderBy:{updatedAt:'desc'},take:20});
      return{items:rows.map(row=>{const c=parseReportCycle(row.value);return{id:c.id,state:c.state,createdAt:c.createdAt,sendEmail:c.sendEmail};})};
    });
  }

  async advance(){
    const rows=await this.db.operationalSetting.findMany({where:{key:{startsWith:REPORT_PREFIX},OR:[{value:{path:['state'],equals:'REVIEWING'}},{value:{path:['state'],equals:'FORMATTING'}}]},select:{key:true},orderBy:{updatedAt:'asc'},take:5});
    for(const row of rows)try{await this.db.serializable(async tx=>{
      await this.guard(tx);const stored=await tx.operationalSetting.findUnique({where:{key:row.key}}),cycle=parseReportCycle(stored?.value);
      if(!['REVIEWING','FORMATTING'].includes(cycle.state))return;
      // Rotate waiting cycles so a paused director cannot starve later reports.
      await tx.operationalSetting.update({where:{key:row.key},data:{updatedAt:new Date()}});
      await lockAdminIdentities(tx,cycle.ownerId);await requireReportOwner(tx,cycle.ownerId);
      if(cycle.state==='REVIEWING'){
        const bundle=await readReportBundle(tx,cycle,this.inbox);if(!bundle)return;
        if(!await tx.aiAgentRuntime.findUnique({where:{key:'EXECUTIVE'}})||await tx.aiAgentTask.count({where:{agentKey:'EXECUTIVE',state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)return;
        const bundleDigest=reportDigest(bundle),task=await tx.aiAgentTask.create({data:{agentKey:'EXECUTIVE',requestedByAccountId:cycle.ownerId,requestKey:reportId(`executive:${cycle.id}`),fingerprint:REPORT_FINGERPRINT+bundleDigest,action:'DRAFT_REPORT',language:'ar-SA',prompt:'يا عبدالله، صغ نتائج مكتب الحوكمة والامتثال والجودة للإدارات الأربع عشرة في تقرير عربي موحد لسلطان. حافظ على الملاحظات والبيانات الناقصة والقرارات المطلوبة؛ لا تمنح اعتمادًا ولا تدع تنفيذ إجراء.'}});
        Object.assign(cycle,{state:'FORMATTING',executiveTaskId:task.id,bundleDigest});
        await this.audit.record({action:'AI_EXECUTIVE_REPORT_QUEUED',resource:'AiAgentTask',resourceId:task.id,metadata:{cycleId:cycle.id,bundleDigest,departmentCount:14,approved:false}},tx);
      }else{
        const task=await tx.aiAgentTask.findUnique({where:{id:cycle.executiveTaskId!}});
        if(!task)throw new ConflictException('مهمة عبدالله غير موجودة.');
        if(['FAILED','INTERRUPTED','CANCELLED','REVIEWED'].includes(task.state)){cycle.state='ATTENTION_REQUIRED';cycle.reason='EXECUTIVE_FORMATTING_FAILED';}
        else if(task.state==='COMPLETED'&&task.result){
          await executiveReportContext(tx,task,this.inbox);
          if(cycle.sendEmail){
            const notificationId=reportId(`report-email:${cycle.id}`);
            await tx.notification.create({data:{id:notificationId,accountId:cycle.ownerId,type:REPORT_NOTIFICATION,payload:{cycleId:cycle.id,executiveTaskId:task.id,executiveRevision:task.revision,bundleDigest:cycle.bundleDigest!,deliveryState:'PENDING',attempts:0}}});
            cycle.notificationId=notificationId;cycle.state='EMAIL_PENDING';
          }else cycle.state='COMPLETE';
          await this.audit.record({action:'DEPARTMENT_REPORT_COMPILED',resource:'DepartmentReport',resourceId:cycle.id,metadata:{executiveTaskId:task.id,notificationId:cycle.notificationId,approved:false}},tx);
        }else return;
      }
      await tx.operationalSetting.update({where:{key:row.key},data:{value:json(cycle),updatedAt:new Date()}});
    });}catch(error){
      if(!(error instanceof ForbiddenException||error instanceof ConflictException))throw error;
      await this.db.serializable(async tx=>{
        const current=await tx.operationalSetting.findUnique({where:{key:row.key}});if(!current)return;
        const cycle=parseReportCycle(current.value);if(!['REVIEWING','FORMATTING'].includes(cycle.state))return;
        cycle.state='ATTENTION_REQUIRED';cycle.reason='REPORT_AUTHORITY_OR_EVIDENCE_CHANGED';
        await tx.operationalSetting.update({where:{key:row.key},data:{value:json(cycle),updatedAt:new Date()}});
      });
    }
  }
}
