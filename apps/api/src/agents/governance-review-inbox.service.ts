import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { STAFFING_DEPARTMENTS } from '../hr/staffing-catalog';
import { AgentService } from './agent.service';
import { AGENT_DEPARTMENTS, uuid } from './agent-runtime.domain';
import { AgentKey } from './agent.types';
import { GOVERNANCE_REVIEW_ORDER, governanceRouteDecision, isGovernanceAgent, parseGovernanceReview } from './governance-review.domain';
import { readOperationsEvidence } from './agent-operations-evidence';
import { correctionFingerprint, correctionRequestId, hasDraftCorrectionPermission, DRAFT_CORRECTION_POLICY, DRAFT_CORRECTION_PREFIX, draftCorrectionRequested } from './governance-draft-correction';

const taskSelect={id:true,agentKey:true,requestedByAccountId:true,fingerprint:true,revision:true,action:true,language:true,prompt:true,result:true,state:true,createdAt:true,startedAt:true,finishedAt:true,dispatchedAt:true,claimId:true,reservedCostMicroUsd:true,estimatedCostMicroUsd:true,attemptCount:true,unknownCostAttempts:true} as const;
type Task=Prisma.AiAgentTaskGetPayload<{select:typeof taskSelect}>;
type Receipt={resourceId:string|null;metadata:Prisma.JsonValue;occurredAt:Date};
type InboxReads={receipts:Map<string,Receipt[]>;tasks:Map<string,Task>;originals:Map<string,Task>};
const receiptKey=(action:string,id:string,bySource=false)=>JSON.stringify([action,id,bySource]);
const metadata=(value:Prisma.JsonValue|null):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
type InboxStatus='NOT_STARTED'|'WAITING_FOR_REVIEW'|'REVIEW_IN_PROGRESS'|'CORRECTION_REQUIRED'|'EVIDENCE_REQUIRED'|'OWNER_ESCALATION_REQUIRED'|'REVIEW_STOPPED'|'ROUTE_DEFERRED'|'INTEGRITY_REVIEW_REQUIRED'|'READY_FOR_OWNER';

@Injectable()
export class GovernanceReviewInboxService {
  constructor(private readonly db:DatabaseService,private readonly agents:AgentService){}
  private roots():Prisma.AiAgentTaskWhereInput{return{agentKey:{in:this.agents.list().filter(a=>!isGovernanceAgent(a.key)).map(a=>a.key)},state:'COMPLETED',result:{not:null}};}

  async list(actorId:string,cursor?:string){
    return this.db.serializable(async tx=>{
      await requireVerifiedAdmin(tx,actorId);
      if(cursor!==undefined&&(!uuid(cursor)||!await tx.aiAgentTask.findFirst({where:{...this.roots(),id:cursor},select:{id:true}})))throw new BadRequestException('مؤشر ملفات المراجعة غير صالح.');
      const sources=await tx.aiAgentTask.findMany({where:this.roots(),select:taskSelect,orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,...(cursor?{cursor:{id:cursor},skip:1}:{})});
      const reads=await this.loadPage(tx,sources.slice(0,20));
      const items=[];
      for(const source of sources.slice(0,20)){const file=await this.readFile(tx,source,reads);items.push({source:{id:file.source.id,revision:file.source.revision,agentKey:file.source.agentKey,nameAr:file.source.nameAr,departmentCode:file.source.departmentCode,departmentName:file.source.departmentName,createdAt:file.source.createdAt},status:file.status,reason:file.reason,completedReviews:file.completedReviews,stageCount:6,cost:file.cost,ownerApprovalRequired:file.ownerApprovalRequired,approved:false});}
      return{items,nextCursor:sources.length>20?sources[19].id:null,observedAt:new Date().toISOString(),scope:'ADVISORY_RUNTIME_OUTPUTS',readOnly:true};
    });
  }

  async detail(actorId:string,id:string){
    return this.db.serializable(async tx=>{
      await requireVerifiedAdmin(tx,actorId);
      if(!uuid(id))throw new BadRequestException('مرجع ملف المراجعة غير صالح.');
      const source=await tx.aiAgentTask.findFirst({where:{...this.roots(),id},select:taskSelect});
      if(!source)throw new NotFoundException('ملف المراجعة غير موجود.');
      return this.readFile(tx,source);
    });
  }

  // Report compilation uses the same verified chain inside its own transaction.
  async reportFile(tx:Prisma.TransactionClient,actorId:string,id:string){
    await requireVerifiedAdmin(tx,actorId);
    const source=await tx.aiAgentTask.findFirst({where:{...this.roots(),id,requestedByAccountId:actorId},select:taskSelect});
    if(!source)throw new NotFoundException('تقرير المدير غير مكتمل أو خارج نطاق المالك.');
    return this.readFile(tx,source);
  }

