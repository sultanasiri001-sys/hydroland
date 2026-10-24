import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { platformOrganization, record } from './staffing-catalog';

export const OWNER_DEPARTMENTS=['HR','LEGAL_CONTRACTS_INSURANCE'] as const;
export const OWNER_DRAFT_SCOPE='INTERNAL_HR_DRAFTS_ONLY' as const;
export const ownerResponsibilityKey=(id:string)=>`OWNER_DEPARTMENT_RESPONSIBILITY:v1:${id}`;
export type OwnerDepartmentEvidence={revision:string;ownerId:string;organizationId:string;organizationRevision:string;assignedAt:string;departments:typeof OWNER_DEPARTMENTS;scope:typeof OWNER_DRAFT_SCOPE;reference:string};
export type OwnerDepartmentResponsibility=OwnerDepartmentEvidence & {version:1;enabled:boolean};
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const iso=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function validOwnerDepartmentEvidence(value:unknown):value is OwnerDepartmentEvidence {
 const x=record(value);
 return ['revision','ownerId','organizationId'].every(k=>uuid(x[k]))&&iso(x.organizationRevision)&&iso(x.assignedAt)&&JSON.stringify(x.departments)===JSON.stringify(OWNER_DEPARTMENTS)&&x.scope===OWNER_DRAFT_SCOPE&&typeof x.reference==='string'&&x.reference.trim().length>=3&&x.reference.length<=240;
}
export function ownerDepartmentEvidence(g:OwnerDepartmentResponsibility):OwnerDepartmentEvidence {
 const {revision,ownerId,organizationId,organizationRevision,assignedAt,departments,scope,reference}=g;
 return {revision,ownerId,organizationId,organizationRevision,assignedAt,departments,scope,reference};
}
export function sameOwnerDepartmentResponsibility(e:unknown,g:OwnerDepartmentResponsibility|null){
 return Boolean(g&&validOwnerDepartmentEvidence(e)&&Object.entries(ownerDepartmentEvidence(g)).every(([k,v])=>JSON.stringify(e[k as keyof OwnerDepartmentEvidence])===JSON.stringify(v)));
}
export async function ownerDepartmentStatus(tx:Prisma.TransactionClient){
 const platform=await platformOrganization(tx);
 if(!platform)return {grant:null,revision:null,account:null};
 const [setting,organization,account,units]=await Promise.all([
  tx.operationalSetting.findUnique({where:{key:ownerResponsibilityKey(platform.id)}}),
  tx.organization.findUniqueOrThrow({where:{id:platform.id},select:{updatedAt:true}}),
  tx.account.findFirst({where:{id:platform.ownerId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,email:true}}),
  tx.orgUnit.count({where:{organizationId:platform.id,type:'DEPARTMENT',active:true,code:{in:[...OWNER_DEPARTMENTS]}}})
 ]);
 if(!setting)return {grant:null,revision:null,account};
 const x=record(setting.value),enabled=x.enabled;
 if(x.version!==1||typeof x.enabled!=='boolean'||!validOwnerDepartmentEvidence(x)||Object.keys(x).some(k=>!['version','enabled','revision','ownerId','organizationId','organizationRevision','assignedAt','departments','scope','reference'].includes(k)))throw new ConflictException('تكليف مسؤول الإدارتين يحتاج مراجعة.');
 const grant=enabled&&account&&units===2&&x.ownerId===platform.ownerId&&x.organizationId===platform.id&&x.organizationRevision===organization.updatedAt.toISOString()?x as OwnerDepartmentResponsibility:null;
 return {grant,revision:String(x.revision),account};
}
