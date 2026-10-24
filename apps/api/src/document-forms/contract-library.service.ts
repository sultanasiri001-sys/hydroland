import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTemplate, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from '../hr/staffing-catalog';
import { assertOwnerReviewUnexpired, currentOwnerReview, lockOwnerReview, ownerReviewEvidence, sameOwnerReview } from '../hr/temporary-owner-review';
import { contractKeys, contractText } from './cooperation-contract.domain';
import { DIVE_LIBRARY_CODE, editLibraryContent, independentEmploymentLegalReview, isLibraryCode, LIBRARY_PREFIX, LibraryContent, LibraryEnvelope, libraryHash, readLibrary, starterContracts } from './contract-library.domain';

type Tx=Prisma.TransactionClient;
const json=(v:unknown)=>v as Prisma.InputJsonValue;
@Injectable()
export class ContractLibraryService {
  constructor(private readonly db:DatabaseService){}

  private async access(tx:Tx,actorId:string){
    const actor=await tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true,personId:true,roleAssignments:{where:{status:'ACTIVE'},select:{role:true}}}});
    if(!actor)throw new ForbiddenException('يلزم حساب نشط وبريد مؤكد.');
    const platform=await platformOrganization(tx);
    if(!platform)throw new ConflictException('هيّئ الجهة الداخلية لهيدرولاند أولاً.');
    const owner=platform.ownerId===actorId&&actor.roleAssignments.some(r=>r.role==='ADMIN');
    if(owner)await requireVerifiedAdmin(tx,actorId);
    const internal=await tx.organizationMember.findFirst({where:{organizationId:platform.id,accountId:actorId,status:'ACTIVE'},select:{id:true}});
    const staff=Boolean(internal&&actor.roleAssignments.some(r=>r.role==='STAFF'));
    const employments=staff?await tx.employment.findMany({where:{accountId:actorId,organizationId:platform.id,status:'ACTIVE',OR:[{endsAt:null},{endsAt:{gt:new Date()}}],AND:[{OR:[{startsAt:null},{startsAt:{lte:new Date()}}]}],orgUnit:{active:true,organizationId:platform.id}},select:{orgUnit:{select:{code:true}}}}):[];
    const legal=employments.some(e=>e.orgUnit.code==='LEGAL_CONTRACTS_INSURANCE');
    const hr=employments.some(e=>e.orgUnit.code==='HR')&&actor.roleAssignments.some(r=>r.role==='HR_MANAGER'||r.role==='HR_REVIEWER');
    const center=await tx.organizationMember.findFirst({where:{accountId:actorId,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{kind:'DIVE_CENTER',status:'ACTIVE'}},select:{id:true}});
    const reader=Boolean(center)||actor.roleAssignments.some(r=>r.role==='INSTRUCTOR');
    if(!owner&&!legal&&!hr&&!reader)throw new ForbiddenException('مكتبة العقود متاحة للمختصين وأطراف عقود التعاون.');
    return {actor,platform,owner,legal,hr,reader,internal:owner||legal||hr,temporaryOwnerReview:owner?await currentOwnerReview(tx,actorId):null};
  }
  private canEdit(a:Awaited<ReturnType<ContractLibraryService['access']>>,content:LibraryContent){return a.owner||a.legal||a.hr&&content.category==='EMPLOYMENT';}
  private visible(a:Awaited<ReturnType<ContractLibraryService['access']>>,row:DocumentTemplate,e:LibraryEnvelope){
    return a.owner||a.legal||a.hr&&e.content.category==='EMPLOYMENT'||a.reader&&row.code===DIVE_LIBRARY_CODE&&['PUBLISHED','RETIRED'].includes(e.state);
  }
  private async context(tx:Tx,actorId:string,id:string){
    const a=await this.access(tx,actorId),row=await tx.documentTemplate.findUnique({where:{id}});
    if(!row||row.organizationId!==a.platform.id||!isLibraryCode(row.code))throw new NotFoundException('قالب العقد غير موجود.');
    const e=readLibrary(row);
    if(!this.visible(a,row,e))throw new ForbiddenException('هذه النسخة مخصصة للمراجعة الداخلية.');
    return {a,row,e};
  }
  private async locks(tx:Tx,actorId:string){
    await lockOwnerReview(tx);
    // An existing row written by every library mutation also serializes two
    // first versions and two publishes, including serializable stale snapshots.
    await tx.$queryRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('CONTRACT_LIBRARY_WRITE:v1','{"version":1}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp() RETURNING "key"`;
    const platform=await platformOrganization(tx);
    if(!platform)throw new ConflictException('هيّئ الجهة الداخلية أولاً.');
    await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
    await lockAccountIdentities(tx,[actorId,platform.ownerId]);
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${platform.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${actorId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "accountId"::text=${actorId} AND "organizationId"::text=${platform.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "Employment" WHERE "accountId"::text=${actorId} AND "organizationId"::text=${platform.id} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "OrgUnit" WHERE "organizationId"::text=${platform.id} FOR SHARE`;
  }
  private async audit(tx:Tx,personId:string,row:DocumentTemplate,e:LibraryEnvelope,action:string,reason:string){
    const authorities=[e.legalReview?.temporaryOwnerReview,e.hrReview?.temporaryOwnerReview].filter(Boolean);
    await tx.auditEvent.create({data:{actorId:personId,resource:'DocumentTemplate',resourceId:row.id,action,metadata:json({organizationId:row.organizationId,code:row.code,version:row.version,contentHash:e.contentHash,state:e.state,reason,...(e.internalApproval?{internalApproval:e.internalApproval}:{}),...(authorities.length?{temporaryOwnerReviews:authorities}:{})})}});
  }
  private view(a:Awaited<ReturnType<ContractLibraryService['access']>>,row:DocumentTemplate,e:LibraryEnvelope,latest=true){
    const own=e.createdBy===a.actor.id,review=e.state==='IN_REVIEW',temporary=Boolean(a.temporaryOwnerReview),employment=e.content.category==='EMPLOYMENT';
    return {id:row.id,code:row.code,titleAr:row.titleAr,titleEn:row.titleEn,version:row.version,state:e.state,contentHash:e.contentHash,content:e.content,createdAt:row.createdAt,changeReason:a.internal?e.changeReason:null,previousId:a.internal?e.previousId:null,
      internalApproval:a.internal?e.internalApproval??null:null,reviews:{legal:e.legalReview?(a.internal?e.legalReview:{at:e.legalReview.at,reference:'مراجعة داخلية مكتملة'}):null,hr:a.internal?e.hrReview??null:null},publishedAt:e.publishedAt??null,
      integration:{legal:{department:'LEGAL_CONTRACTS_INSURANCE',reviewRequired:true},hr:e.content.category==='EMPLOYMENT'?{department:'HR',sourceOfTruth:'Employment',binding:{templateId:row.id,templateVersion:row.version,templateContentHash:e.contentHash},execution:'HR_DRAFT_BINDING_V1',signing:'HR_WORKFLOW_REQUIRED'}:null,documents:{sourceOfTruth:'ManagedDocument',identityVersion:'MARINE-INCIDENT-IDENTITY-1'},canCreateCooperation:row.code===DIVE_LIBRARY_CODE&&e.state==='PUBLISHED'},
      capabilities:{edit:latest&&this.canEdit(a,e.content)&&e.state!=='SUPERSEDED',submit:this.canEdit(a,e.content)&&e.state==='DRAFT',internalApprove:review&&employment&&a.owner&&!e.internalApproval,legalReview:review&&(employment?a.legal&&!a.owner&&!own:(a.legal||a.owner)&&(!own||temporary))&&!e.legalReview,hrReview:review&&employment&&(a.hr||temporary)&&(!own||temporary)&&!e.hrReview,publish:review&&a.owner&&Boolean(e.legalReview)&&(!employment||Boolean(e.hrReview)&&independentEmploymentLegalReview(e,a.platform.ownerId))&&[e.legalReview,e.hrReview].every(r=>!r?.temporaryOwnerReview||sameOwnerReview(r.temporaryOwnerReview,a.temporaryOwnerReview)),return:review&&this.canEdit(a,e.content),retire:e.state==='PUBLISHED'&&a.owner,history:a.internal}};
  }
  async workspace(actorId:string){return this.db.serializable(async tx=>{const a=await this.access(tx,actorId);return {canInitialize:a.owner,canCreate:a.owner||a.legal||a.hr,internal:a.internal,departments:['LEGAL_CONTRACTS_INSURANCE',...(a.hr||a.owner||a.legal?['HR']:[])],owner:a.owner,temporaryOwnerReview:{active:Boolean(a.temporaryOwnerReview),expiresAt:a.temporaryOwnerReview?.expiresAt??null}};});}
  async list(actorId:string,query:{q?:string;category?:string;state?:string}){
    const q=contractText(query.q??'',160),category=query.category,state=query.state;
    if(category&&!['COOPERATION','EMPLOYMENT','GENERAL'].includes(category)||state&&!['DRAFT','IN_REVIEW','PUBLISHED','RETIRED','SUPERSEDED'].includes(state))throw new BadRequestException('مرشح المكتبة غير صالح.');
    return this.db.serializable(async tx=>{
      const a=await this.access(tx,actorId),rows=await tx.documentTemplate.findMany({where:{organizationId:a.platform.id,code:{startsWith:LIBRARY_PREFIX}},orderBy:[{code:'asc'},{version:'desc'}]});
      const visible=rows.map(row=>({row,e:readLibrary(row)})).filter(({row,e})=>this.visible(a,row,e));
      const latest=new Map<string,typeof visible[number]>();for(const x of visible)if(!latest.has(x.row.code))latest.set(x.row.code,x);
      const items=[...latest.values()].filter(({row,e})=>(!q||`${row.titleAr} ${row.titleEn} ${row.code}`.toLowerCase().includes(q.toLowerCase()))&&(!category||e.content.category===category)&&(!state||e.state===state)).map(({row,e})=>({...this.view(a,row,e),publishedVersion:visible.find(v=>v.row.code===row.code&&v.e.state==='PUBLISHED')?.row.version??null,versionCount:visible.filter(v=>v.row.code===row.code).length}));
      return {items,total:items.length};
    });
  }
  async get(actorId:string,id:string){return this.db.serializable(async tx=>{const {a,row,e}=await this.context(tx,actorId,id);const latest=await tx.documentTemplate.findFirst({where:{organizationId:row.organizationId,code:row.code},orderBy:{version:'desc'},select:{id:true}});return this.view(a,row,e,latest?.id===row.id);});}
  async history(actorId:string,id:string){return this.db.serializable(async tx=>{const {a,row}=await this.context(tx,actorId,id);if(!a.internal)throw new ForbiddenException('سجل المراجعات داخلي.');const rows=await tx.documentTemplate.findMany({where:{organizationId:a.platform.id,code:row.code},orderBy:{version:'desc'}});return {items:rows.map(r=>this.view(a,r,readLibrary(r),r.id===rows[0]?.id))}});}
  async initialize(actorId:string,body:unknown){
    const x=contractKeys(body,['reviewed']);if(x.reviewed!==true)throw new BadRequestException('أكد إضافة القوالب كمسودات للمراجعة.');
    return this.db.serializable(async tx=>{
      await this.locks(tx,actorId);const a=await this.access(tx,actorId);if(!a.owner)throw new ForbiddenException('تهيئة المكتبة لمالك هيدرولاند.');
      let created=0;for(const s of starterContracts()){
        if(await tx.documentTemplate.findFirst({where:{organizationId:a.platform.id,code:s.code},select:{id:true}}))continue;
        const e:LibraryEnvelope={kind:'CONTRACT_LIBRARY_V1',state:'DRAFT',content:s.content,contentHash:libraryHash(s.code,s.titleAr,s.titleEn,s.content),createdBy:actorId,createdAt:new Date().toISOString(),changeReason:'إضافة المسودة الأولية من نموذج هيدرولاند السابق',previousId:null};
        const row=await tx.documentTemplate.create({data:{organizationId:a.platform.id,code:s.code,titleAr:s.titleAr,titleEn:s.titleEn,department:'LEGAL_CONTRACTS_INSURANCE',version:1,status:'INACTIVE',fields:json(e)}});
        await this.audit(tx,a.actor.personId,row,e,'CONTRACT_TEMPLATE_INITIALIZED',e.changeReason);created++;
      }return {created};
    });
  }
  async revise(actorId:string,id:string,body:unknown,copy=false){
    const x=contractKeys(body,['expectedVersion','expectedContentHash','titleAr','titleEn','clauses','usageNotes','reason']);
    const reason=contractText(x.reason,1200);if(reason.length<5)throw new BadRequestException('اكتب سبب التعديل.');
    return this.db.serializable(async tx=>{
      await this.locks(tx,actorId);const {a,row,e}=await this.context(tx,actorId,id);
      if(!this.canEdit(a,e.content))throw new ForbiddenException('تعديل القالب للمختص بالإدارة.');
      if(x.expectedVersion!==row.version||x.expectedContentHash!==e.contentHash)throw new ConflictException('تغير إصدار القالب؛ حدّث المكتبة وراجع النسخة.');
      const latest=await tx.documentTemplate.findFirst({where:{organizationId:a.platform.id,code:row.code},orderBy:{version:'desc'}});
      if(!copy&&(latest?.id!==id||e.state==='SUPERSEDED'))throw new ConflictException('أنشئ التعديل من أحدث نسخة متاحة.');
      const edited=editLibraryContent({titleAr:x.titleAr,titleEn:x.titleEn,clauses:x.clauses,usageNotes:x.usageNotes},e.content);
      if(row.code===DIVE_LIBRARY_CODE&&!copy&&edited.titleAr!=='عقد تعاون محترف غوص')throw new BadRequestException('اسم عقد التعاون المعتمد: عقد تعاون محترف غوص.');
      const code=copy?'CLIB-CUSTOM-'+randomUUID().slice(0,8).toUpperCase():row.code;
      // Copies are reference templates until an explicit execution workflow is
      // implemented; copying a diving template must not grant its signing path.
      if(copy){edited.content={...edited.content,category:e.content.category==='EMPLOYMENT'?'EMPLOYMENT':'GENERAL',workflow:e.content.category==='EMPLOYMENT'?'HR_EMPLOYMENT_TEMPLATE_V1':'REFERENCE_TEMPLATE_V1'};}
      const next:LibraryEnvelope={kind:'CONTRACT_LIBRARY_V1',state:'DRAFT',content:edited.content,contentHash:libraryHash(code,edited.titleAr,edited.titleEn,edited.content),createdBy:actorId,createdAt:new Date().toISOString(),changeReason:reason,previousId:copy?null:row.id};
      const updated=await tx.documentTemplate.create({data:{organizationId:a.platform.id,code,titleAr:edited.titleAr,titleEn:edited.titleEn,department:row.department,version:copy?1:row.version+1,status:'INACTIVE',fields:json(next)}});
      if(!copy&&['DRAFT','IN_REVIEW'].includes(e.state))await tx.documentTemplate.update({where:{id},data:{fields:json({...e,state:'SUPERSEDED'})}});
      await this.audit(tx,a.actor.personId,updated,next,copy?'CONTRACT_TEMPLATE_COPIED':'CONTRACT_TEMPLATE_REVISED',reason);
      return this.view(a,updated,next);
    });
  }
  async decide(actorId:string,id:string,body:unknown){
    const x=contractKeys(body,['expectedVersion','expectedContentHash','action','reason','reference','reviewed']);
    const action=String(x.action),reason=contractText(x.reason,1200),reference=contractText(x.reference??'',240);
    if(x.reviewed!==true||reason.length<5||!['SUBMIT','INTERNAL_APPROVAL','LEGAL_REVIEW','HR_REVIEW','PUBLISH','RETURN','RETIRE'].includes(action))throw new BadRequestException('راجع القالب وأكمل القرار وسببه.');
    return this.db.serializable(async tx=>{
      await this.locks(tx,actorId);const {a,row,e}=await this.context(tx,actorId,id);
      await tx.$queryRaw`SELECT "id" FROM "DocumentTemplate" WHERE "id"::text=${id} FOR UPDATE`;
      if(x.expectedVersion!==row.version||x.expectedContentHash!==e.contentHash)throw new ConflictException('تغير إصدار القالب؛ أعد مراجعته.');
      const caps=this.view(a,row,e).capabilities,next={...e};
      if(action==='SUBMIT'){if(!caps.submit)throw new ForbiddenException('لا يمكن إرسال هذه النسخة للمراجعة.');next.state='IN_REVIEW';}
      if(action==='INTERNAL_APPROVAL'){
        if(!caps.internalApprove)throw new ForbiddenException('الموافقة الداخلية على صياغة قالب الموظف لمالك هيدرولاند.');
        if(reference.length<3)throw new BadRequestException('سجل مرجع الموافقة الداخلية.');
        next.internalApproval={accountId:actorId,at:new Date().toISOString(),contentHash:e.contentHash,reference,purpose:'INTERNAL_DRAFT_PREPARATION_ONLY'};
      }
      if(action==='LEGAL_REVIEW'||action==='HR_REVIEW'){
        if(!(action==='LEGAL_REVIEW'?caps.legalReview:caps.hrReview))throw new ForbiddenException('المراجعة تتطلب مختصاً مستقلاً عن محرر النسخة.');
        if(reference.length<3)throw new BadRequestException('سجل مرجع المراجعة.');
        const exception=e.createdBy===actorId||action==='HR_REVIEW'&&!a.hr;
        if(exception&&a.temporaryOwnerReview)assertOwnerReviewUnexpired(a.temporaryOwnerReview);
        next[action==='LEGAL_REVIEW'?'legalReview':'hrReview']={accountId:actorId,at:new Date().toISOString(),contentHash:e.contentHash,reference,...(exception&&a.temporaryOwnerReview?{temporaryOwnerReview:ownerReviewEvidence(a.temporaryOwnerReview)}:{})};
      }
      if(action==='PUBLISH'){
        if(!caps.publish)throw new ForbiddenException('الاعتماد لمالك هيدرولاند بعد اكتمال المراجعات المستقلة.');
        // Recheck reviewers' present authority, not only their historical role.
        for(const [kind,review] of [['LEGAL',e.legalReview],['HR',e.hrReview]] as const){
          if(!review){if(kind==='HR'&&e.content.category!=='EMPLOYMENT')continue;throw new ConflictException('المراجعات غير مكتملة.');}
          await lockAccountIdentities(tx,[review.accountId]);
          await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${review.accountId} FOR SHARE`;
          await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "accountId"::text=${review.accountId} AND "organizationId"::text=${a.platform.id} FOR SHARE`;
          await tx.$queryRaw`SELECT "id" FROM "Employment" WHERE "accountId"::text=${review.accountId} AND "organizationId"::text=${a.platform.id} FOR SHARE`;
          const reviewer=await this.access(tx,review.accountId);
          const temporary=Boolean(review.temporaryOwnerReview&&sameOwnerReview(review.temporaryOwnerReview,reviewer.temporaryOwnerReview));
          if(kind==='LEGAL'&&e.content.category==='EMPLOYMENT'&&(!independentEmploymentLegalReview(e,a.platform.ownerId)||!reviewer.legal||reviewer.owner))throw new ConflictException('قالب الموظف يتطلب مراجعة قانونية مستقلة من المختص المخول.');
          if(review.temporaryOwnerReview&&!temporary||review.contentHash!==e.contentHash||review.accountId===e.createdBy&&!temporary||!(kind==='LEGAL'?(reviewer.legal||reviewer.owner):reviewer.hr||temporary))throw new ConflictException('صلاحية المراجع أو بصمة مراجعته تغيرت.');
          if(temporary&&reviewer.temporaryOwnerReview)assertOwnerReviewUnexpired(reviewer.temporaryOwnerReview);
        }
        const active=await tx.documentTemplate.findMany({where:{organizationId:a.platform.id,code:row.code,status:'ACTIVE'}});
        for(const old of active){const oldEnvelope=readLibrary(old);await tx.documentTemplate.update({where:{id:old.id},data:{status:'INACTIVE',fields:json({...oldEnvelope,state:'RETIRED'})}});await this.audit(tx,a.actor.personId,old,{...oldEnvelope,state:'RETIRED'},'CONTRACT_TEMPLATE_REPLACED',reason);}
        next.state='PUBLISHED';next.publishedBy=actorId;next.publishedAt=new Date().toISOString();
      }
      if(action==='RETURN'){if(!caps.return)throw new ForbiddenException('لا يمكن إعادة هذه النسخة.');next.state='DRAFT';delete next.internalApproval;delete next.legalReview;delete next.hrReview;}
      if(action==='RETIRE'){if(!caps.retire)throw new ForbiddenException('سحب القالب المعتمد لمالك هيدرولاند.');next.state='RETIRED';}
      const updated=await tx.documentTemplate.update({where:{id},data:{status:next.state==='PUBLISHED'?'ACTIVE':'INACTIVE',fields:json(next)}});
      await this.audit(tx,a.actor.personId,updated,next,'CONTRACT_TEMPLATE_'+action,reason);
      if(['LEGAL_REVIEW','HR_REVIEW','PUBLISH'].includes(action)&&a.temporaryOwnerReview&&[next.legalReview,next.hrReview].some(r=>r?.temporaryOwnerReview))assertOwnerReviewUnexpired(a.temporaryOwnerReview);
      return this.view(a,updated,next);
    });
  }
  async events(actorId:string,id:string){return this.db.serializable(async tx=>{const {a,row}=await this.context(tx,actorId,id);if(!a.internal)throw new ForbiddenException('سجل القرارات داخلي.');return {items:await tx.auditEvent.findMany({where:{resource:'DocumentTemplate',resourceId:row.id,action:{startsWith:'CONTRACT_TEMPLATE_'}},orderBy:{occurredAt:'asc'},select:{action:true,occurredAt:true,metadata:true}})};});}
}
