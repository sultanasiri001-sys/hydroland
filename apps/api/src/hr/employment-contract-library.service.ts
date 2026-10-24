import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, EmploymentContract } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from './staffing-catalog';
import { ownerDepartmentStatus, sameOwnerDepartmentResponsibility } from './owner-department-responsibility';
import { lockOwnerReview } from './temporary-owner-review';
import { contractKeys, contractText } from '../document-forms/cooperation-contract.domain';
import { independentEmploymentLegalReview, readLibrary } from '../document-forms/contract-library.domain';
type Tx=Prisma.TransactionClient;
const canonical=(v:any):string=>JSON.stringify(v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])));
const digest=(v:unknown)=>'sha256:'+createHash('sha256').update(canonical(v)).digest('hex');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const automatic=new Set(['EMPLOYMENT_ACCOUNT','EMPLOYMENT_POSITION','EMPLOYMENT_ORG_UNIT','EMPLOYMENT','ORGANIZATION']);
const date=(v:unknown,optional=false)=>{if(optional&&(v===null||v===undefined||v===''))return null;const s=contractText(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new BadRequestException('أدخل تاريخًا صحيحًا للعقد.');return new Date(s+'T00:00:00.000Z');};
@Injectable()
export class EmploymentContractLibraryService {
 constructor(private readonly db:DatabaseService){}
 private async access(tx:Tx,actorId:string,employmentId:string){
  if(!uuid(employmentId))throw new BadRequestException('معرف الموظف غير صالح.');
  const platform=await platformOrganization(tx);
  if(!platform)throw new ConflictException('هيّئ جهة هيدرولاند الداخلية أولًا.');
  const actor=await tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null}},select:{id:true,personId:true,roleAssignments:{where:{status:'ACTIVE'},select:{role:true}}}});
  if(!actor)throw new ForbiddenException('يلزم حساب نشط وبريد متحقق منه.');
  const roles=actor.roleAssignments.map(r=>r.role),owner=platform.ownerId===actor.id&&roles.includes('ADMIN');
  if(owner)await requireVerifiedAdmin(tx,actorId);
  const member=await tx.organizationMember.findFirst({where:{organizationId:platform.id,accountId:actorId,status:'ACTIVE'}});
  const now=new Date();
  const hr=Boolean(member&&roles.includes('STAFF')&&roles.some(r=>r==='HR_MANAGER'||r==='HR_REVIEWER')&&await tx.employment.findFirst({where:{accountId:actorId,organizationId:platform.id,status:'ACTIVE',orgUnit:{organizationId:platform.id,code:'HR',active:true},OR:[{startsAt:null},{startsAt:{lte:now}}],AND:[{OR:[{endsAt:null},{endsAt:{gt:now}}]}]}}));
  if(!owner&&!hr)throw new ForbiddenException('عقود الموظفين لمالك هيدرولاند وموظفي الموارد البشرية المخولين فقط.');
  const employment=await tx.employment.findFirst({where:{id:employmentId,organizationId:platform.id},include:{account:{select:{id:true,email:true,status:true,emailVerifiedAt:true,person:{select:{firstName:true,lastName:true,phone:true}}}},organization:true,orgUnit:true,position:true}});
  if(!employment||employment.orgUnit.organizationId!==platform.id||employment.position&&employment.position.orgUnitId!==employment.orgUnitId)throw new NotFoundException('سجل الموظف غير متاح في النطاق الداخلي.');
  const canCreate=(owner||hr&&roles.includes('HR_MANAGER'))&&['DRAFT','PENDING_APPROVAL','ACTIVE','ON_LEAVE'].includes(employment.status)&&employment.account.status==='ACTIVE'&&Boolean(employment.account.emailVerifiedAt)&&employment.orgUnit.active&&(!employment.position||employment.position.active);
  return {actor,platform,employment,canCreate};
 }
 private async templates(tx:Tx,organizationId:string){
  const rows=await tx.documentTemplate.findMany({where:{organizationId,code:{startsWith:'CLIB-'},status:'ACTIVE'},orderBy:[{code:'asc'},{version:'desc'}]});
  const seen=new Set<string>(),items=[],responsibility=await ownerDepartmentStatus(tx);
  for(const row of rows){const e=readLibrary(row);if(e.content.category!=='EMPLOYMENT')continue;
   if(seen.has(row.code))throw new ConflictException('توجد نسخ فعالة متعارضة لقالب الموظف.');seen.add(row.code);
   const ownerApproval=e.state==='APPROVED_FOR_DRAFTS'?e.ownerDepartmentApproval:null;
   if(ownerApproval){
    if(!sameOwnerDepartmentResponsibility(ownerApproval.authority,responsibility.grant))continue;
   }else if(e.state!=='PUBLISHED'||e.content.workflow!=='HR_EMPLOYMENT_TEMPLATE_V1'||!e.publishedBy||!independentEmploymentLegalReview(e)||!e.hrReview||e.hrReview.contentHash!==e.contentHash)throw new ConflictException('قالب الموظف لم يستكمل الاعتماد والمراجعة القانونية المستقلة.');
   const approval=ownerApproval?{basis:'OWNER_COMBINED_INTERNAL_DRAFTS',scope:'INTERNAL_HR_DRAFTS_ONLY',independentLegalReviewComplete:false,reference:ownerApproval.reference,authority:ownerApproval.authority}:{basis:'INDEPENDENT_LEGAL_AND_HR',scope:'INTERNAL_HR_DRAFTS_ONLY',independentLegalReviewComplete:true};
   items.push({id:row.id,code:row.code,titleAr:row.titleAr,titleEn:row.titleEn,version:row.version,contentHash:e.contentHash,content:e.content,approval});
  }return items;
 }
 private source(e:Awaited<ReturnType<EmploymentContractLibraryService['access']>>['employment']){
  return {employer:e.organization.legalName||e.organization.displayName,registration:e.organization.registrationNumber||'',employerAddress:e.organization.address||'',employeeName:[e.account.person.firstName,e.account.person.lastName].filter(Boolean).join(' '),contact:[e.account.email,e.account.person.phone].filter(Boolean).join(' | '),jobTitle:e.position?.titleAr||'',department:e.orgUnit.nameAr,startDate:e.startsAt?.toISOString().slice(0,10)||''};
 }
 private view(row:EmploymentContract){
  const snapshot=row.librarySnapshot as any;
  if(snapshot){const {snapshotHash,...body}=snapshot;if(snapshot.kind!=='HR_CONTRACT_LIBRARY_SNAPSHOT_V1'||snapshot.contractId!==row.id||snapshot.contractVersion!==row.version||snapshot.employment?.id!==row.employmentId||snapshot.template?.code!==row.contractType||snapshot.effectiveFrom!==row.effectiveFrom.toISOString()||snapshot.effectiveTo!==(row.effectiveTo?.toISOString()??null)||row.status!=='DRAFT'||row.documentId!==null||snapshotHash!==digest(body))throw new ConflictException('بصمة مسودة عقد الموظف غير متطابقة.');
   const r=snapshot.revisionOf;
   if(r!==undefined&&(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['id','version','snapshotHash'].includes(k))||!uuid(r.id)||r.id===row.id||!Number.isInteger(r.version)||r.version<1||r.version>=row.version||typeof r.snapshotHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(r.snapshotHash)))throw new ConflictException('مرجع إصدار مسودة الموظف غير صالح.');
  }
  return {id:row.id,version:row.version,contractType:row.contractType,status:row.status,effectiveFrom:row.effectiveFrom,effectiveTo:row.effectiveTo,documentId:row.documentId,createdAt:row.createdAt,librarySnapshot:snapshot??null,execution:'DRAFT_ONLY',permissionsApplied:false};
 }
 async workspace(actorId:string,employmentId:string){return this.db.serializable(async tx=>{
  const a=await this.access(tx,actorId,employmentId),rows=await tx.employmentContract.findMany({where:{employmentId},orderBy:{version:'desc'}});
  return {employmentId,employmentUpdatedAt:a.employment.updatedAt.toISOString(),expectedContractVersion:rows[0]?.version??0,employeeName:this.source(a.employment).employeeName,sourceValues:this.source(a.employment),sourceHash:digest(this.source(a.employment)),canCreate:a.canCreate,templates:await this.templates(tx,a.platform.id),items:rows.map(r=>this.view(r)),execution:'DRAFT_ONLY'};
 });}
 async create(actorId:string,employmentId:string,body:unknown){
  const x=contractKeys(body,['requestId','expectedEmploymentUpdatedAt','expectedSourceHash','expectedContractVersion','templateId','expectedTemplateVersion','expectedTemplateContentHash','effectiveFrom','effectiveTo','values','reason','reviewed','revisesContract']);
  if(!uuid(x.requestId)||!uuid(x.templateId)||x.reviewed!==true)throw new BadRequestException('راجع بيانات المسودة وحدد القالب المعتمد.');
  let revises:{id:string;expectedSnapshotHash:string}|undefined;
  if(x.revisesContract!==undefined){
   const r=contractKeys(x.revisesContract,['id','expectedSnapshotHash']);
   if(!uuid(r.id)||typeof r.expectedSnapshotHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(r.expectedSnapshotHash))throw new BadRequestException('راجع مرجع المسودة السابقة وبصمتها.');
   revises={id:r.id,expectedSnapshotHash:r.expectedSnapshotHash};
  }
  const reason=contractText(x.reason,1000);if(reason.length<5)throw new BadRequestException('اكتب سبب إعداد المسودة.');
  const effectiveFrom=date(x.effectiveFrom)!,effectiveTo=date(x.effectiveTo,true);
  if(effectiveTo&&effectiveTo<effectiveFrom)throw new BadRequestException('نهاية العقد تسبق بدايته.');
  if(typeof x.expectedEmploymentUpdatedAt!=='string'||x.expectedEmploymentUpdatedAt.length>40||typeof x.expectedSourceHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(x.expectedSourceHash)||typeof x.expectedTemplateContentHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(x.expectedTemplateContentHash)||!Number.isInteger(x.expectedContractVersion)||Number(x.expectedContractVersion)<0||Number(x.expectedContractVersion)>2147483646||!Number.isInteger(x.expectedTemplateVersion)||Number(x.expectedTemplateVersion)<1)throw new BadRequestException('راجع مراجع إصدار الموظف والقالب.');
  const rawValues=x.values??{};
  if(!rawValues||typeof rawValues!=='object'||Array.isArray(rawValues)||Object.keys(rawValues).length>60||Object.values(rawValues).some(v=>typeof v!=='string'||v.length>2000))throw new BadRequestException('شروط المسودة نصوص محدودة الطول فقط.');
  const commandHash=digest(x);
  return this.db.serializable(async tx=>{
   await lockOwnerReview(tx);
   await tx.$queryRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('CONTRACT_LIBRARY_WRITE:v1','{"version":1}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp() RETURNING "key"`;
   const initial=await this.access(tx,actorId,employmentId);
   await tx.$queryRaw`SELECT "key" FROM "OperationalSetting" WHERE "key"='PLATFORM_STAFFING_ORGANIZATION:v1' FOR SHARE`;
   await lockAccountIdentities(tx,[actorId,initial.platform.ownerId,initial.employment.accountId]);
   await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${initial.platform.id} FOR SHARE`;
   await tx.$queryRaw`SELECT "id" FROM "RoleAssignment" WHERE "accountId"::text=${actorId} FOR SHARE`;
   await tx.$queryRaw`SELECT "id" FROM "OrganizationMember" WHERE "accountId"::text=${actorId} FOR SHARE`;
   await tx.$queryRaw`SELECT "id" FROM "Employment" WHERE "accountId"::text=${actorId} OR "id"::text=${employmentId} FOR UPDATE`;
   await tx.$queryRaw`SELECT "id" FROM "OrgUnit" WHERE "organizationId"::text=${initial.platform.id} FOR SHARE`;
   const a=await this.access(tx,actorId,employmentId);
   if(!a.canCreate)throw new ForbiddenException('إنشاء المسودة غير متاح لهذا الحساب أو سجل الموظف.');
   const rows=await tx.employmentContract.findMany({where:{employmentId},orderBy:{version:'desc'}});
   const previous=rows.find(r=>(r.librarySnapshot as any)?.requestId===x.requestId);
   if(previous){const s=previous.librarySnapshot as any;if(s.requestedBy!==actorId||s.commandHash!==commandHash)throw new ConflictException('معرف العملية مرتبط ببيانات أخرى.');return this.view(previous);}
   if(x.expectedSourceHash!==digest(this.source(a.employment))||x.expectedEmploymentUpdatedAt!==a.employment.updatedAt.toISOString()||x.expectedContractVersion!==(rows[0]?.version??0))throw new ConflictException('تغير سجل الموظف أو إصدار عقده؛ حدّث البيانات.');
   const template=(await this.templates(tx,a.platform.id)).find(t=>t.id===x.templateId);
   if(!template||template.version!==x.expectedTemplateVersion||template.contentHash!==x.expectedTemplateContentHash)throw new ConflictException('القالب غير معتمد حاليًا أو تغير إصداره؛ حدّث المكتبة.');
   const manual=template.content.fields.filter(f=>!automatic.has(f.source)),input=contractKeys(x.values??{},manual.map(f=>f.key));
   const values:Record<string,string>={},source=this.source(a.employment) as Record<string,string>;
   for(const f of template.content.fields)values[f.key]=automatic.has(f.source)?source[f.key]??'':contractText(input[f.key],2000,true);
   let revisionOf:{id:string;version:number;snapshotHash:string}|undefined;
   if(revises){
    const prior=rows.find(r=>r.id===revises.id);
    if(!prior||prior.status!=='DRAFT'||!prior.librarySnapshot)throw new ConflictException('المسودة السابقة غير متاحة ضمن عقود هذا الموظف.');
    const old=this.view(prior).librarySnapshot;
    if(old.snapshotHash!==revises.expectedSnapshotHash)throw new ConflictException('تغير مرجع المسودة السابقة؛ حدّث عقود الموظف.');
    if(old.template.code!==template.code)throw new BadRequestException('إصدار المسودة الجديد يتطلب النوع نفسه من العقد.');
    if(old.template.id===template.id&&old.template.contentHash===template.contentHash&&canonical(old.values)===canonical(values)&&prior.effectiveFrom.getTime()===effectiveFrom.getTime()&&(prior.effectiveTo?.getTime()??null)===(effectiveTo?.getTime()??null))throw new ConflictException('لم تتغير بيانات المسودة؛ راجع التعديلات قبل إنشاء إصدار جديد.');
    revisionOf={id:prior.id,version:prior.version,snapshotHash:old.snapshotHash};
   }
   const contractId=randomUUID(),contractVersion=(rows[0]?.version??0)+1;
   const snapshot={contractId,contractVersion,effectiveFrom:effectiveFrom.toISOString(),effectiveTo:effectiveTo?.toISOString()??null,kind:'HR_CONTRACT_LIBRARY_SNAPSHOT_V1',requestId:x.requestId,requestedBy:actorId,commandHash,capturedAt:new Date().toISOString(),...(revisionOf?{revisionOf}:{}),template:{id:template.id,code:template.code,version:template.version,contentHash:template.contentHash,titleAr:template.titleAr,titleEn:template.titleEn,content:template.content,approval:template.approval},employment:{id:employmentId,accountId:a.employment.accountId,organizationId:a.platform.id,orgUnitId:a.employment.orgUnitId,positionId:a.employment.positionId,updatedAt:a.employment.updatedAt.toISOString()},values,missingFields:template.content.fields.filter(f=>f.required&&!values[f.key]).map(f=>({key:f.key,label:f.label})),reason};
   const row=await tx.employmentContract.create({data:{id:contractId,employmentId,version:contractVersion,contractType:template.code,effectiveFrom,effectiveTo,status:'DRAFT',librarySnapshot:{...snapshot,snapshotHash:digest(snapshot)} as unknown as Prisma.InputJsonValue}});
   await tx.auditEvent.create({data:{actorId:a.actor.personId,action:revisionOf?'HR_CONTRACT_DRAFT_REVISED':'HR_CONTRACT_DRAFT_CREATED',resource:'EmploymentContract',resourceId:row.id,metadata:{organizationId:a.platform.id,employmentId,version:row.version,...(revisionOf?{revisionOf}:{}),templateId:template.id,templateVersion:template.version,templateContentHash:template.contentHash,templateApproval:template.approval,snapshotHash:digest(snapshot),reason,permissionsApplied:false}}});
   return this.view(row);
  });
 }
}
