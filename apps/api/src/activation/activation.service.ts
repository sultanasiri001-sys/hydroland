import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

type SelfServiceRole='DIVER'|'INSTRUCTOR'|'DIVE_CENTER'|'BOAT_OWNER'|'STAFF'|'ORGANIZATION';
type ActivationDecision='APPROVED'|'REJECTED'|'MORE_INFORMATION_REQUIRED';
const SELF_SERVICE_ROLES:SelfServiceRole[]=['DIVER','INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','STAFF','ORGANIZATION'];
const REVIEWABLE_STATES=['SUBMITTED','UNDER_REVIEW','RESUBMITTED'] as const;

@Injectable()
export class ActivationService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService,private readonly notifications:NotificationsService){}

  async request(accountId:string,role:string){
    if(!SELF_SERVICE_ROLES.includes(role as SelfServiceRole))throw new BadRequestException('Requested role is not available for self-service activation.');
    const requestedRole=role as SelfServiceRole;
    const existingRole=await this.db.roleAssignment.findUnique({where:{accountId_role:{accountId,role:requestedRole as never}}});
    if(existingRole?.status==='ACTIVE')throw new ConflictException('Role is already active.');
    const activeRequest=existingRole?await this.db.activationRequest.findFirst({where:{applicantId:accountId,roleAssignmentId:existingRole.id,status:{in:['DRAFT','SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','RESUBMITTED']}}}):null;
    if(activeRequest)throw new ConflictException('An active request already exists.');
    const roleAssignment=await this.db.roleAssignment.upsert({where:{accountId_role:{accountId,role:requestedRole as never}},create:{accountId,role:requestedRole as never,status:'PENDING_REVIEW'},update:{status:'PENDING_REVIEW'}});
    const request=await this.db.activationRequest.create({data:{applicantId:accountId,roleAssignmentId:roleAssignment.id,status:'SUBMITTED',submittedAt:new Date()}});
    await this.audit.record({action:'ACTIVATION_REQUEST_SUBMITTED',resource:'ActivationRequest',resourceId:request.id,metadata:{accountId,role:requestedRole,roleAssignmentId:roleAssignment.id}});
    return request;
  }

  async mine(accountId:string){return this.db.activationRequest.findMany({where:{applicantId:accountId},include:{roleAssignment:true,decisions:true},orderBy:{createdAt:'desc'}})}

  reviewQueue(){
    return this.db.activationRequest.findMany({
      where:{status:{in:[...REVIEWABLE_STATES]}},
      include:{
        applicant:{select:{id:true,email:true,person:{select:{firstName:true,lastName:true}}}},
        roleAssignment:true,
        decisions:{orderBy:{createdAt:'desc'},take:5},
      },
      orderBy:[{submittedAt:'asc'},{createdAt:'asc'}],
      take:200,
    });
  }

  async resubmit(accountId:string,requestId:string){
    const request=await this.db.activationRequest.findUnique({where:{id:requestId},include:{roleAssignment:true}});
    if(!request||request.applicantId!==accountId)throw new NotFoundException('Activation request not found.');
    if(request.status!=='MORE_INFORMATION_REQUIRED')throw new BadRequestException('Only requests awaiting more information can be resubmitted.');
    const updated=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      const current=await tx.activationRequest.findUnique({where:{id:requestId}});
      if(!current||current.status!=='MORE_INFORMATION_REQUIRED')throw new ConflictException('Activation request state changed.');
      await tx.roleAssignment.update({where:{id:request.roleAssignmentId},data:{status:'PENDING_REVIEW'}});
      return tx.activationRequest.update({where:{id:requestId},data:{status:'RESUBMITTED',submittedAt:new Date(),decidedAt:null}});
    });
    await this.audit.record({action:'ACTIVATION_REQUEST_RESUBMITTED',resource:'ActivationRequest',resourceId:requestId,metadata:{accountId,role:request.roleAssignment.role,previousStatus:request.status,status:'RESUBMITTED'}});
    return updated;
  }

  async decide(reviewerId:string,requestId:string,outcome:ActivationDecision,reason?:string){
    if(!['APPROVED','REJECTED','MORE_INFORMATION_REQUIRED'].includes(outcome))throw new BadRequestException('Invalid activation decision.');
    const cleanReason=reason?.trim()||null;
    if((outcome==='REJECTED'||outcome==='MORE_INFORMATION_REQUIRED')&&(!cleanReason||cleanReason.length<5))throw new BadRequestException('A reason of at least five characters is required.');
    const request=await this.db.activationRequest.findUnique({where:{id:requestId},include:{roleAssignment:true}});
    if(!request||request.applicantId===reviewerId)throw new NotFoundException('Request not reviewable.');
    if(!REVIEWABLE_STATES.includes(request.status as (typeof REVIEWABLE_STATES)[number]))throw new BadRequestException('Invalid request state.');
    const result=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      await tx.reviewDecision.create({data:{activationRequestId:requestId,reviewerId,outcome,reason:cleanReason}});
      await tx.activationRequest.update({where:{id:requestId},data:{status:outcome,decidedAt:outcome==='MORE_INFORMATION_REQUIRED'?null:new Date()}});
      await tx.roleAssignment.update({where:{id:request.roleAssignmentId},data:{status:outcome==='APPROVED'?'ACTIVE':outcome==='REJECTED'?'REJECTED':'PENDING_REVIEW',activeAt:outcome==='APPROVED'?new Date():null}});
      return{id:requestId,status:outcome,role:request.roleAssignment.role};
    });
    await this.audit.record({action:'ACTIVATION_REQUEST_DECIDED',resource:'ActivationRequest',resourceId:requestId,metadata:{reviewerId,applicantId:request.applicantId,role:request.roleAssignment.role,previousStatus:request.status,outcome,reason:cleanReason}});
    await this.notifications.notify(request.applicantId,'ACTIVATION_REQUEST_DECIDED',{requestId,role:request.roleAssignment.role,outcome,reason:cleanReason});
    return result;
  }
}
