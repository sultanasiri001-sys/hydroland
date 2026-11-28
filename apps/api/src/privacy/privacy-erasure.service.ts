import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { platformOrganization } from '../hr/staffing-catalog';
import { applyNativeErasure, Disposition, ErasureDomain, ErasureSubject, inspectNativeRecord, lockPrivacyRecord, NativePlan } from './record-disposition';
import { erasureDigest, PrivateErasureJournal } from './erasure-journal';
import { approvedRetentionActivation, parsePin, readDisposition, SourcePin } from './retention-source';
import { reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { PrivacyRecoveryService } from './privacy-recovery.service';

type Tx=Prisma.TransactionClient;
export type ErasureIntent={version:1;id:string;requestId:string|null;actorId:string|null;createdAt:string;plan:NativePlan;disposition:Disposition;source:SourcePin|null;activation:SourcePin|null};
type Operation={id:string;requestId:string|null;accountId:string;domain:string;recordRef:string;scope:string;state:string;intent:unknown;intentHash:string;receipt:unknown;receiptHash:string|null;executionAuditId:string|null};
const plain=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
function id(value:unknown):string {if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))throw new BadRequestException('مرجع المحاولة غير صالح.');return value.toLowerCase();}
const note=(x:unknown):string=>{if(typeof x!=='string'||x.trim().length<5||x.length>1000)throw new BadRequestException('أدخل سببًا واضحًا.');return x.trim();};
const privatePolicy:Disposition={recordClass:'PRIVATE_MEMBER_CONVERSATION',accountClosureAt:null,commercialPeriodEnd:null,taxPeriodEnd:null,additionalRetainUntil:null,settlementsComplete:true,holdsReviewed:true,holdReviewReference:'APPROVED_PRIVATE_WITHDRAWAL_POLICY_20261121'};

