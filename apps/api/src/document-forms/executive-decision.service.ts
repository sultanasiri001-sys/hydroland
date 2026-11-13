import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { DocumentAuthorizationService } from './document-authorization.service';
import { boundedNote, eligibleReviewParticipant, Participant, reviewPlatform, reviewSource, validExpiry } from './internal-document-review.domain';
import { decisionDigest, scopeId } from './owner-administrative-decision.domain';
import { templateObject } from './document-template-input';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { validateDocumentPayload } from './document-payload';

type Tx = Prisma.TransactionClient;
const PREFIX='EXECUTIVE_DECISION:v1:', EVENT='EXECUTIVE_DECISION_EVENT:v1:', NUMBER='EXECUTIVE_DECISION_NUMBER:v1:';
const POLICY='SIGNED_EXECUTIVE_FOLLOWUP_V1';
type State='ISSUED'|'REPORTED'|'ESCALATED'|'CLOSED'|'RETRACTED';
type Case = {policy:typeof POLICY;organizationId:string;documentId:string;sourceVersion:number;sourceHash:string;decisionNumber:string;source:{referenceNumber:string;payload:Record<string,string>};
  revision:string;previousRevision:string|null;previousDigest:string|null;state:State;issuedAt:string;expiresAt:string;
  ownerId:string;ownerPersonId:string;ownerBinding:string;worker:Participant;department:string;
  result:null|{documentId:string;version:number;sourceHash:string;referenceNumber:string;payload:Record<string,string>;reportedBy:string;reportedByPersonId:string};
  note:string;updatedAt:string;actorAccountId:string;digest:string};
const key=(org:string,id:string)=>PREFIX+org+':'+id;
const eventKey=(v:Case)=>EVENT+v.organizationId+':'+v.documentId+':'+v.revision;
const seal=(v:Omit<Case,'digest'>):Case=>({...v,digest:decisionDigest(v)});

