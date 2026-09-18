import { ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PostgresUnitOfWork } from '../database/postgres-uow.service';

@Injectable()
export class ApprovalDecisionService {
 constructor(private readonly db:PostgresUnitOfWork){}
 async approve(input:{requestId:string;requesterAccountId:string;reviewerAccountId:string;scopeId:string}) {
  if(input.requesterAccountId===input.reviewerAccountId) throw new ForbiddenException('Self approval is forbidden');
  return this.db.transaction(async tx=>{
   await tx.updateApprovalStatus(input.requestId,'APPROVED');
   if(tx.activateRoleGrant) await tx.activateRoleGrant(input.requestId);
   await tx.appendAudit({id:randomUUID(),actorAccountId:input.reviewerAccountId,action:'approval.approved',resourceType:'activation_request',resourceId:input.requestId,scopeId:input.scopeId,occurredAt:new Date().toISOString()});
   await tx.enqueueNotification({id:randomUUID(),accountId:input.requesterAccountId,eventKey:'activation.approved',payload:{requestId:input.requestId},status:'PENDING',attempts:0,createdAt:new Date().toISOString()});
   return {requestId:input.requestId,status:'APPROVED' as const};
  });
 }
}
