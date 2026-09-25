import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrganizationMemberRole } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

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
 async assert(accountId:string,organizationId:string,action:DocumentAction){
  const member=await this.db.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}}});
  if(!member||member.status!=='ACTIVE') throw new ForbiddenException('Active organization membership is required.');
  if(!permissions[member.role].has(action)) throw new ForbiddenException(`Document action ${action} is not permitted for role ${member.role}.`);
  return member;
 }
}