  private async receipts(tx:Prisma.TransactionClient,action:string,id:string,bySource:boolean,reads?:InboxReads):Promise<Receipt[]>{
    const cached=reads?.receipts.get(receiptKey(action,id,bySource));
    if(cached)return cached;
    return tx.auditEvent.findMany({where:{resource:'AiAgentTask',action,...(bySource?{metadata:{path:['sourceTaskId'],equals:id}}:{resourceId:id})},select:{resourceId:true,metadata:true,occurredAt:true},take:2});
  }

  // Bound each parent's receipts separately: a duplicate must remain visible and
  // must never consume another parent's allowance. All reads share the original
  // serializable snapshot and the existing verifier still decides every verdict.
  private async loadReceipts(tx:Prisma.TransactionClient,reads:InboxReads,action:string,ids:string[],bySource=false){
    const unique=[...new Set(ids)].filter(id=>!reads.receipts.has(receiptKey(action,id,bySource)));
    if(!unique.length)return;
    const key=bySource?Prisma.sql`"metadata"->>'sourceTaskId'`:Prisma.sql`"resourceId"`;
    const rows=await tx.$queryRaw<(Receipt&{parentId:string})[]>(Prisma.sql`
      SELECT "resourceId","metadata","occurredAt","parentId" FROM (
        SELECT "resourceId","metadata","occurredAt",${key} AS "parentId",
          row_number() OVER (PARTITION BY ${key} ORDER BY "id") AS n
        FROM "AuditEvent" WHERE "resource"='AiAgentTask' AND "action"=${action}
          AND ${key} IN (${Prisma.join(unique)})
          ${bySource?Prisma.sql`AND jsonb_typeof("metadata"->'sourceTaskId')='string'`:Prisma.empty}
      ) receipts WHERE n<=2`);
    for(const id of unique)reads.receipts.set(receiptKey(action,id,bySource),[]);
    for(const row of rows)reads.receipts.get(receiptKey(action,row.parentId,bySource))!.push(row);
  }

  private async loadPage(tx:Prisma.TransactionClient,sources:Task[]):Promise<InboxReads>{
    const reads:InboxReads={receipts:new Map(),tasks:new Map(),originals:new Map()};
    await this.loadReceipts(tx,reads,'GOVERNANCE_DRAFT_CORRECTION_QUEUED',sources.filter(t=>t.fingerprint.startsWith(DRAFT_CORRECTION_PREFIX)).map(t=>t.id));
    const originalIds=sources.flatMap(source=>{
      const links=reads.receipts.get(receiptKey('GOVERNANCE_DRAFT_CORRECTION_QUEUED',source.id));
      const id=metadata(links?.[0]?.metadata??null).sourceTaskId;
      return links?.length===1&&uuid(id)?[id]:[];
    });
    if(originalIds.length){
      const originals=await tx.aiAgentTask.findMany({where:{...this.roots(),id:{in:[...new Set(originalIds)]},fingerprint:{not:{startsWith:DRAFT_CORRECTION_PREFIX}}},select:taskSelect});
      for(const task of originals)reads.originals.set(task.id,task);
    }
    const roots=[...sources,...reads.originals.values()];
    await this.loadReceipts(tx,reads,'GOVERNANCE_DRAFT_CORRECTION_QUEUED',roots.map(t=>t.id),true);
    let frontier=roots;
    const parents=new Set<string>();
    for(let stage=0;stage<GOVERNANCE_REVIEW_ORDER.length&&frontier.length;stage++){
      const ids=[...new Set(frontier.map(t=>t.id))];
      ids.forEach(id=>parents.add(id));
      await this.loadReceipts(tx,reads,'GOVERNANCE_REVIEW_QUEUED',ids,true);
      const children=[...new Set(ids.flatMap(id=>{
        const links=reads.receipts.get(receiptKey('GOVERNANCE_REVIEW_QUEUED',id,true))!;
        return links.length===1&&uuid(links[0].resourceId)?[links[0].resourceId]:[];
      }))];
      frontier=children.length?await tx.aiAgentTask.findMany({where:{id:{in:children}},select:taskSelect}):[];
      for(const task of frontier)reads.tasks.set(task.id,task);
    }
    await this.loadReceipts(tx,reads,'GOVERNANCE_ROUTE_DEFERRED',[...parents]);
    await this.loadReceipts(tx,reads,'GOVERNANCE_FINAL_RECOMMENDATION_READY',[...reads.tasks.keys()]);
    return reads;
  }

