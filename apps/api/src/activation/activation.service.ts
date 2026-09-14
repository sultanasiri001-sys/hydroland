import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type SelfServiceRole='DIVER'|'INSTRUCTOR'|'DIVE_CENTER'|'BOAT_OWNER'|'STAFF'|'ORGANIZATION';
const SELF_SERVICE_ROLES:SelfServiceRole[]=['DIVER','INSTRUCTOR','DIVE_CENTER','BOAT_OWNER','STAFF','ORGANIZATION'];

@Injectable()
export class ActivationService {
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

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

  async decide(reviewerId:string,requestId:string,outcome:'APPROVED'|'REJECTED',reason?:string){
    if(!['APPROVED','REJECTED'].includes(outcome))throw new BadRequestException('Invalid activation decision.');
    if(outcome==='REJECTED'&&(!reason?.trim()||reason.trim().length<5))throw new BadRequestException('A rejection reason of at least five characters is required.');
    const request=await this.db.activationRequest.findUnique({where:{id:requestId},include:{roleAssignment:true}});
    if(!request||request.applicantId===reviewerId)throw new NotFoundException('Request not reviewable.');
    if(request.status!=='SUBMITTED'&&request.status!=='UNDER_REVIEW')throw new BadRequestException('Invalid request state.');
    const result=await this.db.$transaction(async(tx:Prisma.TransactionClient)=>{
      await tx.reviewDecision.create({data:{activationRequestId:requestId,reviewerId,outcome,reason:reason?.trim()||null}});
      await tx.activationRequest.update({where:{id:requestId},data:{status:outcome,decidedAt:new Date()}});
      await tx.roleAssignment.update({where:{id:request.roleAssignmentId},data:{status:outcome==='APPROVED'?'ACTIVE':'REJECTED',activeAt:outcome==='APPROVED'?new Date():null}});
      return{id:requestId,status:outcome,role:request.roleAssignment.role};
    });
    await this.audit.record({action:'ACTIVATION_REQUEST_DECIDED',resource:'ActivationRequest',resourceId:requestId,metadata:{reviewerId,applicantId:request.applicantId,role:request.roleAssignment.role,outcome,reason:reason?.trim()||null}});
    return result;
  }
}
