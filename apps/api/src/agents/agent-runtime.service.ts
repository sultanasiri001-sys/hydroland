import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AiAgentTask, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { lockAdminIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { AdminService } from '../admin/admin.service';
import { STAFFING_DEPARTMENTS } from '../hr/staffing-catalog';
import { AgentService } from './agent.service';
import { AgentAction, AgentKey, SupportedLanguage } from './agent.types';
import { AgentModelProviderService, AiModelConfiguration, AiModelResult, AiProviderError } from './agent-model-provider.service';
import { AGENT_DEPARTMENTS, decisionReason, inputRecord, METRICS_MAX_AGE_MS, QUEUE_LIMIT, QUEUE_OVERDUE_MS, RUNTIME_GUARD_KEY, TASK_LEASE_MS, uuid, WORKER_STATUS_KEY, workload } from './agent-runtime.domain';
import { GOVERNANCE_REVIEW_ORDER, governanceRouteDecision, isGovernanceAgent, parseGovernanceReview } from './governance-review.domain';
import { operationsEvidenceDigest, operationsValues, readOperationsEvidence } from './agent-operations-evidence';
import { agentPerformance, performanceView } from './agent-performance';
import { correctionFingerprint, correctionRequestId, hasDraftCorrectionPermission, DRAFT_CORRECTION_POLICY, DRAFT_CORRECTION_PREFIX, draftCorrectionAllowed, draftCorrectionRequested } from './governance-draft-correction';
import { directorDepartment } from './department-directors';
import { executiveReportContext, reportModelInput, REPORT_FINGERPRINT } from './executive-report.domain';
import { GovernanceReviewInboxService } from './governance-review-inbox.service';
import { MAX_PROVIDER_ATTEMPTS, PROVIDER_GATE_KEY, PROVIDER_RECOVERY_WINDOW_MS, ProviderGate, providerGateView, readProviderGate, rejectionPlan, taskIntervalMs } from './agent-provider-policy';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const taskView={id:true,agentKey:true,requestedByAccountId:true,action:true,language:true,prompt:true,state:true,revision:true,createdAt:true,startedAt:true,dispatchedAt:true,finishedAt:true,model:true,executionPolicy:true,inputTokens:true,outputTokens:true,reservedCostMicroUsd:true,estimatedCostMicroUsd:true,result:true,errorCode:true,reviewedAt:true,attemptCount:true,unknownCostAttempts:true,retryNotBefore:true} as const;
const configHash=(config:AiModelConfiguration)=>hash(config);
const stableRequestId=(value:string)=>{
  const hex=createHash('sha256').update(value).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
};
const approvalRequired=(task:{agentKey:string;action:string})=>task.action!=='READ_OPERATIONS'||task.agentKey==='GOV_FINAL_GATE';

@Injectable()
export class AgentRuntimeService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly agents:AgentService,private readonly model:AgentModelProviderService,private readonly admin:AdminService,private readonly reportInbox?:GovernanceReviewInboxService){}

  private descriptor(key:string){const found=this.agents.list().find(a=>a.key===key);if(!found)throw new NotFoundException('الوكيل غير موجود.');return found;}
  private async guard(tx:Prisma.TransactionClient){
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.ai-runtime')::bigint)`;
    // Force a fresh serializable snapshot for waiters, including absent task IDs.
    await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES (${RUNTIME_GUARD_KEY},'{}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp()`;
  }
  private async now(tx:Prisma.TransactionClient){return (await tx.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`)[0].now;}
  private async reserved(tx:Prisma.TransactionClient,now:Date){
    const day=new Date(now.toISOString().slice(0,10)+'T00:00:00Z');
    const [attempts,legacy]=await Promise.all([
      tx.aiAgentTaskAttempt.aggregate({where:{reservationDate:day},_sum:{reservedCostMicroUsd:true}}),
      tx.aiAgentTask.aggregate({where:{reservationDate:day,attempts:{none:{}}},_sum:{reservedCostMicroUsd:true}}),
    ]);
    return{day,reserved:(attempts._sum.reservedCostMicroUsd||0)+(legacy._sum.reservedCostMicroUsd||0)};
  }
  private async providerGate(tx:Prisma.TransactionClient){return readProviderGate((await tx.operationalSetting.findUnique({where:{key:PROVIDER_GATE_KEY}}))?.value);}
  private async preserveLegacyAttempt(tx:Prisma.TransactionClient,task:AiAgentTask){
    if(task.attemptCount||!task.startedAt&&!task.dispatchedAt&&!task.reservedCostMicroUsd)return task;
    const start=task.startedAt||task.createdAt;
    await tx.aiAgentTaskAttempt.create({data:{id:'legacy:'+task.id,taskId:task.id,attemptNumber:1,claimId:task.claimId||'legacy:'+task.id,state:task.state==='RUNNING'?'RUNNING':task.state==='COMPLETED'?'COMPLETED':task.state==='FAILED'?'FAILED':'INTERRUPTED',startedAt:start,dispatchedAt:task.dispatchedAt,finishedAt:task.finishedAt,reservationDate:task.reservationDate||new Date(start.toISOString().slice(0,10)+'T00:00:00Z'),reservedCostMicroUsd:task.reservedCostMicroUsd,estimatedCostMicroUsd:task.estimatedCostMicroUsd,inputTokens:task.inputTokens,outputTokens:task.outputTokens,errorCode:task.errorCode}});
    return tx.aiAgentTask.update({where:{id:task.id},data:{attemptCount:1,unknownCostAttempts:task.dispatchedAt&&task.estimatedCostMicroUsd===null?1:0,retryStartedAt:start}});
  }
  private async saveProviderGate(tx:Prisma.TransactionClient,gate:ProviderGate){
    const value=JSON.parse(JSON.stringify(gate)) as Prisma.InputJsonValue;
    await tx.operationalSetting.upsert({where:{key:PROVIDER_GATE_KEY},create:{key:PROVIDER_GATE_KEY,value},update:{value}});
  }
  private async workerState(tx:Prisma.TransactionClient,config:AiModelConfiguration,now:Date){
    const stored=(await tx.operationalSetting.findUnique({where:{key:WORKER_STATUS_KEY}}))?.value;
    const heartbeat=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored as Record<string,unknown>:{};
    const observed=typeof heartbeat.observedAt==='string'?Date.parse(heartbeat.observedAt):NaN;
    return{observedAt:Number.isFinite(observed)?new Date(observed).toISOString():null,fresh:Number.isFinite(observed)&&now.getTime()-observed>=0&&now.getTime()-observed<=METRICS_MAX_AGE_MS&&heartbeat.configuration===configHash(config)};
  }

  async initialize(actorId:string,body:unknown){
    const reason=decisionReason(inputRecord(body,['reason','reviewed']));
    return this.db.serializable(async tx=>{await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId);let added=0;
      for(const descriptor of this.agents.list())if(!await tx.aiAgentRuntime.findUnique({where:{key:descriptor.key}})){await tx.aiAgentRuntime.create({data:{key:descriptor.key,lastAdminAccountId:actor.id}});added++;}
      if(added)await this.audit.record({actorId:actor.personId,action:'AI_RUNTIME_INITIALIZED',resource:'AiAgentRuntime',metadata:{reason,agentCount:added,state:'PAUSED'}},tx);
      return{initialized:true,agentCount:this.agents.list().length};
    });
  }

  async checkProviderConnection(actorId:string){
    await this.db.serializable(tx=>requireVerifiedAdmin(tx,actorId));
    const result=await this.model.checkConnection();
    // Access may be revoked while the remote metadata request is in flight.
    await this.db.serializable(tx=>requireVerifiedAdmin(tx,actorId));
    return result;
  }

  async catalog(actorId:string){
    return this.db.serializable(async tx=>{
      await requireVerifiedAdmin(tx,actorId);const now=await this.now(tx),config=this.model.configuration(),worker=await this.workerState(tx,config,now),budget=await this.reserved(tx,now);
      const controls=await tx.aiAgentRuntime.findMany();
      const historical=await agentPerformance(tx);
      const gate=providerGateView(await this.providerGate(tx),now.getTime());
      const budgetAvailable=config.ready&&budget.reserved+config.reserveMicroUsd<=config.dailyBudgetMicroUsd;
      const measured=config.ready&&worker.fresh,available=measured&&budgetAvailable&&gate.state!=='ACTION_REQUIRED';
      const reason=!config.ready?config.reason:!worker.fresh?'WORKER_STALE':!budgetAvailable?'DAILY_BUDGET_EXHAUSTED':gate.state==='ACTION_REQUIRED'?'PROVIDER_ACTION_REQUIRED':gate.blocked?'PROVIDER_WAITING':'READY';
      const groups=await tx.aiAgentTask.groupBy({by:['agentKey','state'],_count:{_all:true},where:{state:{in:['QUEUED','RUNNING','FAILED','INTERRUPTED']}}});
      const overdue=await tx.aiAgentTask.groupBy({by:['agentKey'],_count:{_all:true},where:{state:'QUEUED',createdAt:{lt:new Date(now.getTime()-QUEUE_OVERDUE_MS)}}});
      return{initialized:this.agents.list().every(agent=>controls.some(control=>control.key===agent.key)),observedAt:now.toISOString(),workerObservedAt:worker.observedAt,metricsMaxAgeSeconds:METRICS_MAX_AGE_MS/1000,
        provider:{provider:config.provider,model:config.model,ready:available,reason,maxInputTokens:config.maxInputTokens,maxOutputTokens:config.maxOutputTokens,rateControl:gate},
        budget:{currency:'USD',day:budget.day.toISOString().slice(0,10),limitMicroUsd:config.dailyBudgetMicroUsd,reservedMicroUsd:budget.reserved,taskReserveMicroUsd:config.reserveMicroUsd,kind:'CONSERVATIVE_RESERVATION'},
        calculation:{perAgentConcurrency:1,highQueueAt:3,overdueMinutes:QUEUE_OVERDUE_MS/60000,globalConcurrency:1},
        items:this.agents.list().map(agent=>{const control=controls.find(c=>c.key===agent.key),counts=measured?{
          running:groups.find(g=>g.agentKey===agent.key&&g.state==='RUNNING')?._count._all||0,
          queued:groups.find(g=>g.agentKey===agent.key&&g.state==='QUEUED')?._count._all||0,
          failed:groups.filter(g=>g.agentKey===agent.key&&['FAILED','INTERRUPTED'].includes(g.state)).reduce((sum,g)=>sum+g._count._all,0),
          overdue:overdue.find(g=>g.agentKey===agent.key)?._count._all||0}:null;
          return{...agent,reportingRole:directorDepartment(agent.key)?'DEPARTMENT_DIRECTOR':agent.key==='EXECUTIVE'?'EXECUTIVE_SECRETARY':isGovernanceAgent(agent.key)?'GOVERNANCE_REVIEWER':'SPECIALIST',performance:performanceView(historical.find(row=>row.agentKey===agent.key)),departmentCode:AGENT_DEPARTMENTS[agent.key],departmentName:STAFFING_DEPARTMENTS.find(d=>d.code===AGENT_DEPARTMENTS[agent.key])?.nameAr,state:control?.state||'UNINITIALIZED',revision:control?.revision||null,workload:workload(counts),counts,canEnable:Boolean(control&&available&&control.state==='PAUSED'),canPause:control?.state==='ENABLED'};
        })};
    });
  }

  async recoverProvider(actorId:string,body:unknown){
    const value=inputRecord(body,['expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!uuid(value.expectedRevision))throw new BadRequestException('نسخة حالة المزود مطلوبة.');
    return this.db.serializable(async tx=>{
      await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId),gate=await this.providerGate(tx),now=await this.now(tx);
      if(!gate||gate.revision!==value.expectedRevision||gate.status!=='ACTION_REQUIRED')throw new ConflictException('تغيرت حالة المزود؛ حدّثها قبل الاستكمال.');
      if(gate.notBefore&&Date.parse(gate.notBefore)>now.getTime())throw new ConflictException('لم ينته وقت الانتظار الذي حدده المزود.');
      const config=this.model.configuration(),worker=await this.workerState(tx,config,now),budget=await this.reserved(tx,now);
      if(!config.ready||!worker.fresh||budget.reserved+config.reserveMicroUsd>config.dailyBudgetMicroUsd)throw new ConflictException('راجع إعداد المزود والمحرك وحد التكلفة قبل الاستكمال.');
      // Operator review can start a fresh time window, never a fresh attempt cap.
      if(gate.taskId)await tx.aiAgentTask.updateMany({where:{id:gate.taskId,state:'QUEUED',attemptCount:{lt:MAX_PROVIDER_ATTEMPTS},result:null},data:{retryStartedAt:now,revision:randomUUID()}});
      await tx.operationalSetting.delete({where:{key:PROVIDER_GATE_KEY}});
      await this.audit.record({actorId:actor.personId,action:'AI_PROVIDER_RECOVERY_REVIEWED',resource:'AiProvider',metadata:{reason,previousReason:gate.reason,adminAccountId:actor.id,noUncertainReplay:true}},tx);
      return{id:gate.revision,resumed:true};
    });
  }

  async retryRejectedTask(actorId:string,id:string,body:unknown){
    if(!uuid(id))throw new BadRequestException('معرف المهمة غير صالح.');
    const value=inputRecord(body,['expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!uuid(value.expectedRevision))throw new BadRequestException('نسخة المهمة مطلوبة.');
    return this.db.serializable(async tx=>{
      await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId);let task=await tx.aiAgentTask.findUnique({where:{id}});
      if(!task||task.revision!==value.expectedRevision)throw new ConflictException('تغيرت المهمة؛ حدّثها قبل الاستكمال.');
      if(task.state!=='FAILED'||task.result||!uuid(task.claimId)||!['PROVIDER_RATE_LIMITED','PROVIDER_OVERLOADED'].includes(task.errorCode||'')||task.attemptCount>=MAX_PROVIDER_ATTEMPTS)throw new ConflictException('الاستكمال متاح لرفض المزود المؤكد فقط، ضمن حد المحاولات.');
      const receipt=await tx.auditEvent.findFirst({where:{resource:'AiAgentTask',resourceId:id,action:'AI_TASK_EXECUTION_FAILED',metadata:{path:['claimId'],equals:task.claimId}}});
      const error=receipt?.metadata as Record<string,unknown>|undefined;
      if(!error||error.errorCode!==task.errorCode)throw new ConflictException('لم يثبت سجل رفض المزود.');
      task=await this.preserveLegacyAttempt(tx,task);
      const now=await this.now(tx),updated=await tx.aiAgentTask.update({where:{id},data:{state:'QUEUED',revision:randomUUID(),retryStartedAt:now,retryNotBefore:null,startedAt:null,finishedAt:null,dispatchedAt:null,leaseExpiresAt:null,errorCode:null},select:taskView});
      await this.audit.record({actorId:actor.personId,action:'AI_PROVIDER_REJECTION_RESUMED',resource:'AiAgentTask',resourceId:id,metadata:{reason,priorClaimId:task.claimId,attemptCount:task.attemptCount,adminAccountId:actor.id,knownRejectionOnly:true}},tx);
      return{...updated,resumed:true};
    });
  }

  async control(actorId:string,key:string,body:unknown){
    this.descriptor(key);const value=inputRecord(body,['state','expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!['PAUSED','ENABLED'].includes(String(value.state))||!uuid(value.expectedRevision))throw new BadRequestException('حالة الوكيل ونسخته الحالية مطلوبتان.');
    return this.db.serializable(async tx=>{await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId),row=await tx.aiAgentRuntime.findUnique({where:{key}});
      if(!row)throw new ConflictException('هيّئ سجلات الوكلاء أولًا.');if(row.revision!==value.expectedRevision)throw new ConflictException('تغير الوكيل؛ حدّث البيانات وراجع الإجراء.');
      if(value.state==='ENABLED'){
        const config=this.model.configuration(),now=await this.now(tx),worker=await this.workerState(tx,config,now),budget=await this.reserved(tx,now);
        if(!config.ready||!worker.fresh||budget.reserved+config.reserveMicroUsd>config.dailyBudgetMicroUsd)throw new ConflictException('التنفيذ غير متاح؛ راجع جاهزية المزود والعامل وحد التكلفة.');
      }
      if(row.state===value.state)return{key:row.key,state:row.state,revision:row.revision};
      const updated=await tx.aiAgentRuntime.update({where:{key},data:{state:String(value.state),revision:randomUUID(),lastAdminAccountId:actor.id}});
      const [running,queued]=await Promise.all([tx.aiAgentTask.count({where:{agentKey:key,state:'RUNNING'}}),tx.aiAgentTask.count({where:{agentKey:key,state:'QUEUED'}})]);
      await this.audit.record({actorId:actor.personId,action:'AI_AGENT_CONTROL_CHANGED',resource:'AiAgentRuntime',resourceId:key,metadata:{reason,from:row.state,to:updated.state,running,queued,policy:'RUNNING_FINISHES_QUEUED_RETAINED',adminAccountId:actor.id}},tx);
      return{key:updated.key,state:updated.state,revision:updated.revision,running,queued};
    });
  }

  async enqueue(actorId:string,key:string,body:unknown){
    const agent=this.descriptor(key),value=inputRecord(body,['action','language','prompt','requestId','reason','reviewed','correctionPolicy']),reason=decisionReason(value);
    if(!agent.allowedActions.includes(value.action as AgentAction)||!['ar-SA','en'].includes(String(value.language))||typeof value.prompt!=='string'||value.prompt.trim().length<3||value.prompt.length>2000||!uuid(value.requestId))throw new BadRequestException('نوع المهمة أو لغتها أو نصها أو مفتاح الطلب غير صالح.');
    if(value.correctionPolicy!==undefined&&(value.correctionPolicy!==DRAFT_CORRECTION_POLICY||!draftCorrectionAllowed(key,String(value.action))))throw new BadRequestException('التصحيح النصي الواحد متاح لمسودات التنفيذ المحددة فقط.');
    const policy=value.correctionPolicy===DRAFT_CORRECTION_POLICY?{correctionPolicy:DRAFT_CORRECTION_POLICY}:{};
    const prompt=value.prompt.trim(),fingerprint=hash({key,action:value.action,language:value.language,prompt,reason,...policy});
    return this.db.serializable(async tx=>{await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId);
      const existing=await tx.aiAgentTask.findUnique({where:{requestedByAccountId_requestKey:{requestedByAccountId:actorId,requestKey:value.requestId as string}},select:{...taskView,fingerprint:true}});
      if(existing){if(existing.fingerprint!==fingerprint)throw new ConflictException('استُخدم مفتاح الطلب لمهمة مختلفة.');const{fingerprint:omitted,...view}=existing;return{...view,approvalRequired:approvalRequired(view)};}
      if(!await tx.aiAgentRuntime.findUnique({where:{key}}))throw new ConflictException('هيّئ سجلات الوكلاء أولًا.');
      if(await tx.aiAgentTask.count({where:{agentKey:key,state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)throw new HttpException('وصل طابور الوكيل إلى حده؛ راجع المهام قبل الإضافة.',429);
      const task=await tx.aiAgentTask.create({data:{agentKey:key,requestedByAccountId:actorId,requestKey:value.requestId as string,fingerprint,action:String(value.action),language:String(value.language),prompt},select:taskView});
      await this.audit.record({actorId:actor.personId,action:'AI_TASK_QUEUED',resource:'AiAgentTask',resourceId:task.id,metadata:{reason,agentKey:key,action:task.action,language:task.language,requesterAccountId:actorId,to:'QUEUED',approvalRequired:approvalRequired(task),...policy}},tx);
      return{...task,approvalRequired:approvalRequired(task)};
    });
  }

  async tasks(actorId:string,key:string,cursor?:unknown){
    this.descriptor(key);if(cursor!==undefined&&!uuid(cursor))throw new BadRequestException('مؤشر صفحة المهام غير صالح.');
    return this.db.serializable(async tx=>{await requireVerifiedAdmin(tx,actorId);const items=await tx.aiAgentTask.findMany({where:{agentKey:key},select:taskView,orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,...(cursor?{cursor:{id:cursor as string},skip:1}:{})});
      const events=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:{in:items.slice(0,20).map(t=>t.id)},action:{in:['GOVERNANCE_REVIEW_STOPPED','GOVERNANCE_ROUTE_DEFERRED','GOVERNANCE_ROUTE_RESUMED','GOVERNANCE_DRAFT_CORRECTION_RESUMED','GOVERNANCE_FINAL_RECOMMENDATION_READY']}},select:{resourceId:true,action:true,metadata:true},orderBy:{occurredAt:'desc'}});
      return{items:items.slice(0,20).map(t=>{const event=events.find(e=>e.resourceId===t.id),metadata=event?.metadata as Record<string,unknown>|null;
        const status=event?.action==='GOVERNANCE_FINAL_RECOMMENDATION_READY'?'OWNER_RECOMMENDATION_READY':event?.action==='GOVERNANCE_ROUTE_RESUMED'?'MANUAL_ROUTE_RESUMED':event?.action==='GOVERNANCE_DRAFT_CORRECTION_RESUMED'?'DRAFT_CORRECTION_QUEUED':metadata?.outcome||metadata?.reason;
        return{...t,approvalRequired:approvalRequired(t),...(isGovernanceAgent(t.agentKey)?{governanceReview:t.result?parseGovernanceReview(t.result):null}:{}),...(typeof status==='string'?{governanceRouting:{status,ownerApprovalRequired:metadata?.ownerApprovalRequired===true,approved:false,...(metadata?.draftCorrection?{draftCorrection:metadata.draftCorrection}:{})}}:{})};
      }),nextCursor:items.length>20?items[19].id:null};});
  }

  async decideTask(actorId:string,id:string,body:unknown){
    if(!uuid(id))throw new BadRequestException('معرف المهمة غير صالح.');const value=inputRecord(body,['action','expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!['CANCEL','ACKNOWLEDGE'].includes(String(value.action))||!uuid(value.expectedRevision))throw new BadRequestException('قرار المهمة غير صالح.');
    return this.db.serializable(async tx=>{await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId),task=await tx.aiAgentTask.findUnique({where:{id}});if(!task)throw new NotFoundException('المهمة غير موجودة.');
      if(task.revision!==value.expectedRevision)throw new ConflictException('تغيرت المهمة؛ حدّث البيانات وراجع القرار.');
      if(value.action==='CANCEL'&&task.state!=='QUEUED'||value.action==='ACKNOWLEDGE'&&!['FAILED','INTERRUPTED'].includes(task.state))throw new ConflictException('هذا القرار لا يناسب حالة المهمة.');
      const updated=await tx.aiAgentTask.update({where:{id},data:{state:value.action==='CANCEL'?'CANCELLED':'REVIEWED',revision:randomUUID(),reviewedAt:await this.now(tx),reviewedByAccountId:actorId},select:taskView});
      await this.audit.record({actorId:actor.personId,action:'AI_TASK_REVIEWED',resource:'AiAgentTask',resourceId:id,metadata:{reason,agentKey:task.agentKey,from:task.state,to:updated.state,adminAccountId:actorId,noAutomaticRetry:true}},tx);return updated;
    });
  }

  async resumeGovernance(actorId:string,id:string,body:unknown){
    if(!uuid(id))throw new BadRequestException('معرف المهمة غير صالح.');
    const value=inputRecord(body,['expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!uuid(value.expectedRevision))throw new BadRequestException('نسخة المخرج المحفوظ مطلوبة.');
    return this.db.serializable(async tx=>{
      await this.guard(tx);await requireVerifiedAdmin(tx,actorId);const task=await tx.aiAgentTask.findUnique({where:{id}});
      if(!task)throw new NotFoundException('المهمة غير موجودة.');
      const actor=await lockAdminIdentities(tx,actorId,task.requestedByAccountId);if(task.requestedByAccountId!==actorId)await requireVerifiedAdmin(tx,task.requestedByAccountId);
      if(task.revision!==value.expectedRevision||task.state!=='COMPLETED'||!task.result)throw new ConflictException('تغيرت المهمة أو لم يكتمل مخرجها؛ حدّث البيانات وراجع الإجراء.');
      if(!this.descriptor(task.agentKey).allowedActions.includes(task.action as AgentAction))throw new ConflictException('نوع المخرج لا يسمح بإحالة مراجعة.');
      const context=isGovernanceAgent(task.agentKey)?await this.governanceContext(tx,task):null;
      if(isGovernanceAgent(task.agentKey)&&(!context||task.agentKey==='GOV_FINAL_GATE'||governanceRouteDecision(parseGovernanceReview(task.result))!=='CONTINUE'))throw new ConflictException('هذه المراجعة لا تسمح باستئناف الإحالة.');
      const source=context?.source||task,evidence=context?.source.operationsEvidence??await readOperationsEvidence(tx,task);
      if(source.action==='READ_OPERATIONS'&&evidence?.status!=='RECORDED')throw new ConflictException('يلزم دليل المدخلات الأصلي قبل إحالة المراجعة.');
      const nextKey=isGovernanceAgent(task.agentKey)?GOVERNANCE_REVIEW_ORDER[GOVERNANCE_REVIEW_ORDER.indexOf(task.agentKey)+1]:GOVERNANCE_REVIEW_ORDER[0];
      const links=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:id}},take:2});
      if(links.length){
        const link=links[0].metadata as Record<string,unknown>|null,child=links.length===1&&links[0].resourceId?await tx.aiAgentTask.findUnique({where:{id:links[0].resourceId}}):null;
        if(!child||link?.sourceRevision!==task.revision||link.fromAgentKey!==task.agentKey||link.toAgentKey!==nextKey||child.agentKey!==nextKey||child.requestedByAccountId!==task.requestedByAccountId||child.language!==task.language||child.action!=='READ_OPERATIONS')throw new ConflictException('روابط الإحالة تحتاج تحققًا.');
        return{id:task.id,reviewTaskId:child.id,resumed:false};
      }
      const deferred=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:id,action:'GOVERNANCE_ROUTE_DEFERRED'},take:2}),receipt=deferred[0]?.metadata as Record<string,unknown>|undefined;
      if(deferred.length!==1||receipt?.fromAgentKey!==task.agentKey||receipt.toAgentKey!==nextKey||!['GOVERNANCE_QUEUE_FULL','GOVERNANCE_AGENT_UNINITIALIZED'].includes(String(receipt.reason)))throw new ConflictException('لا توجد إحالة مؤجلة قابلة للاستئناف.');
      if(!await tx.aiAgentRuntime.findUnique({where:{key:nextKey}})||await tx.aiAgentTask.count({where:{agentKey:nextKey,state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)throw new ConflictException('ما زال طابور المراجع ممتلئًا أو غير مهيأ.');
      await this.queueGovernanceNext(tx,task);
      const child=await tx.aiAgentTask.findUnique({where:{requestedByAccountId_requestKey:{requestedByAccountId:task.requestedByAccountId,requestKey:stableRequestId(`governance:${task.id}:${nextKey}`)}}});
      if(!child)throw new ConflictException('تعذر تأكيد إحالة المراجعة.');
      await this.audit.record({actorId:actor.personId,action:'GOVERNANCE_ROUTE_RESUMED',resource:'AiAgentTask',resourceId:id,metadata:{reason,sourceRevision:task.revision,reviewTaskId:child.id,toAgentKey:nextKey,adminAccountId:actor.id,sourceRegenerated:false,approved:false}},tx);
      return{id:task.id,reviewTaskId:child.id,resumed:true};
    });
  }

  async heartbeat(){
    return this.db.serializable(async tx=>{await this.guard(tx);const now=await this.now(tx),config=this.model.configuration();
      const expired=await tx.aiAgentTask.findMany({where:{state:'RUNNING',leaseExpiresAt:{lte:now}},take:10});
      for(const task of expired){
        await tx.aiAgentTask.update({where:{id:task.id},data:{state:'INTERRUPTED',errorCode:'EXECUTION_LEASE_EXPIRED',finishedAt:now,revision:randomUUID()}});
        await tx.aiAgentRuntime.update({where:{key:task.agentKey},data:{state:'PAUSED',revision:randomUUID()}});
        if(task.claimId)await tx.aiAgentTaskAttempt.updateMany({where:{claimId:task.claimId,state:'RUNNING'},data:{state:'INTERRUPTED',errorCode:'EXECUTION_LEASE_EXPIRED',finishedAt:now}});
        await this.audit.record({action:'AI_TASK_INTERRUPTED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'RUNNING',to:'INTERRUPTED',reason:'EXECUTION_LEASE_EXPIRED',noAutomaticRetry:true}},tx);
      }
      await tx.operationalSetting.upsert({where:{key:WORKER_STATUS_KEY},create:{key:WORKER_STATUS_KEY,value:{observedAt:now.toISOString(),configuration:configHash(config)}},update:{value:{observedAt:now.toISOString(),configuration:configHash(config)},updatedAt:now}});
    });
  }

  async claim(){
    const config=this.model.configuration();if(!config.ready)return null;
    return this.db.serializable(async tx=>{await this.guard(tx);const now=await this.now(tx),budget=await this.reserved(tx,now);
      if(budget.reserved+config.reserveMicroUsd>config.dailyBudgetMicroUsd||await tx.aiAgentTask.count({where:{state:'RUNNING'}})>0||providerGateView(await this.providerGate(tx),now.getTime()).blocked)return null;
      let task=await tx.aiAgentTask.findFirst({where:{state:'QUEUED',result:null,agent:{state:'ENABLED'},OR:[{retryNotBefore:null},{retryNotBefore:{lte:now}}]},orderBy:[{createdAt:'asc'},{id:'asc'}]});if(!task)return null;
      let allowed=true;try{await lockAdminIdentities(tx,task.requestedByAccountId);}catch(error){if(!(error instanceof ForbiddenException))throw error;allowed=false;}
      if(!allowed){await tx.aiAgentTask.update({where:{id:task.id},data:{state:'FAILED',errorCode:'REQUESTER_AUTH_REVOKED',finishedAt:now,revision:randomUUID()}});await this.audit.record({action:'AI_TASK_DENIED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'QUEUED',to:'FAILED',reason:'REQUESTER_AUTH_REVOKED'}},tx);return null;}
      task=await this.preserveLegacyAttempt(tx,task);
      if(task.attemptCount>=MAX_PROVIDER_ATTEMPTS){await tx.aiAgentTask.update({where:{id:task.id},data:{state:'FAILED',errorCode:'PROVIDER_RETRY_EXHAUSTED',finishedAt:now,revision:randomUUID()}});return null;}
      if(task.attemptCount>0&&task.retryStartedAt&&now.getTime()-task.retryStartedAt.getTime()>PROVIDER_RECOVERY_WINDOW_MS){
        await this.saveProviderGate(tx,{version:1,revision:randomUUID(),status:'ACTION_REQUIRED',reason:'PROVIDER_RECOVERY_EXPIRED',notBefore:null,taskId:task.id});
        await this.audit.record({action:'AI_PROVIDER_RECOVERY_WINDOW_EXPIRED',resource:'AiAgentTask',resourceId:task.id,metadata:{attemptCount:task.attemptCount,requesterAccountId:task.requestedByAccountId,noAutomaticRetry:true}},tx);return null;
      }
      const claimId=randomUUID(),attemptNumber=task.attemptCount+1;
      await tx.aiAgentTaskAttempt.create({data:{taskId:task.id,attemptNumber,claimId,state:'RUNNING',startedAt:now,reservationDate:budget.day,reservedCostMicroUsd:config.reserveMicroUsd}});
      const updated=await tx.aiAgentTask.update({where:{id:task.id},data:{state:'RUNNING',revision:randomUUID(),startedAt:now,finishedAt:null,dispatchedAt:null,retryNotBefore:null,retryStartedAt:task.retryStartedAt||now,attemptCount:attemptNumber,leaseExpiresAt:new Date(now.getTime()+TASK_LEASE_MS),claimId,model:config.model,reservationDate:budget.day,reservedCostMicroUsd:{increment:config.reserveMicroUsd},errorCode:null,executionPolicy:{provider:config.provider,model:config.model,maxInputTokens:config.maxInputTokens,maxOutputTokens:config.maxOutputTokens,inputRate:config.inputRate,outputRate:config.outputRate,dailyBudgetMicroUsd:config.dailyBudgetMicroUsd}}});
      await this.saveProviderGate(tx,{version:1,revision:randomUUID(),status:'WAITING',reason:'PROVIDER_PACING',notBefore:new Date(now.getTime()+taskIntervalMs()).toISOString()});
      await this.audit.record({action:'AI_TASK_STARTED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'QUEUED',to:'RUNNING',claimId,revision:updated.revision,model:config.model,reservedCostMicroUsd:config.reserveMicroUsd,budgetDay:budget.day.toISOString()}},tx);
      return{task:updated,config,agent:this.descriptor(task.agentKey)};
    });
  }

  async runClaim(claim:NonNullable<Awaited<ReturnType<AgentRuntimeService['claim']>>>){
    const dispatched=await this.db.serializable(async tx=>{await this.guard(tx);const row=await tx.aiAgentTask.findUnique({where:{id:claim.task.id}}),now=await this.now(tx);if(!row||row.claimId!==claim.task.claimId||row.state!=='RUNNING'||row.dispatchedAt||!row.leaseExpiresAt||row.leaseExpiresAt<=now)return false;
      const receipt=await tx.aiAgentTaskAttempt.updateMany({where:{claimId:row.claimId!,state:'RUNNING',dispatchedAt:null},data:{dispatchedAt:now}});if(receipt.count!==1)throw new ConflictException('لم يثبت حجز المحاولة.');
      await tx.aiAgentTask.update({where:{id:row.id},data:{dispatchedAt:now,unknownCostAttempts:{increment:1}}});await this.audit.record({action:'AI_TASK_DISPATCHED',resource:'AiAgentTask',resourceId:row.id,metadata:{agentKey:row.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:row.requestedByAccountId,claimId:row.claimId,attemptNumber:row.attemptCount}},tx);return true;});
    if(!dispatched)return;
    let result:AiModelResult|undefined,error:AiProviderError|undefined;
    try{
      const governanceReview=isGovernanceAgent(claim.task.agentKey)?await this.db.serializable(tx=>this.governanceContext(tx,claim.task)):undefined;
      if(isGovernanceAgent(claim.task.agentKey)&&!governanceReview)throw new AiProviderError('GOVERNANCE_SOURCE_INVALID');
      if(governanceReview?.source.action==='READ_OPERATIONS'&&governanceReview.source.operationsEvidence?.status!=='RECORDED')throw new AiProviderError('SOURCE_EVIDENCE_UNAVAILABLE');
      const draftCorrection=claim.task.fingerprint.startsWith(DRAFT_CORRECTION_PREFIX)?await this.db.serializable(tx=>this.draftCorrectionContext(tx,claim.task)):undefined;
      if(claim.task.fingerprint.startsWith(DRAFT_CORRECTION_PREFIX)&&!draftCorrection)throw new AiProviderError('DRAFT_CORRECTION_SOURCE_INVALID');
      let reportBundle:object|undefined;
      if(claim.task.fingerprint.startsWith(REPORT_FINGERPRINT)){
        if(!this.reportInbox)throw new AiProviderError('EXECUTIVE_REPORT_CONTEXT_UNAVAILABLE');
        reportBundle=reportModelInput((await this.db.serializable(tx=>executiveReportContext(tx,claim.task,this.reportInbox!))).bundle);
      }
      const operations=claim.task.action==='READ_OPERATIONS'&&!isGovernanceAgent(claim.task.agentKey)?await this.admin.overview():undefined;
      const snapshot=operations?{pendingReviews:operations.pendingReviews,openTrips:operations.openTrips,activeBookings:operations.activeBookings,pendingOrganizations:operations.pendingOrganizations}:undefined;
      if(snapshot){
        const values=operationsValues(snapshot);if(!values)throw new AiProviderError('OPERATIONS_EVIDENCE_INVALID');
        await this.db.serializable(async tx=>{
          await this.guard(tx);
          const row=await tx.aiAgentTask.findUnique({where:{id:claim.task.id}});
          if(!row||row.state!=='RUNNING'||row.claimId!==claim.task.claimId||row.revision!==claim.task.revision)throw new AiProviderError('OPERATIONS_EVIDENCE_CONFLICT');
          const observedAt=(await this.now(tx)).toISOString();
          await this.audit.record({action:'AI_TASK_OPERATIONS_CAPTURED',resource:'AiAgentTask',resourceId:row.id,metadata:{agentKey:row.agentKey,scope:'OPERATIONS_AGGREGATE_V1',claimId:row.claimId,sourceRevision:row.revision,observedAt,values,digest:operationsEvidenceDigest(row.id,row.claimId!,row.revision,observedAt,values)}},tx);
        });
      }
      result=await this.model.execute(claim.config,claim.agent,claim.task.action as AgentAction,claim.task.language as SupportedLanguage,claim.task.prompt,snapshot,governanceReview||undefined,draftCorrection||undefined,reportBundle);
    }catch(failure){error=failure instanceof AiProviderError?failure:new AiProviderError('EXECUTION_FAILED');}
    // Retry only persistence, never the provider request. A committed receipt is
    // detected through claimId/state, making an ambiguous DB commit harmless.
    for(let attempt=0;attempt<3;attempt++)try{return await this.finish(claim.task.id,claim.task.claimId!,result,error);}catch(failure){if(attempt===2)throw failure;await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));}
  }

  private async governanceContext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;requestedByAccountId:string;action:string;language:string}){
    if(!isGovernanceAgent(task.agentKey)||task.action!=='READ_OPERATIONS')return null;
    const reviews:Array<{id:string;agentKey:string;revision:string;result:string}>=[];
    let cursor=task;
    for(let index=GOVERNANCE_REVIEW_ORDER.indexOf(task.agentKey);index>=0;index--){
      const events=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:cursor.id,action:'GOVERNANCE_REVIEW_QUEUED'},take:2});
      if(events.length!==1)return null;
      const metadata=events[0].metadata as Record<string,unknown>|null;
      if(!metadata||!uuid(metadata.sourceTaskId)||!uuid(metadata.sourceRevision)||metadata.toAgentKey!==cursor.agentKey)return null;
      const source=await tx.aiAgentTask.findUnique({where:{id:metadata.sourceTaskId}});
      if(!source||source.requestedByAccountId!==task.requestedByAccountId||source.language!==task.language||source.state!=='COMPLETED'||!source.result||source.revision!==metadata.sourceRevision||metadata.fromAgentKey!==source.agentKey)return null;
      if(index===0){
        if(isGovernanceAgent(source.agentKey))return null;
        return{source:{id:source.id,agentKey:source.agentKey,revision:source.revision,action:source.action,prompt:source.prompt,result:source.result,operationsEvidence:await readOperationsEvidence(tx,source)},reviews:reviews.reverse()};
      }
      if(source.agentKey!==GOVERNANCE_REVIEW_ORDER[index-1]||source.action!=='READ_OPERATIONS'||governanceRouteDecision(parseGovernanceReview(source.result))!=='CONTINUE')return null;
      reviews.push({id:source.id,agentKey:source.agentKey,revision:source.revision,result:source.result});cursor=source;
    }
    return null;
  }

  private async queueDraftCorrection(tx:Prisma.TransactionClient,reviewTask:{id:string;agentKey:string;revision:string;requestedByAccountId:string;action:string;language:string;result:string|null}){
    const context=await this.governanceContext(tx,reviewTask);
    if(!context||!draftCorrectionRequested(parseGovernanceReview(reviewTask.result||'')))return{status:'NOT_ELIGIBLE'};
    const source=await tx.aiAgentTask.findUnique({where:{id:context.source.id}});
    if(!source||!await hasDraftCorrectionPermission(tx,source))return{status:'NOT_AUTHORIZED'};
    try{await lockAdminIdentities(tx,source.requestedByAccountId);}catch(error){if(error instanceof ForbiddenException)return{status:'REQUESTER_AUTH_REVOKED'};throw error;}
    const requestKey=correctionRequestId(source.id),fingerprint=correctionFingerprint(source,reviewTask);
    const existing=await tx.aiAgentTask.findUnique({where:{requestedByAccountId_requestKey:{requestedByAccountId:source.requestedByAccountId,requestKey}}});
    if(existing){
      const links=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:existing.id,action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED'},take:2});
      const link=links[0]?.metadata as Record<string,unknown>|undefined;
      return existing.agentKey===source.agentKey&&existing.action===source.action&&existing.language===source.language&&existing.prompt===source.prompt&&existing.fingerprint===fingerprint&&existing.requestKey===correctionRequestId(source.id)&&links.length===1&&link?.policy===DRAFT_CORRECTION_POLICY&&link.maxRounds===1&&link.agentKey===source.agentKey&&link.requesterAccountId===source.requestedByAccountId&&link.sourceTaskId===source.id&&link.sourceRevision===source.revision&&link.reviewTaskId===reviewTask.id&&link.reviewRevision===reviewTask.revision?{status:'QUEUED',id:existing.id}:{status:'INTEGRITY_REVIEW_REQUIRED'};
    }
    const control=await tx.aiAgentRuntime.findUnique({where:{key:source.agentKey}});
    if(!control||await tx.aiAgentTask.count({where:{agentKey:source.agentKey,state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)return{status:!control?'AGENT_UNINITIALIZED':'QUEUE_FULL'};
    const correction=await tx.aiAgentTask.create({data:{agentKey:source.agentKey,requestedByAccountId:source.requestedByAccountId,requestKey,fingerprint,action:source.action,language:source.language,prompt:source.prompt}});
    await this.audit.record({action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',resource:'AiAgentTask',resourceId:correction.id,metadata:{policy:DRAFT_CORRECTION_POLICY,sourceTaskId:source.id,sourceRevision:source.revision,reviewTaskId:reviewTask.id,reviewRevision:reviewTask.revision,agentKey:source.agentKey,requesterAccountId:source.requestedByAccountId,maxRounds:1,sourcePreserved:true,approved:false}},tx);
    return{status:'QUEUED',id:correction.id};
  }

  private async draftCorrectionContext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;requestedByAccountId:string;action:string;language:string;prompt:string;fingerprint:string;requestKey:string}){
    await requireVerifiedAdmin(tx,task.requestedByAccountId);
    const links=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:task.id,action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED'},take:2});
    const link=links[0]?.metadata as Record<string,unknown>|undefined;
    if(links.length!==1||link?.policy!==DRAFT_CORRECTION_POLICY||link.maxRounds!==1||!uuid(link.sourceTaskId)||!uuid(link.reviewTaskId))return null;
    const source=await tx.aiAgentTask.findUnique({where:{id:link.sourceTaskId}}),review=await tx.aiAgentTask.findUnique({where:{id:link.reviewTaskId}});
    if(!source||!review||source.state!=='COMPLETED'||!source.result||review.state!=='COMPLETED'||source.revision!==link.sourceRevision||review.revision!==link.reviewRevision||source.agentKey!==task.agentKey||source.action!==task.action||source.language!==task.language||source.prompt!==task.prompt||source.requestedByAccountId!==task.requestedByAccountId||review.requestedByAccountId!==task.requestedByAccountId||link.agentKey!==task.agentKey||link.requesterAccountId!==task.requestedByAccountId||task.requestKey!==correctionRequestId(source.id)||correctionFingerprint(source,review)!==task.fingerprint||!await hasDraftCorrectionPermission(tx,source)||!draftCorrectionRequested(parseGovernanceReview(review.result||'')))return null;
    const context=await this.governanceContext(tx,review);
    if(context?.source.id!==source.id||context.source.revision!==source.revision)return null;
    const siblings=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',action:'GOVERNANCE_DRAFT_CORRECTION_QUEUED',metadata:{path:['sourceTaskId'],equals:source.id}},select:{resourceId:true},take:2});
    if(siblings.length!==1||siblings[0].resourceId!==task.id)return null;
    return{source:context.source,reviews:[...context.reviews,{id:review.id,revision:review.revision,agentKey:review.agentKey,result:review.result}],round:1,maxRounds:1};
  }

  async resumeDraftCorrection(actorId:string,id:string,body:unknown){
    if(!uuid(id))throw new BadRequestException('معرف المراجعة غير صالح.');
    const value=inputRecord(body,['expectedRevision','reason','reviewed']),reason=decisionReason(value);
    if(!uuid(value.expectedRevision))throw new BadRequestException('نسخة المراجعة مطلوبة.');
    return this.db.serializable(async tx=>{
      await this.guard(tx);await requireVerifiedAdmin(tx,actorId);const review=await tx.aiAgentTask.findUnique({where:{id}});
      if(!review)throw new NotFoundException('المراجعة غير موجودة.');
      const actor=await lockAdminIdentities(tx,actorId,review.requestedByAccountId);
      if(review.state!=='COMPLETED'||review.revision!==value.expectedRevision)throw new ConflictException('تغيرت المراجعة؛ حدّث البيانات.');
      const correction=await this.queueDraftCorrection(tx,review);
      if(correction.status!=='QUEUED'||!correction.id)throw new ConflictException('التصحيح غير مأذون أو يتطلب أدلة/قرار المالك أو لا تتاح سعة في الطابور.');
      const existing=await tx.auditEvent.findFirst({where:{resource:'AiAgentTask',resourceId:id,action:'GOVERNANCE_DRAFT_CORRECTION_RESUMED'}});
      if(!existing)await this.audit.record({actorId:actor.personId,action:'GOVERNANCE_DRAFT_CORRECTION_RESUMED',resource:'AiAgentTask',resourceId:id,metadata:{reason,correctionTaskId:correction.id,reviewRevision:review.revision,adminAccountId:actor.id,approved:false}},tx);
      return{id,correctionTaskId:correction.id};
    });
  }

  private async queueGovernanceNext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;revision:string;requestedByAccountId:string;action:string;language:string;prompt:string;result:string|null}){
    const current=task.agentKey;
    let nextKey:AgentKey=GOVERNANCE_REVIEW_ORDER[0];
    if(isGovernanceAgent(current)){
      const context=await this.governanceContext(tx,task);
      const review=parseGovernanceReview(task.result||'');
      const outcome=context?governanceRouteDecision(review):'UNLINKED_REVIEW';
      if(outcome!=='CONTINUE'){
        const correction=outcome==='CORRECTION_REQUIRED'?await this.queueDraftCorrection(tx,task):{status:'NOT_ELIGIBLE'};
        await this.audit.record({action:'GOVERNANCE_REVIEW_STOPPED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:current,outcome,sourceTaskId:context?.source.id,ownerApprovalRequired:outcome==='OWNER_ESCALATION_REQUIRED',noAutomaticCorrection:correction.status!=='QUEUED',draftCorrection:correction}},tx);
        return;
      }
      if(current==='GOV_FINAL_GATE'){
        await this.audit.record({action:'GOVERNANCE_FINAL_RECOMMENDATION_READY',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:current,sourceTaskId:context!.source.id,sourceRevision:context!.source.revision,reviewCount:context!.reviews.length,requesterAccountId:task.requestedByAccountId,ownerApprovalRequired:true,approved:false}},tx);
        return;
      }
      nextKey=GOVERNANCE_REVIEW_ORDER[GOVERNANCE_REVIEW_ORDER.indexOf(current)+1];
    }
    const requestKey=stableRequestId(`governance:${task.id}:${nextKey}`);
    const existing=await tx.aiAgentTask.findUnique({where:{requestedByAccountId_requestKey:{requestedByAccountId:task.requestedByAccountId,requestKey}}});
    if(existing)return;
    const control=await tx.aiAgentRuntime.findUnique({where:{key:nextKey}});
    const pending=await tx.aiAgentTask.count({where:{agentKey:nextKey,state:{in:['QUEUED','RUNNING']}}});
    if(!control||pending>=QUEUE_LIMIT){
      await this.audit.record({action:'GOVERNANCE_ROUTE_DEFERRED',resource:'AiAgentTask',resourceId:task.id,metadata:{fromAgentKey:current,toAgentKey:nextKey,reason:!control?'GOVERNANCE_AGENT_UNINITIALIZED':'GOVERNANCE_QUEUE_FULL'}},tx);
      return;
    }
    const prompt=[
      'HYDROLAND Governance & Quality Office review.',
      `Source agent: ${task.agentKey}`,
      `Source task: ${task.id}`,
      'Review the complete linked source and prior reviews supplied in governanceReview.',
      'This is an advisory review, not an execution or approval.',
    ].join('\n');
    const fingerprint=hash({key:nextKey,action:'READ_OPERATIONS',language:task.language,prompt,reason:'AUTOMATED_GOVERNANCE_ROUTE'});
    const queued=await tx.aiAgentTask.create({data:{agentKey:nextKey,requestedByAccountId:task.requestedByAccountId,requestKey,fingerprint,action:'READ_OPERATIONS',language:task.language,prompt},select:taskView});
    await this.audit.record({action:'GOVERNANCE_REVIEW_QUEUED',resource:'AiAgentTask',resourceId:queued.id,metadata:{sourceTaskId:task.id,sourceRevision:task.revision,fromAgentKey:task.agentKey,toAgentKey:nextKey,automatic:true,ownerApprovalRequired:nextKey==='GOV_FINAL_GATE',controlState:control.state}},tx);
  }

  private async finish(id:string,claimId:string,result?:AiModelResult,error?:AiProviderError){
    return this.db.serializable(async tx=>{await this.guard(tx);const task=await tx.aiAgentTask.findUnique({where:{id}});if(!task||task.claimId!==claimId||task.state==='COMPLETED'||task.result)return;
      const late=task.state!=='RUNNING';if(late&&!result)return;
      const now=await this.now(tx);
      const rejected=!late&&error?.definiteRejection===true&&['PROVIDER_RATE_LIMITED','PROVIDER_OVERLOADED','PROVIDER_WAIT_REQUIRED','PROVIDER_QUOTA_EXHAUSTED','PROVIDER_USAGE_LIMITED'].includes(error.code);
      const plan=rejected?rejectionPlan(error!.code,error!.limits,task.attemptCount,(task.retryStartedAt||now).getTime(),now.getTime()):null;
      const deferred=Boolean(plan&&!plan.exhausted);
      const state=late?(task.state==='QUEUED'?'INTERRUPTED':task.state):result?'COMPLETED':deferred?'QUEUED':error?.uncertain?'INTERRUPTED':'FAILED';
      const receipt=await tx.aiAgentTaskAttempt.updateMany({where:{claimId,state:{in:['RUNNING','INTERRUPTED']}},data:{state:late?'LATE_RESULT':result?'COMPLETED':rejected?'REJECTED':state,finishedAt:now,errorCode:error?.code,providerStage:error?.providerStage,...(error?.limits?{providerLimits:JSON.parse(JSON.stringify(error.limits))}:{}),...(result?{inputTokens:result.inputTokens,outputTokens:result.outputTokens,estimatedCostMicroUsd:result.estimatedCostMicroUsd}:{})}});
      if(receipt.count!==1)throw new ConflictException('لم يثبت سجل نتيجة المحاولة.');
      const completed=await tx.aiAgentTask.update({where:{id},data:{state,revision:randomUUID(),finishedAt:deferred?null:now,retryNotBefore:plan?.notBefore?new Date(plan.notBefore):null,...(deferred?{dispatchedAt:null,leaseExpiresAt:null}:{}),...(result?{result:result.text,inputTokens:result.inputTokens,outputTokens:result.outputTokens,estimatedCostMicroUsd:(task.estimatedCostMicroUsd||0)+result.estimatedCostMicroUsd,unknownCostAttempts:Math.max(0,task.unknownCostAttempts-1)}:{errorCode:plan?.exhausted?'PROVIDER_RETRY_EXHAUSTED':error?.code||'EXECUTION_FAILED'})}});
      if(plan)await this.saveProviderGate(tx,{version:1,revision:randomUUID(),status:plan.automatic?'WAITING':'ACTION_REQUIRED',reason:plan.reason,notBefore:plan.notBefore,taskId:id,...(error?.limits?{limits:error.limits}:{})});
      else if(result?.rateLimits){
        const gate=await this.providerGate(tx),until=Math.max(result.rateLimits.retryAt?Date.parse(result.rateLimits.retryAt):0,result.rateLimits.minimumDelayMs!==undefined?now.getTime()+result.rateLimits.minimumDelayMs:0);
        if(gate?.status!=='ACTION_REQUIRED'&&(result.rateLimits.invalidDelay||until>now.getTime()))await this.saveProviderGate(tx,{version:1,revision:randomUUID(),status:result.rateLimits.invalidDelay?'ACTION_REQUIRED':'WAITING',reason:result.rateLimits.invalidDelay?'PROVIDER_DELAY_REQUIRES_REVIEW':'PROVIDER_RATE_LIMITED',notBefore:new Date(Math.max(until,gate?.notBefore?Date.parse(gate.notBefore):0,now.getTime())).toISOString(),limits:result.rateLimits});
      }
      if((!result&&!late&&!deferred)||(late&&task.state==='QUEUED'))await tx.aiAgentRuntime.update({where:{key:task.agentKey},data:{state:'PAUSED',revision:randomUUID()}});
      await this.audit.record({action:late?'AI_TASK_LATE_RESULT_RECORDED':result?'AI_TASK_COMPLETED':deferred?'AI_TASK_PROVIDER_DEFERRED':'AI_TASK_EXECUTION_FAILED',resource:'AiAgentTask',resourceId:id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,claimId,attemptNumber:task.attemptCount,from:task.state,to:state,errorCode:error?.code,providerStage:error?.providerStage,providerLimits:error?.limits,inputTokens:result?.inputTokens,outputTokens:result?.outputTokens,estimatedCostMicroUsd:result?.estimatedCostMicroUsd,noAutomaticRetry:!plan?.automatic,definiteRejection:error?.definiteRejection===true,retryNotBefore:plan?.notBefore,agentPaused:!result&&!late&&!deferred}},tx);
      if(result&&!late){
        if(task.fingerprint.startsWith(REPORT_FINGERPRINT))await this.audit.record({action:'AI_EXECUTIVE_REPORT_FORMATTED',resource:'AiAgentTask',resourceId:id,metadata:{approved:false,scope:'REPORT_FORMATTING_ONLY'}},tx);
        else if(this.agents.list().some(agent=>agent.key===task.agentKey))await this.queueGovernanceNext(tx,completed);
      }
    });
  }
}