  private async readFile(tx:Prisma.TransactionClient,source:Task,reads?:InboxReads){
    const file=await this.buildFile(tx,source,reads);
    if(source.fingerprint.startsWith(DRAFT_CORRECTION_PREFIX)){
      const links=await this.receipts(tx,'GOVERNANCE_DRAFT_CORRECTION_QUEUED',source.id,false,reads);
      const link=metadata(links[0]?.metadata??null);
      const original=links.length===1&&uuid(link.sourceTaskId)?(reads?reads.originals.get(link.sourceTaskId)??null:await tx.aiAgentTask.findFirst({where:{...this.roots(),id:link.sourceTaskId,fingerprint:{not:{startsWith:DRAFT_CORRECTION_PREFIX}}},select:taskSelect})):null;
      // Build only a non-correction root, so a forged cycle cannot recurse.
      const originalFile=original?await this.buildFile(tx,original,reads):null;
      if(originalFile?.status!=='CORRECTION_REQUIRED'||originalFile.draftCorrection?.status!=='LINKED'||originalFile.draftCorrection.taskId!==source.id){file.status='INTEGRITY_REVIEW_REQUIRED';file.reason='DRAFT_CORRECTION_SOURCE_INVALID';file.ownerApprovalRequired=false;}
    }
    return file;
  }

