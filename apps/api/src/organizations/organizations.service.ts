import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PolicyControlService } from '../trips/policy-control.service';

type CreateOrganizationInput = { displayName: string; legalName?: string; kind: string; registrationNumber?: string; regionCode?: string };
type UpdateOrganizationInput = Partial<CreateOrganizationInput>;
type AddMemberInput = { accountId: string; role: 'ADMIN' | 'OPERATOR' | 'INSTRUCTOR' | 'STAFF' | 'VIEWER' };
const isUniqueConstraintError=(error:unknown):error is {code:string}=>typeof error==='object'&&error!==null&&'code' in error&&(error as {code?:unknown}).code==='P2002';

@Injectable()
export class OrganizationsService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly policies:PolicyControlService,private readonly notifications:NotificationsService) {}
  private clean(input:CreateOrganizationInput){const displayName=input.displayName?.trim(),kind=input.kind?.trim();if(!displayName||!kind)throw new BadRequestException('displayName and kind are required.');return{displayName,kind,legalName:input.legalName?.trim()||null,registrationNumber:input.registrationNumber?.trim()||null,regionCode:input.regionCode?.trim()||null};}
  private async auditAction(accountId:string,action:string,resourceId:string,metadata?:object){const account=await this.db.account.findUnique({where:{id:accountId},select:{personId:true}});await this.audit.record({actorId:account?.personId,action,resource:'organization',resourceId,metadata});}
  private async notifyQuietly(accountId:string,type:string,payload:Record<string,unknown>){try{await this.notifications.notify(accountId,type,payload);}catch{return;}}
  private category(kind:string){const normalized=kind.toUpperCase();return normalized.includes('DIVE')||normalized.includes('CENTER')?'CENTER':'ORGANIZATION';}
  private async activationDecision(kind:string){const category=this.category(kind);const activation=await this.policies.decision(category,'ACTIVATION_APPROVAL');const documents=await this.policies.decision(category,category==='CENTER'?'LICENSES':'REGISTRATION_DOCUMENTS');return{category,activation,documents};}

  async create(accountId:string,input:CreateOrganizationInput){const data=this.clean(input),policy=await this.activationDecision(data.kind);try{const organization=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{const created=await tx.organization.create({data:{...data,ownerId:accountId,status:policy.activation.bypass?'ACTIVE':'PENDING_REVIEW'}});await tx.organizationMember.create({data:{organizationId:created.id,accountId,role:'OWNER',status:'ACTIVE'}});return created;});await this.auditAction(accountId,'organization.submitted',organization.id,{kind:organization.kind,policy:{activation:policy.activation.state,documents:policy.documents.state}});return{...organization,policyReview:{required:policy.activation.review||policy.documents.review,issues:[...(policy.activation.review?['ACTIVATION_APPROVAL']:[]),...(policy.documents.review?['DOCUMENTS_OR_LICENSES']:[])],states:{activation:policy.activation.state,documents:policy.documents.state}}};}catch(error){if(isUniqueConstraintError(error))throw new ConflictException('Registration number already exists.');throw error;}}
  mine(accountId:string){return this.db.organizationMember.findMany({where:{accountId,status:{in:['PENDING','ACTIVE']}},include:{organization:true},orderBy:{createdAt:'desc'}});}
  private async requireManager(accountId:string,organizationId:string){const member=await this.db.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}}});if(!member||member.status!=='ACTIVE'||!['OWNER','ADMIN'].includes(member.role))throw new ForbiddenException('Organization manager scope required.');return member;}
  async update(accountId:string,organizationId:string,input:UpdateOrganizationInput){await this.requireManager(accountId,organizationId);const organization=await this.db.organization.findUnique({where:{id:organizationId}});if(!organization)throw new NotFoundException('Organization not found.');const data=this.clean({...organization,...input} as CreateOrganizationInput),policy=await this.activationDecision(data.kind);try{const nextStatus=policy.activation.bypass?'ACTIVE':organization.status==='REJECTED'?'PENDING_REVIEW':organization.status;const updated=await this.db.organization.update({where:{id:organizationId},data:{...data,status:nextStatus}});await this.auditAction(accountId,'organization.updated',organizationId,{policy:{activation:policy.activation.state,documents:policy.documents.state}});return{...updated,policyReview:{required:policy.activation.review||policy.documents.review,states:{activation:policy.activation.state,documents:policy.documents.state}}};}catch(error){if(isUniqueConstraintError(error))throw new ConflictException('Registration number already exists.');throw error;}}
  async members(accountId:string,organizationId:string){await this.requireManager(accountId,organizationId);return this.db.organizationMember.findMany({where:{organizationId},include:{account:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}}},orderBy:{createdAt:'asc'}});}
  async addMember(accountId:string,organizationId:string,input:AddMemberInput){await this.requireManager(accountId,organizationId);const [account,organization]=await Promise.all([this.db.account.findUnique({where:{id:input.accountId},select:{id:true}}),this.db.organization.findUnique({where:{id:organizationId},select:{displayName:true}})]);if(!account)throw new NotFoundException('Account not found.');try{const member=await this.db.organizationMember.create({data:{organizationId,accountId:input.accountId,role:input.role,status:'PENDING'}});await this.auditAction(accountId,'organization.member_invited',organizationId,{memberId:member.id,invitedAccountId:input.accountId,role:input.role});await this.notifyQuietly(input.accountId,'ORGANIZATION_INVITATION',{organizationId,organizationName:organization?.displayName??null,memberId:member.id,role:input.role});return member;}catch(error){if(isUniqueConstraintError(error))throw new ConflictException('Account is already a member.');throw error;}}

  async respondToInvitation(accountId:string,organizationId:string,accept:boolean){
    if(typeof accept!=='boolean')throw new BadRequestException('Invitation response must explicitly set accept to true or false.');
    const membership=await this.db.organizationMember.findUnique({where:{organizationId_accountId:{organizationId,accountId}},include:{organization:{select:{id:true,status:true,displayName:true,ownerId:true}}}});
    if(!membership||membership.role==='OWNER'||membership.status!=='PENDING')throw new NotFoundException('Pending organization invitation not found.');
    if(accept&&membership.organization.status!=='ACTIVE')throw new ConflictException('Organization must be active before an invitation can be accepted.');
    const status=accept?'ACTIVE':'REMOVED';
    const updated=await this.db.organizationMember.update({where:{id:membership.id},data:{status}});
    await this.auditAction(accountId,accept?'organization.member_invitation_accepted':'organization.member_invitation_declined',organizationId,{memberId:membership.id,role:membership.role,organizationStatus:membership.organization.status});
    await this.notifyQuietly(membership.organization.ownerId,'ORGANIZATION_INVITATION_RESPONSE',{organizationId,organizationName:membership.organization.displayName,memberAccountId:accountId,role:membership.role,accepted:accept});
    return{...updated,organizationName:membership.organization.displayName};
  }

  listForAdmin(){return this.db.organization.findMany({include:{owner:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},_count:{select:{members:true}}},orderBy:{createdAt:'desc'}});}

  async decide(reviewerId:string,organizationId:string,input:{outcome:'APPROVED'|'REJECTED';reason?:string}){
    if(!['APPROVED','REJECTED'].includes(input.outcome))throw new BadRequestException('Invalid decision.');
    if(input.outcome==='REJECTED'&&(!input.reason?.trim()||input.reason.trim().length<5))throw new BadRequestException('A rejection reason of at least five characters is required.');
    const organization=await this.db.organization.findUnique({where:{id:organizationId}});
    if(!organization||organization.status!=='PENDING_REVIEW')throw new NotFoundException('Organization is not awaiting review.');
    if(organization.ownerId===reviewerId)throw new ForbiddenException('Reviewers cannot approve or reject an organization they own.');
    const policy=await this.activationDecision(organization.kind);
    if(input.outcome==='APPROVED'&&policy.activation.enforce&&policy.documents.enforce&&!organization.registrationNumber)throw new ConflictException('Registration number is required while organization document validation is enforced.');
    const status=input.outcome==='APPROVED'?'ACTIVE':'REJECTED';
    const updated=await this.db.organization.update({where:{id:organizationId},data:{status,reviewedAt:new Date(),reviewedById:reviewerId}});
    await this.auditAction(reviewerId,'organization.'+input.outcome.toLowerCase(),organizationId,{reason:input.reason?.trim()||null,policy:{activation:policy.activation.state,documents:policy.documents.state},pendingInvitationsActivated:false});
    await this.notifyQuietly(organization.ownerId,'ORGANIZATION_REVIEWED',{organizationId,displayName:organization.displayName,outcome:input.outcome,reason:input.reason?.trim()||null});
    return{...updated,policyReview:{required:policy.documents.review,issues:policy.documents.review?['DOCUMENTS_OR_LICENSES']:[],states:{activation:policy.activation.state,documents:policy.documents.state}}};
  }
}
