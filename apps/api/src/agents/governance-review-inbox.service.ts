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

const taskSelect={id:true,agentKey:true,requestedByAccountId:true,revision:true,action:true,language:true,prompt:true,result:true,state:true,createdAt:true,startedAt:true,finishedAt:true,claimId:true,reservedCostMicroUsd:true,estimatedCostMicroUsd:true} as const;
type Task=Prisma.AiAgentTaskGetPayload<{select:typeof taskSelect}>;
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
      const items=[];
      for(const source of sources.slice(0,20)){const file=await this.readFile(tx,source);items.push({source:{id:file.source.id,revision:file.source.revision,agentKey:file.source.agentKey,nameAr:file.source.nameAr,departmentCode:file.source.departmentCode,departmentName:file.source.departmentName,createdAt:file.source.createdAt},status:file.status,reason:file.reason,completedReviews:file.completedReviews,stageCount:6,cost:file.cost,ownerApprovalRequired:file.ownerApprovalRequired,approved:false});}
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

  private async readFile(tx:Prisma.TransactionClient,source:Task){
    const descriptors=this.agents.list();
    const departmentCode=AGENT_DEPARTMENTS[source.agentKey as AgentKey];
    const sourceView={id:source.id,revision:source.revision,agentKey:source.agentKey,nameAr:descriptors.find(a=>a.key===source.agentKey)?.nameAr||source.agentKey,departmentCode,departmentName:STAFFING_DEPARTMENTS.find(d=>d.code===departmentCode)?.nameAr||departmentCode,action:source.action,language:source.language,prompt:source.prompt,result:source.result,createdAt:source.createdAt,finishedAt:source.finishedAt,operationsEvidence:await readOperationsEvidence(tx,source)};
    const reviews:GovernanceInboxStage[]=GOVERNANCE_REVIEW_ORDER.map(agentKey=>({agentKey,nameAr:descriptors.find(a=>a.key===agentKey)!.nameAr,state:'NOT_STARTED',taskId:null,revision:null,result:null,review:null,finishedAt:null}));
    const tasks:Task[]=[source];
    let parent=source,status:InboxStatus='NOT_STARTED',reason='REVIEW_NOT_QUEUED',completedReviews=0;
    for(let i=0;i<reviews.length;i++){
      const stage=reviews[i];
      const links=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',action:'GOVERNANCE_REVIEW_QUEUED',metadata:{path:['sourceTaskId'],equals:parent.id}},select:{resourceId:true,metadata:true},take:2});
      if(!links.length){
        const deferred=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:parent.id,action:'GOVERNANCE_ROUTE_DEFERRED'},select:{metadata:true},take:2});
        if(deferred.length===1){status='ROUTE_DEFERRED';reason=String(metadata(deferred[0].metadata).reason||'REVIEW_DEFERRED');}
        else if(deferred.length>1){status='INTEGRITY_REVIEW_REQUIRED';reason='CONFLICTING_ROUTE_RECEIPTS';}
        else if(i>0){status='INTEGRITY_REVIEW_REQUIRED';reason='NEXT_REVIEW_RECEIPT_MISSING';}
        break;
      }
      const link=metadata(links[0].metadata),childId=links[0].resourceId;
      if(links.length!==1||!uuid(childId)||link.sourceRevision!==parent.revision||link.fromAgentKey!==parent.agentKey||link.toAgentKey!==stage.agentKey){status='INTEGRITY_REVIEW_REQUIRED';reason='REVIEW_LINK_CONFLICT';break;}
      const task=await tx.aiAgentTask.findUnique({where:{id:childId},select:taskSelect});
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
        const receipts=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:task.id,action:'GOVERNANCE_FINAL_RECOMMENDATION_READY'},select:{metadata:true,occurredAt:true},take:2});
        const receipt=receipts.length===1?metadata(receipts[0].metadata):{};
        if(receipt.agentKey!=='GOV_FINAL_GATE'||receipt.requesterAccountId!==source.requestedByAccountId||receipt.sourceTaskId!==source.id||receipt.sourceRevision!==source.revision||receipt.reviewCount!==5||receipt.ownerApprovalRequired!==true||receipt.approved!==false){status='INTEGRITY_REVIEW_REQUIRED';reason='FINAL_RECOMMENDATION_RECEIPT_MISSING';}
        else{status='READY_FOR_OWNER';reason='OWNER_APPROVAL_RESERVED';}
      }
      parent=task;
    }
    if(sourceView.operationsEvidence&&sourceView.operationsEvidence.status!=='RECORDED'&&status!=='OWNER_ESCALATION_REQUIRED'&&status!=='INTEGRITY_REVIEW_REQUIRED'){status='EVIDENCE_REQUIRED';reason='SOURCE_EVIDENCE_UNAVAILABLE';}
    return{source:sourceView,reviews,status,reason,completedReviews,stageCount:6,cost:{currency:'USD',taskCount:tasks.length,reservedMicroUsd:tasks.reduce((n,t)=>n+t.reservedCostMicroUsd,0),estimatedMicroUsd:tasks.every(t=>t.estimatedCostMicroUsd!==null)?tasks.reduce((n,t)=>n+t.estimatedCostMicroUsd!,0):null},ownerApprovalRequired:status==='READY_FOR_OWNER'||status==='OWNER_ESCALATION_REQUIRED',approved:false,readOnly:true,scope:'ADVISORY_RUNTIME_OUTPUTS'};
  }
}

export interface GovernanceInboxStage {
  agentKey:typeof GOVERNANCE_REVIEW_ORDER[number];nameAr:string;state:string;taskId:string|null;revision:string|null;
  result:string|null;review:ReturnType<typeof parseGovernanceReview>;finishedAt:Date|null;
}