@Injectable()
export class ExecutiveDecisionService {
  constructor(private readonly db:DatabaseService,private readonly authz:DocumentAuthorizationService){}
  private view(v:Case){return {policy:POLICY,organizationId:v.organizationId,documentId:v.documentId,revision:v.revision,state:v.state,sourceVersion:v.sourceVersion,decisionNumber:v.decisionNumber,issuedAt:v.issuedAt,expiresAt:v.expiresAt,updatedAt:v.updatedAt,department:v.department,assigneeAccountId:v.worker.accountId,result:v.result?{documentId:v.result.documentId,version:v.result.version,referenceNumber:v.result.referenceNumber,payload:v.result.payload,reportedBy:v.result.reportedBy}:null,note:v.note};}
  private ownerBinding(p:Awaited<ReturnType<typeof reviewPlatform>>){return decisionDigest({ownerId:p.ownerId,ownerPersonId:p.ownerPersonId,organizationRevision:p.updatedAt.toISOString(),platformRevision:p.platformRevision,ownerAuthorityRevision:p.ownerAuthorityRevision,ownerStatusRevision:p.ownerStatusRevision,ownerMemberRevision:p.ownerMemberRevision,ownerVerifiedAt:p.ownerVerifiedAt});}
  private async platform(tx:Tx,org:string){const p=await reviewPlatform(tx);if(p.id!==org)throw new ForbiddenException();return p;}
  private async owner(tx:Tx,actor:string,org:string){const p=await this.platform(tx,org);await this.authz.assert(actor,org,'DOCUMENT_READ',tx);if(p.ownerId!==actor)throw new ForbiddenException();return p;}
  private async source(tx:Tx,org:string,id:string,code='EXE-DECISION'){
    const s=await reviewSource(tx,org,id),d=s.d;
    if(d.department!=='EXECUTIVE_GOVERNANCE'||d.template.code!==code||d.status!=='SIGNED'||!d.signedByAccountId||!d.signedAt)throw new ConflictException('يلزم مصدر تنفيذي محفوظ ومعتمد وموقّع في مسار المستندات المستقل.');
    const signer=await tx.account.findUnique({where:{id:d.signedByAccountId},select:{personId:true}});
    const signatures=await tx.documentLifecycleEvent.findMany({where:{documentId:id,version:d.version,action:'SIGNED',actorAccountId:d.signedByAccountId,toStatus:'SIGNED'},select:{id:true},take:2});
    if(!signer||signer.personId===d.createdBy.personId||signer.personId===d.approvedBy?.personId||signatures.length!==1)throw new ConflictException('أدلة استقلال الموقّع غير مكتملة.');
    validateDocumentPayload(d.template.fields,d.payload);
    const raw=d.payload as Record<string,unknown>,names=code==='EXE-DECISION'?['decisionNo','authority','decision']:['decisionNo','owner','evidence'];
    const payload=Object.fromEntries(names.map(name=>[name,raw[name]])) as Record<string,string>;
    for(const value of Object.values(payload))if(typeof value!=='string'||!value.trim()||value.length>10000)throw new ConflictException('المصدر غير مكتمل.');
    if(Object.keys(payload).length!==3)throw new ConflictException('حقول المصدر غير مكتملة.');
    return {...s,payload};
  }
  private read(value:unknown,org:string,id:string):Case{
    const v=value as Case;if(!v||typeof v!=='object'||v.policy!==POLICY||v.organizationId!==org||v.documentId!==id||!['ISSUED','REPORTED','ESCALATED','CLOSED','RETRACTED'].includes(v.state)||typeof v.revision!=='string'||!v.worker?.accountId||!Number.isInteger(v.sourceVersion)||!Number.isFinite(Date.parse(v.expiresAt)))throw new ConflictException('سجل القرار غير متسق.');
    const {digest,...body}=v;if(digest!==decisionDigest(body))throw new ConflictException('بصمة سجل القرار غير متسقة.');return v;
  }
  private async stored(tx:Tx,org:string,id:string){
    const row=await tx.operationalSetting.findUnique({where:{key:key(org,id)}});if(!row)return null;const v=this.read(row.value,org,id);
    const receipt=await tx.operationalSetting.findUnique({where:{key:eventKey(v)}});if(!receipt||this.read(receipt.value,org,id).digest!==v.digest)throw new ConflictException('إيصال انتقال القرار غير متاح.');return v;
  }
  private async access(tx:Tx,actor:string,org:string,id:string){
    const p=await this.platform(tx,org),v=await this.stored(tx,org,id);if(!v)throw new NotFoundException();
    const authorityCurrent=p.ownerId===v.ownerId&&this.ownerBinding(p)===v.ownerBinding;
    let personId=p.ownerPersonId;
    if(actor===p.ownerId)await this.owner(tx,actor,org);
    else{if(!authorityCurrent||actor!==v.worker.accountId)throw new ForbiddenException();const worker=await eligibleReviewParticipant(tx,org,v.department,actor);if(decisionDigest(worker.binding)!==decisionDigest(v.worker))throw new ForbiddenException('تغير تكليف الموظف أو صلاحيته.');personId=worker.binding.personId;}
    return {p,v,personId,isOwner:actor===p.ownerId,authorityCurrent};
  }
  private async lock(tx:Tx,org:string,id:string,accounts:string[]){
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,accounts);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${org} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${id} AND "organizationId"::text=${org} FOR UPDATE`;
  }
  private async save(tx:Tx,v:Case,personId:string,action:string){
    await tx.operationalSetting.create({data:{key:eventKey(v),value:v as unknown as Prisma.InputJsonValue}});
    await tx.operationalSetting.upsert({where:{key:key(v.organizationId,v.documentId)},create:{key:key(v.organizationId,v.documentId),value:v as unknown as Prisma.InputJsonValue},update:{value:v as unknown as Prisma.InputJsonValue}});
    await tx.auditEvent.create({data:{actorId:personId,action:'EXECUTIVE_DECISION_'+action,resource:'ExecutiveDecision',resourceId:v.documentId,metadata:{organizationId:v.organizationId,revision:v.revision,previousRevision:v.previousRevision,digest:v.digest,actorAccountId:v.actorAccountId} as Prisma.InputJsonValue}});
  }
  private async conflict<T>(fn:()=>Promise<T>){try{return await fn();}catch(e){if(e&&typeof e==='object'&&'code'in e&&['P2002','P2034'].includes(String(e.code)))throw new ConflictException('تغير القرار بالتزامن؛ أعد قراءة النتيجة المحفوظة.');throw e;}}
  async inspect(actor:string,org:string,id:string){scopeId(org);scopeId(id);return this.db.serializable(async tx=>{
    const p=await this.owner(tx,actor,org),s=await this.source(tx,org,id),current=await this.stored(tx,org,id);
    return {policy:POLICY,organizationId:org,documentId:id,sourceVersion:s.d.version,sourceHash:s.sourceHash,source:{referenceNumber:s.d.referenceNumber,payload:s.payload},current:current?this.view(current):null,ownerBinding:this.ownerBinding(p)};
  });}
  async issue(actor:string,org:string,id:string,body:unknown){
    scopeId(org);scopeId(id);const x=templateObject(body,['expectedVersion','sourceHash','ownerBinding','assigneeAccountId','department','expiresAt','note','confirmed']);
    scopeId(x.assigneeAccountId);validExpiry(String(x.expiresAt));const note=boundedNote(x.note);
    if(x.confirmed!==true||!DOCUMENT_DEPARTMENTS.includes(x.department as never)||!Number.isSafeInteger(x.expectedVersion))throw new BadRequestException('راجع المصدر والمكلّف والنطاق والمدة وأكّد الإصدار.');
    return this.conflict(()=>this.db.serializable(async tx=>{
      await this.owner(tx,actor,org);await this.lock(tx,org,id,[actor,String(x.assigneeAccountId)]);
      const currentOwner=await this.owner(tx,actor,org),s=await this.source(tx,org,id),worker=await eligibleReviewParticipant(tx,org,String(x.department),String(x.assigneeAccountId));
      if(worker.binding.personId===currentOwner.ownerPersonId)throw new ForbiddenException('يلزم منفذ مستقل عن مصدر التكليف.');
      validExpiry(String(x.expiresAt));
      if(s.d.version!==x.expectedVersion||s.sourceHash!==x.sourceHash||this.ownerBinding(currentOwner)!==x.ownerBinding)throw new ConflictException('تغير المصدر أو الصلاحية؛ أعد القراءة.');
      if(await this.stored(tx,org,id))throw new ConflictException('لهذا المستند قرار محفوظ؛ لا يعاد إصداره أو استبدال سجله.');
      await tx.operationalSetting.create({data:{key:NUMBER+org+':'+decisionDigest(s.payload.decisionNo.trim().normalize('NFKC')),value:{documentId:id,sourceVersion:s.d.version,decisionNumber:s.payload.decisionNo}}});
      const now=new Date().toISOString(),v=seal({policy:POLICY,organizationId:org,documentId:id,sourceVersion:s.d.version,sourceHash:s.sourceHash,decisionNumber:String(s.payload.decisionNo),source:{referenceNumber:s.d.referenceNumber,payload:s.payload},revision:randomUUID(),previousRevision:null,previousDigest:null,state:'ISSUED',issuedAt:now,expiresAt:String(x.expiresAt),ownerId:actor,ownerPersonId:currentOwner.ownerPersonId,ownerBinding:this.ownerBinding(currentOwner),worker:worker.binding,department:String(x.department),result:null,note,updatedAt:now,actorAccountId:actor});
      await this.save(tx,v,currentOwner.ownerPersonId,'ISSUED');return this.view(v);
    }));
  }
  async detail(actor:string,org:string,id:string){scopeId(org);scopeId(id);return this.db.serializable(async tx=>{
    const v=await this.access(tx,actor,org,id);let sourceCurrent=false;
    try{const s=await this.source(tx,org,id);sourceCurrent=s.sourceHash===v.v.sourceHash&&s.d.version===v.v.sourceVersion;}catch(e){if(!(e instanceof ConflictException))throw e;}
    const expired=Date.parse(v.v.expiresAt)<=Date.now(),terminal=['CLOSED','RETRACTED'].includes(v.v.state);
    const historyRows=await tx.operationalSetting.findMany({where:{key:{startsWith:EVENT+org+':'+id+':'}},orderBy:{updatedAt:'desc'},take:51});
    const history=historyRows.slice(0,50).map(row=>this.view(this.read(row.value,org,id)));
    const results:Array<{documentId:string;referenceNumber:string}>=[];
    if(!v.isOwner&&!expired&&sourceCurrent&&['ISSUED','ESCALATED'].includes(v.v.state)){
      const rows=await tx.managedDocument.findMany({where:{organizationId:org,department:'EXECUTIVE_GOVERNANCE',status:'SIGNED',template:{code:'EXE-FOLLOWUP'},payload:{path:['decisionNo'],equals:v.v.decisionNumber}},select:{id:true},orderBy:{id:'asc'},take:21});
      for(const row of rows.slice(0,20)){try{const r=await this.source(tx,org,row.id,'EXE-FOLLOWUP');results.push({documentId:row.id,referenceNumber:r.d.referenceNumber});}catch(e){if(!(e instanceof ForbiddenException||e instanceof ConflictException))throw e;}}
    }
    return {policy:POLICY,organizationId:org,documentId:id,current:this.view(v.v),source:v.v.source,sourceCurrent,authorityCurrent:v.authorityCurrent,expired,history,hasMoreHistory:historyRows.length>50,results,
      actions:{report:!v.isOwner&&v.authorityCurrent&&!expired&&sourceCurrent&&['ISSUED','ESCALATED'].includes(v.v.state),escalate:!terminal&&v.authorityCurrent&&!expired&&sourceCurrent,close:v.isOwner&&v.authorityCurrent&&!expired&&sourceCurrent&&v.v.state==='REPORTED',retract:v.isOwner&&!terminal}};
  });}
  async candidates(actor:string,org:string,department:string){scopeId(org);if(!DOCUMENT_DEPARTMENTS.includes(department as never))throw new BadRequestException();return this.db.serializable(async tx=>{
    await this.owner(tx,actor,org);const rows=await tx.employment.findMany({where:{organizationId:org,status:'ACTIVE',orgUnit:{code:department,active:true,type:'DEPARTMENT'}},select:{accountId:true},orderBy:{id:'asc'},take:51});const items=[];const seen=new Set<string>();
    for(const row of rows.slice(0,50)){if(seen.has(row.accountId)||row.accountId===actor)continue;seen.add(row.accountId);try{const p=await eligibleReviewParticipant(tx,org,department,row.accountId);items.push({accountId:p.binding.accountId,name:p.name,jobTitle:p.jobTitle});}catch(e){if(!(e instanceof ForbiddenException))throw e;}}
    return {policy:POLICY,organizationId:org,department,items,hasMore:rows.length>50};
  });}
  async inbox(actor:string,cursor?:string){if(cursor!==undefined&&(typeof cursor!=='string'||cursor.length>400||!cursor.startsWith(PREFIX)))throw new BadRequestException();return this.db.serializable(async tx=>{
    const p=await reviewPlatform(tx),prefix=PREFIX+p.id+':';if(cursor&&!cursor.startsWith(prefix))throw new BadRequestException();
    const where=actor===p.ownerId?{}:{value:{path:['worker','accountId'],equals:actor}};
    const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:prefix,...(cursor?{gt:cursor}:{})},...where},orderBy:{key:'asc'},take:21});const items=[];
    for(const row of rows.slice(0,20)){const id=row.key.slice(prefix.length);try{const a=await this.access(tx,actor,p.id,id);items.push({organizationId:p.id,documentId:id,decisionNumber:a.v.decisionNumber,state:a.v.state,expiresAt:a.v.expiresAt});}catch(e){if(!(e instanceof ForbiddenException||e instanceof ConflictException||e instanceof NotFoundException))throw e;}}
    return {policy:POLICY,items,nextCursor:rows.length>20?rows[19].key:null};
  });}
  async transition(actor:string,org:string,id:string,body:unknown){
    scopeId(org);scopeId(id);const x=templateObject(body,['action','expectedRevision','note','resultDocumentId','confirmed']),note=boundedNote(x.note);scopeId(x.expectedRevision);
    if(x.confirmed!==true||!['REPORT','ESCALATE','CLOSE','RETRACT'].includes(String(x.action)))throw new BadRequestException();
    if(x.action==='REPORT')scopeId(x.resultDocumentId);else if(x.resultDocumentId!==undefined)throw new BadRequestException();
    return this.conflict(()=>this.db.serializable(async tx=>{
      const initial=await this.access(tx,actor,org,id);await this.lock(tx,org,id,[actor,initial.v.ownerId,initial.v.worker.accountId]);
      const c=await this.access(tx,actor,org,id),v=c.v;if(v.revision!==x.expectedRevision||['CLOSED','RETRACTED'].includes(v.state))throw new ConflictException('تغير القرار أو أصبح نهائيًا.');
      if(x.action==='RETRACT'&&!c.isOwner||x.action==='CLOSE'&&!c.isOwner||x.action==='REPORT'&&c.isOwner)throw new ForbiddenException();
      if(x.action!=='RETRACT'){
        if(!c.authorityCurrent)throw new ForbiddenException('تغيرت صلاحية الإصدار؛ يمكن للمالك الحالي التراجع فقط.');
        const s=await this.source(tx,org,id);if(s.sourceHash!==v.sourceHash||s.d.version!==v.sourceVersion||Date.parse(v.expiresAt)<=Date.now())throw new ConflictException('انتهى التكليف أو تغير مصدره.');
      }
      let result=v.result,state:State;
      if(x.action==='REPORT'){
        if(!['ISSUED','ESCALATED'].includes(v.state))throw new ConflictException();
        const r=await this.source(tx,org,String(x.resultDocumentId),'EXE-FOLLOWUP');if(String(r.payload.decisionNo)!==v.decisionNumber)throw new ConflictException('دليل النتيجة يخص قرارًا آخر.');
        result={documentId:r.d.id,version:r.d.version,sourceHash:r.sourceHash,referenceNumber:r.d.referenceNumber,payload:r.payload,reportedBy:actor,reportedByPersonId:c.personId};state='REPORTED';
      }else if(x.action==='CLOSE'){
        if(v.state!=='REPORTED'||!v.result||v.result.reportedByPersonId===c.personId)throw new ConflictException('يلزم تقرير مستقل ودليل تنفيذ.');
        const r=await this.source(tx,org,v.result.documentId,'EXE-FOLLOWUP');if(r.d.version!==v.result.version||r.sourceHash!==v.result.sourceHash)throw new ConflictException('تغير دليل النتيجة.');state='CLOSED';
      }else state=x.action==='ESCALATE'?'ESCALATED':'RETRACTED';
      const {digest,...old}=v,next=seal({...old,revision:randomUUID(),previousRevision:v.revision,previousDigest:digest,state,result,note,updatedAt:new Date().toISOString(),actorAccountId:actor});
      await this.save(tx,next,c.personId,String(x.action));return this.view(next);
    }));
  }
}
