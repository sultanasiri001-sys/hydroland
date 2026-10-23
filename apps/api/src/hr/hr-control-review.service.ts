import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { ControlProposal, HR_CONTROL_PREFIX, controlInput, exact, object, proposal, requestKey, reviewReason, revision, uuid } from './hr-control-review.domain';

@Injectable()
export class HrControlReviewService {
 constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}
 private async lock(tx:Prisma.TransactionClient,ids:string[]){
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.hr-control-review')::bigint)`;
  await tx.$queryRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('HR_CONTROL_WRITE_SERIALIZATION:v1','{"version":1}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp() RETURNING "key"`;
  const participants=[...new Set(ids)].sort();
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Account" WHERE "id"::text IN (${Prisma.join(participants)}) ORDER BY "id" FOR UPDATE`);
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text IN (${Prisma.join(participants)}) AND "role"='ADMIN' ORDER BY "id" FOR UPDATE`);
 }
 private view(p:ControlProposal,actorId:string){return {id:p.id,control:p.control,baseRevision:p.baseRevision,requestedAt:p.requestedAt,reason:p.reason,status:p.status,revision:p.revision,reviewReason:p.reviewReason||null,decisionReason:p.decisionReason||null,canReview:p.status==='PROPOSED'&&actorId!==p.requestedByAccountId,canApprove:p.status==='REVIEWED'&&![p.requestedByAccountId,p.reviewedByAccountId].includes(actorId),canReject:['PROPOSED','REVIEWED'].includes(p.status)&&actorId!==p.requestedByAccountId};}
 async list(actorId:string,cursor?:unknown){
  if(cursor!==undefined&&!uuid(cursor))throw new BadRequestException('صفحة طلبات الضوابط غير صالحة.');
  return this.db.serializable(async tx=>{
   await requireVerifiedAdmin(tx,actorId);
   const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:HR_CONTROL_PREFIX}},orderBy:[{updatedAt:'desc'},{key:'desc'}],take:21,...(cursor?{cursor:{key:requestKey(cursor as string)},skip:1}:{})});
   const controls=await tx.policyControl.findMany({where:{category:'HR_COMPLIANCE'},select:{ruleKey:true,labelAr:true,state:true,updatedAt:true,metadata:true},orderBy:{ruleKey:'asc'},take:200});
   return {observedAt:new Date().toISOString(),controls:controls.map(c=>{const m=object(c.metadata);return {ruleKey:c.ruleKey,labelAr:c.labelAr,state:c.state,revision:c.updatedAt.toISOString(),regulatoryRequirementId:typeof m.regulatoryRequirementId==='string'?m.regulatoryRequirementId:null,regulatoryVersion:typeof m.regulatoryVersion==='string'?m.regulatoryVersion:null,validationStatus:typeof m.validationStatus==='string'?m.validationStatus:null};}),items:rows.slice(0,20).map(r=>this.view(proposal(r.value),actorId)),nextCursor:rows.length>20?proposal(rows[19].value).id:null};
  });
 }
 async request(actorId:string,body:unknown){
  const x=exact(body,['requestId','control','baseRevision','reason','reviewed']),reason=reviewReason(x),control=controlInput(x.control);
  if(!uuid(x.requestId)||x.baseRevision!==null&&!revision(x.baseRevision))throw new BadRequestException('معرّف الطلب أو نسخة الضابط غير صالحين.');
  const id=x.requestId,baseRevision=x.baseRevision as string|null,fingerprint=createHash('sha256').update(JSON.stringify({actorId,control,baseRevision,reason})).digest('hex');
  return this.db.serializable(async tx=>{
   await this.lock(tx,[actorId]);const actor=await requireVerifiedAdmin(tx,actorId);
   const prior=await tx.operationalSetting.findUnique({where:{key:requestKey(id)}});
   if(prior){const p=proposal(prior.value);if(p.fingerprint!==fingerprint||p.requestedByAccountId!==actorId)throw new ConflictException('معرّف الطلب مستخدم ببيانات أخرى.');return this.view(p,actorId);}
   const current=await tx.policyControl.findUnique({where:{category_ruleKey:{category:'HR_COMPLIANCE',ruleKey:control.ruleKey}}});
   if((current?.updatedAt.toISOString()??null)!==baseRevision)throw new ConflictException('تغير الضابط؛ حدّث البيانات وراجع المرجع والنسخة.');
   const p:ControlProposal={version:1,id,fingerprint,control,baseRevision,requestedByAccountId:actorId,requestedAt:new Date().toISOString(),reason,status:'PROPOSED',revision:randomUUID()};
   await tx.operationalSetting.create({data:{key:requestKey(id),value:p as unknown as Prisma.InputJsonValue}});
   await this.audit.record({actorId:actor.personId,action:'HR_CONTROL_PROPOSED',resource:'PolicyControl',resourceId:control.ruleKey,metadata:{requestId:id,control,baseRevision,reason,fromStatus:null,toStatus:'PROPOSED',activated:false}},tx);
   return this.view(p,actorId);
  });
 }
 async decide(actorId:string,id:string,body:unknown){
  const x=exact(body,['action','expectedRevision','reason','reviewed']),reason=reviewReason(x);
  if(!uuid(id)||!uuid(x.expectedRevision)||!['REVIEW','APPROVE','REJECT'].includes(String(x.action)))throw new BadRequestException('إجراء طلب الضابط غير صالح.');
  return this.db.serializable(async tx=>{
   // Read-only authorization precedes loading private proposal data. The write
   // boundary then locks all participating identities in the shared order.
   await requireVerifiedAdmin(tx,actorId);
   const stored=await tx.operationalSetting.findUnique({where:{key:requestKey(id)}});if(!stored)throw new NotFoundException('طلب الضابط غير موجود.');
   const p=proposal(stored.value);await this.lock(tx,[actorId,p.requestedByAccountId,...(p.reviewedByAccountId?[p.reviewedByAccountId]:[])]);
   const actor=await requireVerifiedAdmin(tx,actorId);
   if(p.revision!==x.expectedRevision||!['PROPOSED','REVIEWED'].includes(p.status))throw new ConflictException('تغير طلب الضابط؛ حدّث البيانات وراجع القرار.');
   if(actorId===p.requestedByAccountId)throw new ForbiddenException('يلزم مراجع ومعتمد مستقلان عن مقدم الطلب.');
   const now=new Date().toISOString(),next={...p,revision:randomUUID()};let previousControl:object|null=null;
   if(x.action==='REVIEW'){
    if(p.status!=='PROPOSED')throw new ConflictException('الطلب ليس بانتظار المراجعة.');
    await requireVerifiedAdmin(tx,p.requestedByAccountId);
    Object.assign(next,{status:'REVIEWED',reviewedByAccountId:actorId,reviewedAt:now,reviewReason:reason});
   }else if(x.action==='APPROVE'){
    if(p.status!=='REVIEWED'||!p.reviewedByAccountId)throw new ConflictException('أكمل مراجعة الضابط أولًا.');
    if(actorId===p.reviewedByAccountId)throw new ForbiddenException('يلزم اعتماد مستقل عن المراجع.');
    await requireVerifiedAdmin(tx,p.requestedByAccountId);await requireVerifiedAdmin(tx,p.reviewedByAccountId);
    const current=await tx.policyControl.findUnique({where:{category_ruleKey:{category:'HR_COMPLIANCE',ruleKey:p.control.ruleKey}}});
    if((current?.updatedAt.toISOString()??null)!==p.baseRevision)throw new ConflictException('تغير الضابط منذ تقديم الطلب؛ يلزم طلب جديد بالنسخة الحالية.');
    previousControl=current?{ruleKey:current.ruleKey,labelAr:current.labelAr,state:current.state,revision:current.updatedAt.toISOString(),metadata:current.metadata}:null;
    const metadata={mandatory:true,applicable:true,regulatoryRequirementId:p.control.regulatoryRequirementId,regulatoryVersion:p.control.regulatoryVersion,evidenceIds:p.control.evidenceIds,legalApprovalReference:p.control.legalApprovalReference,validationStatus:'VALID',blockingFinding:false,approval:{requestId:id,requestedByAccountId:p.requestedByAccountId,reviewedByAccountId:p.reviewedByAccountId,approvedByAccountId:actorId,requestedAt:p.requestedAt,reviewedAt:p.reviewedAt,approvedAt:now}};
    await tx.policyControl.upsert({where:{category_ruleKey:{category:'HR_COMPLIANCE',ruleKey:p.control.ruleKey}},create:{category:'HR_COMPLIANCE',ruleKey:p.control.ruleKey,labelAr:p.control.labelAr,state:'ENABLED',metadata,updatedByAccountId:actorId},update:{labelAr:p.control.labelAr,state:'ENABLED',metadata,updatedByAccountId:actorId,updatedAt:new Date(Math.max(Date.now(),(current?.updatedAt.getTime()||0)+1))}});
    Object.assign(next,{status:'APPLIED',decidedByAccountId:actorId,decidedAt:now,decisionReason:reason});
   }else Object.assign(next,{status:'REJECTED',decidedByAccountId:actorId,decidedAt:now,decisionReason:reason});
   await tx.operationalSetting.update({where:{key:requestKey(id)},data:{value:next as unknown as Prisma.InputJsonValue}});
   await this.audit.record({actorId:actor.personId,action:x.action==='REVIEW'?'HR_CONTROL_REVIEWED':x.action==='APPROVE'?'HR_CONTROL_APPLIED':'HR_CONTROL_REJECTED',resource:'PolicyControl',resourceId:p.control.ruleKey,metadata:{requestId:id,reason,previousStatus:p.status,status:next.status,control:p.control,baseRevision:p.baseRevision,previousControl,activated:x.action==='APPROVE'}},tx);
   return this.view(next,actorId);
  });
 }
}
