import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { record } from './staffing-catalog';

export const delegationKey=(organizationId:string)=>`STAFF_APPROVAL_DELEGATIONS:v1:${organizationId}`;
export type Delegations={version:1;ownerId:string;revision:string;organizationRevision?:string;grants:{accountId:string;createdAt:string}[]};
export async function readDelegations(tx:Prisma.TransactionClient,organization:{id:string;ownerId:string}):Promise<Delegations>{
  const setting=await tx.operationalSetting.findUnique({where:{key:delegationKey(organization.id)}});
  if(!setting)return {version:1,ownerId:organization.ownerId,revision:'NONE',grants:[]};
  const x=record(setting.value);
  if(x.version!==1||typeof x.ownerId!=='string'||typeof x.revision!=='string'||!Array.isArray(x.grants)||x.grants.length>20||x.grants.some(v=>{const g=record(v);return typeof g.accountId!=='string'||typeof g.createdAt!=='string'}))throw new ConflictException('إعداد تفويض الاعتماد يحتاج مراجعة.');
  // Ownership transfer immediately invalidates the former owner's delegations.
  const current=await tx.organization.findUniqueOrThrow({where:{id:organization.id},select:{updatedAt:true}});
  return {...x,grants:x.ownerId===organization.ownerId&&x.organizationRevision===current.updatedAt.toISOString()?x.grants:[]} as Delegations;
}
export async function eligibleDelegate(tx:Prisma.TransactionClient,organizationId:string,accountId:string){
  return tx.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'STAFF',status:'ACTIVE'}},organizationMemberships:{some:{organizationId,status:'ACTIVE'}},employments:{some:{organizationId,status:'ACTIVE',orgUnit:{active:true},position:{active:true}}}},select:{id:true,personId:true,email:true,person:{select:{firstName:true,lastName:true}}}});
}
export async function staffApprovalAuthority(tx:Prisma.TransactionClient,organization:{id:string;ownerId:string},actorId:string){
  const owner=await tx.account.findFirst({where:{id:organization.ownerId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true,personId:true}});
  if(!owner)return null;
  if(owner.id===actorId)return {...owner,kind:'OWNER' as const};
  const delegations=await readDelegations(tx,organization);
  if(!delegations.grants.some(g=>g.accountId===actorId))return null;
  const delegate=await eligibleDelegate(tx,organization.id,actorId);
  return delegate?{id:delegate.id,personId:delegate.personId,kind:'DELEGATE' as const}:null;
}
export async function requireStaffApprovalAuthority(tx:Prisma.TransactionClient,organization:{id:string;ownerId:string},actorId:string,employeeId?:string){
  if(actorId===employeeId)throw new ForbiddenException('لا يمكن للموظف اعتماد تعيينه.');
  const authority=await staffApprovalAuthority(tx,organization,actorId);
  if(!authority)throw new ForbiddenException('الاعتماد متاح لمالك هيدرولاند أو موظف مفوض منه فقط.');
  return authority;
}
export async function requireDelegationOwner(tx:Prisma.TransactionClient,organization:{ownerId:string},actorId:string){
  const actor=await requireVerifiedAdmin(tx,actorId);
  if(organization.ownerId!==actorId)throw new ForbiddenException('إدارة تفويض الاعتماد متاحة لمالك هيدرولاند فقط.');
  return actor;
}
