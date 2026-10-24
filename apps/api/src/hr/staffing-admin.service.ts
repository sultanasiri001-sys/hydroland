import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { lockAccountIdentities, lockAdminIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { AuthService } from '../auth/auth.service';
import { EmailDeliveryService } from '../integrations/email-delivery.service';
import { StaffingIamService } from '../technology-security/staffing-iam.service';
import { HrService } from './hr.service';
import { intentKey, platformOrganization, platformOwnerCanReview, PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, profileFor, readIntent, record, reviewedReason, STAFFING_DEPARTMENTS, STAFFING_PROFILES, StaffingIntent, textField } from './staffing-catalog';

import { delegationKey, eligibleDelegate, readDelegations, requireDelegationOwner, requireStaffApprovalAuthority, staffApprovalAuthority } from './staff-approval-authority';

const publicAccount={id:true,email:true,status:true,emailVerifiedAt:true,person:{select:{firstName:true,lastName:true}}} as const;
const movementView={id:true,type:true,status:true,reason:true,requestedByAccountId:true,reviewedByAccountId:true,approvedByAccountId:true,createdAt:true,updatedAt:true,effectiveAt:true,
  employment:{select:{id:true,accountId:true,organizationId:true,orgUnitId:true,positionId:true,status:true,account:{select:{...publicAccount,roleAssignments:{select:{role:true,status:true,scope:true}},organizationMemberships:{select:{organizationId:true,status:true}}}},orgUnit:{select:{id:true,code:true,nameAr:true,active:true}},position:{select:{id:true,titleAr:true,active:true,orgUnitId:true}}}}} as const;
type MovementView=Prisma.EmploymentMovementGetPayload<{select:typeof movementView}>;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const complianceReasons=new Set(['HR_COMPLIANCE_CONTROLS_MISSING','HR_COMPLIANCE_REQUIREMENT_MISSING','HR_COMPLIANCE_EVIDENCE_MISSING','HR_COMPLIANCE_VALIDATION_FAILED','HR_COMPLIANCE_BLOCKING_FINDING']);

@Injectable()
export class StaffingAdminService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly auth:AuthService,private readonly hr:HrService,private readonly iam:StaffingIamService,private readonly email:EmailDeliveryService){}

  private async lockWrites(tx:Prisma.TransactionClient){
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hydroland.admin.staffing')::bigint)`;
    // A write to the shared row forces a serializable retry after a waiter saw
    // an older snapshot, including concurrent creation of previously absent IDs.
    await tx.$queryRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('STAFFING_WRITE_SERIALIZATION:v1','{"version":1}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp() RETURNING "key"`;
  }

  private async writeLock(tx:Prisma.TransactionClient,actorId:string,targetId?:string){
    await this.lockWrites(tx);
    return lockAdminIdentities(tx,actorId,targetId);
  }

  private async reviewAuthority(tx:Prisma.TransactionClient,organization:{ownerId:string}|null,actorId:string){
    const owner=organization?await tx.account.findFirst({where:{id:organization.ownerId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}}):null;
    return {kind:'PLATFORM_OWNER' as const,available:Boolean(owner),isCurrentAccount:Boolean(owner&&owner.id===actorId)};
  }

  private async approvalReadiness(tx:Prisma.TransactionClient,organization:{id:string;ownerId:string}|null,actorId:string){
    const available=await tx.account.count({where:{status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}}});
    let compliance={ready:true,reason:'READY'};
    try{await this.hr.assertProductionCompliance('APPROVE_APPOINTMENT',tx);}
    catch(error){
      const reason=error instanceof Error?error.message.split(':')[0]:'';
      if(!complianceReasons.has(reason))throw error;
      // Only the category is returned, never control references or evidence.
      compliance={ready:false,reason};
    }
    return {checkedAt:new Date().toISOString(),independentAdministrators:{required:1,available},approvalAuthority:organization?{kind:(await staffApprovalAuthority(tx,organization,actorId))?.kind??null,canManageDelegations:organization.ownerId===actorId}:null,reviewAuthority:await this.reviewAuthority(tx,organization,actorId),compliance};
  }

  async delegationList(actorId:string){
    return this.db.serializable(async tx=>{
      const organization=await platformOrganization(tx);if(!organization)throw new ConflictException('هيّئ الهيكل الداخلي أولًا.');
      await requireDelegationOwner(tx,organization,actorId);
      return this.presentDelegations(tx,organization);
    });
  }

  private async presentDelegations(tx:Prisma.TransactionClient,organization:{id:string;ownerId:string}){
    const state=await readDelegations(tx,organization);
    const items=await Promise.all(state.grants.map(async grant=>{
      const account=await tx.account.findUnique({where:{id:grant.accountId},select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}});
      return {accountId:grant.accountId,email:account?.email??null,person:account?.person??null,createdAt:grant.createdAt,eligible:Boolean(await eligibleDelegate(tx,organization.id,grant.accountId))};
    }));
    return {revision:state.revision,scope:'ALL_INTERNAL_DEPARTMENTS',items};
  }

  async changeDelegation(actorId:string,body:unknown){
    const x=record(body),reason=reviewedReason(body,['action','email','accountId','expectedRevision','reason','reviewed']);
    if(!['GRANT','REVOKE'].includes(String(x.action))||typeof x.expectedRevision!=='string'||x.expectedRevision.length>40||x.action==='GRANT'&&(x.accountId!==undefined||typeof x.email!=='string'||x.email.length>254||! /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(x.email.trim()))||x.action==='REVOKE'&&(x.email!==undefined||!uuid(x.accountId)))throw new BadRequestException('بيانات تفويض الاعتماد غير صالحة.');
    return this.db.serializable(async tx=>{
      await this.lockWrites(tx);
      const organization=await platformOrganization(tx);if(!organization)throw new ConflictException('هيّئ الهيكل الداخلي أولًا.');
      // Check ownership before looking up the submitted employee email.
      await requireDelegationOwner(tx,organization,actorId);
      const target=x.action==='GRANT'?await tx.account.findFirst({where:{email:{equals:(x.email as string).trim(),mode:'insensitive'}},select:{id:true}}):{id:x.accountId as string};
      if(!target)throw new NotFoundException('لا يوجد حساب موظف مطابق للبريد.');
      await lockAccountIdentities(tx,[actorId,target.id,organization.ownerId]);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organization.id} FOR UPDATE`;
      const actor=await requireDelegationOwner(tx,organization,actorId),state=await readDelegations(tx,organization);
      if(state.revision!==x.expectedRevision)throw new ConflictException('تغيرت التفويضات؛ حدّث القائمة وراجع الإجراء.');
      if(target.id===organization.ownerId)throw new BadRequestException('مالك الجهة يملك صلاحية الاعتماد بالفعل.');
      let grants=state.grants;
      if(x.action==='GRANT'){
        if(!await eligibleDelegate(tx,organization.id,target.id))throw new ConflictException('التفويض يتطلب موظفًا نشطًا في هيدرولاند، بحساب وبريد وصلاحية موظف وعضوية داخلية نشطة.');
        if(grants.some(g=>g.accountId===target.id))throw new ConflictException('الموظف مفوض بالفعل.');
        if(grants.length>=20)throw new ConflictException('وصل عدد المفوضين إلى الحد المتاح.');
        grants=[...grants,{accountId:target.id,createdAt:new Date().toISOString()}];
      }else{
        if(!grants.some(g=>g.accountId===target.id))throw new ConflictException('التفويض غير موجود أو تغير مالك الجهة.');
        grants=grants.filter(g=>g.accountId!==target.id);
      }
      const organizationRevision=(await tx.organization.findUniqueOrThrow({where:{id:organization.id},select:{updatedAt:true}})).updatedAt.toISOString();
      const next={version:1,ownerId:organization.ownerId,organizationRevision,revision:randomUUID(),grants};
      await tx.operationalSetting.upsert({where:{key:delegationKey(organization.id)},create:{key:delegationKey(organization.id),value:next},update:{value:next}});
      await this.audit.record({actorId:actor.personId,action:x.action==='GRANT'?'STAFF_APPROVAL_DELEGATED':'STAFF_APPROVAL_REVOKED',resource:'Organization',resourceId:organization.id,metadata:{accountId:target.id,reason,scope:'ALL_INTERNAL_DEPARTMENTS',previousRevision:state.revision,revision:next.revision}},tx);
      return this.presentDelegations(tx,organization);
    });
  }

  async approvalCapability(actorId:string){
    return this.db.serializable(async tx=>{const organization=await platformOrganization(tx);const authority=organization?await staffApprovalAuthority(tx,organization,actorId):null;return {canApprove:Boolean(authority),kind:authority?.kind??null};});
  }

  async delegatedDecision(actorId:string,id:string,body:unknown){
    if(record(body).action!=='APPROVE')throw new ForbiddenException('هذا المسار لاعتماد التعيين فقط.');
    return this.decide(actorId,id,body);
  }

  async initialize(actorId:string,body:unknown){
    const reason=reviewedReason(body,['reason','reviewed']);
    return this.db.serializable(async tx=>{
      const actor=await this.writeLock(tx,actorId);
      let organization=await platformOrganization(tx);
      const configuredNow=!organization;
      if(!organization){
        const candidates=await tx.organization.findMany({where:{kind:PLATFORM_STAFFING_KIND},select:{id:true,status:true,ownerId:true},take:2});
        if(candidates.length>1||candidates.some(o=>o.status!=='ACTIVE'))throw new ConflictException('يلزم توحيد جهة هيدرولاند الداخلية قبل التهيئة.');
        organization=candidates[0]?{...candidates[0],kind:PLATFORM_STAFFING_KIND}:await tx.organization.create({data:{displayName:'هيدرولاند — الجهة الداخلية',kind:PLATFORM_STAFFING_KIND,status:'ACTIVE',ownerId:actor.id},select:{id:true,kind:true,status:true,ownerId:true}});
        await tx.operationalSetting.create({data:{key:PLATFORM_STAFFING_KEY,value:{version:1,organizationId:organization.id}}});
      }
      let hq=await tx.orgUnit.findUnique({where:{organizationId_code:{organizationId:organization.id,code:'HYDROLAND_HQ'}}});
      let added=0;
      if(!hq){hq=await tx.orgUnit.create({data:{organizationId:organization.id,type:'HQ',code:'HYDROLAND_HQ',nameAr:'المقر الرئيسي لهيدرولاند'}});added++;}
      if(hq.type!=='HQ'||!hq.active)throw new ConflictException('المقر الداخلي الحالي يحتاج مراجعة.');
      for(const department of STAFFING_DEPARTMENTS){
        const existing=await tx.orgUnit.findUnique({where:{organizationId_code:{organizationId:organization.id,code:department.code}}});
        if(existing){if(existing.type!=='DEPARTMENT'||existing.parentId!==hq.id)throw new ConflictException('تعارض في الهيكل التنظيمي الحالي.');continue;}
        await tx.orgUnit.create({data:{organizationId:organization.id,parentId:hq.id,type:'DEPARTMENT',...department}});added++;
      }
      if(added||configuredNow)await this.audit.record({actorId:actor.personId,action:'STAFFING_STRUCTURE_INITIALIZED',resource:'Organization',resourceId:organization.id,metadata:{reason,addedUnits:added,departmentCodes:STAFFING_DEPARTMENTS.map(d=>d.code)}},tx);
      return {initialized:true,organizationId:organization.id};
    });
  }

  async list(actorId:string,input:{search?:unknown;cursor?:unknown}={},delegated=false){
    if(input.search!==undefined&&typeof input.search!=='string'||input.cursor!==undefined&&typeof input.cursor!=='string')throw new BadRequestException('بحث الموظفين غير صالح.');
    const search=typeof input.search==='string'?input.search.trim():'';
    if(search.length>120||input.cursor&&!uuid(input.cursor))throw new BadRequestException('بحث الموظفين غير صالح.');
    return this.db.serializable(async tx=>{
      const organization=await platformOrganization(tx);
      if(delegated){if(!organization)throw new ForbiddenException();await requireStaffApprovalAuthority(tx,organization,actorId);}else await requireVerifiedAdmin(tx,actorId);
      const email=this.email.publicConfig(),google={enabled:this.auth.googleConfig().enabled};
      const approvalReadiness=await this.approvalReadiness(tx,organization,actorId);
      if(!organization)return {initialized:false,departments:[],profiles:STAFFING_PROFILES,email,google,approvalReadiness,items:[],nextCursor:null};
      const departments=await tx.orgUnit.findMany({where:{organizationId:organization.id,type:'DEPARTMENT',code:{in:STAFFING_DEPARTMENTS.map(d=>d.code)}},select:{id:true,code:true,nameAr:true,active:true},orderBy:{code:'asc'}});
      const rows=await tx.employmentMovement.findMany({where:{type:'APPOINTMENT',employment:{organizationId:organization.id,...(search?{account:{OR:[{email:{contains:search,mode:'insensitive'}},{person:{firstName:{contains:search,mode:'insensitive'}}},{person:{lastName:{contains:search,mode:'insensitive'}}}]}}:{})}},select:movementView,orderBy:[{createdAt:'desc'},{id:'desc'}],take:21,...(input.cursor?{cursor:{id:input.cursor as string},skip:1}:{})});
      const items=await Promise.all(rows.slice(0,20).map(row=>this.present(tx,row,actorId,organization,approvalReadiness.reviewAuthority)));
      return {initialized:true,departments,profiles:STAFFING_PROFILES,email,google,approvalReadiness,items,nextCursor:rows.length>20?rows[19].id:null};
    });
  }

  async request(actorId:string,body:unknown){
    const x=record(body),reason=reviewedReason(body,['mode','accountId','email','firstName','lastName','verificationMethod','departmentCode','jobTitle','profile','reason','reviewed','requestId']);
    if(x.mode!=='CREATE'&&x.mode!=='LINK'||!uuid(x.requestId))throw new BadRequestException('حدد إنشاء الحساب أو ربطه وأعد إرسال الطلب.');
    const departmentCode=textField(x.departmentCode,'الإدارة'),jobTitle=textField(x.jobTitle,'المسمى الوظيفي'),profile=profileFor(x.profile,departmentCode);
    if(!STAFFING_DEPARTMENTS.some(d=>d.code===departmentCode))throw new BadRequestException('الإدارة غير معتمدة.');
    const identity=x.mode==='CREATE'?{email:textField(x.email,'البريد',254).toLowerCase(),firstName:textField(x.firstName,'الاسم الأول',80),lastName:textField(x.lastName,'اسم العائلة',80)}:null;
    if(x.mode==='LINK'&&!uuid(x.accountId)||identity&&!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(identity.email))throw new BadRequestException('بيانات الحساب غير صالحة.');
    if(x.mode==='CREATE'&&(x.accountId!==undefined||!['EMAIL','GOOGLE'].includes(String(x.verificationMethod)))||x.mode==='LINK'&&['email','firstName','lastName','verificationMethod'].some(k=>x[k]!==undefined))throw new BadRequestException('استخدم بيانات المسار المحدد فقط.');
    const fingerprint=hash({mode:x.mode,accountId:x.accountId??null,identity,verificationMethod:x.verificationMethod??'EXISTING',departmentCode,jobTitle,profile:profile.code,reason});
    const retryKey=`STAFFING_REQUEST:${actorId}:${x.requestId}`;
    return this.db.serializable(async tx=>{
      const actor=await this.writeLock(tx,actorId,x.mode==='LINK'?x.accountId as string:undefined);
      const organization=await platformOrganization(tx);if(!organization)throw new ConflictException('هيّئ الهيكل الداخلي أولًا.');
      const replay=record((await tx.operationalSetting.findUnique({where:{key:retryKey}}))?.value);
      if(replay.movementId){if(replay.fingerprint!==fingerprint)throw new ConflictException('مفتاح الطلب مستخدم ببيانات مختلفة.');return this.get(tx,String(replay.movementId),actorId,organization);}
      const unit=await tx.orgUnit.findUnique({where:{organizationId_code:{organizationId:organization.id,code:departmentCode}}});
      if(!unit?.active||unit.type!=='DEPARTMENT')throw new ConflictException('الإدارة غير متاحة للتوظيف.');
      if(identity&&x.verificationMethod==='EMAIL'&&!this.email.publicConfig().enabled)throw new ServiceUnavailableException('خدمة التحقق بالبريد غير جاهزة لإنشاء حساب جديد. اختر Google أو اربط حسابًا متحققًا موجودًا.');
      const account=identity?await this.auth.provisionPendingAccount(tx,identity,x.verificationMethod as 'EMAIL'|'GOOGLE'):await tx.account.findUnique({where:{id:x.accountId as string},select:{...publicAccount,personId:true}});
      if(!account)throw new NotFoundException('الحساب غير موجود.');
      if(!identity&&(account.status!=='ACTIVE'||!account.emailVerifiedAt))throw new ConflictException('الربط يتطلب حسابًا نشطًا أكمل التحقق من بريده.');
      let employment=await tx.employment.findFirst({where:{accountId:account.id,organizationId:organization.id,status:{notIn:['TERMINATED','OFFBOARDED']}},orderBy:{createdAt:'desc'}});
      if(employment){
        const last=await tx.employmentMovement.findFirst({where:{employmentId:employment.id},orderBy:{createdAt:'desc'}});
        if(employment.status!=='DRAFT'||!last||!['REJECTED','CANCELLED'].includes(last.status))throw new ConflictException('يوجد تعيين أو طلب توظيف قائم لهذا الحساب.');
      }
      const code=`JOB_${hash(jobTitle).slice(0,24)}`;
      let position=await tx.position.findUnique({where:{orgUnitId_code:{orgUnitId:unit.id,code}}});
      if(!position)position=await tx.position.create({data:{orgUnitId:unit.id,code,titleAr:jobTitle}});
      if(!position.active)throw new ConflictException('الوظيفة غير متاحة.');
      employment=employment?await tx.employment.update({where:{id:employment.id},data:{orgUnitId:unit.id,positionId:position.id,status:'PENDING_APPROVAL'}}):await tx.employment.create({data:{accountId:account.id,organizationId:organization.id,orgUnitId:unit.id,positionId:position.id,workerClass:'EMPLOYEE',status:'PENDING_APPROVAL'}});
      await tx.hrCandidate.upsert({where:{organizationId_personId:{organizationId:organization.id,personId:account.personId}},create:{organizationId:organization.id,personId:account.personId,status:'SUBMITTED'},update:{}});
      const movement=await tx.employmentMovement.create({data:{employmentId:employment.id,type:'APPOINTMENT',status:'HR_REVIEW',toOrgUnitId:unit.id,toPositionId:position.id,requestedByAccountId:actor.id,reason}});
      const intent:StaffingIntent={version:1,employmentId:employment.id,accountId:account.id,organizationId:organization.id,orgUnitId:unit.id,positionId:position.id,profile:profile.code,verificationMethod:identity?x.verificationMethod as 'EMAIL'|'GOOGLE':'EXISTING'};
      await tx.operationalSetting.create({data:{key:intentKey(movement.id),value:intent}});
      await tx.operationalSetting.create({data:{key:retryKey,value:{version:1,fingerprint,movementId:movement.id}}});
      await this.audit.record({actorId:actor.personId,action:'STAFFING_REQUESTED',resource:'Employment',resourceId:employment.id,metadata:{movementId:movement.id,accountId:account.id,organizationId:organization.id,departmentCode,positionId:position.id,profile:profile.code,verificationMethod:intent.verificationMethod,reason,identityCreated:Boolean(identity),fromStatus:null,toStatus:'HR_REVIEW',permissionsApplied:false}},tx);
      return this.get(tx,movement.id,actor.id,organization);
    });
  }

  async decide(actorId:string,id:string,body:unknown){
    const x=record(body),reason=reviewedReason(body,['action','reason','reviewed','expectedUpdatedAt']);
    if(!uuid(id)||!['REVIEW','APPROVE','REJECT','CANCEL'].includes(String(x.action))||typeof x.expectedUpdatedAt!=='string'||x.expectedUpdatedAt.length>40||!Number.isFinite(Date.parse(x.expectedUpdatedAt)))throw new BadRequestException('الإجراء أو نسخة الطلب غير صالحين.');
    return this.db.serializable(async tx=>{
      await this.lockWrites(tx);
      const organization=await platformOrganization(tx);if(!organization)throw new NotFoundException('طلب التوظيف غير موجود.');
      const reference=await tx.employmentMovement.findFirst({where:{id,employment:{organizationId:organization.id}},select:{requestedByAccountId:true,reviewedByAccountId:true,employment:{select:{accountId:true}}}});
      await lockAccountIdentities(tx,[actorId,organization.ownerId,...(reference?[reference.employment.accountId,reference.requestedByAccountId,...(reference.reviewedByAccountId?[reference.reviewedByAccountId]:[])]:[])]);
      const actor=x.action==='APPROVE'?await requireStaffApprovalAuthority(tx,organization,actorId,reference?.employment.accountId):await requireVerifiedAdmin(tx,actorId);
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organization.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "EmploymentMovement" WHERE "id"::text=${id} FOR UPDATE`;
      const row=await tx.employmentMovement.findFirst({where:{id,type:'APPOINTMENT',employment:{organizationId:organization.id}},select:movementView});
      if(!row)throw new NotFoundException('طلب التوظيف غير موجود.');
      await tx.$queryRaw`SELECT "id" FROM "Employment" WHERE "id"::text=${row.employment.id} FOR UPDATE`;
      if(row.updatedAt.getTime()!==Date.parse(x.expectedUpdatedAt as string))throw new ConflictException('تغير الطلب؛ حدّث البيانات وراجع القرار.');
      const intent=readIntent((await tx.operationalSetting.findUnique({where:{key:intentKey(id)}}))?.value),employment=row.employment;
      if(!this.intentMatches(intent,employment)||employment.status!=='PENDING_APPROVAL'||!['HR_REVIEW','APPROVAL_REQUIRED'].includes(row.status))throw new ConflictException('الطلب لم يعد متاحًا لهذا الإجراء.');
      const action=x.action as string;
      if(action==='CANCEL'){
        if(row.requestedByAccountId!==actor.id)throw new ForbiddenException('إلغاء الطلب متاح لصاحبه.');
      }else{
        if(actor.id===employment.accountId)throw new ForbiddenException('لا يمكن للموظف مراجعة أو اعتماد تعيينه.');
        if(['REVIEW','REJECT'].includes(action)&&!platformOwnerCanReview(organization,actor.id,employment.accountId))throw new ForbiddenException('مراجعة موظفي هيدرولاند مسؤولية حساب الإدارة العليا المالك للجهة.');

      }

      if(action==='REVIEW'||action==='APPROVE'){
        if(employment.account.status!=='ACTIVE'||!employment.account.emailVerifiedAt||!employment.orgUnit.active||!employment.position?.active)throw new ConflictException('يلزم حساب متحقق نشط وإدارة ووظيفة متاحتان قبل المراجعة.');
        profileFor(intent.profile,employment.orgUnit.code);
      }
      // Review requires the internal owner; approval requires that owner or a
      // current employee delegate. This adapter only handles
      // the reserved internal organization. These are workflow capacities, never
      // RoleAssignment grants. External-center HR authority is unchanged.
      const hrActor={accountId:actor.id,roles:['HR_MANAGER','HR_REVIEWER','HR_EXECUTIVE'],organizationId:organization.id};
      let nextStatus:'APPROVAL_REQUIRED'|'EFFECTIVE'|'REJECTED'|'CANCELLED';
      try{
        if(action==='REVIEW'){
          if(row.status!=='HR_REVIEW'&&!(row.status==='APPROVAL_REQUIRED'&&row.reviewedByAccountId!==organization.ownerId))throw new ConflictException('الطلب ليس بانتظار مراجعة مسؤول الجهة الحالي.');
          this.hr.authorize(hrActor,'VERIFY_CANDIDATE',{organizationId:organization.id});
          const account=await tx.account.findUniqueOrThrow({where:{id:employment.accountId},select:{personId:true}});
          const candidate=await tx.hrCandidate.findUniqueOrThrow({where:{organizationId_personId:{organizationId:organization.id,personId:account.personId}}});
          await tx.hrCandidate.update({where:{id:candidate.id},data:{status:'APPROVED',verifiedByAccountId:actor.id,verifiedAt:new Date(),verificationNotes:reason}});
          await this.audit.record({actorId:actor.personId,action:'HR_CANDIDATE_VERIFIED',resource:'HrCandidate',resourceId:candidate.id,metadata:{organizationId:organization.id,movementId:id,reason,previousStatus:candidate.status,status:'APPROVED',reviewAuthority:'PLATFORM_OWNER',requesterAlsoReviewer:row.requestedByAccountId===actor.id,previousReviewerAccountId:row.reviewedByAccountId}},tx);
          await tx.employmentMovement.update({where:{id},data:{status:'APPROVAL_REQUIRED',reviewedByAccountId:actor.id}});
          nextStatus='APPROVAL_REQUIRED';
        }else if(action==='APPROVE'){
          if(row.status!=='APPROVAL_REQUIRED'||!row.reviewedByAccountId)throw new ConflictException('يلزم إكمال مراجعة الموارد البشرية أولًا.');
          if(!platformOwnerCanReview(organization,row.reviewedByAccountId,employment.accountId))throw new ConflictException('تغير مسؤول المراجعة؛ يلزم أن يعيد مالك الجهة الحالي مراجعة الطلب.');
          await requireVerifiedAdmin(tx,organization.ownerId);await requireVerifiedAdmin(tx,row.requestedByAccountId);
          await requireStaffApprovalAuthority(tx,organization,actor.id,employment.accountId);
          this.hr.validateEmploymentTransition(employment.status,'ACTIVE');
          await this.hr.assertProductionCompliance('APPROVE_APPOINTMENT',tx);
          const now=new Date();
          await tx.employment.update({where:{id:employment.id},data:{status:'ACTIVE',startsAt:now}});
          await tx.employmentMovement.update({where:{id},data:{status:'APPROVED',approvedByAccountId:actor.id,effectiveAt:now}});
          await this.iam.applyAppointment(tx,id);
          await tx.employmentMovement.update({where:{id},data:{status:'EFFECTIVE'}});
          nextStatus='EFFECTIVE';
        }else{
          nextStatus=action==='CANCEL'?'CANCELLED':'REJECTED';
          await tx.employmentMovement.update({where:{id},data:{status:nextStatus}});
          await tx.employment.update({where:{id:employment.id},data:{status:'DRAFT'}});
        }
      }catch(error){
        const code=error instanceof Error?error.message:'';
        if(/HR_.*(APPROVAL_REQUIRED|PERMISSION_REQUIRED|SELF_APPROVAL_DENIED|SEGREGATION_OF_DUTIES_DENIED)/.test(code))throw new ForbiddenException('لا تملك صلاحية إتمام إجراء التوظيف المطلوب.');
        if(code.startsWith('HR_COMPLIANCE_'))throw new ConflictException(`ضوابط التوظيف غير مكتملة: ${code}`);
        throw error;
      }
      await this.audit.record({actorId:actor.personId,action:`STAFFING_${action}`,resource:'Employment',resourceId:employment.id,metadata:{movementId:id,organizationId:organization.id,accountId:employment.accountId,reason,fromStatus:row.status,toStatus:nextStatus,profile:intent.profile,...(action==='APPROVE'?{approvalAuthority:(await requireStaffApprovalAuthority(tx,organization,actor.id,employment.accountId)).kind}:{}),...(action==='REVIEW'?{reviewAuthority:'PLATFORM_OWNER',requesterAlsoReviewer:row.requestedByAccountId===actor.id,previousReviewerAccountId:row.reviewedByAccountId}:{})}},tx);
      return this.get(tx,id,actor.id,organization);
    });
  }

  private intentMatches(intent:StaffingIntent,employment:MovementView['employment']){
    return intent.employmentId===employment.id&&intent.accountId===employment.accountId&&intent.organizationId===employment.organizationId&&intent.orgUnitId===employment.orgUnitId&&intent.positionId===employment.positionId&&employment.position?.orgUnitId===employment.orgUnitId;
  }

  private async get(tx:Prisma.TransactionClient,id:string,actorId:string,organization:{id:string;ownerId:string}){
    const row=await tx.employmentMovement.findFirst({where:{id,type:'APPOINTMENT',employment:{organizationId:organization.id}},select:movementView});
    if(!row)throw new NotFoundException('طلب التوظيف غير موجود.');
    return this.present(tx,row,actorId,organization,await this.reviewAuthority(tx,organization,actorId));
  }

  private async present(tx:Prisma.TransactionClient,row:MovementView,actorId:string,organization:{id:string;ownerId:string},reviewAuthority:{available:boolean;isCurrentAccount:boolean}){
    const setting=await tx.operationalSetting.findUnique({where:{key:intentKey(row.id)}});
    let intent:StaffingIntent|null=null;try{intent=readIntent(setting?.value);}catch{}
    const employment=row.employment,account=employment.account;
    if(intent&&!this.intentMatches(intent,employment))intent=null;
    let profile:ReturnType<typeof profileFor>|null=null;try{profile=intent?profileFor(intent.profile,employment.orgUnit.code):null;}catch{intent=null;}
    const ready=Boolean(account.status==='ACTIVE'&&account.emailVerifiedAt&&employment.orgUnit.active&&employment.position?.active);
    const grantedRoles=account.roleAssignments.filter(r=>r.status==='ACTIVE'&&(r.role==='STAFF'||(Array.isArray(record(r.scope).organizationIds)&&(record(r.scope).organizationIds as unknown[]).includes(employment.organizationId)))).map(r=>r.role);
    const member=account.organizationMemberships.some(m=>m.organizationId===employment.organizationId&&m.status==='ACTIVE');
    const effectiveAccess=Boolean(row.status==='EFFECTIVE'&&employment.status==='ACTIVE'&&ready&&member&&profile?.roles.every(role=>grantedRoles.includes(role)));
    const pending=employment.status==='PENDING_APPROVAL';
    return {canManageContractDrafts:organization.ownerId===actorId,id:row.id,status:row.status,reason:row.reason,createdAt:row.createdAt,updatedAt:row.updatedAt,effectiveAt:row.effectiveAt,employment:{id:employment.id,status:employment.status,department:employment.orgUnit,position:employment.position},account:{id:account.id,email:account.email,status:account.status,emailVerifiedAt:account.emailVerifiedAt,person:account.person},requestedProfile:profile?.code??null,verificationMethod:intent?.verificationMethod??null,grantedRoles,effectiveAccess,
      canReview:Boolean(intent&&pending&&ready&&reviewAuthority.available&&platformOwnerCanReview(organization,actorId,account.id)&&(row.status==='HR_REVIEW'||row.status==='APPROVAL_REQUIRED'&&row.reviewedByAccountId!==organization.ownerId)),
      canApprove:Boolean(intent&&pending&&ready&&reviewAuthority.available&&row.status==='APPROVAL_REQUIRED'&&row.reviewedByAccountId===organization.ownerId&&actorId!==account.id&&await staffApprovalAuthority(tx,organization,actorId)),
      canReject:Boolean(intent&&pending&&['HR_REVIEW','APPROVAL_REQUIRED'].includes(row.status)&&platformOwnerCanReview(organization,actorId,account.id)),
      canCancel:Boolean(intent&&pending&&['HR_REVIEW','APPROVAL_REQUIRED'].includes(row.status)&&actorId===row.requestedByAccountId)};
  }
}
