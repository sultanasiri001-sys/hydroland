import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { DocumentAuthorizationService } from './document-authorization.service';
import { decisionDigest, scopeId } from './owner-administrative-decision.domain';
import { templateObject } from './document-template-input';
import { validateDocumentPayload } from './document-payload';
import { assignedReviewAccess, boundedNote, eligibleReviewParticipant, grantInput, INTERNAL_REVIEW_NOTICE, INTERNAL_REVIEW_POLICY, INTERNAL_REVIEW_PREFIX, readGrant, ReviewGrant, reviewKey, reviewPlatform, reviewSource, sealGrant, validExpiry } from './internal-document-review.domain';

type Tx = Prisma.TransactionClient;
@Injectable()
export class InternalDocumentReviewService {
  constructor(private readonly db: DatabaseService, private readonly authz: DocumentAuthorizationService) {}

  private async owner(tx: Tx, actorId: string, org: string) {
    const access = await this.authz.assert(actorId,org,'DOCUMENT_READ',tx);
    if (!('accessBasis' in access) || access.accessBasis !== 'PLATFORM_OWNER') throw new ForbiddenException('إدارة التكليف لمالك الجهة الداخلية فقط.');
    const platform = await reviewPlatform(tx);
    if (platform.id !== org || platform.ownerId !== actorId) throw new ForbiddenException();
    return platform;
  }
  private async lock(tx: Tx, org: string, id: string, accounts: string[]) {
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,accounts);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private async stored(tx: Tx, org: string, id: string) {
    return readGrant((await tx.operationalSetting.findUnique({where:{key:reviewKey(org,id)}}))?.value,org,id);
  }
  private async audit(tx: Tx, personId: string, action: string, id: string, metadata: object) {
    await tx.auditEvent.create({data:{actorId:personId,action,resource:'InternalDocumentReview',resourceId:id,metadata:metadata as Prisma.InputJsonValue}});
  }
  private async save(tx: Tx, grant: ReviewGrant) {
    const key = reviewKey(grant.organizationId,grant.documentId), value = grant as unknown as Prisma.InputJsonValue;
    await tx.operationalSetting.upsert({where:{key},create:{key,value},update:{value}});
  }
  private sourceSummary(d: any) {
    return {id:d.id,organizationId:d.organizationId,referenceNumber:d.referenceNumber,version:d.version,department:d.department,status:d.status,templateCode:d.template.code,titleAr:d.template.titleAr,contentHash:d.contentHash,approvedByAccountId:d.approvedByAccountId};
  }
  private async catchConflict<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && ['P2002','P2034'].includes(String(e.code))) throw new ConflictException('تغير المستند أو التكليف؛ أعد قراءة الحالة قبل أي محاولة جديدة.');
      throw e;
    }
  }
  async inspect(actorId: string, org: string, id: string) {
    scopeId(org); scopeId(id);
    return this.db.serializable(async tx => {
      await this.owner(tx,actorId,org);
      const {d} = await reviewSource(tx,org,id), current = await this.stored(tx,org,id);
      const rows = await tx.employment.findMany({where:{organizationId:org,status:'ACTIVE',orgUnit:{code:d.department,active:true,type:'DEPARTMENT'},position:{active:true},account:{status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'STAFF',status:'ACTIVE'}}}},select:{accountId:true},orderBy:{id:'asc'},take:51});
      const candidates: Array<{accountId:string;name:string;email:string;jobTitle:string;canReview:boolean;canSign:boolean}> = [];
      for (const row of rows.slice(0,50)) {
        if (candidates.some(c=>c.accountId===row.accountId)) continue;
        try {
          const p = await eligibleReviewParticipant(tx,org,d.department,row.accountId);
          if (p.binding.personId === d.createdBy.personId) continue;
          candidates.push({accountId:row.accountId,name:p.name,email:p.email,jobTitle:p.jobTitle,canReview:d.status==='PENDING_APPROVAL',canSign:p.binding.personId!==d.approvedBy?.personId});
        } catch (e) { if (!(e instanceof ForbiddenException)) throw e; }
      }
      return {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,source:this.sourceSummary(d),current,candidates,hasMoreCandidates:rows.length>50,
        canAssign:['PENDING_APPROVAL','APPROVED'].includes(d.status),requiresRevoke:current?.state==='ACTIVE'&&Date.parse(current.expiresAt)>Date.now(),notice:INTERNAL_REVIEW_NOTICE};
    });
  }
  private async prepare(tx: Tx, actorId: string, org: string, id: string, input: ReturnType<typeof grantInput>) {
    const platform = await this.owner(tx,actorId,org), source = await reviewSource(tx,org,id), {d} = source;
    const previous = await this.stored(tx,org,id);
    validExpiry(input.expiresAt);
    if (d.version !== input.expectedDocumentVersion || !['PENDING_APPROVAL','APPROVED'].includes(d.status)) throw new ConflictException('أرسل نسخة مكتملة للاعتماد ثم أعد معاينة التكليف.');
    if (previous?.state === 'ACTIVE' && Date.parse(previous.expiresAt) > Date.now()) throw new ConflictException('ألغِ التكليف الحالي صراحةً قبل استبداله.');
    validateDocumentPayload(d.template.fields,d.payload);
    const signer = await eligibleReviewParticipant(tx,org,d.department,input.signerAccountId);
    const reviewer = d.status === 'PENDING_APPROVAL' ? await eligibleReviewParticipant(tx,org,d.department,input.reviewerAccountId) : null;
    if (reviewer && (reviewer.binding.personId===d.createdBy.personId || reviewer.binding.personId===signer.binding.personId)
      || signer.binding.personId===d.createdBy.personId || signer.binding.personId===d.approvedBy?.personId) throw new ForbiddenException('يلزم منشئ ومعتمد وموقّع بأشخاص مستقلين.');
    if (d.status === 'APPROVED' && (!d.approvedByAccountId || !d.approvedAt || input.reviewerAccountId!==d.approvedByAccountId)) throw new ConflictException('احتفظ بالاعتماد المسجل؛ يمكن تكليف موقّع مستقل فقط.');
    const body: Omit<ReviewGrant,'id'|'revision'|'state'|'issuedAt'|'digest'> = {policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,ownerId:actorId,ownerPersonId:platform.ownerPersonId,organizationRevision:platform.updatedAt.toISOString(),ownerAuthorityRevision:platform.ownerAuthorityRevision,ownerStatusRevision:platform.ownerStatusRevision,
      platformRevision:platform.platformRevision,ownerMemberRevision:platform.ownerMemberRevision,ownerVerifiedAt:platform.ownerVerifiedAt,documentVersion:d.version,department:d.department,sourceHash:source.sourceHash,reviewer:reviewer?.binding??null,signer:signer.binding,approvalAtAssignment:d.status==='APPROVED'?{accountId:d.approvedByAccountId!,personId:d.approvedBy!.personId,approvedAt:d.approvedAt!.toISOString()}:null,expiresAt:input.expiresAt,reason:input.reason};
    const summary = {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,source:this.sourceSummary(d),reviewer:reviewer?{accountId:reviewer.binding.accountId,name:reviewer.name,email:reviewer.email}:null,
      retainedApprovalAccountId:d.status==='APPROVED'?d.approvedByAccountId:null,signer:{accountId:signer.binding.accountId,name:signer.name,email:signer.email},expiresAt:input.expiresAt,reason:input.reason,notice:INTERNAL_REVIEW_NOTICE,
      access:['READ_ASSIGNED_VERSION','PRINT_ASSIGNED_VERSION',...(reviewer?['REVIEW_AND_APPROVE_OR_RETURN']:[]),'SIGN_OR_DECLINE_AFTER_APPROVAL']};
    return {body,summary,previous,source,planHash:decisionDigest({body,sourceStatus:d.status,approvedBy:d.approvedByAccountId,approvedAt:d.approvedAt?.toISOString()??null,previousDigest:previous?.digest??null})};
  }
  async plan(actorId: string, org: string, id: string, body: unknown) {
    scopeId(org); scopeId(id); const input=grantInput(body);
    return this.db.serializable(async tx=>{const p=await this.prepare(tx,actorId,org,id,input);return {...p.summary,planHash:p.planHash};});
  }
  async assign(actorId: string, org: string, id: string, body: unknown) {
    scopeId(org);scopeId(id);const x=templateObject(body,['reviewerAccountId','signerAccountId','expectedDocumentVersion','expiresAt','reason','expectedPlanHash','confirmed']),input=grantInput(x);
    if (x.confirmed!==true || typeof x.expectedPlanHash!=='string' || !/^[a-f0-9]{64}$/.test(x.expectedPlanHash)) throw new BadRequestException('راجع المستند والحسابين والنطاق والمدة وأكّد التكليف.');
    return this.catchConflict(()=>this.db.serializable(async tx=>{
      const platform=await this.owner(tx,actorId,org), initial=await reviewSource(tx,org,id);
      await this.lock(tx,org,id,[actorId,platform.ownerId,initial.d.createdByAccountId,input.reviewerAccountId,input.signerAccountId]);
      const p=await this.prepare(tx,actorId,org,id,input);
      if(p.planHash!==x.expectedPlanHash)throw new ConflictException('تغيرت النسخة أو الأشخاص أو الصلاحيات؛ أعد المعاينة والتأكيد.');
      const grant=sealGrant({...p.body,id:randomUUID(),revision:randomUUID(),state:'ACTIVE',issuedAt:new Date().toISOString()});
      await this.save(tx,grant);
      await this.audit(tx,grant.ownerPersonId,'INTERNAL_DOCUMENT_REVIEW_ASSIGNED',id,{accountId:actorId,grant,previousDigest:p.previous?.digest??null});
      return {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,grant,permissionsApplied:['ASSIGNED_DOCUMENT_VERSION_ONLY'],notice:INTERNAL_REVIEW_NOTICE};
    }));
  }
  async revoke(actorId: string, org: string, id: string, body: unknown) {
    scopeId(org);scopeId(id);const x=templateObject(body,['expectedRevision','reason','confirmed']),reason=boundedNote(x.reason);scopeId(x.expectedRevision);
    if(x.confirmed!==true)throw new BadRequestException('أكّد إلغاء التكليف المعروض.');
    return this.catchConflict(()=>this.db.serializable(async tx=>{
      const platform=await this.owner(tx,actorId,org), initial=await this.stored(tx,org,id);
      if(!initial)throw new NotFoundException('لا يوجد تكليف محفوظ.');
      await this.lock(tx,org,id,[actorId,platform.ownerId,initial.signer.accountId,...(initial.reviewer?[initial.reviewer.accountId]:[])]);
      await this.owner(tx,actorId,org);const current=await this.stored(tx,org,id);
      if(!current||current.revision!==x.expectedRevision||current.state!=='ACTIVE')throw new ConflictException('تغيرت حالة التكليف؛ أعد قراءتها.');
      const {digest,...old}=current, grant=sealGrant({...old,revision:randomUUID(),state:'REVOKED'});
      await this.save(tx,grant);await this.audit(tx,platform.ownerPersonId,'INTERNAL_DOCUMENT_REVIEW_REVOKED',id,{accountId:actorId,grantId:grant.id,previousDigest:digest,grant,reason});
      return {schemaVersion:1,organizationId:org,documentId:id,grant};
    }));
  }
  async inbox(actorId: string, cursor?: string) {
    if(cursor!==undefined&&(typeof cursor!=='string'||cursor.length>400||!cursor.startsWith(INTERNAL_REVIEW_PREFIX)))throw new BadRequestException('مؤشر قائمة المراجعة غير صالح.');
    return this.db.serializable(async tx=>{
      const platform=await reviewPlatform(tx), prefix=INTERNAL_REVIEW_PREFIX+platform.id+':';
      if(cursor&&!cursor.startsWith(prefix))throw new BadRequestException('مؤشر القائمة خارج الجهة.');
      const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:prefix,...(cursor?{gt:cursor}:{})},OR:[{value:{path:['reviewer','accountId'],equals:actorId}},{value:{path:['signer','accountId'],equals:actorId}}]},orderBy:{key:'asc'},take:21});
      const items=[];
      for(const row of rows.slice(0,20)){
        const id=row.key.slice(prefix.length);try{
          const v=await assignedReviewAccess(tx,actorId,platform.id,id);
          items.push({...this.sourceSummary(v.d),role:v.role,expiresAt:v.g.expiresAt,assignmentId:v.g.id});
        }catch(e){if(!(e instanceof ForbiddenException||e instanceof ConflictException))throw e;}
      }
      return {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,items,nextCursor:rows.length>20?rows[19].key:null,notice:INTERNAL_REVIEW_NOTICE};
    });
  }
  private viewHash(v: Awaited<ReturnType<typeof assignedReviewAccess>>) {
    return decisionDigest({grantDigest:v.g.digest,actorId:v.actor.binding.accountId,role:v.role,sourceHash:v.sourceHash,status:v.d.status,approvedBy:v.d.approvedByAccountId,approvedAt:v.d.approvedAt?.toISOString()??null});
  }
  async detail(actorId: string, org: string, id: string) {
    scopeId(org);scopeId(id);
    return this.db.serializable(async tx=>{
      const v=await assignedReviewAccess(tx,actorId,org,id);
      return {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,source:this.sourceSummary(v.d),role:v.role,expiresAt:v.g.expiresAt,reviewHash:this.viewHash(v),
        fields:(v.d.template.fields as unknown as Array<{key:string;labelAr:string}>).map(f=>({key:f.key,labelAr:f.labelAr,value:(v.d.payload as Record<string,unknown>)[f.key]??null})),
        actorActions:{approve:v.role==='REVIEWER'&&v.d.status==='PENDING_APPROVAL',return:v.role==='REVIEWER'&&v.d.status==='PENDING_APPROVAL',sign:v.role==='SIGNER'&&v.d.status==='APPROVED'&&Boolean(v.d.approvedByAccountId&&v.d.approvedAt),decline:v.role==='SIGNER'&&v.d.status==='APPROVED'},notice:INTERNAL_REVIEW_NOTICE};
    });
  }
  async decide(actorId: string, org: string, id: string, body: unknown) {
    scopeId(org);scopeId(id);const x=templateObject(body,['action','expectedVersion','reviewHash','note','confirmed']),note=boundedNote(x.note);
    if(!['APPROVE','RETURN','SIGN','DECLINE'].includes(String(x.action))||x.confirmed!==true||!Number.isSafeInteger(x.expectedVersion)||typeof x.reviewHash!=='string'||!/^[a-f0-9]{64}$/.test(x.reviewHash))throw new BadRequestException('راجع النسخة وحدد الإجراء والملاحظة وأكّد القرار من حسابك.');
    return this.catchConflict(()=>this.db.serializable(async tx=>{
      const initial=await this.stored(tx,org,id);
      if(!initial||![initial.reviewer?.accountId,initial.signer.accountId].includes(actorId))throw new ForbiddenException('هذا المستند غير مكلف لحسابك.');
      const source=await assignedReviewAccess(tx,actorId,org,id);
      await this.lock(tx,org,id,[actorId,initial.ownerId,source.d.createdByAccountId,initial.signer.accountId,...(initial.reviewer?[initial.reviewer.accountId]:[])]);
      const v=await assignedReviewAccess(tx,actorId,org,id),{d,g}=v;
      if(d.version!==x.expectedVersion||this.viewHash(v)!==x.reviewHash)throw new ConflictException('تغيرت النسخة أو حالة التكليف؛ أعد المراجعة.');
      const reviewAction=['APPROVE','RETURN'].includes(String(x.action));
      if(reviewAction&&(v.role!=='REVIEWER'||d.status!=='PENDING_APPROVAL'||d.approvedByAccountId||d.signedByAccountId)
        || !reviewAction&&(v.role!=='SIGNER'||d.status!=='APPROVED'||!d.approvedByAccountId||!d.approvedAt||d.signedByAccountId))throw new ConflictException('الإجراء غير متاح لدورك وحالة المستند الحالية.');
      const now=new Date(),action=String(x.action),nextStatus=action==='APPROVE'?'APPROVED':action==='SIGN'?'SIGNED':action==='RETURN'?'DRAFT':'APPROVED';
      const receiptBody={policy:INTERNAL_REVIEW_POLICY,grantId:g.id,assignmentRevision:g.revision,organizationId:org,documentId:id,sourceVersion:d.version,sourceHash:v.sourceHash,action,actorAccountId:actorId,actorPersonId:v.actor.binding.personId,recordedAt:now.toISOString(),note};
      const receipt={...receiptBody,receiptHash:decisionDigest(receiptBody)};
      if(action!=='DECLINE'){
        const data: Prisma.ManagedDocumentUncheckedUpdateManyInput=action==='APPROVE'?{status:'APPROVED',approvedByAccountId:actorId,approvedAt:now}:action==='SIGN'?{status:'SIGNED',signedByAccountId:actorId,signedAt:now}:{status:'DRAFT',version:{increment:1}};
        const claimed=await tx.managedDocument.updateMany({where:{id,organizationId:org,version:d.version,status:d.status,templateId:d.templateId},data});
        if(claimed.count!==1)throw new ConflictException('تغير المستند أثناء الإجراء.');
        if(action==='RETURN')await tx.documentRevision.create({data:{documentId:id,version:d.version+1,contentHash:d.contentHash,payload:d.payload as Prisma.InputJsonValue,createdByAccountId:actorId}});
      }
      const {digest,...previous}=g, grant=sealGrant({...previous,revision:randomUUID(),state:action==='RETURN'?'RETURNED':action==='DECLINE'?'DECLINED':'ACTIVE'});
      await this.save(tx,grant);
      await tx.documentLifecycleEvent.create({data:{documentId:id,actorAccountId:actorId,action:action==='RETURN'?'INTERNAL_REVIEW_RETURNED':action==='DECLINE'?'INTERNAL_SIGN_DECLINED':nextStatus,fromStatus:d.status,toStatus:nextStatus as never,version:d.version+(action==='RETURN'?1:0),metadata:receipt as unknown as Prisma.InputJsonValue}});
      await this.audit(tx,v.actor.binding.personId,'INTERNAL_DOCUMENT_'+action,id,{receipt,previousDigest:digest,grantDigest:grant.digest});
      return {schemaVersion:1,policy:INTERNAL_REVIEW_POLICY,organizationId:org,documentId:id,action,status:nextStatus,version:d.version+(action==='RETURN'?1:0),receipt};
    }));
  }
}
