import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { platformOrganization, record } from './staffing-catalog';

export const OWNER_REVIEW_SCOPES = ['CONTRACT_LIBRARY', 'HR_CONTROL_REFERENCES'] as const;
export const ownerReviewKey = (id:string) => `TEMPORARY_OWNER_REVIEW:v1:${id}`;
export type OwnerReviewEvidence = { grantId:string; ownerId:string; organizationId:string; organizationRevision:string; issuedAt:string; expiresAt:string };
export type OwnerReviewGrant = OwnerReviewEvidence & { version:1; enabled:boolean };
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function validOwnerReviewEvidence(value:unknown):value is OwnerReviewEvidence {
  const x=record(value),start=Date.parse(String(x.issuedAt)),end=Date.parse(String(x.expiresAt));
  return ['grantId','ownerId','organizationId'].every(k=>uuid(x[k]))&&typeof x.organizationRevision==='string'&&Number.isFinite(Date.parse(x.organizationRevision))&&typeof x.issuedAt==='string'&&typeof x.expiresAt==='string'&&Number.isFinite(start)&&Number.isFinite(end)&&end>start&&end-start<=86400000;
}
export function ownerReviewLive(g:OwnerReviewGrant,now=Date.now()) {return g.enabled&&Date.parse(g.issuedAt)<=now&&now<Date.parse(g.expiresAt);}
export function ownerReviewEvidence(g:OwnerReviewGrant):OwnerReviewEvidence {const {grantId,ownerId,organizationId,organizationRevision,issuedAt,expiresAt}=g;return {grantId,ownerId,organizationId,organizationRevision,issuedAt,expiresAt};}
export function sameOwnerReview(e:unknown,g:OwnerReviewGrant|null) {return Boolean(g&&validOwnerReviewEvidence(e)&&Object.entries(ownerReviewEvidence(g)).every(([k,v])=>e[k as keyof OwnerReviewEvidence]===v));}

// Every grant change and every affected workflow mutation takes this barrier
// first. Revocation cannot race a decision using an older serializable snapshot.
export async function lockOwnerReview(tx:Prisma.TransactionClient) {
  await tx.$queryRaw`INSERT INTO "OperationalSetting" ("key","value","updatedAt") VALUES ('TEMPORARY_OWNER_REVIEW_WRITE:v1','{"version":1}'::jsonb,clock_timestamp()) ON CONFLICT ("key") DO UPDATE SET "updatedAt"=clock_timestamp() RETURNING "key"`;
}
export async function currentOwnerReview(tx:Prisma.TransactionClient,actorId:string):Promise<OwnerReviewGrant|null> {
  const platform=await platformOrganization(tx);if(!platform||platform.ownerId!==actorId)return null;
  const [actor,org,setting]=await Promise.all([
    tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}}),
    tx.organization.findUnique({where:{id:platform.id},select:{updatedAt:true}}),
    tx.operationalSetting.findUnique({where:{key:ownerReviewKey(platform.id)}}),
  ]);
  const g=record(setting?.value);
  if(!actor||!org||g.version!==1||g.enabled!==true||!validOwnerReviewEvidence(g)||g.ownerId!==actorId||g.organizationId!==platform.id||g.organizationRevision!==org.updatedAt.toISOString())return null;
  const grant=g as unknown as OwnerReviewGrant;return ownerReviewLive(grant)?grant:null;
}
export async function ownerReviewStatus(tx:Prisma.TransactionClient,actorId:string) {
  const platform=await platformOrganization(tx);
  const owner=Boolean(platform?.ownerId===actorId&&await tx.account.findFirst({where:{id:actorId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}}));
  if(!owner||!platform)return {canManage:false,active:false,revision:null,expiresAt:null,scopes:[]};
  const stored=record((await tx.operationalSetting.findUnique({where:{key:ownerReviewKey(platform.id)}}))?.value),grant=await currentOwnerReview(tx,actorId);
  return {canManage:true,active:Boolean(grant),revision:uuid(stored.grantId)?stored.grantId:null,expiresAt:grant?.expiresAt??null,scopes:OWNER_REVIEW_SCOPES};
}
export function assertOwnerReviewUnexpired(grant:OwnerReviewGrant) {if(!ownerReviewLive(grant))throw new ConflictException('انتهت صلاحية مراجعة المالك المؤقتة؛ حدّث الشاشة وأعد المراجعة.');}
