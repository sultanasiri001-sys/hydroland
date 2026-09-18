import { ApprovalDecisionService } from './approval-decision.service';
const calls:string[]=[];
const db:any={transaction:async(fn:any)=>{calls.push('begin');const r=await fn(db);calls.push('commit');return r;},updateApprovalStatus:async()=>calls.push('status'),activateRoleGrant:async()=>calls.push('grant'),appendAudit:async()=>calls.push('audit'),enqueueNotification:async()=>calls.push('notify')};
const access:any={resolve:async()=>({accountId:'v',roleKeys:['reviewer'],permissions:['approval.decide'],scopeType:'CENTER',scopeIds:['c'],active:true}),require:()=>undefined};
(async()=>{await new ApprovalDecisionService(db,access).approve({requestId:'r',requesterAccountId:'u',reviewerAccountId:'v',scopeId:'c'});
const expected='begin,status,grant,audit,notify,commit'; if(calls.join(',')!==expected) throw new Error(calls.join(',')); console.log('approval decision tests passed');})().catch(e=>{console.error(e);process.exit(1)});
