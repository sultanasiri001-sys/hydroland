import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, record } from '../hr/staffing-catalog';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';
import { decisionDigest, scopeId } from './owner-administrative-decision.domain';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { templateObject } from './document-template-input';
import { validateDocumentPayload } from './document-payload';

export const INTERNAL_REVIEW_POLICY = 'EXPLICIT_DOCUMENT_REVIEW_V1';
export const INTERNAL_REVIEW_PREFIX = 'INTERNAL_DOCUMENT_REVIEW:v1:';
export const INTERNAL_REVIEW_NOTICE = 'التكليف لنسخة المستند المحددة فقط. المراجعة والاعتماد والتوقيع تسجل بهوية صاحب الحساب، ولا تنفّذ قرارًا وظيفيًا أو ماليًا أو تصريح تشغيل أو عقدًا في مساره المتخصص.';
export const reviewKey = (org: string, id: string) => `${INTERNAL_REVIEW_PREFIX}${org}:${id}`;
export type Participant = { accountId: string; personId: string; employmentId: string; employmentRevision: string;
  orgUnitId: string; unitRevision: string; positionId: string; positionRevision: string;
  memberRevision: string; roleRevision: string; verifiedAt: string; accountStatusRevision: string };
export type ReviewGrant = { policy: typeof INTERNAL_REVIEW_POLICY; id: string; revision: string; organizationId: string; documentId: string;
  ownerId: string; ownerPersonId: string; organizationRevision: string; ownerAuthorityRevision: string; ownerStatusRevision: string;
  platformRevision: string; ownerMemberRevision: string; ownerVerifiedAt: string;
  documentVersion: number; department: string; sourceHash: string; state: 'ACTIVE'|'REVOKED'|'RETURNED'|'DECLINED';
  reviewer: Participant | null; signer: Participant; approvalAtAssignment: {accountId:string;personId:string;approvedAt:string}|null;
  issuedAt: string; expiresAt: string; reason: string; digest: string };

