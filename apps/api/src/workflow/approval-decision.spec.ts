import { ApprovalDecisionService } from './approval-decision.service';
import { UnitOfWork } from '../database/uow.types';
const calls:string[]=[];
const db:UnitOfWork={
 async updateApprovalStatus(){calls.push('status');}, async activateRoleGrant(){calls.push('grant');},
 async appendAudit(){calls.push('audit');}, async enqueueNotification(){calls.push('notify');},
 async transaction<T>(work:(tx:UnitOfWork)=>Promise<T>){calls.push('begin');const v=await work(this);calls.push('commit');return v;}
};
(async()=>{await new ApprovalDecisionService(db).approve({requestId:'r',requesterAccountId:'u',reviewerAccountId:'v',scopeId:'c'});
 const expected='begin,status,grant,audit,notify,commit';if(calls.join(',')!==expected)throw new Error('transaction orchestration mismatch');})();
