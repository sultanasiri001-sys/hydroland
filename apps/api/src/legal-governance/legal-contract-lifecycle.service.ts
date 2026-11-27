import { ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from '../hr/staffing-catalog';
import { assignedReviewAccess, eligibleReviewParticipant } from '../document-forms/internal-document-review.domain';
import { verifiedEntry } from '../finance/posting/ledger-proof';
import { command, dateOnly, hash, id, integer, json, LEGAL_CLAIM_REFERENCE, LEGAL_CONTRACT_CODE, LEGAL_DEPARTMENT, LEGAL_EVIDENCE_CODE, LEGAL_TEMPLATES,
  LegalAction, LegalLifecycleEvent, LegalLifecycleRow, LegalLifecycleState, LegalProof, LegalSource, object, requireState, sourceRef, text, timestamp, legalBusinessDate } from './legal-contract-lifecycle.domain';
import { legalContractTerms, legalNativeSource } from './legal-contract-lifecycle-source';

type Tx=Prisma.TransactionClient;
type Access={accountId:string;personId:string;manager:boolean;role:string};
const nativeKey=(table:'Organization'|'ManagedDocument'|'Account'|'FinanceEntry',value:string)=>Prisma.sql`(SELECT "id" FROM ${Prisma.raw('"'+table+'"')} WHERE "id"::text=${value})`;
const digest=(recordId:string,organizationId:string,revision:number,state:LegalLifecycleState)=>hash({recordId,organizationId,revision,state});
const asJson=(value:unknown)=>json(value) as Prisma.InputJsonValue;

@Injectable()
export class LegalContractLifecycleService {
  constructor(private readonly db:DatabaseService){}

  private async write<T>(work:(tx:Tx)=>Promise<T>):Promise<T>{
    try{return await this.db.serializable(work);}catch(error){
      // Concurrent first delivery may hit a unique key before PostgreSQL emits
      // a serialization conflict. A fresh transaction resolves the saved
      // command/source through the ordinary scoped replay checks.
      const e=error as {code?:string;meta?:{code?:string}};
      if(e?.code==='P2002'||e?.code==='P2010'&&e.meta?.code==='23505')return this.db.serializable(work);
      throw error;
    }
  }

  private async access(tx:Tx,organizationId:string,actorId:string):Promise<Access>{
    const actor=await tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true,personId:true}});
    const organization=await tx.organization.findFirst({where:{id:organizationId,status:'ACTIVE'},select:{id:true,ownerId:true}});
    if(!actor||!organization)throw new ForbiddenException('Active verified account and organization are required.');
    const platform=await platformOrganization(tx);
    const member=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId:actorId}}});
    if(platform?.id===organizationId){
      if(platform.ownerId===actorId){
        await requireVerifiedAdmin(tx,actorId);
        if(member&&member.status!=='ACTIVE')throw new ForbiddenException('The internal owner membership is suspended.');
        return {accountId:actorId,personId:actor.personId,manager:true,role:'OWNER'};
      }
      await eligibleReviewParticipant(tx,organizationId,LEGAL_DEPARTMENT,actorId);
      return {accountId:actorId,personId:actor.personId,manager:true,role:'LEGAL_STAFF'};
    }
    if(!member||member.status!=='ACTIVE')throw new ForbiddenException('Active organization membership is required.');
    return {accountId:actorId,personId:actor.personId,manager:['OWNER','ADMIN'].includes(member.role),role:member.role};
  }
  private manager(a:Access){if(!a.manager)throw new ForbiddenException('A current organization manager or assigned internal legal specialist is required.');}
  private async contractAccess(tx:Tx,source:LegalSource,a:Access){
    const platform=await platformOrganization(tx);
    if(platform?.id===source.organizationId&&platform.ownerId!==a.accountId){
      await assignedReviewAccess(tx,a.accountId,source.organizationId,source.id);
    }
    if(source.payload.workflow!=='DIVE_COOPERATION_V1')return;
    // Cooperation originals are private to their parties and platform owner.
    // Organization membership alone must not expand that existing visibility.
    if(platform?.ownerId===a.accountId){await requireVerifiedAdmin(tx,a.accountId);return;}
    if(source.payload.centerAccountId===a.accountId&&['OWNER','ADMIN'].includes(a.role))return;
    if(source.payload.professionalAccountId===a.accountId&&await tx.roleAssignment.findFirst({where:{accountId:a.accountId,role:'INSTRUCTOR',status:'ACTIVE'}}))return;
    throw new ForbiddenException('The native cooperation contract is restricted to its authorized parties and platform owner.');
  }
  private async lock(tx:Tx,organizationId:string,actorId:string){
    await lockAccountIdentities(tx,[actorId]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${organizationId} AND "accountId"::text=${actorId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "Employment" WHERE "organizationId"::text=${organizationId} AND "accountId"::text=${actorId} FOR SHARE`;
    return this.access(tx,organizationId,actorId);
  }
  private async load(tx:Tx,org:string,recordId:string){
    const rows=await tx.$queryRaw<LegalLifecycleRow[]>`SELECT * FROM "LegalContractLifecycle" WHERE "organizationId"::text=${org} AND "id"=${recordId}`;
    if(!rows[0])throw new NotFoundException('The legal follow-up record is not in this organization.');
    return rows[0];
  }
  private async verified(tx:Tx,row:LegalLifecycleRow){
    const events=await tx.$queryRaw<LegalLifecycleEvent[]>`SELECT * FROM "LegalContractLifecycleEvent" WHERE "lifecycleId"=${row.id} AND "organizationId"::text=${row.organizationId} ORDER BY "afterRevision" ASC`;
    requireState(events.length===row.revision&&row.revision<=2000,'The legal history revision is inconsistent.');
    let prior:string|null=null;
    for(let i=0;i<events.length;i++){
      const event=events[i], state=object(event.evidence).afterState as LegalLifecycleState;
      requireState(event.beforeRevision===i&&event.afterRevision===i+1&&event.previousDigest===prior&&state?.schemaVersion===1
        &&event.resultDigest===digest(row.id,row.organizationId,i+1,state),'The legal event history does not match its retained state.');
      prior=event.resultDigest;
    }
    requireState(row.digest===prior&&row.digest===digest(row.id,row.organizationId,row.revision,row.state)
      &&row.documentId===row.state.contract.id&&row.documentVersion===row.state.contract.version&&row.documentHash===row.state.contract.hash,'The legal follow-up snapshot is inconsistent.');
    return events;
  }
  private async source(tx:Tx,row:LegalLifecycleRow,a?:Access){
    const source=await legalNativeSource(tx,row.organizationId,row.documentId,'CONTRACT');
    if(a)await this.contractAccess(tx,source,a);
    requireState(source.version===row.documentVersion&&source.hash===row.documentHash&&hash(source.snapshot)===hash(row.state.contractSnapshot),'The signed contract has changed; review the original source.');
    return source;
  }
  private async view(tx:Tx,row:LegalLifecycleRow,actor:Access,replayed=false){
    const events=await this.verified(tx,row);await this.source(tx,row,actor);
    const s=row.state,today=legalBusinessDate();
    const receipt=(p:LegalProof|null)=>p?{source:p.source,recordedBy:p.recordedBy,recordedAt:p.recordedAt}:null;
    return {id:row.id,organizationId:row.organizationId,revision:row.revision,digest:row.digest,replayed,
      ...s,contractSnapshot:undefined,contract:{...s.contract,title:s.subject},
      obligations:s.obligations.map(o=>({...o,original:receipt(o.original),completion:receipt(o.completion),verification:receipt(o.verification)})),
      policies:s.policies.map(p=>({...p,original:receipt(p.original),cancellation:receipt(p.cancellation)})),
      claims:s.claims.map(c=>({...c,original:receipt(c.original),decision:receipt(c.decision),settlement:c.settlement?{...receipt(c.settlement),financeEntryId:c.settlement.financeEntryId,ledgerHash:c.settlement.ledgerHash}:null})),
      termination:receipt(s.termination),archive:s.archive?{...receipt(s.archive),retainUntil:s.archive.retainUntil}:null,
      validity:today<s.effectiveFrom?'NOT_YET_EFFECTIVE':today>s.expiresOn?'EXPIRED':'IN_FORCE',
      overdueObligations:s.obligations.filter(o=>o.status!=='FULFILLED'&&o.dueAt<today).map(o=>o.id),
      policyValidity:s.policies.map(p=>({id:p.id,status:p.status==='CANCELLED'?'CANCELLED':today<p.coverageFrom?'NOT_YET_EFFECTIVE':today>p.coverageUntil?'EXPIRED':'IN_FORCE'})),
      capabilities:{manage:actor.manager,fulfill:actor.role!=='VIEWER'&&s.status!=='ARCHIVED'&&s.obligations.some(o=>o.responsibleAccountId===actor.accountId&&o.status==='OPEN')},
      events:events.map(e=>({id:e.id,revision:e.afterRevision,action:e.action,actorAccountId:e.actorAccountId,at:e.createdAt,digest:e.resultDigest,evidence:object(e.evidence).source??null})),
      boundary:{moneyExecution:false,legalProfessionalApproval:false,employmentOrOperatingAuthority:false},createdAt:row.createdAt,updatedAt:row.updatedAt};
  }
  private async replay(tx:Tx,org:string,a:Access,commandId:string,requestHash:string){
    const rows=await tx.$queryRaw<LegalLifecycleEvent[]>`SELECT * FROM "LegalContractLifecycleEvent" WHERE "organizationId"::text=${org} AND "commandId"=${commandId}`;
    if(!rows.length)return null;
    if(rows[0].actorAccountId!==a.accountId||rows[0].requestHash!==requestHash)throw new ConflictException('The command identifier was already used for different content or authority.');
    return this.view(tx,await this.load(tx,org,rows[0].lifecycleId),a,true);
  }
  private async persist(tx:Tx,row:LegalLifecycleRow|null,org:string,recordId:string,state:LegalLifecycleState,a:Access,commandId:string,requestHash:string,action:string,evidence:Record<string,unknown>){
    const revision=(row?.revision??0)+1,at=new Date().toISOString(), nextDigest=digest(recordId,org,revision,state);
    if(revision>2000)throw new ConflictException('This record reached its retained event limit; review before extending it.');
    const stateJson=JSON.stringify(state);
    if(row){
      await tx.$executeRaw`UPDATE "LegalContractLifecycle" SET "revision"=${revision},"digest"=${nextDigest},"state"=${stateJson}::jsonb,"updatedAt"=(${at}::timestamptz AT TIME ZONE 'UTC') WHERE "id"=${recordId} AND "organizationId"::text=${org}`;
    }else{
      await tx.$executeRaw`INSERT INTO "LegalContractLifecycle" ("id","organizationId","documentId","documentVersion","documentHash","revision","digest","state","createdByAccountId","createdAt","updatedAt")
        VALUES (${recordId},${nativeKey('Organization',org)},${nativeKey('ManagedDocument',state.contract.id)},${state.contract.version},${state.contract.hash},${revision},${nextDigest},${stateJson}::jsonb,${nativeKey('Account',a.accountId)},(${at}::timestamptz AT TIME ZONE 'UTC'),(${at}::timestamptz AT TIME ZONE 'UTC'))`;
    }
    const retained=JSON.stringify(json({...evidence,afterState:state}));
    await tx.$executeRaw`INSERT INTO "LegalContractLifecycleEvent" ("id","organizationId","lifecycleId","commandId","actorAccountId","requestHash","action","beforeRevision","afterRevision","previousDigest","resultDigest","evidence","createdAt")
      VALUES (${randomUUID()},${nativeKey('Organization',org)},${recordId},${commandId},${nativeKey('Account',a.accountId)},${requestHash},${action},${revision-1},${revision},${row?.digest??null},${nextDigest},${retained}::jsonb,(${at}::timestamptz AT TIME ZONE 'UTC'))`;
    await tx.auditEvent.create({data:{actorId:a.personId,resource:'LegalContractLifecycle',resourceId:recordId,action:'LEGAL_LIFECYCLE_'+action,
      metadata:asJson({organizationId:org,commandId,revision,contract:state.contract,resultDigest:nextDigest,evidence,...(action==='LINK_SETTLEMENT'?{moneyExecuted:false}:{}),professionalLegalApproval:false})}});
    return this.load(tx,org,recordId);
  }
  private initial(source:LegalSource,predecessorId:string|null=null):LegalLifecycleState{
    return {schemaVersion:1,contract:sourceRef(source),contractSnapshot:source.snapshot,...legalContractTerms(source),predecessorId,successorId:null,status:'OPEN',obligations:[],policies:[],claims:[],termination:null,archive:null};
  }
  private proof(source:LegalSource,a:Access):LegalProof{return {source:sourceRef(source),sourceSnapshot:source.snapshot,recordedBy:a.accountId,personId:a.personId,recordedAt:new Date().toISOString()};}
  private independent(a:Access,personId:string){this.manager(a);if(a.personId===personId)throw new ForbiddenException('The decision requires a different person from the recorded executor.');}
  private async verifyProof(tx:Tx,org:string,p:LegalProof){
    const source=await legalNativeSource(tx,org,p.source.id,'EVIDENCE');
    requireState(source.hash===p.source.hash&&source.version===p.source.version&&hash(source.snapshot)===hash(p.sourceSnapshot),'A retained legal evidence source has changed.');
    return source;
  }
  private async evidence(tx:Tx,row:LegalLifecycleRow,documentId:string,action:string,subjectId?:string){
    const source=await legalNativeSource(tx,row.organizationId,documentId,'EVIDENCE'),p=source.payload;
    requireState(p.kind===action&&p.lifecycleId===row.id&&p.contractDocumentId===row.documentId&&integer(p.contractVersion,'Contract version',1)===row.documentVersion&&p.contractHash===row.documentHash,
      'The signed evidence must bind this action and the exact contract version.');
    requireState(subjectId?p.subjectId===subjectId:p.subjectId===undefined||p.subjectId===null||p.subjectId==='','The evidence subject does not match this action.');
    text(p.reference,'Evidence reference',1000);text(p.findings,'Verification findings',8000);
    const occurredAt=timestamp(p.occurredAt);
    requireState(occurredAt.getTime()<=Date.parse(source.signedAt)&&Date.parse(source.signedAt)>=row.createdAt.getTime(),'Evidence must precede its signature, which must follow contract registration.');
    return source;
  }

  async workspaces(actorId:string){return this.db.serializable(async tx=>{
    const memberships=await tx.organizationMember.findMany({where:{accountId:actorId,status:'ACTIVE',organization:{status:'ACTIVE'}},include:{organization:{select:{id:true,displayName:true}}}});
    const platform=await platformOrganization(tx),organizations=memberships.map(m=>m.organization);
    if(platform&&!organizations.some(o=>o.id===platform.id)){const org=await tx.organization.findUniqueOrThrow({where:{id:platform.id},select:{id:true,displayName:true}});organizations.push(org);}
    const items=[];for(const org of organizations){try{const a=await this.access(tx,org.id,actorId);items.push({...org,canManage:a.manager});}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    return {organizations:items};
  });}
  async workspace(actorId:string,org:string){id(org);return this.db.serializable(async tx=>{
    const a=await this.access(tx,org,actorId);
    const records=await tx.$queryRaw<LegalLifecycleRow[]>`SELECT * FROM "LegalContractLifecycle" WHERE "organizationId"::text=${org} ORDER BY "updatedAt" DESC,"id" ASC LIMIT 100`;
    const visibleRecords=[];for(const row of records){try{await this.source(tx,row,a);await this.verified(tx,row);visibleRecords.push(row);}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    const documents=await tx.managedDocument.findMany({where:{organizationId:org,department:LEGAL_DEPARTMENT,status:{in:['SIGNED','ARCHIVED']},template:{code:{in:[LEGAL_CONTRACT_CODE,'LEG-DIVE-COOPERATION-V1',LEGAL_EVIDENCE_CODE]}}},select:{id:true,version:true,referenceNumber:true,template:{select:{code:true,titleAr:true,titleEn:true}},payload:true},orderBy:{updatedAt:'desc'},take:200});
    const sources=[];for(const d of documents){try{const source=await legalNativeSource(tx,org,d.id,d.template.code===LEGAL_EVIDENCE_CODE?'EVIDENCE':'CONTRACT');await this.contractAccess(tx,source,a);sources.push({...sourceRef(source),titleAr:d.template.titleAr,titleEn:d.template.titleEn,kind:d.template.code===LEGAL_EVIDENCE_CODE?'EVIDENCE':'CONTRACT',purpose:source.payload.kind??null,lifecycleId:source.payload.lifecycleId??null,subjectId:source.payload.subjectId??null});}catch(error){if(!(error instanceof HttpException)||error.getStatus()>=500)throw error;}}
    const templates=await tx.documentTemplate.findMany({where:{organizationId:org,code:{in:[LEGAL_CONTRACT_CODE,LEGAL_EVIDENCE_CODE]},status:'ACTIVE'},select:{id:true,code:true,titleAr:true,titleEn:true,fields:true}});
    const platform=await platformOrganization(tx),members=await tx.organizationMember.findMany({where:{organizationId:org,status:'ACTIVE',account:{status:'ACTIVE',emailVerifiedAt:{not:null}}},include:{account:{include:{person:true}}},take:200});
    const responsibleAccounts=[];for(const member of members){if(member.role==='VIEWER')continue;try{await this.access(tx,org,member.accountId);responsibleAccounts.push({id:member.accountId,name:[member.account.person.firstName,member.account.person.lastName].filter(Boolean).join(' ')});}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    const visibleClaimIds=visibleRecords.flatMap(record=>record.state.claims.map(claim=>claim.id));
    const settlementEntries=a.manager?await tx.financeEntry.findMany({where:{organizationId:org,referenceType:LEGAL_CLAIM_REFERENCE,referenceId:{in:visibleClaimIds},status:'POSTED',type:'REVENUE',currency:'SAR'},select:{id:true,referenceId:true,amountMinor:true,currency:true},take:200,orderBy:{postedAt:'desc'}}):[];
    const usedEvidence=await tx.$queryRaw<Array<{documentId:string}>>`SELECT "evidence"->'source'->>'id' AS "documentId" FROM "LegalContractLifecycleEvent" WHERE "organizationId"::text=${org} AND "action" NOT IN ('REGISTER','REGISTER_RENEWAL')`;
    const used=new Set(usedEvidence.map(e=>e.documentId));
    return {organizationId:org,canManage:a.manager,canInstallTemplates:a.role==='OWNER'||a.role==='ADMIN',canDraftEvidence:platform?.id===org?a.role==='OWNER':a.role!=='VIEWER',templates,sources:sources.map(source=>({...source,used:used.has(source.id)})),responsibleAccounts,settlementEntries,
      records:visibleRecords.map(r=>({id:r.id,revision:r.revision,status:r.state.status,subject:r.state.subject,contract:r.state.contract,expiresOn:r.state.expiresOn,openObligations:r.state.obligations.filter(o=>o.status!=='FULFILLED').length,openClaims:r.state.claims.filter(c=>['OPEN','APPROVED'].includes(c.status)).length,updatedAt:r.updatedAt}))};
  });}
  async install(actorId:string,org:string){id(org);return this.write(async tx=>{
    const a=await this.lock(tx,org,actorId);this.manager(a);if(a.role==='LEGAL_STAFF')throw new ForbiddenException('Template installation requires the organization owner.');
    let created=0;
    for(const template of LEGAL_TEMPLATES){
      const row=await tx.documentTemplate.findFirst({where:{organizationId:org,code:template.code},orderBy:{version:'desc'}});
      if(row){requireState(hash(row.fields)===hash(template.fields)&&row.department===LEGAL_DEPARTMENT,'The existing legal template differs; migrate its binding explicitly.');continue;}
      await tx.documentTemplate.create({data:{organizationId:org,department:LEGAL_DEPARTMENT,code:template.code,titleAr:template.titleAr,titleEn:template.titleEn,fields:asJson(template.fields)}});created++;
    }
    if(created)await tx.auditEvent.create({data:{actorId:a.personId,resource:'Organization',resourceId:org,action:'LEGAL_LIFECYCLE_TEMPLATES_INSTALLED',metadata:{created}}});
    return {created};
  });}
  async get(actorId:string,org:string,recordId:string){id(org);id(recordId);return this.db.serializable(async tx=>{const a=await this.access(tx,org,actorId);return this.view(tx,await this.load(tx,org,recordId),a);});}
  async register(actorId:string,org:string,body:unknown){
    id(org);const input=command(body,true),requestHash=hash({organizationId:org,operation:'REGISTER',input}),recordId=randomUUID();
    return this.write(async tx=>{
      const a=await this.lock(tx,org,actorId);this.manager(a);
      const replay=await this.replay(tx,org,a,input.commandId,requestHash);if(replay)return replay;
      const source=await legalNativeSource(tx,org,id(input.contractDocumentId),'CONTRACT');
      await this.contractAccess(tx,source,a);
      requireState(source.version===integer(input.expectedDocumentVersion,'Document version',1)&&source.hash===input.expectedDocumentHash,'The signed contract version changed.');
      const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LegalContractLifecycle" WHERE "organizationId"::text=${org} AND "documentId"::text=${source.id} AND "documentVersion"=${source.version}`;
      requireState(!existing.length,'This exact contract version already has a follow-up record.');
      const row=await this.persist(tx,null,org,recordId,this.initial(source),a,input.commandId,requestHash,'REGISTER',{source:sourceRef(source)});
      return this.view(tx,row,a);
    });
  }
  async act(actorId:string,org:string,recordId:string,body:unknown){
    id(org);id(recordId);const input=command(body),requestHash=hash({organizationId:org,recordId,input}), action=input.action as LegalAction;
    return this.write(async tx=>{
      const a=await this.lock(tx,org,actorId);
      const replay=await this.replay(tx,org,a,input.commandId,requestHash);if(replay)return replay;
      const row=await this.load(tx,org,recordId);await this.verified(tx,row);const contractSource=await this.source(tx,row,a);
      requireState(row.revision===input.expectedRevision,'The follow-up record changed. Reload and review the new revision.');
      requireState(row.state.status!=='ARCHIVED','Archived legal follow-up is read-only.');
      if(action!=='FULFILL_OBLIGATION')this.manager(a);
      else if(a.role==='VIEWER')throw new ForbiddenException('Read-only membership cannot execute an obligation.');
      const needsSubject=!['RENEW','TERMINATE','ARCHIVE'].includes(action),subjectId=needsSubject?id(input.subjectId,'Subject identifier'):undefined;
      const source=await this.evidence(tx,row,id(input.evidenceDocumentId),action,subjectId),p=source.payload,proof=this.proof(source,a),s=json(row.state);
      await this.contractAccess(tx,source,a);
      const used=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LegalContractLifecycleEvent" WHERE "organizationId"::text=${org} AND "evidence"->'source'->>'id'=${source.id}`;
      requireState(!used.length,'This signed evidence has already been consumed.');
      const obligation=s.obligations.find(o=>o.id===subjectId),policy=s.policies.find(v=>v.id===subjectId),claim=s.claims.find(c=>c.id===subjectId);
      if(action==='ADD_OBLIGATION'){
        requireState(s.status==='OPEN'&&!obligation&&s.obligations.length<100,'New obligations require an open record and a new identifier.');
        const responsible=id(p.responsibleAccountId,'Responsible account'),authority=await this.access(tx,org,responsible);
        if(authority.role==='VIEWER')throw new ForbiddenException('Read-only membership cannot hold an execution responsibility.');
        await this.contractAccess(tx,contractSource,authority);
        const dueAt=dateOnly(p.dueAt,'Obligation due date');requireState(dueAt>=s.effectiveFrom,'The obligation cannot predate the contract.');
        s.obligations.push({id:subjectId!,title:text(p.title,'Obligation title',1000),dueAt,responsibleAccountId:responsible,status:'OPEN',original:proof,completion:null,verification:null});
      }
      if(action==='FULFILL_OBLIGATION'){
        requireState(obligation&&obligation.status==='OPEN','An open obligation is required.');
        if(obligation.responsibleAccountId!==a.accountId)throw new ForbiddenException('Only the named responsible account can record fulfilment.');
        await this.verifyProof(tx,org,obligation.original);obligation.status='AWAITING_VERIFICATION';obligation.completion=proof;obligation.verification=null;
      }
      if(action==='VERIFY_OBLIGATION'||action==='REJECT_OBLIGATION'){
        requireState(obligation&&obligation.status==='AWAITING_VERIFICATION'&&obligation.completion,'A completed obligation awaiting independent verification is required.');
        this.independent(a,obligation.completion.personId);await this.verifyProof(tx,org,obligation.completion);
        requireState(Date.parse(source.signedAt)>=Date.parse(obligation.completion.recordedAt),'Verification cannot predate completion.');
        obligation.status=action==='VERIFY_OBLIGATION'?'FULFILLED':'OPEN';obligation.verification=proof;
      }
      if(action==='REOPEN_OBLIGATION'){
        requireState(obligation&&obligation.status==='FULFILLED','A verified obligation is required.');obligation.status='OPEN';obligation.completion=null;obligation.verification=null;
      }
      if(action==='ADD_POLICY'){
        requireState(s.status==='OPEN'&&!policy&&s.policies.length<100,'New insurance coverage requires an open record and a new identifier.');
        const coverageFrom=dateOnly(p.coverageFrom,'Coverage starts'),coverageUntil=dateOnly(p.coverageUntil,'Coverage ends');
        requireState(coverageUntil>=coverageFrom&&coverageUntil>=s.effectiveFrom&&coverageFrom<=s.expiresOn,'Insurance coverage must overlap the contract.');
        const provider=text(p.provider,'Insurer',300),policyNumber=text(p.policyNumber,'Insurance number',200);
        requireState(!s.policies.some(v=>v.provider===provider&&v.policyNumber===policyNumber),'This insurer policy is already recorded.');
        s.policies.push({id:subjectId!,provider,policyNumber,coverageFrom,coverageUntil,scope:text(p.scope,'Insurance scope',8000),status:'ACTIVE',original:proof,cancellation:null});
      }
      if(action==='CANCEL_POLICY'){
        requireState(policy&&policy.status==='ACTIVE','An active insurance record is required.');
        const cutoff=timestamp(p.occurredAt).getTime();
        requireState(s.claims.filter(c=>c.policyId===policy.id&&c.status!=='REJECTED').every(c=>Date.parse(c.occurredAt)<cutoff),'Resolve claims affected by the documented cancellation time first.');
        policy.status='CANCELLED';policy.cancellation=proof;
      }
      if(action==='OPEN_CLAIM'){
        requireState(!claim&&s.claims.length<100,'Use a new claim identifier.');
        const linked=s.policies.find(v=>v.id===p.policyId);requireState(linked,'The claim requires a policy from this same contract.');await this.verifyProof(tx,org,linked.original);
        const occurrence=timestamp(p.occurredAt).toISOString(),day=legalBusinessDate(new Date(occurrence));
        const cancellation=linked.cancellation?await this.verifyProof(tx,org,linked.cancellation):null;
        requireState(day>=linked.coverageFrom&&day<=linked.coverageUntil&&(!cancellation||Date.parse(occurrence)<timestamp(cancellation.payload.occurredAt).getTime()), 'The incident must fall within the recorded coverage period before cancellation.');
        requireState(p.currency==='SAR','Only an explicit SAR claim can link to the existing journal.');
        s.claims.push({id:subjectId!,policyId:linked.id,title:text(p.title,'Claim title',1000),occurredAt:occurrence,amountMinor:integer(p.amountMinor,'Claim amount',1),currency:'SAR',status:'OPEN',original:proof,decision:null,settlement:null});
      }
      if(action==='APPROVE_CLAIM'||action==='REJECT_CLAIM'){
        requireState(claim&&claim.status==='OPEN','An open claim is required.');this.independent(a,claim.original.personId);await this.verifyProof(tx,org,claim.original);
        requireState(Date.parse(source.signedAt)>=Date.parse(claim.original.recordedAt),'The claim decision cannot predate its registration.');
        claim.status=action==='APPROVE_CLAIM'?'APPROVED':'REJECTED';claim.decision=proof;
      }
      if(action==='REOPEN_CLAIM'){
        requireState(claim&&claim.status==='REJECTED','Only a rejected claim can be reopened.');claim.status='OPEN';claim.decision=null;
      }
      if(action==='LINK_SETTLEMENT'){
        requireState(claim&&claim.status==='APPROVED'&&claim.decision,'An independently approved claim is required.');this.independent(a,claim.original.personId);
        await this.verifyProof(tx,org,claim.decision);const entryId=id(p.financeEntryId,'Posted entry');
        await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${entryId} FOR SHARE`;
        const entry=await verifiedEntry(tx,entryId);
        requireState(entry.organizationId===org&&entry.referenceType===LEGAL_CLAIM_REFERENCE&&entry.referenceId===claim.id&&entry.type==='REVENUE'&&entry.amountMinor===claim.amountMinor&&entry.currency===claim.currency,
          'The posted journal must match this exact claim, organization, amount and currency.');
        const people=await tx.account.findMany({where:{id:{in:[entry.requestedByAccountId,entry.approvedByAccountId!,entry.postedByAccountId!]}},select:{personId:true}});
        requireState(people.length===3&&new Set(people.map(x=>x.personId)).size===3,'The journal requires person-level financial separation.');
        requireState(entry.postedAt!.getTime()>=Date.parse(claim.decision.recordedAt)&&Date.parse(source.signedAt)>=entry.postedAt!.getTime(),'The journal and evidence must follow the claim approval.');
        const existing=await tx.$queryRaw<Array<{claimId:string}>>`SELECT "claimId" FROM "LegalContractSettlementReference" WHERE "financeEntryId"::text=${entryId} OR ("organizationId"::text=${org} AND "claimId"=${claim.id})`;
        requireState(!existing.length,'This journal entry or claim is already linked to a settlement.');
        const ledgerHash=hash(entry);await tx.$executeRaw`INSERT INTO "LegalContractSettlementReference" ("financeEntryId","organizationId","lifecycleId","claimId","ledgerHash") VALUES (${nativeKey('FinanceEntry',entryId)},${nativeKey('Organization',org)},${recordId},${claim.id},${ledgerHash})`;
        claim.status='SETTLED';claim.settlement={...proof,financeEntryId:entryId,ledgerHash};
      }
      if(action==='RENEW'){
        requireState(s.status==='OPEN'&&!s.successorId,'Only an open contract can be renewed once.');
        const nextSource=await legalNativeSource(tx,org,id(input.newContractDocumentId),'CONTRACT');
        await this.contractAccess(tx,nextSource,a);
        requireState(p.newContractDocumentId===nextSource.id&&p.newContractVersion===nextSource.version&&p.newContractHash===nextSource.hash&&nextSource.id!==row.documentId&&nextSource.version===integer(input.newContractVersion,'Renewal version',1)&&nextSource.hash===input.newContractHash,'The signed renewal evidence must bind the exact new contract version and digest.');
        const cooperation=contractSource.payload.workflow==='DIVE_COOPERATION_V1',nextCooperation=nextSource.payload.workflow==='DIVE_COOPERATION_V1';
        requireState(cooperation===nextCooperation,'Renewal must preserve the original specialized signing workflow.');
        if(cooperation){
          // Native cooperation originals have no editable predecessor field.
          // The independently signed renewal evidence binds both exact sources;
          // both new party signatures still come from the native producer.
          requireState(nextSource.payload.centerAccountId===contractSource.payload.centerAccountId&&nextSource.payload.professionalAccountId===contractSource.payload.professionalAccountId,'Cooperation renewal requires the same original parties.');
        }else requireState(nextSource.payload.previousContractDocumentId===row.documentId,'The new signed contract must name the previous original.');
        const nextState=this.initial(nextSource,recordId);requireState(nextState.expiresOn>s.expiresOn&&nextState.effectiveFrom>=s.effectiveFrom,'The renewal must extend the contract validity.');
        const exists=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "LegalContractLifecycle" WHERE "organizationId"::text=${org} AND "documentId"::text=${nextSource.id} AND "documentVersion"=${nextSource.version}`;
        requireState(!exists.length,'The renewed source already has a follow-up record.');
        const nextId=randomUUID();await this.persist(tx,null,org,nextId,nextState,a,randomUUID(),hash({parentCommand:input.commandId,newContract:sourceRef(nextSource)}),'REGISTER_RENEWAL',{source:sourceRef(nextSource),predecessorId:recordId});
        s.successorId=nextId;s.status='RENEWED';
      }
      if(action==='TERMINATE'){
        requireState(s.status==='OPEN','Only an open contract can be terminated.');s.status='TERMINATED';s.termination=proof;
      }
      if(action==='ARCHIVE'){
        requireState(s.status!=='OPEN'||legalBusinessDate()>s.expiresOn,'Only an expired, terminated or renewed contract can be archived.');
        requireState(s.obligations.every(o=>o.status==='FULFILLED')&&s.claims.every(c=>['SETTLED','REJECTED'].includes(c.status)), 'Resolve and verify every obligation and claim before archival.');
        for(const obligation of s.obligations){await this.verifyProof(tx,org,obligation.original);if(obligation.completion)await this.verifyProof(tx,org,obligation.completion);if(obligation.verification)await this.verifyProof(tx,org,obligation.verification);}
        for(const policy of s.policies){await this.verifyProof(tx,org,policy.original);if(policy.cancellation)await this.verifyProof(tx,org,policy.cancellation);}
        for(const claim of s.claims){await this.verifyProof(tx,org,claim.original);if(claim.decision)await this.verifyProof(tx,org,claim.decision);if(claim.settlement){await this.verifyProof(tx,org,claim.settlement);requireState(hash(await verifiedEntry(tx,claim.settlement.financeEntryId))===claim.settlement.ledgerHash,'The linked financial ledger changed.');}}
        const retainUntil=dateOnly(p.retainUntil,'Retention date');requireState(retainUntil>=legalBusinessDate()&&retainUntil>=s.expiresOn,'The recorded retention date cannot be earlier than today or contract expiry.');
        s.status='ARCHIVED';s.archive={...proof,retainUntil};
      }
      return this.view(tx,await this.persist(tx,row,org,recordId,s,a,input.commandId,requestHash,action,{source:sourceRef(source),subjectId:subjectId??null}),a);
    });
  }
}
