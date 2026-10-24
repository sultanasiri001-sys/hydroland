import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationMemberRole, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { PLATFORM_STAFFING_KEY, PLATFORM_STAFFING_KIND, record } from '../hr/staffing-catalog';

export type DocumentAction='TEMPLATE_CREATE'|'TEMPLATE_UPDATE'|'TEMPLATE_LIST'|'DOCUMENT_CREATE'|'DOCUMENT_LIST'|'DOCUMENT_READ'|'REVISE'|'SUBMIT'|'APPROVE'|'SIGN'|'ARCHIVE'|'BRAND_READ'|'BRAND_UPDATE';
const permissions:Record<OrganizationMemberRole,ReadonlySet<DocumentAction>>={
 OWNER:new Set(['TEMPLATE_CREATE','TEMPLATE_UPDATE','TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_LIST','DOCUMENT_READ','REVISE','SUBMIT','APPROVE','SIGN','ARCHIVE','BRAND_READ','BRAND_UPDATE']),
 ADMIN:new Set(['TEMPLATE_CREATE','TEMPLATE_UPDATE','TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_LIST','DOCUMENT_READ','REVISE','SUBMIT','APPROVE','SIGN','ARCHIVE','BRAND_READ','BRAND_UPDATE']),
 OPERATOR:new Set(['TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_LIST','DOCUMENT_READ','REVISE','SUBMIT','BRAND_READ']),
 INSTRUCTOR:new Set(['TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_LIST','DOCUMENT_READ','REVISE','SUBMIT','BRAND_READ']),
 STAFF:new Set(['TEMPLATE_LIST','DOCUMENT_CREATE','DOCUMENT_LIST','DOCUMENT_READ','REVISE','SUBMIT','BRAND_READ']),
 VIEWER:new Set(['TEMPLATE_LIST','DOCUMENT_LIST','DOCUMENT_READ','BRAND_READ']),
};
@Injectable()
export class DocumentAuthorizationService{
 constructor(private readonly db:DatabaseService){}
 async assert(accountId:string,organizationId:string,action:DocumentAction,client:Prisma.TransactionClient|DatabaseService=this.db){
  const pointer=await client.operationalSetting.findUnique({where:{key:PLATFORM_STAFFING_KEY},select:{value:true}});
  if(record(pointer?.value).organizationId===organizationId){
    // Internal personnel documents are private to the current verified owner.
    // This derives existing ownership, never creates a membership or IAM role.
    const organization=await client.organization.findUnique({where:{id:organizationId},select:{ownerId:true,kind:true,status:true}});
    const actor=await client.account.findFirst({where:{id:accountId,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}});
    const explicit=await client.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}}});
    if(!actor||organization?.ownerId!==accountId||organization.kind!==PLATFORM_STAFFING_KIND||organization.status!=='ACTIVE'||explicit&&explicit.status!=='ACTIVE')throw new ForbiddenException('مستندات هيدرولاند الداخلية خاصة بالمالك الإداري المتحقق الحالي.');
    return {organizationId,accountId,role:OrganizationMemberRole.OWNER,status:'ACTIVE',accessBasis:'PLATFORM_OWNER'};
  }
  const member=await client.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}}});
  if(!member||member.status!=='ACTIVE') throw new ForbiddenException('Active organization membership is required.');
  if(!permissions[member.role].has(action)) throw new ForbiddenException(`Document action ${action} is not permitted for role ${member.role}.`);
  return member;
 }

 async workspaces(accountId:string){
  return this.db.serializable(async tx=>{
    const memberships=await tx.organizationMember.findMany({where:{accountId,status:'ACTIVE',organization:{status:'ACTIVE'}},select:{organizationId:true,role:true,status:true,organization:{select:{id:true,displayName:true,kind:true}}}});
    const result:Array<{role:OrganizationMemberRole;status:string;organization:{id:string;displayName:string;kind:string};accessBasis?:string}>=[];
    for(const m of memberships){try{const a=await this.assert(accountId,m.organizationId,'DOCUMENT_LIST',tx);result.push({...m,role:a.role});}catch(error){if(!(error instanceof ForbiddenException))throw error;}}
    const pointer=await tx.operationalSetting.findUnique({where:{key:PLATFORM_STAFFING_KEY},select:{value:true}}),id=record(pointer?.value).organizationId;
    if(typeof id==='string'&&!result.some(m=>m.organization.id===id)){
      try{const access=await this.assert(accountId,id,'DOCUMENT_LIST',tx);const org=await tx.organization.findUniqueOrThrow({where:{id},select:{id:true,displayName:true,kind:true}});result.push({role:access.role,status:'ACTIVE',organization:org,accessBasis:'PLATFORM_OWNER'});}catch(error){if(!(error instanceof ForbiddenException))throw error;}
    }
    return result;
  });
 }
}
