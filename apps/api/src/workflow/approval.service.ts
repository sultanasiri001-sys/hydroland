import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus, approvalTransitions } from './approval.types';
@Injectable()
export class ApprovalService {
 transition(req:ApprovalRequest,next:ApprovalStatus,actorAccountId:string){
  if(req.requesterAccountId===actorAccountId && ['APPROVED','REJECTED'].includes(next)) throw new ForbiddenException('Self approval is forbidden');
  if(!approvalTransitions[req.status].includes(next)) throw new BadRequestException('Invalid approval transition');
  return {...req,status:next};
 }
}
