import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OperationalEvidence, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { reviewPlatform } from '../document-forms/internal-document-review.domain';
import { evidenceCreate, evidenceDigest, evidenceId, evidenceRecordDigest, evidenceTransition, EVIDENCE_KINDS, EVIDENCE_NOTICE, EVIDENCE_POLICY, validateEvidenceRecord } from './operational-evidence.domain';
type Tx=Prisma.TransactionClient;
type Platform=Awaited<ReturnType<typeof reviewPlatform>>;
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

@Injectable()
export class OperationalEvidenceService {
  constructor(private readonly db:DatabaseService){}
  private async owner(tx:Tx,actorId:string){const p=await reviewPlatform(tx);if(p.ownerId!==actorId)throw new ForbiddenException('سجل الأدلة الداخلية متاح لمالك هيدرولاند فقط.');return p;}
  private async lock(tx:Tx,actorId:string,org:string,id?:string){
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,[actorId]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${org} AND "accountId"::text=${actorId} FOR SHARE`;
    if(id)await tx.$queryRaw`SELECT "id" FROM "OperationalEvidence" WHERE "id"=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private async conflict<T>(work:()=>Promise<T>){try{return await work();}catch(e){if(e&&typeof e==='object'&&'code' in e&&['P2002','P2034'].includes(String(e.code)))throw new ConflictException('تكرر المرجع أو تغير السجل؛ أعد القراءة.');throw e;}}
  private async row(tx:Tx,org:string,id:string){
    const row=await tx.operationalEvidence.findFirst({where:{id,organizationId:org}});if(!row)throw new NotFoundException('الدليل غير متاح.');validateEvidenceRecord(row);
    const history=await tx.operationalEvidenceRevision.findUnique({where:{evidenceId_revision:{evidenceId:id,revision:row.revision}}});if(!history)throw new ConflictException('تاريخ الدليل غير متاح.');const {recordDigest,...value}=history;
    if(evidenceDigest(value)!==recordDigest||evidenceDigest(history.snapshot)!==evidenceDigest(json(row)))throw new ConflictException('تاريخ الدليل لا يطابق الإصدار الحالي.');return row;
  }
  private async proof(tx:Tx,row:Pick<OperationalEvidence,'organizationId'|'department'|'proofDocumentId'|'proofVersion'|'proofContentHash'>,recording:boolean){
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${row.proofDocumentId} AND "organizationId"::text=${row.organizationId} FOR SHARE`;
    const d=await tx.managedDocument.findFirst({where:{id:row.proofDocumentId,organizationId:row.organizationId,department:row.department,template:{organizationId:row.organizationId,department:row.department}},select:{id:true,version:true,contentHash:true,payload:true,status:true,approvedAt:true,approvedByAccountId:true,signedAt:true,signedByAccountId:true}});
    const revision=d?await tx.documentRevision.findUnique({where:{documentId_version:{documentId:d.id,version:d.version}}}):null;
    if(!d||d.version!==row.proofVersion||d.contentHash!==row.proofContentHash||!revision||revision.contentHash!==d.contentHash||evidenceDigest(revision.payload)!==evidenceDigest(d.payload))throw new ConflictException('مرجع المستند أو إصداره خارج النطاق أو تغير.');
    if(recording&&(!['APPROVED','SIGNED'].includes(d.status)||!d.approvedAt||!d.approvedByAccountId||d.status==='SIGNED'&&(!d.signedAt||!d.signedByAccountId)))throw new ConflictException('توثيق الواقعة يحتاج مستندًا معتمدًا أو موقعًا في مساره الأصلي.');
    return d;
  }
  private async references(tx:Tx,row:OperationalEvidence,recording:boolean){
    const x=row.details as Record<string,any>,org=row.organizationId;let bindings:Record<string,unknown>={};
    if(row.kind.startsWith('WAREHOUSE_')||row.kind==='PROCUREMENT'){
      const product=await tx.storeProduct.findFirst({where:{id:x.productId,organizationId:org,kind:'GOODS'},select:{id:true}});if(!product)throw new ConflictException('مرجع السلعة خارج نطاق الجهة.');
      if(x.locationId&&!await tx.warehouseLocation.findFirst({where:{id:x.locationId,organizationId:org},select:{id:true}}))throw new ConflictException('موقع المستودع خارج نطاق الجهة.');
    }
    if(row.kind.startsWith('RECORD_')){
      if(!await tx.administrativeRecord.findFirst({where:{id:x.recordId,organizationId:org,unit:{organizationId:org}},select:{id:true}}))throw new ConflictException('السجل الإداري خارج نطاق الجهة.');
      if(row.kind==='RECORD_RETENTION'&&Date.parse(x.retainUntil)<row.occurredAt.getTime())throw new BadRequestException('تاريخ الاحتفاظ يسبق واقعة التسجيل.');
      if(row.kind==='RECORD_DISPOSAL'){
        const retained=await this.row(tx,org,x.retentionEvidenceId),details=retained.details as Record<string,any>;
        if(retained.kind!=='RECORD_RETENTION'||details.recordId!==x.recordId||details.hold!==false||Date.parse(details.retainUntil)>row.occurredAt.getTime()||retained.occurredAt>row.occurredAt||recording&&retained.status!=='RECORDED')throw new ConflictException('مرجع الاحتفاظ أو مانع الإتلاف لا يسمح بتوثيق هذه الواقعة.');
        if(recording){
          const latest=await tx.operationalEvidence.findFirst({where:{organizationId:org,kind:'RECORD_RETENTION',status:'RECORDED',details:{path:['recordId'],equals:x.recordId},occurredAt:{lte:row.occurredAt}},orderBy:[{occurredAt:'desc'},{createdAt:'desc'},{id:'desc'}],select:{id:true}});
          if(latest?.id!==retained.id)throw new ConflictException('يوجد قرار احتفاظ أحدث لهذه الواقعة.');
          await this.proof(tx,retained,true);
        }
        const authorization=await tx.managedDocument.findFirst({where:{id:x.authorizationDocumentId,organizationId:org,department:row.department,template:{organizationId:org,department:row.department}},select:{version:true,contentHash:true}});if(!authorization)throw new ConflictException('مرجع إذن الإتلاف خارج النطاق.');
        const bound=(row.referenceBindings as Record<string,any>)?.authorization;
        if(recording&&(!bound||bound.version!==authorization.version||bound.contentHash!==authorization.contentHash))throw new ConflictException('تغير إصدار إذن الإتلاف منذ إنشاء مسودة الدليل.');
        bindings={authorization:{id:x.authorizationDocumentId,version:authorization.version,contentHash:authorization.contentHash}};
        await this.proof(tx,{...row,proofDocumentId:x.authorizationDocumentId,proofVersion:authorization.version,proofContentHash:authorization.contentHash},recording);
      }
    }
    if(row.kind.startsWith('CAMPAIGN_')){
      const campaign=await tx.marketingCampaignDraft.findFirst({where:{id:x.campaignDraftId,organizationId:org},select:{id:true,channels:true}});if(!campaign)throw new ConflictException('مرجع الحملة خارج نطاق الجهة.');
      if(row.kind==='CAMPAIGN_PUBLICATION'&&!(campaign.channels as string[]).includes(x.channel))throw new ConflictException('قناة النشر ليست ضمن قنوات الحملة المسجلة.');
      if(row.kind==='CAMPAIGN_ANALYTICS'){
        const publication=await this.row(tx,org,x.publicationEvidenceId),details=publication.details as Record<string,any>;
        if(publication.kind!=='CAMPAIGN_PUBLICATION'||details.campaignDraftId!==x.campaignDraftId||publication.occurredAt.getTime()>Date.parse(x.windowStart)||Date.parse(x.windowEnd)>row.occurredAt.getTime()||recording&&publication.status!=='RECORDED')throw new ConflictException('مرجع النشر أو فترة التحليلات لا يطابق الحملة.');
        if(recording)await this.proof(tx,publication,true);
      }
    }
    return bindings;
  }
  private async append(tx:Tx,p:Platform,actorId:string,row:OperationalEvidence,action:string,reason:string){
    const previous=row.revision>1?await tx.operationalEvidenceRevision.findUniqueOrThrow({where:{evidenceId_revision:{evidenceId:row.id,revision:row.revision-1}}}):null;
    const value={id:randomUUID(),evidenceId:row.id,revision:row.revision,snapshot:json(row),action,reason,actorAccountId:actorId,previousDigest:previous?.recordDigest??null,createdAt:new Date()};
    await tx.operationalEvidenceRevision.create({data:{...value,recordDigest:evidenceDigest(value)}});
    await tx.auditEvent.create({data:{actorId:p.ownerPersonId,action,resource:'OperationalEvidence',resourceId:row.id,metadata:json({policy:EVIDENCE_POLICY,organizationId:p.id,revision:row.revision,kind:row.kind,status:row.status,recordDigest:row.recordDigest,noOperationalExecution:true})}});
  }
  private summary(row:OperationalEvidence){return{id:row.id,revision:row.revision,kind:row.kind,department:row.department,reference:row.reference,status:row.status,occurredAt:row.occurredAt.toISOString(),recordedAt:row.recordedAt?.toISOString()??null,createdAt:row.createdAt.toISOString()};}
  private async view(tx:Tx,row:OperationalEvidence){const history=await tx.operationalEvidenceRevision.findMany({where:{evidenceId:row.id},orderBy:{revision:'desc'},take:51,select:{revision:true,action:true,reason:true,recordDigest:true,createdAt:true}});return{schemaVersion:1,record:{...this.summary(row),proofDocumentId:row.proofDocumentId,proofVersion:row.proofVersion,details:row.details,recordDigest:row.recordDigest},history:history.slice(0,50),historyTruncated:history.length>50,notice:EVIDENCE_NOTICE};}
  async list(actorId:string,cursor?:string,kind?:string,status?:string){
    if(cursor)evidenceId(cursor);if(kind&&!Object.hasOwn(EVIDENCE_KINDS,kind)||status&&!['DRAFT','RECORDED','ARCHIVED'].includes(status))throw new BadRequestException('مرشح قائمة الأدلة غير صالح.');
    return this.db.serializable(async tx=>{const p=await this.owner(tx,actorId),filter={organizationId:p.id,...(kind?{kind}:{}),...(status?{status}:{})},before=cursor?await tx.operationalEvidence.findFirst({where:{...filter,id:cursor}}):null;if(cursor&&!before)throw new BadRequestException('مؤشر القائمة خارج النطاق.');const rows=await tx.operationalEvidence.findMany({where:{...filter,...(before?{OR:[{createdAt:{lt:before.createdAt}},{createdAt:before.createdAt,id:{lt:before.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:51});for(const r of rows)validateEvidenceRecord(r);return{schemaVersion:1,policy:EVIDENCE_POLICY,items:rows.slice(0,50).map(r=>this.summary(r)),hasMore:rows.length>50,nextCursor:rows.length>50?rows[49].id:null,kinds:EVIDENCE_KINDS,notice:EVIDENCE_NOTICE};});
  }
  async detail(actorId:string,id:string){evidenceId(id);return this.db.serializable(async tx=>{const p=await this.owner(tx,actorId);return this.view(tx,await this.row(tx,p.id,id));});}
  async create(actorId:string,body:unknown){
    const input=evidenceCreate(body),{requestKey,...content}=input,requestDigest=evidenceDigest(content);
    return this.conflict(()=>this.db.serializable(async tx=>{const initial=await this.owner(tx,actorId);await this.lock(tx,actorId,initial.id);const p=await this.owner(tx,actorId);if(p.id!==initial.id)throw new ConflictException('تغيرت الجهة الداخلية.');const old=await tx.operationalEvidence.findUnique({where:{organizationId_createdByAccountId_requestKey:{organizationId:p.id,createdByAccountId:actorId,requestKey}}});if(old){if(old.requestDigest!==requestDigest)throw new ConflictException('مرجع الطلب مستخدم لمحتوى مختلف.');return{...await this.view(tx,await this.row(tx,p.id,old.id)),created:false};}
      const proof=await tx.managedDocument.findFirst({where:{id:input.proofDocumentId,organizationId:p.id,department:input.department},select:{version:true,contentHash:true}});if(!proof)throw new ConflictException('مستند الإثبات خارج النطاق.');const now=new Date(),value={id:randomUUID(),organizationId:p.id,requestKey,requestDigest,revision:1,status:'DRAFT',...content,occurredAt:new Date(content.occurredAt),proofVersion:proof.version,proofContentHash:proof.contentHash,referenceBindings:{},createdByAccountId:actorId,recordedAt:null,createdAt:now,updatedAt:now};if(value.occurredAt>now)throw new BadRequestException('وقت الواقعة لا يجوز أن يكون في المستقبل.');const row={...value,recordDigest:evidenceRecordDigest(value)} as OperationalEvidence;await this.proof(tx,row,false);row.referenceBindings=json(await this.references(tx,row,false));row.recordDigest=evidenceRecordDigest(row);const saved=await tx.operationalEvidence.create({data:{...row,details:json(row.details),referenceBindings:json(row.referenceBindings)}});await this.append(tx,p,actorId,saved,'OPERATIONAL_EVIDENCE_CREATED','إنشاء مسودة توثيق واقعة');return{...await this.view(tx,saved),created:true};}));
  }
  async transition(actorId:string,id:string,body:unknown,status:'RECORDED'|'ARCHIVED'){
    evidenceId(id);const x=evidenceTransition(body);return this.conflict(()=>this.db.serializable(async tx=>{const initial=await this.owner(tx,actorId);await this.lock(tx,actorId,initial.id,id);const p=await this.owner(tx,actorId);if(p.id!==initial.id)throw new ConflictException('تغيرت الجهة الداخلية.');const old=await this.row(tx,p.id,id);if(old.revision!==x.expectedRevision||old.status==='ARCHIVED'||status==='RECORDED'&&old.status!=='DRAFT')throw new ConflictException('تغير إصدار الدليل أو حالته.');if(status==='RECORDED'){await this.proof(tx,old,true);await this.references(tx,old,true);}const value={...old,status,recordedAt:status==='RECORDED'?new Date():old.recordedAt,revision:old.revision+1,updatedAt:new Date()},recordDigest=evidenceRecordDigest(value);const updated=await tx.operationalEvidence.updateMany({where:{id,organizationId:p.id,revision:old.revision,recordDigest:old.recordDigest},data:{status,recordedAt:value.recordedAt,revision:value.revision,updatedAt:value.updatedAt,recordDigest}});if(updated.count!==1)throw new ConflictException('تغير الدليل أثناء الإجراء.');const saved=await tx.operationalEvidence.findUniqueOrThrow({where:{id}});await this.append(tx,p,actorId,saved,status==='RECORDED'?'OPERATIONAL_EVIDENCE_RECORDED':'OPERATIONAL_EVIDENCE_ARCHIVED',x.reason);return this.view(tx,saved);}));
  }
}