  private async buildFile(tx:Prisma.TransactionClient,source:Task,reads?:InboxReads){
    const descriptors=this.agents.list();
    const departmentCode=AGENT_DEPARTMENTS[source.agentKey as AgentKey];
    const sourceView={id:source.id,revision:source.revision,agentKey:source.agentKey,nameAr:descriptors.find(a=>a.key===source.agentKey)?.nameAr||source.agentKey,departmentCode,departmentName:STAFFING_DEPARTMENTS.find(d=>d.code===departmentCode)?.nameAr||departmentCode,action:source.action,language:source.language,prompt:source.prompt,result:source.result,createdAt:source.createdAt,finishedAt:source.finishedAt,operationsEvidence:await readOperationsEvidence(tx,source)};
    const reviews:GovernanceInboxStage[]=GOVERNANCE_REVIEW_ORDER.map(agentKey=>({agentKey,nameAr:descriptors.find(a=>a.key===agentKey)!.nameAr,state:'NOT_STARTED',taskId:null,revision:null,result:null,review:null,finishedAt:null}));
    const tasks:Task[]=[source];
    let parent=source,status:InboxStatus='NOT_STARTED',reason='REVIEW_NOT_QUEUED',completedReviews=0;
    for(let i=0;i<reviews.length;i++){
      const stage=reviews[i];
      const links=await this.receipts(tx,'GOVERNANCE_REVIEW_QUEUED',parent.id,true,reads);
      if(!links.length){
        const deferred=await this.receipts(tx,'GOVERNANCE_ROUTE_DEFERRED',parent.id,false,reads);
        if(deferred.length===1){status='ROUTE_DEFERRED';reason=String(metadata(deferred[0].metadata).reason||'REVIEW_DEFERRED');}
        else if(deferred.length>1){status='INTEGRITY_REVIEW_REQUIRED';reason='CONFLICTING_ROUTE_RECEIPTS';}
        else if(i>0){status='INTEGRITY_REVIEW_REQUIRED';reason='NEXT_REVIEW_RECEIPT_MISSING';}
        break;
      }
      const link=metadata(links[0].metadata),childId=links[0].resourceId;
      if(links.length!==1||!uuid(childId)||link.sourceRevision!==parent.revision||link.fromAgentKey!==parent.agentKey||link.toAgentKey!==stage.agentKey){status='INTEGRITY_REVIEW_REQUIRED';reason='REVIEW_LINK_CONFLICT';break;}
      const task=reads?reads.tasks.get(childId)??null:await tx.aiAgentTask.findUnique({where:{id:childId},select:taskSelect});
      if(!task||task.agentKey!==stage.agentKey||task.requestedByAccountId!==source.requestedByAccountId||task.language!==source.language||task.action!=='READ_OPERATIONS'){status='INTEGRITY_REVIEW_REQUIRED';reason='REVIEW_TASK_CONFLICT';break;}
      tasks.push(task);
      Object.assign(stage,{state:task.state,taskId:task.id,revision:task.revision,result:task.result,review:task.result?parseGovernanceReview(task.result):null,finishedAt:task.finishedAt});
      if(task.state==='QUEUED'){status='WAITING_FOR_REVIEW';reason='REVIEW_QUEUED';break;}
      if(task.state==='RUNNING'){status='REVIEW_IN_PROGRESS';reason='REVIEW_RUNNING';break;}
      if(task.state!=='COMPLETED'){status='REVIEW_STOPPED';reason='REVIEW_'+task.state;break;}
      const outcome=governanceRouteDecision(stage.review);
      if(outcome!=='CONTINUE'){
        status=outcome==='OWNER_ESCALATION_REQUIRED'?'OWNER_ESCALATION_REQUIRED':outcome==='CORRECTION_REQUIRED'?'CORRECTION_REQUIRED':'EVIDENCE_REQUIRED';reason=outcome;break;
      }
      completedReviews++;
      if(i===reviews.length-1){
        const receipts=await this.receipts(tx,'GOVERNANCE_FINAL_RECOMMENDATION_READY',task.id,false,reads);
        const receipt=receipts.length===1?metadata(receipts[0].metadata):{};
        if(receipt.agentKey!=='GOV_FINAL_GATE'||receipt.requesterAccountId!==source.requestedByAccountId||receipt.sourceTaskId!==source.id||receipt.sourceRevision!==source.revision||receipt.reviewCount!==5||receipt.ownerApprovalRequired!==true||receipt.approved!==false){status='INTEGRITY_REVIEW_REQUIRED';reason='FINAL_RECOMMENDATION_RECEIPT_MISSING';}
        else{status='READY_FOR_OWNER';reason='OWNER_APPROVAL_RESERVED';}
      }
      parent=task;
    }
    if(sourceView.operationsEvidence&&sourceView.operationsEvidence.status!=='RECORDED'&&status!=='OWNER_ESCALATION_REQUIRED'&&status!=='INTEGRITY_REVIEW_REQUIRED'){status='EVIDENCE_REQUIRED';reason='SOURCE_EVIDENCE_UNAVAILABLE';}
    const corrections=await this.receipts(tx,'GOVERNANCE_DRAFT_CORRECTION_QUEUED',source.id,true,reads);
    let draftCorrection:{status:string;taskId?:string;state?:string}|null=null;
    if(corrections.length){
      const link=metadata(corrections[0].metadata),review=tasks.find(t=>t.id===link.reviewTaskId),child=corrections.length===1&&uuid(corrections[0].resourceId)?await tx.aiAgentTask.findUnique({where:{id:corrections[0].resourceId}}):null;
      draftCorrection=child&&review&&source.revision===link.sourceRevision&&review.revision===link.reviewRevision&&review.state==='COMPLETED'&&draftCorrectionRequested(parseGovernanceReview(review.result||''))&&link.policy===DRAFT_CORRECTION_POLICY&&link.maxRounds===1&&await hasDraftCorrectionPermission(tx,source)&&link.agentKey===source.agentKey&&link.requesterAccountId===source.requestedByAccountId&&child.requestKey===correctionRequestId(source.id)&&child.agentKey===source.agentKey&&child.requestedByAccountId===source.requestedByAccountId&&child.action===source.action&&child.language===source.language&&child.prompt===source.prompt&&child.fingerprint===correctionFingerprint(source,review)?{status:'LINKED',taskId:child.id,state:child.state}:{status:'INTEGRITY_REVIEW_REQUIRED'};
    }
    const unknownAttempts=tasks.reduce((n,t)=>n+(t.attemptCount>0?t.unknownCostAttempts:t.dispatchedAt&&t.estimatedCostMicroUsd===null?1:0),0),knownEstimatedMicroUsd=tasks.reduce((n,t)=>n+(t.estimatedCostMicroUsd||0),0);
    return{source:sourceView,reviews,status,reason,completedReviews,stageCount:6,cost:{currency:'USD',taskCount:tasks.length,attemptCount:tasks.reduce((n,t)=>n+t.attemptCount,0),unknownAttempts,reservedMicroUsd:tasks.reduce((n,t)=>n+t.reservedCostMicroUsd,0),knownEstimatedMicroUsd,estimatedMicroUsd:unknownAttempts===0&&tasks.every(t=>t.estimatedCostMicroUsd!==null)?knownEstimatedMicroUsd:null},draftCorrection,ownerApprovalRequired:status==='READY_FOR_OWNER'||status==='OWNER_ESCALATION_REQUIRED',approved:false,readOnly:true,scope:'ADVISORY_RUNTIME_OUTPUTS'};
  }
}

export interface GovernanceInboxStage {
  agentKey:typeof GOVERNANCE_REVIEW_ORDER[number];nameAr:string;state:string;taskId:string|null;revision:string|null;
  result:string|null;review:ReturnType<typeof parseGovernanceReview>;finishedAt:Date|null;
}