const iso = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function boundedNote(v: unknown): string {
  if (typeof v !== 'string' || v.trim().length < 3 || v.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v)) throw new BadRequestException('أدخل سببًا واضحًا من 3 إلى 2000 حرف.');
  return v.trim();
}
export function grantInput(body: unknown) {
  const x = templateObject(body, ['reviewerAccountId','signerAccountId','expectedDocumentVersion','expiresAt','reason','expectedPlanHash','confirmed']);
  scopeId(x.reviewerAccountId); scopeId(x.signerAccountId);
  if (!Number.isSafeInteger(x.expectedDocumentVersion) || Number(x.expectedDocumentVersion) < 1 || !iso(x.expiresAt)) throw new BadRequestException('الإصدار أو وقت انتهاء التكليف غير صالح.');
  return { reviewerAccountId: x.reviewerAccountId, signerAccountId: x.signerAccountId, expectedDocumentVersion: Number(x.expectedDocumentVersion), expiresAt: x.expiresAt, reason: boundedNote(x.reason) };
}
export function validExpiry(expiresAt: string, now = Date.now()) {
  if (!iso(expiresAt) || Date.parse(expiresAt) <= now || Date.parse(expiresAt) > now + 7 * 86400000) throw new BadRequestException('مدة التكليف من الآن وحتى سبعة أيام كحد أقصى.');
}
function participant(v: unknown): v is Participant {
  const x = record(v), keys = ['accountId','personId','employmentId','orgUnitId','positionId','employmentRevision','unitRevision','positionRevision','memberRevision','roleRevision','verifiedAt','accountStatusRevision'];
  return Object.keys(x).length === keys.length && keys.every(k => typeof x[k] === 'string' && (x[k] as string).length > 0)
    && ['employmentRevision','unitRevision','positionRevision','memberRevision','roleRevision','verifiedAt'].every(k => iso(x[k]));
}
export function sealGrant(body: Omit<ReviewGrant,'digest'>): ReviewGrant { return { ...body, digest: decisionDigest(body) }; }
export function readGrant(value: unknown, org: string, id: string): ReviewGrant | null {
  if (value === undefined || value === null) return null;
  const x = record(value), { digest, ...body } = x;
  const keys = ['policy','id','revision','organizationId','documentId','ownerId','ownerPersonId','organizationRevision','ownerAuthorityRevision','ownerStatusRevision','platformRevision','ownerMemberRevision','ownerVerifiedAt','documentVersion','department','sourceHash','state','reviewer','signer','approvalAtAssignment','issuedAt','expiresAt','reason','digest'];
  const approval=record(x.approvalAtAssignment);
  if (Object.keys(x).length !== keys.length || Object.keys(x).some(k => !keys.includes(k)) || x.policy !== INTERNAL_REVIEW_POLICY || x.organizationId !== org || x.documentId !== id
    || !['id','revision','ownerId','ownerPersonId','ownerStatusRevision'].every(k => typeof x[k] === 'string' && (x[k] as string).length > 0)
    || !Number.isSafeInteger(x.documentVersion) || Number(x.documentVersion) < 1 || !DOCUMENT_DEPARTMENTS.includes(x.department as never)
    || !iso(x.organizationRevision) || !iso(x.ownerAuthorityRevision) || !iso(x.platformRevision) || !iso(x.ownerVerifiedAt)
    || !(x.ownerMemberRevision==='DERIVED_OWNER_NO_MEMBERSHIP'||iso(x.ownerMemberRevision)) || !iso(x.issuedAt) || !iso(x.expiresAt)
    || Date.parse(x.expiresAt) <= Date.parse(x.issuedAt) || Date.parse(x.expiresAt)-Date.parse(x.issuedAt) > 7*86400000
    || !['ACTIVE','REVOKED','RETURNED','DECLINED'].includes(String(x.state)) || typeof x.sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(x.sourceHash)
    || !participant(x.signer) || (x.reviewer !== null && !participant(x.reviewer))
    || (x.reviewer===null ? Object.keys(approval).length!==3||typeof approval.accountId!=='string'||typeof approval.personId!=='string'||!iso(approval.approvedAt) : x.approvalAtAssignment!==null)
    || typeof digest !== 'string' || digest !== decisionDigest(body)) throw new ConflictException('سجل التكليف غير متسق؛ يلزم مراجعة المالك.');
  boundedNote(x.reason);
  return x as ReviewGrant;
}
export async function accountStatusRevision(tx: Prisma.TransactionClient, id: string): Promise<string> {
  const event = await tx.auditEvent.findFirst({ where: { resource: 'Account', resourceId: id, action: 'ACCOUNT_STATUS_CHANGED' }, orderBy: [{occurredAt:'desc'},{id:'desc'}], select: { id: true } });
  return event?.id ?? 'NONE';
}
export async function reviewPlatform(tx: Prisma.TransactionClient) {
  const pointer = await tx.operationalSetting.findUnique({ where: { key: PLATFORM_STAFFING_KEY }, select: { value: true, updatedAt: true } });
  const id = record(pointer?.value).organizationId;
  if (typeof id !== 'string') throw new ForbiddenException('الجهة الداخلية غير مهيأة.');
  const org = await tx.organization.findUnique({ where: { id }, select: { id: true, ownerId: true, kind: true, status: true, updatedAt: true } });
  if (!org || org.kind !== PLATFORM_STAFFING_KIND || org.status !== 'ACTIVE') throw new ForbiddenException('الجهة الداخلية غير متاحة.');
  const owner = await tx.account.findFirst({ where: { id: org.ownerId, status: 'ACTIVE', emailVerifiedAt: {not:null}, roleAssignments: {some:{role:'ADMIN',status:'ACTIVE'}} }, select: { id:true, personId:true, emailVerifiedAt:true } });
  const member = await tx.organizationMember.findUnique({ where: { organizationId_accountId: {organizationId:id,accountId:org.ownerId} }, select: {status:true,updatedAt:true} });
  const authority = await tx.roleAssignment.findUnique({ where: { accountId_role:{accountId:org.ownerId,role:'ADMIN'} }, select:{status:true,updatedAt:true} });
  if (!owner || !authority || authority.status !== 'ACTIVE' || member && member.status !== 'ACTIVE') throw new ForbiddenException('صلاحية مالك الجهة غير متاحة.');
  return { ...org, platformRevision:pointer!.updatedAt.toISOString(), ownerMemberRevision:member?.updatedAt.toISOString()??'DERIVED_OWNER_NO_MEMBERSHIP', ownerVerifiedAt:owner.emailVerifiedAt!.toISOString(), ownerPersonId: owner.personId, ownerAuthorityRevision: authority.updatedAt.toISOString(), ownerStatusRevision: await accountStatusRevision(tx,owner.id) };
}
export async function eligibleReviewParticipant(tx: Prisma.TransactionClient, org: string, department: string, accountId: string) {
  const account = await tx.account.findFirst({ where: { id: accountId, status:'ACTIVE', emailVerifiedAt:{not:null}, roleAssignments:{some:{role:'STAFF',status:'ACTIVE'}} }, select:{id:true,personId:true,emailVerifiedAt:true,email:true,person:{select:{firstName:true,lastName:true}}} });
  if (!account) throw new ForbiddenException('المكلّف يجب أن يكون موظفًا فعليًا نشطًا بحساب متحقق.');
  const employment = await tx.employment.findFirst({ where:{accountId,organizationId:org,status:'ACTIVE',orgUnit:{organizationId:org,code:department,type:'DEPARTMENT',active:true},position:{active:true,orgUnit:{organizationId:org,code:department,active:true}}}, include:{orgUnit:true,position:true}, orderBy:{id:'asc'} });
  const member = await tx.organizationMember.findUnique({where:{organizationId_accountId:{organizationId:org,accountId}},select:{status:true,updatedAt:true}});
  const role = await tx.roleAssignment.findUnique({where:{accountId_role:{accountId,role:'STAFF'}},select:{status:true,updatedAt:true}});
  if (!employment?.position || !member || member.status !== 'ACTIVE' || !role || role.status !== 'ACTIVE' || employment.position.orgUnitId !== employment.orgUnitId
    || employment.startsAt && employment.startsAt.getTime() > Date.now() || employment.endsAt && employment.endsAt.getTime() <= Date.now()) throw new ForbiddenException('لا يوجد تكليف وظيفي وعضوية نشطان في إدارة هذا المستند.');
  const binding: Participant = {accountId,personId:account.personId,employmentId:employment.id,employmentRevision:employment.updatedAt.toISOString(),orgUnitId:employment.orgUnitId,unitRevision:employment.orgUnit.updatedAt.toISOString(),positionId:employment.position.id,positionRevision:employment.position.updatedAt.toISOString(),memberRevision:member.updatedAt.toISOString(),roleRevision:role.updatedAt.toISOString(),verifiedAt:account.emailVerifiedAt!.toISOString(),accountStatusRevision:await accountStatusRevision(tx,accountId)};
  return { binding, name: `${account.person.firstName} ${account.person.lastName}`.trim(), email:account.email, jobTitle:employment.position.titleAr };
}
export function documentReadHash(d: any): string {
  return decisionDigest({id:d.id,organizationId:d.organizationId,referenceNumber:d.referenceNumber,version:d.version,department:d.department,contentHash:d.contentHash,payload:d.payload,createdByAccountId:d.createdByAccountId,documentBrandVersion:d.documentBrandVersion,template:{id:d.template.id,code:d.template.code,version:d.template.version,department:d.template.department,titleAr:d.template.titleAr,titleEn:d.template.titleEn,fields:d.template.fields,printable:d.template.printable}});
}
export async function reviewSource(tx: Prisma.TransactionClient, org: string, id: string) {
  const d = await tx.managedDocument.findFirst({where:{id,organizationId:org},include:{template:true,createdBy:{select:{personId:true}},approvedBy:{select:{personId:true}}}});
  if (!d || d.template.organizationId !== org || d.template.department !== d.department || d.template.code === COOPERATION_CODE || isLibraryCode(d.template.code)) throw new ForbiddenException('المستند غير متاح في مسار المراجعة الداخلية.');
  const revision = await tx.documentRevision.findUnique({where:{documentId_version:{documentId:id,version:d.version}}});
  if (!revision || revision.contentHash !== d.contentHash || decisionDigest(revision.payload) !== decisionDigest(d.payload) || !d.documentBrandVersion) throw new ConflictException('أدلة إصدار المستند غير متسقة.');
  const branding = await tx.documentBrandSnapshot.findUnique({where:{organizationId_brandVersion:{organizationId:org,brandVersion:d.documentBrandVersion}}});
  if (!branding) throw new ConflictException('هوية إصدار المستند غير متاحة.');
  if(['APPROVED','SIGNED','ARCHIVED'].includes(d.status)){
    if(!d.approvedByAccountId||!d.approvedAt||!d.approvedBy||d.approvedBy.personId===d.createdBy.personId)throw new ConflictException('أدلة الاعتماد المستقل غير مكتملة.');
    const approvals=await tx.documentLifecycleEvent.findMany({where:{documentId:id,version:d.version,action:'APPROVED',actorAccountId:d.approvedByAccountId,toStatus:'APPROVED'},select:{id:true},take:2});
    if(approvals.length!==1)throw new ConflictException('سجل الاعتماد لهذا الإصدار غير متسق.');
  }
  const sourceHash = decisionDigest({document:documentReadHash(d),creatorPersonId:d.createdBy.personId,branding:{brandVersion:branding.brandVersion,logoUrl:branding.logoUrl,logoAssetId:branding.logoAssetId,brandNameAr:branding.brandNameAr,brandNameEn:branding.brandNameEn,footerAr:branding.footerAr,footerEn:branding.footerEn}});
  return {d,sourceHash};
}
export async function assignedReviewAccess(tx: Prisma.TransactionClient, actorId: string, org: string, id: string) {
  const stored = await tx.operationalSetting.findUnique({where:{key:reviewKey(org,id)},select:{value:true}});
  const g = readGrant(stored?.value,org,id);
  // Refuse unrelated accounts before loading a document, its contents or names.
  const role = g?.reviewer?.accountId === actorId ? 'REVIEWER' : g?.signer.accountId === actorId ? 'SIGNER' : null;
  if (!g || !role || g.state !== 'ACTIVE' || Date.parse(g.expiresAt) <= Date.now()) throw new ForbiddenException('لا يوجد تكليف مراجعة فعّال لهذا الحساب والنسخة.');
  const platform = await reviewPlatform(tx);
  if (platform.id !== org || platform.ownerId !== g.ownerId || platform.ownerPersonId !== g.ownerPersonId || platform.updatedAt.toISOString() !== g.organizationRevision || platform.ownerAuthorityRevision !== g.ownerAuthorityRevision || platform.ownerStatusRevision !== g.ownerStatusRevision
    || platform.platformRevision!==g.platformRevision || platform.ownerMemberRevision!==g.ownerMemberRevision || platform.ownerVerifiedAt!==g.ownerVerifiedAt) throw new ForbiddenException('تغيرت سلطة إصدار التكليف؛ يلزم تكليف جديد.');
  const actor = await eligibleReviewParticipant(tx,org,g.department,actorId), expected = role === 'REVIEWER' ? g.reviewer! : g.signer;
  if (decisionDigest(actor.binding) !== decisionDigest(expected)) throw new ForbiddenException('تغيرت صلاحية أو عضوية أو وظيفة المكلّف؛ يلزم تكليف جديد.');
  const source = await reviewSource(tx,org,id);
  const approved=g.approvalAtAssignment;
  if (source.d.version !== g.documentVersion || source.d.department !== g.department || source.sourceHash !== g.sourceHash
    || actor.binding.personId === source.d.createdBy.personId || g.reviewer && g.signer.personId === g.reviewer.personId
    || g.reviewer && source.d.approvedByAccountId && source.d.approvedByAccountId!==g.reviewer.accountId
    || approved && (approved.accountId!==source.d.approvedByAccountId||approved.personId!==source.d.approvedBy?.personId||approved.approvedAt!==source.d.approvedAt?.toISOString())
    || ['SIGNED','ARCHIVED'].includes(source.d.status)&&source.d.signedByAccountId!==g.signer.accountId
    || role === 'SIGNER' && source.d.approvedBy?.personId === actor.binding.personId) throw new ForbiddenException('تغير نطاق النسخة أو لم يتحقق فصل المهام.');
  validateDocumentPayload(source.d.template.fields,source.d.payload);
  return { ...source, g, role, actor, platform };
}