@Injectable()
export class PrivacyErasureService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly journal:PrivateErasureJournal,private readonly recovery:PrivacyRecoveryService){}

  /** The same native center/department authority as the decision workflow. A
   * subject or the first decision maker cannot review their own appeal. */
  private async caseScope(tx:Tx,actorId:string,caseId:string,allowClosedHoldReview=false) {
    const actor=await tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true,personId:true,roleAssignments:{where:{status:'ACTIVE'},select:{role:true}}}});
    if(!actor)throw new ForbiddenException();
    const c=await tx.privacyGrievance.findUnique({where:{id:caseId},include:{personalDataRequest:true,customer:{select:{personId:true}},organization:{select:{ownerId:true,status:true,kind:true,owner:{select:{status:true,emailVerifiedAt:true}}}}}});
    if(!c?.personalDataRequest||c.personalDataRequest.kind!=='ERASURE'||c.organization.status!=='ACTIVE'||c.organization.kind!=='DIVE_CENTER')throw new NotFoundException();
    if(c.customer.personId===actor.personId||c.appealedAt&&c.decisionPersonId===actor.personId)throw new ForbiddenException('يلزم مراجع مستقل.');
    const center= c.organization.owner.status==='ACTIVE'&&!!c.organization.owner.emailVerifiedAt&&(c.organization.ownerId===actorId||!!await tx.organizationMember.count({where:{organizationId:c.organizationId,accountId:actorId,status:'ACTIVE',role:{in:['OWNER','ADMIN']}}}));
    let department=false;
    if(actor.roleAssignments.some(r=>r.role==='STAFF')) {
      const platform=await platformOrganization(tx),now=new Date();
      department=!!platform&&!!await tx.employment.count({where:{accountId:actorId,organizationId:platform.id,status:'ACTIVE',orgUnit:{organizationId:platform.id,code:c.departmentCode,type:'DEPARTMENT',active:true},
        organization:{members:{some:{accountId:actorId,status:'ACTIVE'}}},AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{endsAt:null},{endsAt:{gt:now}}]}]}});
    }
    const canCenter=center&&(c.state==='CENTER_HANDLING'||c.state==='CENTER_PENDING'&&c.dueAt>new Date()||allowClosedHoldReview&&c.state==='RESOLVED'&&!c.escalatedAt);
    const canDepartment=department&&(c.state==='DEPARTMENT_PENDING'||allowClosedHoldReview&&c.state==='RESOLVED')&&!!c.escalatedAt;
    if(!canCenter&&!canDepartment)throw new ForbiddenException('لا توجد صلاحية معالجة لهذه الحالة في مرحلتها الحالية.');
    const request=c.personalDataRequest;
    if(!['ACCOUNT','BOOKINGS','PAYMENTS','SENT_MESSAGES'].includes(request.domain)||request.accountId!==c.customerId||request.routingCenterId!==c.organizationId)throw new ConflictException('نطاق الطلب غير متسق.');
    const subject:ErasureSubject={accountId:request.accountId,domain:request.domain as ErasureDomain,recordRef:request.domain==='ACCOUNT'?request.accountId:request.recordRef??'',centerId:c.organizationId};
    if(!subject.recordRef)throw new ConflictException('يحتاج المحو مرجع سجل محددًا.');
    return {actor,request,subject,c};
  }

  async preview(actor:string,caseId:string,body:unknown) {
    const d=plain(body),keys=['recordClass','accountClosureAt','commercialPeriodEnd','taxPeriodEnd','additionalRetainUntil','settlementsComplete','holdsReviewed','holdReviewReference'];
    if(Object.keys(d).some(k=>!keys.includes(k))||!['ACCOUNT_PROFILE','BOOKINGS_RENTALS','PAYMENT_COMMERCIAL','PAYMENT_VAT','PAYMENT_COMMERCIAL_AND_VAT','PRIVATE_MEMBER_CONVERSATION'].includes(String(d.recordClass))
      ||d.settlementsComplete!==true||d.holdsReviewed!==true)throw new BadRequestException('راجع تصنيف السجل وموانع الاحتفاظ.');
    note(d.holdReviewReference);
    for(const key of ['accountClosureAt','commercialPeriodEnd','taxPeriodEnd','additionalRetainUntil'])if(d[key]!==null&&d[key]!==undefined&&typeof d[key]!=='string')throw new BadRequestException('تاريخ غير صالح.');
    const disposition={...d,accountClosureAt:d.accountClosureAt??null,commercialPeriodEnd:d.commercialPeriodEnd??null,taxPeriodEnd:d.taxPeriodEnd??null,additionalRetainUntil:d.additionalRetainUntil??null} as Disposition;
    return this.db.serializable(async tx=>{
      const scope=await this.caseScope(tx,actor,caseId),plan=await inspectNativeRecord(tx,scope.subject,disposition);
      return {requestId:scope.request.id,...scope.subject,scope:plan.scope,sourceHash:plan.sourceHash,dueAt:plan.dueAt,policyVersion:'0.1',executed:false,
        notice:'هذه معاينة للسجل. يحتاج التنفيذ قرار تصرف أصليًا معتمدًا وسجل محو خارجيًا محفوظًا.'};
    });
  }

  async execute(actor:string,caseId:string,body:unknown) {
    if(!this.enabled())throw new ServiceUnavailableException('تنفيذ المحو أو بوابة الاستعادة غير مفعّلين.');
    this.recovery.assertReady();
    const b=plain(body);
    if(Object.keys(b).sort().join(',')!=='operationId,source')throw new BadRequestException();
    const operationId=id(b.operationId),pin=parsePin(b.source);
    const operation=await this.db.serializable(async tx=>{
      const scope=await this.caseScope(tx,actor,caseId);
      const existing=await this.getOperation(tx,operationId,true);
      if(existing) {
        const previous=existing.intent as ErasureIntent;
        if(existing.requestId!==scope.request.id||previous.actorId!==actor||erasureDigest(previous.source)!==erasureDigest(pin))throw new ConflictException('مرجع المحاولة مرتبط بقرار آخر.');
        return existing;
      }
      const activation=await approvedRetentionActivation(tx);
      if(!activation)throw new ConflictException('لم يثبت تاريخ نفاذ المدد بعد.');
      const decision=await readDisposition(tx,pin,scope.request.id,scope.subject),plan=await inspectNativeRecord(tx,scope.subject,decision.disposition);
      if(plan.sourceHash!==decision.expectedNativeHash)throw new ConflictException('تغير السجل بعد المراجعة؛ يلزم قرار مطابق.');
      const intent:ErasureIntent={version:1,id:operationId,requestId:scope.request.id,actorId:actor,createdAt:new Date().toISOString(),plan,disposition:decision.disposition,source:pin,activation:activation.pin};
      return this.prepare(tx,intent);
    });
    return this.run(operation,async(tx,intent)=>{
      await this.caseScope(tx,actor,caseId);
      const activation=await approvedRetentionActivation(tx);
      if(!activation||erasureDigest(activation.pin)!==erasureDigest(intent.activation))throw new ConflictException('تغير اعتماد النفاذ.');
      const decision=await readDisposition(tx,pin,intent.requestId!,intent.plan);
      if(erasureDigest(decision.disposition)!==erasureDigest(intent.disposition))throw new ConflictException('تغير قرار التصرف.');
    });
  }

  async purgePrivateMessage(messageId:string) {
    if(process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED!=='true')throw new ServiceUnavailableException('يلزم تجهيز سجل المحو الخارجي وبوابة الاستعادة قبل الإتلاف.');
    this.recovery.assertReady();
    const operation=await this.db.serializable(async tx=>{
      const [m]=await tx.$queryRaw<Array<{accountId:string}>>`SELECT "senderAccountId"::text AS "accountId" FROM "Message" WHERE id::text=${messageId}`;
      if(!m)return null;
      const subject:ErasureSubject={accountId:m.accountId,domain:'SENT_MESSAGES',recordRef:messageId,centerId:null};
      await lockPrivacyRecord(tx,subject);
      const [previous]=await tx.$queryRaw<Operation[]>`SELECT * FROM "PrivacyErasureOperation" WHERE "domain"='SENT_MESSAGES' AND "recordRef"=${messageId} AND "state" IN ('PREPARED','APPLIED_LOCAL','PUBLISHED') ORDER BY "createdAt" DESC LIMIT 1`;
      if(previous)return previous;
      const plan=await inspectNativeRecord(tx,subject,privatePolicy);
      const intent:ErasureIntent={version:1,id:randomUUID(),requestId:null,actorId:null,createdAt:new Date().toISOString(),plan,disposition:privatePolicy,source:null,activation:null};
      return this.prepare(tx,intent);
    });
    if(!operation)return null;
    return this.run(operation,async()=>{});
  }

  private async getOperation(tx:Tx,operationId:string,lock=false) {
    const rows=lock?await tx.$queryRaw<Operation[]>`SELECT * FROM "PrivacyErasureOperation" WHERE id=${operationId} FOR UPDATE`
      :await tx.$queryRaw<Operation[]>`SELECT * FROM "PrivacyErasureOperation" WHERE id=${operationId}`;
    return rows[0]??null;
  }

  enabled(){return process.env.HYDROLAND_PRIVACY_ERASURE_ENABLED==='true'&&process.env.HYDROLAND_PRIVACY_RECOVERY_REQUIRED==='true';}
  async options(actor:string,caseId:string) {
    return this.db.serializable(async tx=>{
      const s=await this.caseScope(tx,actor,caseId,true),platform=await reviewPlatform(tx);
      const candidates=await tx.managedDocument.findMany({where:{organizationId:platform.id,status:{in:['APPROVED','SIGNED']},template:{code:s.subject.domain==='PAYMENTS'?'FIN-A15-RECORD-DISPOSITION':'LEGAL-A15-RECORD-DISPOSITION',status:'ACTIVE'},
        AND:[{payload:{path:['requestId'],equals:s.request.id}},{payload:{path:['accountId'],equals:s.subject.accountId}}]},orderBy:[{updatedAt:'desc'},{id:'asc'}],take:100});
      const sources:Array<{label:string;source:SourcePin}>=[];
      for(const d of s.c.state==='RESOLVED'?[]:candidates){
        try{const reviewed=await reviewSource(tx,platform.id,d.id),source={documentId:d.id,version:d.version,contentHash:d.contentHash,sourceHash:reviewed.sourceHash};
          const decision=await readDisposition(tx,source,s.request.id,s.subject),plan=await inspectNativeRecord(tx,s.subject,decision.disposition);
          if(plan.sourceHash===decision.expectedNativeHash)sources.push({label:d.referenceNumber+' · قرار التصرف · v'+d.version,source});
        }catch(error){if(!(error instanceof ConflictException||error instanceof ForbiddenException||error instanceof NotFoundException||error instanceof BadRequestException))throw error;}
      }
      const holds=await tx.$queryRaw<Array<{id:string;reason:string;releaseRequestedByPersonId:string|null}>>`SELECT id,reason,"releaseRequestedByPersonId" FROM "PrivacyRecordHold" WHERE "requestId"=${s.request.id} AND "releasedAt" IS NULL ORDER BY "createdAt",id`;
      const activation=await approvedRetentionActivation(tx);
      return {enabled:this.enabled()&&!!activation&&s.c.state!=='RESOLVED',requestKind:s.request.kind,requestDomain:s.request.domain,sources,
        holds:holds.map(h=>({id:h.id,reason:h.reason,releasePending:!!h.releaseRequestedByPersonId,canConfirmRelease:!!h.releaseRequestedByPersonId&&h.releaseRequestedByPersonId!==s.actor.personId})),
        effectiveFrom:activation?.effectiveFrom??null,notice:activation?'يلزم قرار مطابق للسجل ومراجعة موانع الاحتفاظ قبل التنفيذ.':'لم يبدأ نفاذ مدد الاحتفاظ بعد.'};
    });
  }
  private async prepare(tx:Tx,intent:ErasureIntent) {
    await tx.$executeRaw`INSERT INTO "PrivacyErasureOperation" (id,"requestId","accountId","domain","recordRef",scope,intent,"intentHash")
      VALUES (${intent.id},${intent.requestId},${intent.plan.accountId},${intent.plan.domain},${intent.plan.recordRef},${intent.plan.scope},${JSON.stringify(intent)}::jsonb,${erasureDigest(intent)})`;
    return (await this.getOperation(tx,intent.id))!;
  }
  private async run(operation:Operation,revalidate:(tx:Tx,intent:ErasureIntent)=>Promise<void>) {
    if(operation.state==='ABORTED')throw new ConflictException('توقفت محاولة المحو دون تنفيذ؛ يلزم قرار ومحاولة جديدان.');
    const intent=operation.intent as ErasureIntent;
    if(erasureDigest(intent)!==operation.intentHash)throw new ConflictException('إيصال النية غير متسق.');
    // This write is durably confirmed BEFORE any destructive database write.
    await this.journal.put(operation.id,'intent',intent);
    try {
      operation=await this.db.serializable(async tx=>{
        const current=await this.getOperation(tx,operation.id,true);
        if(!current)throw new ConflictException();
        if(['APPLIED_LOCAL','PUBLISHED'].includes(current.state))return current;
        if(current.state!=='PREPARED')throw new ConflictException();
        await revalidate(tx,intent);
        const plan=await inspectNativeRecord(tx,intent.plan,intent.disposition);
        if(erasureDigest(plan)!==erasureDigest(intent.plan))throw new ConflictException('تغير السجل أو موانع محوه.');
        await applyNativeErasure(tx,plan);
        const event=await this.audit.record({actorId:intent.actorId??undefined,action:'PERSONAL_DATA_ERASED',resource:'PrivacyErasureOperation',resourceId:operation.id,
          metadata:{requestId:intent.requestId,domain:plan.domain,scope:plan.scope,intentHash:operation.intentHash}},tx);
        const receipt={version:1,id:operation.id,intentHash:operation.intentHash,executionAuditId:event.id,appliedAt:new Date().toISOString()};
        await tx.$executeRaw`UPDATE "PrivacyErasureOperation" SET state='APPLIED_LOCAL',receipt=${JSON.stringify(receipt)}::jsonb,"receiptHash"=${erasureDigest(receipt)},"executionAuditId"=${event.id},"appliedAt"=${new Date(receipt.appliedAt)} WHERE id=${operation.id}`;
        return (await this.getOperation(tx,operation.id))!;
      });
    }catch(error) {
      // Check the committed state on a fresh transaction. If connectivity or
      // transaction outcome is unknown, leave an unresolved external intent.
      const aborted=await this.db.serializable(async tx=>{
        const current=await this.getOperation(tx,operation.id,true);
        if(current?.state!=='PREPARED')return false;
        await tx.$executeRaw`UPDATE "PrivacyErasureOperation" SET state='ABORTED' WHERE id=${operation.id}`;return true;
      }).catch(()=>false);
      if(aborted)await this.journal.put(operation.id,'abort',{version:1,id:operation.id,intentHash:operation.intentHash,reason:'LOCAL_EXECUTION_NOT_APPLIED'});
      throw error;
    }
    // A failure here never repeats deletion. Reusing the same operationId only
    // publishes its original receipt; APPLIED remains unavailable until saved.
    await this.journal.put(operation.id,'commit',operation.receipt);
    await this.db.serializable(async tx=>{
      const current=await this.getOperation(tx,operation.id,true);
      if(!current||!['APPLIED_LOCAL','PUBLISHED'].includes(current.state)||current.receiptHash!==erasureDigest(operation.receipt))throw new ConflictException('إيصال التنفيذ تغير.');
      if(current.state!=='PUBLISHED')await tx.$executeRaw`UPDATE "PrivacyErasureOperation" SET state='PUBLISHED',"publishedAt"=clock_timestamp() WHERE id=${operation.id}`;
      if(current.requestId)await tx.personalDataRequest.update({where:{id:current.requestId},data:{executionAuditId:current.executionAuditId}});
    });
    return {operationId:operation.id,scope:operation.scope,executed:true,externalReceiptSaved:true,executionAuditId:operation.executionAuditId};
  }

  async hold(actor:string,caseId:string,body:unknown) {
    const b=plain(body);if(Object.keys(b).some(k=>!['reason','entireDomain'].includes(k))||b.entireDomain!==undefined&&typeof b.entireDomain!=='boolean')throw new BadRequestException();
    const reason=note(b.reason);
    return this.db.serializable(async tx=>{
      const s=await this.caseScope(tx,actor,caseId);await lockPrivacyRecord(tx,s.subject);
      const holdId=randomUUID(),ref=b.entireDomain?'*':s.subject.recordRef;
      await tx.$executeRaw`INSERT INTO "PrivacyRecordHold" (id,"requestId","accountId",domain,"recordRef",reason,"createdByPersonId") VALUES (${holdId},${s.request.id},${s.subject.accountId},${s.subject.domain},${ref},${reason},${s.actor.personId})`;
      await this.audit.record({actorId:actor,action:'privacy.retention_hold_created',resource:'PrivacyRecordHold',resourceId:holdId},tx);
      return {id:holdId,held:true};
    });
  }
  async releaseHold(actor:string,caseId:string,holdId:string,body:unknown) {
    const b=plain(body);if(Object.keys(b).join(',')!=='reason')throw new BadRequestException();const reason=note(b.reason);
    return this.db.serializable(async tx=>{
      const s=await this.caseScope(tx,actor,caseId,true);await lockPrivacyRecord(tx,s.subject);
      const [hold]=await tx.$queryRaw<Array<{id:string;releaseRequestedByPersonId:string|null;releasedAt:Date|null}>>`SELECT id,"releaseRequestedByPersonId","releasedAt" FROM "PrivacyRecordHold" WHERE id=${holdId} AND "requestId"=${s.request.id} FOR UPDATE`;
      if(!hold)throw new NotFoundException();if(hold.releasedAt)return {id:holdId,released:true};
      if(hold.releaseRequestedByPersonId===s.actor.personId)throw new ConflictException('يلزم تأكيد مراجع آخر لرفع التجميد.');
      if(hold.releaseRequestedByPersonId)await tx.$executeRaw`UPDATE "PrivacyRecordHold" SET "releasedByPersonId"=${s.actor.personId},"releasedAt"=clock_timestamp() WHERE id=${holdId}`;
      else await tx.$executeRaw`UPDATE "PrivacyRecordHold" SET "releaseRequestedByPersonId"=${s.actor.personId},"releaseReason"=${reason} WHERE id=${holdId}`;
      await this.audit.record({actorId:actor,action:hold.releaseRequestedByPersonId?'privacy.retention_hold_released':'privacy.retention_hold_release_requested',resource:'PrivacyRecordHold',resourceId:holdId},tx);
      return {id:holdId,released:!!hold.releaseRequestedByPersonId};
    });
  }
}
