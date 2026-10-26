import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
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

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const taskView={id:true,agentKey:true,requestedByAccountId:true,action:true,language:true,prompt:true,state:true,revision:true,createdAt:true,startedAt:true,dispatchedAt:true,finishedAt:true,model:true,executionPolicy:true,inputTokens:true,outputTokens:true,reservedCostMicroUsd:true,estimatedCostMicroUsd:true,result:true,errorCode:true,reviewedAt:true} as const;
const configHash=(config:AiModelConfiguration)=>hash(config);
const stableRequestId=(value:string)=>{
  const hex=createHash('sha256').update(value).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
};
const approvalRequired=(task:{agentKey:string;action:string})=>task.action!=='READ_OPERATIONS'||task.agentKey==='GOV_FINAL_GATE';

@Injectable()
export class AgentRuntimeService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly agents:AgentService,private readonly model:AgentModelProviderService,private readonly admin:AdminService){}

  private descriptor(key:string){const found=this.agents.list().find(a=>a.key===key);if(!found)throw new NotFoundException('الوكيل غير موجود.');return found;}
  private async guard(tx:Prisma.TransactionClient){
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.ai-runtime')::bigint)`;
    // Force a fresh serializable snapshot for waiters, including absent task IDs.
    await tx.$executeRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES (${RUNTIME_GUARD_KEY},'{}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp()`;
  }
  private async now(tx:Prisma.TransactionClient){return (await tx.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`)[0].now;}
  private async reserved(tx:Prisma.TransactionClient,now:Date){const day=new Date(now.toISOString().slice(0,10)+'T00:00:00Z');const sum=await tx.aiAgentTask.aggregate({where:{reservationDate:day},_sum:{reservedCostMicroUsd:true}});return{day,reserved:sum._sum.reservedCostMicroUsd||0};}
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
      const budgetAvailable=config.ready&&budget.reserved+config.reserveMicroUsd<=config.dailyBudgetMicroUsd;
      const measured=config.ready&&worker.fresh,available=measured&&budgetAvailable;
      const reason=!config.ready?config.reason:!worker.fresh?'WORKER_STALE':!budgetAvailable?'DAILY_BUDGET_EXHAUSTED':'READY';
      const groups=await tx.aiAgentTask.groupBy({by:['agentKey','state'],_count:{_all:true},where:{state:{in:['QUEUED','RUNNING','FAILED','INTERRUPTED']}}});
      const overdue=await tx.aiAgentTask.groupBy({by:['agentKey'],_count:{_all:true},where:{state:'QUEUED',createdAt:{lt:new Date(now.getTime()-QUEUE_OVERDUE_MS)}}});
      return{initialized:this.agents.list().every(agent=>controls.some(control=>control.key===agent.key)),observedAt:now.toISOString(),workerObservedAt:worker.observedAt,metricsMaxAgeSeconds:METRICS_MAX_AGE_MS/1000,
        provider:{provider:config.provider,model:config.model,ready:available,reason,maxInputTokens:config.maxInputTokens,maxOutputTokens:config.maxOutputTokens},
        budget:{currency:'USD',day:budget.day.toISOString().slice(0,10),limitMicroUsd:config.dailyBudgetMicroUsd,reservedMicroUsd:budget.reserved,taskReserveMicroUsd:config.reserveMicroUsd,kind:'CONSERVATIVE_RESERVATION'},
        calculation:{perAgentConcurrency:1,highQueueAt:3,overdueMinutes:QUEUE_OVERDUE_MS/60000,globalConcurrency:1},
        items:this.agents.list().map(agent=>{const control=controls.find(c=>c.key===agent.key),counts=measured?{
          running:groups.find(g=>g.agentKey===agent.key&&g.state==='RUNNING')?._count._all||0,
          queued:groups.find(g=>g.agentKey===agent.key&&g.state==='QUEUED')?._count._all||0,
          failed:groups.filter(g=>g.agentKey===agent.key&&['FAILED','INTERRUPTED'].includes(g.state)).reduce((sum,g)=>sum+g._count._all,0),
          overdue:overdue.find(g=>g.agentKey===agent.key)?._count._all||0}:null;
          return{...agent,departmentCode:AGENT_DEPARTMENTS[agent.key],departmentName:STAFFING_DEPARTMENTS.find(d=>d.code===AGENT_DEPARTMENTS[agent.key])?.nameAr,state:control?.state||'UNINITIALIZED',revision:control?.revision||null,workload:workload(counts),counts,canEnable:Boolean(control&&available&&control.state==='PAUSED'),canPause:control?.state==='ENABLED'};
        })};
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
    const agent=this.descriptor(key),value=inputRecord(body,['action','language','prompt','requestId','reason','reviewed']),reason=decisionReason(value);
    if(!agent.allowedActions.includes(value.action as AgentAction)||!['ar-SA','en'].includes(String(value.language))||typeof value.prompt!=='string'||value.prompt.trim().length<3||value.prompt.length>2000||!uuid(value.requestId))throw new BadRequestException('نوع المهمة أو لغتها أو نصها أو مفتاح الطلب غير صالح.');
    const prompt=value.prompt.trim(),fingerprint=hash({key,action:value.action,language:value.language,prompt,reason});
    return this.db.serializable(async tx=>{await this.guard(tx);const actor=await lockAdminIdentities(tx,actorId);
      const existing=await tx.aiAgentTask.findUnique({where:{requestedByAccountId_requestKey:{requestedByAccountId:actorId,requestKey:value.requestId as string}},select:{...taskView,fingerprint:true}});
      if(existing){if(existing.fingerprint!==fingerprint)throw new ConflictException('استُخدم مفتاح الطلب لمهمة مختلفة.');const{fingerprint:omitted,...view}=existing;return{...view,approvalRequired:approvalRequired(view)};}
      if(!await tx.aiAgentRuntime.findUnique({where:{key}}))throw new ConflictException('هيّئ سجلات الوكلاء أولًا.');
      if(await tx.aiAgentTask.count({where:{agentKey:key,state:{in:['QUEUED','RUNNING']}}})>=QUEUE_LIMIT)throw new HttpException('وصل طابور الوكيل إلى حده؛ راجع المهام قبل الإضافة.',429);
      const task=await tx.aiAgentTask.create({data:{agentKey:key,requestedByAccountId:actorId,requestKey:value.requestId as string,fingerprint,action:String(value.action),language:String(value.language),prompt},select:taskView});
      await this.audit.record({actorId:actor.personId,action:'AI_TASK_QUEUED',resource:'AiAgentTask',resourceId:task.id,metadata:{reason,agentKey:key,action:task.action,language:task.language,requesterAccountId:actorId,to:'QUEUED',approvalRequired:approvalRequired(task)}},tx);
      return{...task,approvalRequired:approvalRequired(task)};
    });
  }

  async tasks(actorId:string,key:string,cursor?:unknown){
    this.descriptor(key);if(cursor!==undefined&&!uuid(cursor))throw new BadRequestException('مؤشر صفحة المهام غير صالح.');
    return this.db.serializable(async tx=>{await requireVerifiedAdmin(tx,actorId);const items=await tx.aiAgentTask.findMany({where:{agentKey:key},select:taskView,orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,...(cursor?{cursor:{id:cursor as string},skip:1}:{})});
      const events=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:{in:items.slice(0,20).map(t=>t.id)},action:{in:['GOVERNANCE_REVIEW_STOPPED','GOVERNANCE_ROUTE_DEFERRED','GOVERNANCE_FINAL_RECOMMENDATION_READY']}},select:{resourceId:true,action:true,metadata:true},orderBy:{occurredAt:'desc'}});
      return{items:items.slice(0,20).map(t=>{const event=events.find(e=>e.resourceId===t.id),metadata=event?.metadata as Record<string,unknown>|null;
        const status=event?.action==='GOVERNANCE_FINAL_RECOMMENDATION_READY'?'OWNER_RECOMMENDATION_READY':metadata?.outcome||metadata?.reason;
        return{...t,approvalRequired:approvalRequired(t),...(isGovernanceAgent(t.agentKey)?{governanceReview:t.result?parseGovernanceReview(t.result):null}:{}),...(typeof status==='string'?{governanceRouting:{status,ownerApprovalRequired:metadata?.ownerApprovalRequired===true,approved:false}}:{})};
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

  async heartbeat(){
    return this.db.serializable(async tx=>{await this.guard(tx);const now=await this.now(tx),config=this.model.configuration();
      const expired=await tx.aiAgentTask.findMany({where:{state:'RUNNING',leaseExpiresAt:{lte:now}},take:10});
      for(const task of expired){
        await tx.aiAgentTask.update({where:{id:task.id},data:{state:'INTERRUPTED',errorCode:'EXECUTION_LEASE_EXPIRED',finishedAt:now,revision:randomUUID()}});
        await tx.aiAgentRuntime.update({where:{key:task.agentKey},data:{state:'PAUSED',revision:randomUUID()}});
        await this.audit.record({action:'AI_TASK_INTERRUPTED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'RUNNING',to:'INTERRUPTED',reason:'EXECUTION_LEASE_EXPIRED',noAutomaticRetry:true}},tx);
      }
      await tx.operationalSetting.upsert({where:{key:WORKER_STATUS_KEY},create:{key:WORKER_STATUS_KEY,value:{observedAt:now.toISOString(),configuration:configHash(config)}},update:{value:{observedAt:now.toISOString(),configuration:configHash(config)},updatedAt:now}});
    });
  }

  async claim(){
    const config=this.model.configuration();if(!config.ready)return null;
    return this.db.serializable(async tx=>{await this.guard(tx);const now=await this.now(tx),budget=await this.reserved(tx,now);
      if(budget.reserved+config.reserveMicroUsd>config.dailyBudgetMicroUsd||await tx.aiAgentTask.count({where:{state:'RUNNING'}})>0)return null;
      const task=await tx.aiAgentTask.findFirst({where:{state:'QUEUED',agent:{state:'ENABLED'}},orderBy:[{createdAt:'asc'},{id:'asc'}]});if(!task)return null;
      let allowed=true;try{await lockAdminIdentities(tx,task.requestedByAccountId);}catch(error){if(!(error instanceof ForbiddenException))throw error;allowed=false;}
      if(!allowed){await tx.aiAgentTask.update({where:{id:task.id},data:{state:'FAILED',errorCode:'REQUESTER_AUTH_REVOKED',finishedAt:now,revision:randomUUID()}});await this.audit.record({action:'AI_TASK_DENIED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'QUEUED',to:'FAILED',reason:'REQUESTER_AUTH_REVOKED'}},tx);return null;}
      const claimId=randomUUID();const updated=await tx.aiAgentTask.update({where:{id:task.id},data:{state:'RUNNING',revision:randomUUID(),startedAt:now,leaseExpiresAt:new Date(now.getTime()+TASK_LEASE_MS),claimId,model:config.model,reservationDate:budget.day,reservedCostMicroUsd:config.reserveMicroUsd,executionPolicy:{provider:config.provider,model:config.model,maxInputTokens:config.maxInputTokens,maxOutputTokens:config.maxOutputTokens,inputRate:config.inputRate,outputRate:config.outputRate,dailyBudgetMicroUsd:config.dailyBudgetMicroUsd}}});
      await this.audit.record({action:'AI_TASK_STARTED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,from:'QUEUED',to:'RUNNING',claimId,revision:updated.revision,model:config.model,reservedCostMicroUsd:config.reserveMicroUsd,budgetDay:budget.day.toISOString()}},tx);
      return{task:updated,config,agent:this.descriptor(task.agentKey)};
    });
  }

  async runClaim(claim:NonNullable<Awaited<ReturnType<AgentRuntimeService['claim']>>>){
    const dispatched=await this.db.serializable(async tx=>{await this.guard(tx);const row=await tx.aiAgentTask.findUnique({where:{id:claim.task.id}}),now=await this.now(tx);if(!row||row.claimId!==claim.task.claimId||row.state!=='RUNNING'||row.dispatchedAt||!row.leaseExpiresAt||row.leaseExpiresAt<=now)return false;
      await tx.aiAgentTask.update({where:{id:row.id},data:{dispatchedAt:now}});await this.audit.record({action:'AI_TASK_DISPATCHED',resource:'AiAgentTask',resourceId:row.id,metadata:{agentKey:row.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:row.requestedByAccountId,claimId:row.claimId}},tx);return true;});
    if(!dispatched)return;
    let result:AiModelResult|undefined,error:AiProviderError|undefined;
    try{
      const governanceReview=isGovernanceAgent(claim.task.agentKey)?await this.db.serializable(tx=>this.governanceContext(tx,claim.task)):undefined;
      if(governanceReview?.source.action==='READ_OPERATIONS'&&governanceReview.source.operationsEvidence?.status!=='RECORDED')throw new AiProviderError('SOURCE_EVIDENCE_UNAVAILABLE');
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
      result=await this.model.execute(claim.config,claim.agent,claim.task.action as AgentAction,claim.task.language as SupportedLanguage,claim.task.prompt,snapshot,governanceReview||undefined);
    }catch(failure){error=failure instanceof AiProviderError?failure:new AiProviderError('EXECUTION_FAILED');}
    // Retry only persistence, never the provider request. A committed receipt is
    // detected through claimId/state, making an ambiguous DB commit harmless.
    for(let attempt=0;attempt<3;attempt++)try{return await this.finish(claim.task.id,claim.task.claimId!,result,error);}catch(failure){if(attempt===2)throw failure;await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));}
  }

  private async governanceContext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;requestedByAccountId:string}){
    if(!isGovernanceAgent(task.agentKey))return null;
    const reviews:Array<{id:string;agentKey:string;revision:string;result:string}>=[];
    let cursor=task;
    for(let index=GOVERNANCE_REVIEW_ORDER.indexOf(task.agentKey);index>=0;index--){
      const event=await tx.auditEvent.findFirst({where:{resource:'AiAgentTask',resourceId:cursor.id,action:'GOVERNANCE_REVIEW_QUEUED'},orderBy:{occurredAt:'desc'}});
      const metadata=event?.metadata as Record<string,unknown>|null;
      if(!metadata||!uuid(metadata.sourceTaskId)||!uuid(metadata.sourceRevision))return null;
      const source=await tx.aiAgentTask.findUnique({where:{id:metadata.sourceTaskId}});
      if(!source||source.requestedByAccountId!==task.requestedByAccountId||source.state!=='COMPLETED'||!source.result||source.revision!==metadata.sourceRevision)return null;
      if(index===0){
        if(isGovernanceAgent(source.agentKey))return null;
        return{source:{id:source.id,agentKey:source.agentKey,revision:source.revision,action:source.action,prompt:source.prompt,result:source.result,operationsEvidence:await readOperationsEvidence(tx,source)},reviews:reviews.reverse()};
      }
      if(source.agentKey!==GOVERNANCE_REVIEW_ORDER[index-1]||governanceRouteDecision(parseGovernanceReview(source.result))!=='CONTINUE')return null;
      reviews.push({id:source.id,agentKey:source.agentKey,revision:source.revision,result:source.result});cursor=source;
    }
    return null;
  }

  private async queueGovernanceNext(tx:Prisma.TransactionClient,task:{id:string;agentKey:string;revision:string;requestedByAccountId:string;language:string;prompt:string;result:string|null}){
    const current=task.agentKey;
    let nextKey:AgentKey=GOVERNANCE_REVIEW_ORDER[0];
    if(isGovernanceAgent(current)){
      const context=await this.governanceContext(tx,task);
      const review=parseGovernanceReview(task.result||'');
      const outcome=context?governanceRouteDecision(review):'UNLINKED_REVIEW';
      if(outcome!=='CONTINUE'){
        await this.audit.record({action:'GOVERNANCE_REVIEW_STOPPED',resource:'AiAgentTask',resourceId:task.id,metadata:{agentKey:current,outcome,sourceTaskId:context?.source.id,ownerApprovalRequired:outcome==='OWNER_ESCALATION_REQUIRED',noAutomaticCorrection:true}},tx);
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
      const state=late?task.state:result?'COMPLETED':error?.uncertain?'INTERRUPTED':'FAILED';
      const completed=await tx.aiAgentTask.update({where:{id},data:{state,revision:randomUUID(),finishedAt:await this.now(tx),...(result?{result:result.text,inputTokens:result.inputTokens,outputTokens:result.outputTokens,estimatedCostMicroUsd:result.estimatedCostMicroUsd}:{errorCode:error?.code||'EXECUTION_FAILED'})}});
      if(!result&&!late)await tx.aiAgentRuntime.update({where:{key:task.agentKey},data:{state:'PAUSED',revision:randomUUID()}});
      await this.audit.record({action:late?'AI_TASK_LATE_RESULT_RECORDED':result?'AI_TASK_COMPLETED':'AI_TASK_EXECUTION_FAILED',resource:'AiAgentTask',resourceId:id,metadata:{agentKey:task.agentKey,executor:'AI_RUNTIME_WORKER',initiatedByAccountId:task.requestedByAccountId,claimId,from:task.state,to:state,errorCode:error?.code,inputTokens:result?.inputTokens,outputTokens:result?.outputTokens,estimatedCostMicroUsd:result?.estimatedCostMicroUsd,noAutomaticRetry:true,agentPaused:!result&&!late}},tx);
      if(result&&!late){
        if(this.agents.list().some(agent=>agent.key===task.agentKey))await this.queueGovernanceNext(tx,completed);
      }
    });
  }
}
