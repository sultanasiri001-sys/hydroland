import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities } from '../admin/admin-authorization';
import { eligibleReviewParticipant, reviewPlatform, reviewSource } from '../document-forms/internal-document-review.domain';
import { record } from '../hr/staffing-catalog';
import { TECHNOLOGY_REQUEST_POLICY, TECHNOLOGY_REQUEST_PREFIX, TechnologyProof, TechnologyRequestAction, TechnologyRequestRecord,
  historyKey, readTechnologyRequest, requestDigest, requestKey, technologyActions, technologyCreate, technologyId, technologyNext,
  technologyRecordDigest, technologyTransition } from './technology-request.domain';

type Tx=Prisma.TransactionClient;
type Platform=Awaited<ReturnType<typeof reviewPlatform>>;
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const department='TECHNOLOGY_CYBERSECURITY';
const requestTemplates={ACCESS:'TEC-ACCESS-REQUEST',CHANGE:'TEC-CHANGE-REQUEST',INCIDENT:'TEC-SECURITY-INCIDENT',RISK:'TEC-SECURITY-REPORT'} as const;

@Injectable()
export class TechnologyRequestService {
  constructor(private readonly db:DatabaseService){}
  private async owner(tx:Tx,actorId:string){const p=await reviewPlatform(tx);if(actorId!==p.ownerId)throw new ForbiddenException('إنشاء واعتماد طلبات التقنية متاح لمالك الجهة المتحقق.');return p;}
  private async lock(tx:Tx,p:Platform,ids:string[],id?:string){
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,[p.ownerId,...ids]);
    const accounts=[...new Set([p.ownerId,...ids])].sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${p.id} FOR SHARE`;
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "OrganizationMember" WHERE "organizationId"::text=${p.id} AND "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Employment" WHERE "organizationId"::text=${p.id} AND "accountId"::text IN (${Prisma.join(accounts)}) ORDER BY "id" FOR SHARE`);
    if(id)await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"=${requestKey(p.id,id)} FOR UPDATE`;
  }
  private authority(p:Platform){return requestDigest({id:p.id,ownerId:p.ownerId,ownerPersonId:p.ownerPersonId,organizationRevision:p.updatedAt.toISOString(),platformRevision:p.platformRevision,ownerMemberRevision:p.ownerMemberRevision,ownerAuthorityRevision:p.ownerAuthorityRevision,ownerStatusRevision:p.ownerStatusRevision,ownerVerifiedAt:p.ownerVerifiedAt});}
  private async row(tx:Tx,p:Platform,id:string){
    const saved=await tx.operationalSetting.findUnique({where:{key:requestKey(p.id,id)}});if(!saved)throw new NotFoundException('الطلب غير متاح.');
    const row=readTechnologyRequest(saved.value);if(row.id!==id||row.organizationId!==p.id)throw new ConflictException('نطاق الطلب غير متسق.');
    const history=record((await tx.operationalSetting.findUnique({where:{key:historyKey(p.id,id,row.revision)}}))?.value);
    if(history.recordDigest!==row.recordDigest||requestDigest(history.snapshot)!==requestDigest(row))throw new ConflictException('تاريخ الطلب لا يطابق الإصدار الحالي.');return row;
  }
  private async operator(tx:Tx,p:Platform,row:TechnologyRequestRecord){
    if(row.assignee.accountId===p.ownerId||row.assignee.personId===p.ownerPersonId)throw new ForbiddenException('يلزم منفذ مستقل عن صاحب اعتماد الطلب.');
    const current=await eligibleReviewParticipant(tx,p.id,department,row.assignee.accountId,'EMPLOYEE');
    if(requestDigest(current.binding)!==requestDigest(row.assignee)||Date.parse(row.expiresAt)<=Date.now())throw new ForbiddenException('انتهى تكليف المنفذ أو تغيرت عضويته أو صلاحياته.');return current;
  }
  private async reader(tx:Tx,p:Platform,row:TechnologyRequestRecord,actorId:string){
    if(actorId===p.ownerId)return 'OWNER' as const;
    if(actorId!==row.assignee.accountId)throw new NotFoundException('الطلب غير متاح.');
    if(row.state==='REVOKED')throw new ForbiddenException('سُحب تكليف هذا الطلب.');
    await this.operator(tx,p,row);return 'ASSIGNEE' as const;
  }
  private async proof(tx:Tx,p:Platform,expected:{documentId:string;version:number;contentHash:string},approved:boolean){
    await tx.$queryRaw`SELECT "id" FROM "ManagedDocument" WHERE "id"::text=${expected.documentId} AND "organizationId"::text=${p.id} FOR SHARE`;
    const {d,sourceHash}=await reviewSource(tx,p.id,expected.documentId);
    await tx.$queryRaw`SELECT "id" FROM "DocumentTemplate" WHERE "id"::text=${d.templateId} FOR SHARE`;
    if(d.department!==department||d.template.department!==department||d.status==='ARCHIVED'||d.version!==expected.version||d.contentHash!==expected.contentHash||approved&&!['APPROVED','SIGNED'].includes(d.status))throw new ConflictException('مستند الطلب أو الإثبات تغير أو لم يعتمد أو يقع خارج إدارة التقنية.');
    return {proof:{documentId:d.id,version:d.version,contentHash:d.contentHash,sourceHash,reference:d.referenceNumber,templateCode:d.template.code},payload:record(d.payload),createdByAccountId:d.createdByAccountId,approvedByPersonId:d.approvedBy?.personId??null};
  }
  private async pinnedProof(tx:Tx,p:Platform,proof:TechnologyProof,approved=true){const current=await this.proof(tx,p,proof,approved);if(requestDigest(current.proof)!==requestDigest(proof))throw new ConflictException('تغير مصدر مستند الإثبات؛ يلزم مسار مراجعة جديد.');return current;}
  private requestScope(row:Pick<TechnologyRequestRecord,'kind'|'scopeReference'|'targetAccountId'|'accessAction'>,proof:TechnologyProof,payload:Record<string,unknown>){
    const field=row.kind==='ACCESS'?'accountId':row.kind==='CHANGE'?'systemRef':'eventNo';
    if(proof.templateCode!==requestTemplates[row.kind]||payload[field]!== (row.kind==='ACCESS'?row.targetAccountId:row.scopeReference))throw new ConflictException('نوع مستند الطلب أو مرجع نطاقه لا يطابق الحالة.');
    if(row.kind==='ACCESS'&&(payload.system!==row.scopeReference||payload.accessLevel!==(row.accessAction==='APPOINTMENT'?'STAFF':row.accessAction)))throw new ConflictException('نطاق النظام ومستوى الوصول لا يطابقان العملية المحددة.');
  }
  private async target(tx:Tx,p:Platform,row:Pick<TechnologyRequestRecord,'kind'|'targetAccountId'>){
    if(row.kind!=='ACCESS')return;
    const id=row.targetAccountId!;
    const [member,employment]=await Promise.all([tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:p.id,accountId:id}},select:{status:true}}),tx.employment.findFirst({where:{accountId:id,organizationId:p.id},select:{id:true}})]);
    if(!member&&!employment)throw new ConflictException('الحساب المستهدف خارج نطاق الجهة الداخلية.');
    if(id===p.ownerId)throw new ConflictException('طلبات الوصول لا تعدل وصول مالك المنصة.');
  }
  private async auditProof(tx:Tx,p:Platform,row:TechnologyRequestRecord,id:string|null,rollback=false){
    if(row.kind!=='ACCESS'){if(id)throw new BadRequestException('مرجع IAM خاص بطلبات الوصول.');return;}
    if(!id||!row.approval)throw new ConflictException('يلزم أثر تنفيذ IAM من مساره الأصلي.');
    const e=await tx.auditEvent.findUnique({where:{id}}),m=record(e?.metadata);
    if(!e||e.occurredAt.getTime()<Date.parse(row.approval.at)||e.occurredAt.getTime()>Date.now()||![p.ownerPersonId,row.assignee.personId].includes(e.actorId??''))throw new ConflictException('أثر IAM لا يطابق هوية المنفذ أو وقت اعتماد الطلب.');
    if(!rollback&&row.accessAction==='APPOINTMENT'){
      const employment=await tx.employment.findFirst({where:{id:e.resourceId??'',accountId:row.targetAccountId!,organizationId:p.id,status:'ACTIVE'}});
      if(e.action!=='STAFFING_IAM_APPLIED'||e.resource!=='Employment'||!employment||m.organizationId!==p.id||m.profile!=='STAFF'||m.requiresNewLogin!==true)throw new ConflictException('أثر التعيين لا يطابق الحساب والجهة والطلب.');
    }else{
      const status=rollback?(row.accessAction==='SUSPEND'?'ACTIVE':'SUSPENDED'):(row.accessAction==='SUSPEND'?'SUSPENDED':'ACTIVE');
      if(e.action!=='ACCOUNT_STATUS_CHANGED'||e.resource!=='Account'||e.resourceId!==row.targetAccountId||m.status!==status||m.sessionsRevoked!==true)throw new ConflictException('أثر تغيير الوصول لا يثبت الحالة وإبطال الجلسات المطلوبة.');
    }
    const key='TECHNOLOGY_REQUEST_AUDIT_BINDING:v1:'+id;
    const previous=await tx.operationalSetting.findUnique({where:{key}});
    if(previous)throw new ConflictException('أثر التنفيذ مرتبط مسبقًا بطلب أو مرحلة أخرى.');
    await tx.operationalSetting.create({data:{key,value:json({organizationId:p.id,requestId:row.id,revision:row.revision,rollback})}});
  }
  private async currentAccess(tx:Tx,p:Platform,row:TechnologyRequestRecord,rollback=false){
    if(row.kind!=='ACCESS')return;
    const status=rollback?(row.accessAction==='SUSPEND'?'ACTIVE':'SUSPENDED'):(row.accessAction==='SUSPEND'?'SUSPENDED':'ACTIVE');
    const account=await tx.account.findUnique({where:{id:row.targetAccountId!},select:{status:true,emailVerifiedAt:true}});
    if(!account?.emailVerifiedAt||account.status!==status)throw new ConflictException('حالة الوصول الحالية لا تطابق النتيجة الموثقة؛ يلزم تحقق جديد.');
    if(!rollback&&row.accessAction==='APPOINTMENT'){
      const event=row.executionAuditId?await tx.auditEvent.findUnique({where:{id:row.executionAuditId},select:{resourceId:true}}):null;
      const employee=event?.resourceId?await tx.employment.findFirst({where:{id:event.resourceId,accountId:row.targetAccountId!,organizationId:p.id,status:'ACTIVE'},select:{id:true}}):null;
      const staff=await tx.roleAssignment.findUnique({where:{accountId_role:{accountId:row.targetAccountId!,role:'STAFF'}},select:{status:true}});
      const member=await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:p.id,accountId:row.targetAccountId!}},select:{status:true}});
      if(!employee||staff?.status!=='ACTIVE'||member?.status!=='ACTIVE')throw new ConflictException('تغير تنفيذ IAM أو التعيين أو عضوية الحساب منذ توثيقه.');
    }
  }
  private evidenceDefinition(row:TechnologyRequestRecord,rollback=false){
    const revocation=row.kind==='ACCESS'&&(rollback?row.accessAction!=='SUSPEND':row.accessAction==='SUSPEND');
    return {code:row.kind==='ACCESS'?(revocation?'TEC-ACCESS-REVOCATION':'TEC-ACCESS-MATRIX'):row.kind==='CHANGE'?'TEC-RELEASE-RECORD':'TEC-INCIDENT-RESOLUTION',field:row.kind==='ACCESS'?(revocation?'hrDecisionRef':'authorityRef'):row.kind==='CHANGE'?'changeRef':'incidentRef',reference:['INCIDENT','RISK'].includes(row.kind)?row.scopeReference:row.requestProof.reference};
  }
  private evidenceScope(row:TechnologyRequestRecord,proof:TechnologyProof,payload:Record<string,unknown>,rollback=false){
    const {code,field:key,reference:expected}=this.evidenceDefinition(row,rollback);
    if(proof.templateCode!==code||payload[key]!==expected)throw new ConflictException('الإثبات لا يعود إلى الطلب المعتمد أو نطاق الحالة.');
  }
  private async append(tx:Tx,p:Platform,row:TechnologyRequestRecord,actorId:string,action:string,reason:string){
    const actor=await tx.account.findUniqueOrThrow({where:{id:actorId},select:{personId:true}});
    await tx.operationalSetting.create({data:{key:historyKey(p.id,row.id,row.revision),value:json({snapshot:row,recordDigest:row.recordDigest,action,reason,actorAccountId:actorId,at:row.updatedAt})}});
    await tx.auditEvent.create({data:{actorId:actor.personId,action:'TECHNOLOGY_REQUEST_'+action,resource:'TechnologyRequest',resourceId:row.id,metadata:json({organizationId:p.id,revision:row.revision,kind:row.kind,state:row.state,recordDigest:row.recordDigest,executionAuditId:row.executionAuditId,recordsExistingExecution:true})}});
  }
  private summary(row:TechnologyRequestRecord){return {id:row.id,revision:row.revision,kind:row.kind,title:row.title,state:row.state,scopeReference:row.scopeReference,expiresAt:row.expiresAt,createdAt:row.createdAt};}
  private async view(tx:Tx,p:Platform,row:TechnologyRequestRecord,actorId:string){
    const role=await this.reader(tx,p,row,actorId),rows=await tx.operationalSetting.findMany({where:{key:{startsWith:`${'TECHNOLOGY_REQUEST_HISTORY:v1:'}${p.id}:${row.id}:`}},orderBy:{key:'desc'},take:51});
    return {schemaVersion:1,policy:TECHNOLOGY_REQUEST_POLICY,role,record:row,actions:technologyActions(row.state,role),history:rows.slice(0,50).map(x=>{const h=record(x.value);return{action:h.action,reason:h.reason,at:h.at,revision:record(h.snapshot).revision};}),historyTruncated:rows.length>50};
  }
  async list(actorId:string,cursor?:string){
    if(cursor)technologyId(cursor);
    return this.db.serializable(async tx=>{
      const p=await reviewPlatform(tx),owner=p.ownerId===actorId;
      if(!owner)await eligibleReviewParticipant(tx,p.id,department,actorId,'EMPLOYEE');
      const prefix=TECHNOLOGY_REQUEST_PREFIX+p.id+':';
      if(cursor){const before=await this.row(tx,p,cursor);if(!owner&&before.assignee.accountId!==actorId)throw new BadRequestException('مؤشر الطلبات خارج النطاق.');}
      const rows=await tx.operationalSetting.findMany({where:{key:{startsWith:prefix,...(cursor?{gt:requestKey(p.id,cursor)}:{})},...(!owner?{value:{path:['assignee','accountId'],equals:actorId}}:{})},orderBy:{key:'asc'},take:51});
      const items=[];for(const saved of rows.slice(0,50)){const row=readTechnologyRequest(saved.value);if(row.organizationId!==p.id)throw new ConflictException('نطاق قائمة الطلبات غير متسق.');if(!owner){if(row.state==='REVOKED')continue;try{await this.operator(tx,p,row);}catch(e){if(e instanceof ForbiddenException)continue;throw e;}}items.push(this.summary(row));}
      return {schemaVersion:1,policy:TECHNOLOGY_REQUEST_POLICY,role:owner?'OWNER':'ASSIGNEE',items,hasMore:rows.length>50,nextCursor:rows.length>50?readTechnologyRequest(rows[49].value).id:null};
    });
  }
  async detail(actorId:string,id:string){technologyId(id);return this.db.serializable(async tx=>{const p=await reviewPlatform(tx);return this.view(tx,p,await this.row(tx,p,id),actorId);});}
  async references(actorId:string,type:string,kind?:string,caseId?:string,cursor?:string){
    if(!['request','proof','assignee','target','audit'].includes(type))throw new BadRequestException('نوع المرجع غير صالح.');
    if(cursor)technologyId(cursor);if(caseId)technologyId(caseId);
    return this.db.serializable(async tx=>{
      const p=await reviewPlatform(tx),row=caseId?await this.row(tx,p,caseId):null;
      if(type==='proof'||type==='audit'){if(!row)throw new BadRequestException('يلزم تحديد الحالة.');await this.reader(tx,p,row,actorId);}else await this.owner(tx,actorId);
      if(type==='assignee'||type==='target'){
        const where:Prisma.AccountWhereInput=type==='assignee'?{id:{not:p.ownerId},status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'STAFF',status:'ACTIVE'}},employments:{some:{organizationId:p.id,status:'ACTIVE',workerClass:'EMPLOYEE',orgUnit:{code:department,active:true},position:{active:true},AND:[{OR:[{startsAt:null},{startsAt:{lte:new Date()}}]},{OR:[{endsAt:null},{endsAt:{gt:new Date()}}]}]}},organizationMemberships:{some:{organizationId:p.id,status:'ACTIVE'}}}:{OR:[{organizationMemberships:{some:{organizationId:p.id}}},{employments:{some:{organizationId:p.id}}}],id:{not:p.ownerId}};
        const accounts=await tx.account.findMany({where:{...where,...(cursor?{AND:[where,{id:{gt:cursor}}]}:{})},orderBy:{id:'asc'},take:51,select:{id:true,person:{select:{firstName:true,lastName:true}}}});
        return {items:accounts.slice(0,50).map(a=>({id:a.id,label:(a.person.firstName+' '+a.person.lastName).trim()})),nextCursor:accounts.length>50?accounts[49].id:null};
      }
      if(type==='audit'){
        if(row!.kind!=='ACCESS'||!row!.approval)return {items:[],nextCursor:null};
        const employment=await tx.employment.findMany({where:{organizationId:p.id,accountId:row!.targetAccountId!},select:{id:true}});
        const events=await tx.auditEvent.findMany({where:{...(cursor?{id:{gt:cursor}}:{}),actorId:{in:[p.ownerPersonId,row!.assignee.personId]},occurredAt:{gte:new Date(row!.approval.at)},OR:[{resource:'Account',resourceId:row!.targetAccountId,action:'ACCOUNT_STATUS_CHANGED'},{resource:'Employment',resourceId:{in:employment.map(x=>x.id)},action:'STAFFING_IAM_APPLIED'}]},orderBy:{id:'asc'},take:51,select:{id:true,action:true,occurredAt:true}});
        return {items:events.slice(0,50).map(e=>({id:e.id,label:e.action+' · '+e.occurredAt.toISOString()})),nextCursor:events.length>50?events[49].id:null};
      }
      let code:string,field:string|undefined,reference:string|undefined;
      if(type==='request'){if(!kind||!Object.hasOwn(requestTemplates,kind))throw new BadRequestException('نوع الطلب غير صالح.');code=requestTemplates[kind as keyof typeof requestTemplates];}
      else{const definition=this.evidenceDefinition(row!,['ROLLBACK_REQUIRED','ROLLED_BACK'].includes(row!.state)||row!.outcome==='ROLLED_BACK');({code,field,reference}=definition);}
      const docs=await tx.managedDocument.findMany({where:{organizationId:p.id,department,template:{organizationId:p.id,department,code},...(type==='proof'?{status:{in:['APPROVED','SIGNED']},payload:{path:[field!],equals:reference!},...(actorId===p.ownerId?{}:{createdByAccountId:actorId})}:{}),...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:'asc'},take:51,select:{id:true,referenceNumber:true,version:true,contentHash:true,status:true,payload:true}});
      return {items:docs.slice(0,50).map(d=>{const fields=record(d.payload);return {id:d.id,label:d.referenceNumber+' · '+d.status,version:d.version,contentHash:d.contentHash,...(type==='request'?{scopeReference:fields[kind==='ACCESS'?'system':kind==='CHANGE'?'systemRef':'eventNo'],...(kind==='ACCESS'?{targetAccountId:fields.accountId,accessAction:fields.accessLevel==='STAFF'?'APPOINTMENT':fields.accessLevel}:{} )}:{})};}),nextCursor:docs.length>50?docs[49].id:null};
    });
  }
  async create(actorId:string,body:unknown){
    const input=technologyCreate(body),digest=requestDigest(input);
    return this.db.serializable(async tx=>{
      const initial=await this.owner(tx,actorId);await this.lock(tx,initial,[actorId,input.assigneeAccountId,...(input.targetAccountId?[input.targetAccountId]:[])]);
      const p=await this.owner(tx,actorId);if(p.id!==initial.id)throw new ConflictException('تغيرت جهة الطلب.');
      const id=input.requestKey,previous=await tx.operationalSetting.findUnique({where:{key:requestKey(p.id,id)}});
      if(previous){const old=await this.row(tx,p,id);if(old.requestDigest!==digest)throw new ConflictException('مرجع الطلب مستخدم لمحتوى مختلف.');return {...await this.view(tx,p,old,actorId),created:false};}
      const assignee=(await eligibleReviewParticipant(tx,p.id,department,input.assigneeAccountId,'EMPLOYEE')).binding;
      if(assignee.personId===p.ownerPersonId)throw new ConflictException('يلزم منفذ مستقل عن صاحب الاعتماد.');
      const source=await this.proof(tx,p,{documentId:input.requestDocumentId,version:input.requestDocumentVersion,contentHash:input.requestDocumentHash},false);
      this.requestScope(input,source.proof,source.payload);await this.target(tx,p,input);
      if(input.targetAccountId===assignee.accountId)throw new ConflictException('لا يمكن إسناد تغيير وصول الموظف إلى الموظف نفسه.');
      const sourceKey=`TECHNOLOGY_REQUEST_SOURCE:v1:${p.id}:${source.proof.documentId}:${source.proof.version}`;
      if(await tx.operationalSetting.findUnique({where:{key:sourceKey}}))throw new ConflictException('إصدار مستند الطلب مرتبط بالفعل بحالة؛ افتح الحالة الأصلية.');
      await tx.operationalSetting.create({data:{key:sourceKey,value:json({requestId:id})}});
      const now=new Date().toISOString();
      const row:TechnologyRequestRecord={policy:TECHNOLOGY_REQUEST_POLICY,id,organizationId:p.id,requestKey:id,requestDigest:digest,revision:1,kind:input.kind,title:input.title,scopeReference:input.scopeReference,executionPlan:input.executionPlan,testPlan:input.testPlan,rollbackPlan:input.rollbackPlan,targetAccountId:input.targetAccountId,accessAction:input.accessAction,requestedByAccountId:actorId,assignee,expiresAt:input.expiresAt,requestProof:source.proof,state:'DRAFT',approval:null,executionProof:null,verificationProof:null,rollbackProof:null,executionAuditId:null,rollbackAuditId:null,riskReviewAt:null,outcome:null,createdAt:now,updatedAt:now,recordDigest:''};row.recordDigest=technologyRecordDigest(row);
      await tx.operationalSetting.create({data:{key:requestKey(p.id,id),value:json(row)}});await this.append(tx,p,row,actorId,'CREATE','إنشاء طلب تقني محدد النطاق والمنفذ والمدة.');return {...await this.view(tx,p,row,actorId),created:true};
    });
  }
  async transition(actorId:string,id:string,action:TechnologyRequestAction,body:unknown){
    technologyId(id);const input=technologyTransition(body,action);
    return this.db.serializable(async tx=>{
      const initial=await reviewPlatform(tx),before=await this.row(tx,initial,id);
      await this.lock(tx,initial,[actorId,before.assignee.accountId,...(before.targetAccountId?[before.targetAccountId]:[])],id);
      const p=await reviewPlatform(tx);if(p.id!==initial.id)throw new ConflictException('تغيرت جهة الطلب.');
      const row=await this.row(tx,p,id),role=await this.reader(tx,p,row,actorId);
      if(row.revision!==input.expectedRevision)throw new ConflictException('تغير إصدار الطلب؛ أعد القراءة قبل الإجراء.');
      const next=technologyNext(row.state,action,role);
      if(action!=='REVOKE'){
        await this.operator(tx,p,row);await this.target(tx,p,row);
        const source=await this.pinnedProof(tx,p,row.requestProof,!['SUBMIT','REJECT'].includes(action));this.requestScope(row,row.requestProof,source.payload);
        if(!['SUBMIT','APPROVE','REJECT'].includes(action)&&(!row.approval||row.approval.authorityDigest!==this.authority(p)))throw new ConflictException('تغير صاحب اعتماد الطلب أو صلاحياته؛ التنفيذ محجوب.');
      }
      const now=new Date().toISOString(),updated={...row,state:next,revision:row.revision+1,updatedAt:now};
      if(action==='APPROVE')updated.approval={accountId:actorId,personId:p.ownerPersonId,authorityDigest:this.authority(p),at:now};
      if(input.proof){
        const proof=await this.proof(tx,p,input.proof,true);this.evidenceScope(row,proof.proof,proof.payload,action==='RECORD_ROLLBACK'||row.state==='ROLLED_BACK');
        if(action==='PASS_TEST'||action==='ACCEPT_RISK'){
          if(action==='ACCEPT_RISK'&&(row.kind!=='RISK'||typeof proof.payload.riskOrClosureDecisionRef!=='string'||!proof.payload.riskOrClosureDecisionRef.trim()))throw new ConflictException('قبول الخطر يحتاج حالة خطر ومحضر قرار صاحبه.');
          if(proof.approvedByPersonId!==p.ownerPersonId||[row.executionProof?.documentId,row.rollbackProof?.documentId].includes(proof.proof.documentId))throw new ConflictException('التحقق يحتاج محضرًا مستقلاً معتمدًا من صاحب القرار.');
          const execution=row.state==='ROLLED_BACK'?row.rollbackProof:row.executionProof;if(!execution)throw new ConflictException('أثر التنفيذ غير مكتمل.');await this.pinnedProof(tx,p,execution);
          await this.currentAccess(tx,p,row,row.state==='ROLLED_BACK');
          updated.verificationProof=proof.proof;updated.outcome=action==='ACCEPT_RISK'?'RISK_ACCEPTED':row.state==='ROLLED_BACK'?'ROLLED_BACK':'COMPLETED';updated.riskReviewAt=input.riskReviewAt;
        }else{
          if(proof.createdByAccountId!==actorId)throw new ForbiddenException('سجّل التنفيذ بمحضر تملكه ومعتمد في مساره الأصلي.');
          await this.auditProof(tx,p,row,input.executionAuditId,action==='RECORD_ROLLBACK');
          if(action==='RECORD_ROLLBACK'){updated.rollbackProof=proof.proof;updated.rollbackAuditId=input.executionAuditId;updated.verificationProof=null;updated.outcome=null;}else{updated.executionProof=proof.proof;updated.executionAuditId=input.executionAuditId;}
          await this.currentAccess(tx,p,updated,action==='RECORD_ROLLBACK');
        }
      }
      if(action==='FAIL_TEST'||action==='REQUEST_ROLLBACK'){updated.verificationProof=null;updated.outcome=null;}
      if(action==='CLOSE'){
        if(row.outcome==='RISK_ACCEPTED'&&(!row.riskReviewAt||Date.parse(row.riskReviewAt)<=Date.now()))throw new ConflictException('حان موعد مراجعة الخطر المقبول؛ يلزم قرار جديد قبل الإقفال.');
        if(!row.verificationProof||!row.outcome)throw new ConflictException('لا يمكن إقفال طلب دون تحقق مثبت.');
        const verification=await this.pinnedProof(tx,p,row.verificationProof);if(verification.approvedByPersonId!==p.ownerPersonId)throw new ConflictException('تغير اعتماد التحقق.');
        const execution=row.outcome==='ROLLED_BACK'?row.rollbackProof:row.executionProof;if(!execution)throw new ConflictException('أثر التنفيذ غير مكتمل.');await this.pinnedProof(tx,p,execution);
        await this.currentAccess(tx,p,row,row.outcome==='ROLLED_BACK');
      }
      updated.recordDigest=technologyRecordDigest(updated);
      await tx.operationalSetting.update({where:{key:requestKey(p.id,id)},data:{value:json(updated),updatedAt:new Date()}});
      await this.append(tx,p,updated,actorId,action,input.reason);return this.view(tx,p,updated,actorId);
    });
  }
}
