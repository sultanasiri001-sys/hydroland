import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AdminService } from '../admin/admin.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { boundedNote, reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { templateObject } from '../document-forms/document-template-input';
import { requestDigest, technologyExpiry, technologyId } from './technology-request.domain';

type Tx=Prisma.TransactionClient;
type Platform=Awaited<ReturnType<typeof reviewPlatform>>;
type Source={id:string;version:number;hash:string;reference:string};
type Case={id:string;organizationId:string;ownerId:string;authority:string;revision:number;state:'PROPOSED'|'EXECUTED'|'VERIFIED'|'TEST_FAILED'|'ROLLED_BACK'|'CLOSED'|'REVOKED';targetId:string;targetLabel:string;targetRevision:string;previousStatus:'ACTIVE'|'SUSPENDED';status:'ACTIVE'|'SUSPENDED';source:Source;taskId:string;taskDigest:string;recommendation:string;expiresAt:string;reason:string;createdAt:string;nativeAuditId:string|null;verification:Source|null;digest:string};
const prefix='TECHNOLOGY_AGENT_ACCESS:v1:';
const encode=(x:unknown)=>JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
const seal=(row:Case)=>{const{digest:_ignored,...body}=row;return{...row,digest:requestDigest(body)};};

/** Bounded D02 adapter. The agent supplies advice, never executable commands. */
@Injectable()
export class TechnologyAgentAccessService {
  constructor(private readonly db:DatabaseService,private readonly admin:AdminService){}
  private key(org:string,id:string){return prefix+org+':'+id;}
  private authority(p:Platform){return requestDigest({id:p.id,ownerId:p.ownerId,ownerPersonId:p.ownerPersonId,updatedAt:p.updatedAt.toISOString(),platformRevision:p.platformRevision,ownerMemberRevision:p.ownerMemberRevision,ownerAuthorityRevision:p.ownerAuthorityRevision,ownerStatusRevision:p.ownerStatusRevision,ownerVerifiedAt:p.ownerVerifiedAt});}
  private async owner(tx:Tx,actor:string){const p=await reviewPlatform(tx);if(p.ownerId!==actor)throw new ForbiddenException('هذه العملية لمالك المنصة المتحقق.');return p;}
  private async locked(tx:Tx,actor:string,target?:string){
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('hydroland.admin.account-status')::bigint)`;
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,[actor,...(target?[target]:[])]);return this.owner(tx,actor);
  }
  private async source(tx:Tx,p:Platform,id:string){
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${id} FOR SHARE`;
    const{d,sourceHash}=await reviewSource(tx,p.id,id);
    await tx.$queryRaw`SELECT "id" FROM "DocumentTemplate" WHERE "id"::text=${d.templateId} FOR SHARE`;
    if(d.department!=='TECHNOLOGY_CYBERSECURITY'||d.status==='ARCHIVED')throw new ConflictException('مصدر الطلب غير متاح في إدارة التقنية.');
    return{d,pin:{id:d.id,version:d.version,hash:sourceHash,reference:d.referenceNumber}};
  }
  private async task(tx:Tx,p:Platform,id:string,reference:string){
    await tx.$queryRaw`SELECT "id" FROM "AiAgentTask" WHERE "id"::text=${id} FOR SHARE`;
    const t=await tx.aiAgentTask.findUnique({where:{id}});
    if(!t||t.agentKey!=='CYBER_SECURITY'||t.action!=='DRAFT_REPORT'||t.requestedByAccountId!==p.ownerId||t.state!=='COMPLETED'||!t.result||!t.claimId||!t.prompt.includes(reference))throw new ConflictException('يلزم مخرج مكتمل من وكيل الأمن السيبراني مرتبط بمرجع الطلب.');
    const receipt=await tx.auditEvent.findFirst({where:{resource:'AiAgentTask',resourceId:id,action:'AI_TASK_COMPLETED',metadata:{path:['claimId'],equals:t.claimId}}});
    const attempt=await tx.aiAgentTaskAttempt.findFirst({where:{taskId:id,claimId:t.claimId,state:'COMPLETED'}});
    if(!receipt||!attempt)throw new ConflictException('لا يوجد أثر تنفيذ أصلي مكتمل لتوصية الوكيل.');
    return{digest:requestDigest({id:t.id,revision:t.revision,result:t.result,claim:t.claimId,receipt:receipt.id,attempt:attempt.id}),result:t.result};
  }
  private read(value:unknown){const r=value as Case;if(!r||r.digest!==seal(r).digest)throw new ConflictException('سجل الطلب لا يطابق بصمته.');return r;}
  private async load(tx:Tx,p:Platform,id:string){const saved=await tx.operationalSetting.findUnique({where:{key:this.key(p.id,id)}});if(!saved)throw new NotFoundException('الطلب غير متاح.');const r=this.read(saved.value);if(r.organizationId!==p.id||r.id!==id||r.ownerId!==p.ownerId)throw new ConflictException('تغير نطاق الطلب.');const history=await tx.operationalSetting.findUnique({where:{key:`${this.key(p.id,id)}:history:${String(r.revision).padStart(7,'0')}`}});if(!history||requestDigest(history.value)!==requestDigest(r))throw new ConflictException('سجل الطلب لا يطابق تاريخ نسخته.');return r;}
  private async scope(tx:Tx,p:Platform,r:Case){
    if(r.authority!==this.authority(p)||Date.parse(r.expiresAt)<=Date.now())throw new ConflictException('انتهى نطاق الموافقة أو تغير صاحب الصلاحية.');
    const source=await this.source(tx,p,r.source.id);
    if(requestDigest(source.pin)!==requestDigest(r.source))throw new ConflictException('تغير مستند الطلب.');
    const task=await this.task(tx,p,r.taskId,r.source.reference);if(task.digest!==r.taskDigest)throw new ConflictException('تغير مخرج الوكيل.');
    const member=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:p.id,accountId:r.targetId}}});
    if(!member||member.status!=='ACTIVE'||r.targetId===p.ownerId)throw new ConflictException('الحساب المستهدف خارج النطاق المعتمد.');
  }
  private async save(tx:Tx,p:Platform,r:Case,action:string){
    const sealed=seal(r);await tx.operationalSetting.upsert({where:{key:this.key(p.id,r.id)},create:{key:this.key(p.id,r.id),value:encode(sealed)},update:{value:encode(sealed)}});
    await tx.operationalSetting.create({data:{key:`${this.key(p.id,r.id)}:history:${String(r.revision).padStart(7,'0')}`,value:encode(sealed)}});
    await tx.auditEvent.create({data:{actorId:p.ownerPersonId,action:'TECHNOLOGY_AGENT_ACCESS_'+action,resource:'TechnologyAgentAccess',resourceId:r.id,metadata:encode({organizationId:p.id,revision:r.revision,digest:sealed.digest,executor:'DETERMINISTIC_SYSTEM',approvedByAccountId:p.ownerId,agentKey:'CYBER_SECURITY',taskId:r.taskId,nativeAuditId:r.nativeAuditId})}});return sealed;
  }
  async references(actor:string){return this.db.serializable(async tx=>{const p=await this.owner(tx,actor);const documents=await tx.managedDocument.findMany({where:{organizationId:p.id,department:'TECHNOLOGY_CYBERSECURITY',template:{code:'TEC-ACCESS-REQUEST'},status:{not:'ARCHIVED'},payload:{path:['system'],equals:'PLATFORM_ACCOUNT'}},orderBy:{updatedAt:'desc'},take:50,select:{id:true,referenceNumber:true,payload:true}});const tasks=await tx.aiAgentTask.findMany({where:{requestedByAccountId:actor,agentKey:'CYBER_SECURITY',action:'DRAFT_REPORT',state:'COMPLETED',result:{not:null}},orderBy:{createdAt:'desc'},take:50,select:{id:true,prompt:true,createdAt:true}});const proofs=await tx.managedDocument.findMany({where:{organizationId:p.id,department:'TECHNOLOGY_CYBERSECURITY',template:{code:{in:['TEC-ACCESS-REVOCATION','TEC-ACCESS-MATRIX']}},status:{in:['APPROVED','SIGNED']},approvedByAccountId:actor},orderBy:{updatedAt:'desc'},take:50,select:{id:true,referenceNumber:true,payload:true}});return{proofs:proofs.map(d=>({id:d.id,label:d.referenceNumber,reference:(d.payload as Record<string,unknown>).hrDecisionRef||(d.payload as Record<string,unknown>).authorityRef})),documents:documents.map(d=>({id:d.id,label:d.referenceNumber,action:(d.payload as Record<string,unknown>).accessLevel})),tasks:tasks.map(t=>({id:t.id,label:t.createdAt.toISOString()+' · '+t.prompt.slice(0,120)})),limit:50};});}
  async list(actor:string){return this.db.serializable(async tx=>{const p=await this.owner(tx,actor);const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:prefix+p.id+':'},NOT:{key:{contains:':history:'}}},orderBy:{updatedAt:'desc'},take:50});return{items:rows.map(x=>this.read(x.value)),limit:50};});}
  async propose(actor:string,body:unknown){
    const x=templateObject(body,['requestId','documentId','taskId','expiresAt','reason']),id=technologyId(x.requestId),documentId=technologyId(x.documentId),taskId=technologyId(x.taskId),expiresAt=technologyExpiry(x.expiresAt),reason=boundedNote(x.reason);
    return this.db.serializable(async tx=>{
      const p=await this.locked(tx,actor),existing=await tx.operationalSetting.findUnique({where:{key:this.key(p.id,id)}});
      if(existing){const r=this.read(existing.value);if(r.source.id!==documentId||r.taskId!==taskId||r.expiresAt!==expiresAt||r.reason!==reason)throw new ConflictException('مرجع الطلب مستخدم لمحتوى مختلف.');return r;}
      const source=await this.source(tx,p,documentId),payload=source.d.payload as Record<string,unknown>;
      if(source.d.template.code!=='TEC-ACCESS-REQUEST'||payload.system!=='PLATFORM_ACCOUNT'||!['SUSPEND','REACTIVATE'].includes(String(payload.accessLevel)))throw new BadRequestException('المعالج يدعم تعليق حساب المنصة وإعادة تفعيله فقط.');
      const targetId=technologyId(payload.accountId);await lockAccountIdentities(tx,[actor,targetId]);
      const target=await tx.account.findUniqueOrThrow({where:{id:targetId}});
      if(!['ACTIVE','SUSPENDED'].includes(target.status)||!target.emailVerifiedAt)throw new ConflictException('حالة الحساب لا تسمح بالإجراء.');
      const task=await this.task(tx,p,taskId,source.pin.reference),row:Case={id,organizationId:p.id,ownerId:p.ownerId,authority:this.authority(p),revision:1,state:'PROPOSED',targetId,targetLabel:target.email,targetRevision:target.updatedAt.toISOString(),previousStatus:target.status as Case['previousStatus'],status:payload.accessLevel==='SUSPEND'?'SUSPENDED':'ACTIVE',source:source.pin,taskId,taskDigest:task.digest,recommendation:task.result,expiresAt,reason,createdAt:new Date().toISOString(),nativeAuditId:null,verification:null,digest:''};
      if(row.status===row.previousStatus)throw new ConflictException('الحساب في الحالة المطلوبة بالفعل.');await this.scope(tx,p,row);
      const binding=`TECHNOLOGY_AGENT_ACCESS_SOURCE:v1:${p.id}:${source.pin.id}:${source.pin.version}`;
      if(await tx.operationalSetting.findUnique({where:{key:binding}}))throw new ConflictException('إصدار المستند مرتبط بطلب سابق.');
      await tx.operationalSetting.create({data:{key:binding,value:encode({requestId:id})}});return this.save(tx,p,row,'PROPOSED');
    });
  }
  async decide(actor:string,id:string,action:string,body:unknown){
    technologyId(id);const x=templateObject(body,['expectedRevision','confirmed','reason',...(action==='VERIFY'?['documentId']:[])]),reason=boundedNote(x.reason);
    if(x.confirmed!==true||!Number.isSafeInteger(x.expectedRevision)||!['APPROVE_EXECUTE','VERIFY','FAIL_TEST','ROLLBACK','CLOSE','REVOKE'].includes(action))throw new BadRequestException('يلزم تأكيد الإجراء والإصدار الحالي.');
    return this.db.serializable(async tx=>{
      const initial=await this.owner(tx,actor),before=await this.load(tx,initial,id),p=await this.locked(tx,actor,before.targetId);
      await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"=${this.key(p.id,id)} FOR UPDATE`;
      const r=await this.load(tx,p,id);if(r.revision!==x.expectedRevision)throw new ConflictException('تغير إصدار الطلب.');
      if(['CLOSED','REVOKED'].includes(r.state))throw new ConflictException('الطلب نهائي.');
      if(action!=='REVOKE')await this.scope(tx,p,r);
      const target=await tx.account.findUniqueOrThrow({where:{id:r.targetId}});
      if(action==='APPROVE_EXECUTE'||action==='ROLLBACK'){
        if(action==='APPROVE_EXECUTE'?r.state!=='PROPOSED':!['TEST_FAILED','EXECUTED','VERIFIED'].includes(r.state))throw new ConflictException('حالة الطلب لا تسمح بالتنفيذ.');
        if(target.updatedAt.toISOString()!==r.targetRevision)throw new ConflictException('تغير الحساب المستهدف منذ مراجعة الطلب.');
        const desired=action==='ROLLBACK'?r.previousStatus:r.status;
        const result=await this.admin.setAccountStatusInTransaction(tx,actor,r.targetId,desired,reason,r.targetRevision,true);
        if(!result.sessionsRevoked)throw new ConflictException('لم يثبت تنفيذ تغيير الوصول.');
        r.nativeAuditId=result.nativeAuditId!;r.targetRevision=result.updatedAt.toISOString();r.state=action==='ROLLBACK'?'ROLLED_BACK':'EXECUTED';r.verification=null;
      }else if(action==='VERIFY'){
        if(!['EXECUTED','ROLLED_BACK'].includes(r.state))throw new ConflictException('يلزم تنفيذ مثبت قبل التحقق.');
        const proof=await this.source(tx,p,technologyId(x.documentId));
        const template=r.state==='ROLLED_BACK'?(r.previousStatus==='SUSPENDED'?'TEC-ACCESS-REVOCATION':'TEC-ACCESS-MATRIX'):(r.status==='SUSPENDED'?'TEC-ACCESS-REVOCATION':'TEC-ACCESS-MATRIX');
        const payload=proof.d.payload as Record<string,unknown>;
        if(proof.d.id===r.source.id||proof.d.template.code!==template||!['APPROVED','SIGNED'].includes(proof.d.status)||proof.d.approvedByAccountId!==p.ownerId||payload[template==='TEC-ACCESS-REVOCATION'?'hrDecisionRef':'authorityRef']!==r.source.reference)throw new ConflictException('يلزم محضر تحقق معتمد مرتبط بالطلب.');
        if(target.updatedAt.toISOString()!==r.targetRevision)throw new ConflictException('تغير الوصول قبل التحقق.');
        const sessions=await tx.session.count({where:{accountId:r.targetId,revokedAt:null,createdAt:{lte:target.updatedAt}}});if(sessions)throw new ConflictException('لا تزال جلسات سابقة فعالة.');
        r.verification=proof.pin;r.state='VERIFIED';
      }else if(action==='FAIL_TEST'){
        if(!['EXECUTED','ROLLED_BACK'].includes(r.state))throw new ConflictException('لا توجد نتيجة تنفيذ لاختبارها.');r.state='TEST_FAILED';r.verification=null;
      }else if(action==='CLOSE'){
        if(r.state!=='VERIFIED'||!r.verification||target.updatedAt.toISOString()!==r.targetRevision)throw new ConflictException('يلزم تحقق ثابت قبل الإقفال.');
        const proof=await this.source(tx,p,r.verification.id);if(requestDigest(proof.pin)!==requestDigest(r.verification)||!['APPROVED','SIGNED'].includes(proof.d.status)||proof.d.approvedByAccountId!==p.ownerId)throw new ConflictException('تغير محضر التحقق.');r.state='CLOSED';
      }else r.state='REVOKED';
      r.reason=reason;r.revision++;return this.save(tx,p,r,action);
    });
  }
}
