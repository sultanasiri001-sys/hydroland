import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { uuid } from './agent-runtime.domain';
import { DEPARTMENT_SOURCE_SCOPE, DIRECTOR_SOURCE_FINGERPRINT, DepartmentSourceValues, departmentSourceValues } from './department-source.domain';

const keys=['pendingReviews','openTrips','activeBookings','pendingOrganizations'] as const;
export type OperationsValues=Record<typeof keys[number],number>;
export type OperationsEvidence={status:'RECORDED';observedAt:string;values:OperationsValues}|{status:'RECORDED';scope:typeof DEPARTMENT_SOURCE_SCOPE;observedAt:string;values:DepartmentSourceValues}|{status:'NOT_RECORDED'|'INVALID'};
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;

export function operationsValues(value:unknown):OperationsValues|null {
  const input=record(value);
  if(!input||Object.keys(input).length!==keys.length||keys.some(key=>!Number.isSafeInteger(input[key])||Number(input[key])<0))return null;
  return Object.fromEntries(keys.map(key=>[key,input[key]])) as OperationsValues;
}

export function operationsEvidenceDigest(taskId:string,claimId:string,sourceRevision:string,observedAt:string,values:OperationsValues|DepartmentSourceValues){
  return createHash('sha256').update(JSON.stringify({taskId,claimId,sourceRevision,observedAt,values})).digest('hex');
}

// Read only the exact server-captured aggregate input for this execution.
// Older tasks remain explicitly unrecorded; never reconstruct their past input.
export async function readOperationsEvidence(tx:Prisma.TransactionClient,source:{id:string;agentKey:string;action:string;fingerprint?:string;claimId:string|null;startedAt:Date|null;finishedAt:Date|null}):Promise<OperationsEvidence|null>{
  if(source.action!=='READ_OPERATIONS')return null;
  const events=await tx.auditEvent.findMany({where:{resource:'AiAgentTask',resourceId:source.id,action:{in:['AI_TASK_STARTED','AI_TASK_OPERATIONS_CAPTURED']},metadata:{path:['claimId'],equals:source.claimId||''}},select:{action:true,metadata:true},take:3});
  const captures=events.filter(event=>event.action==='AI_TASK_OPERATIONS_CAPTURED');
  if(!captures.length){
    const prior=await tx.auditEvent.findFirst({where:{resource:'AiAgentTask',resourceId:source.id,action:'AI_TASK_OPERATIONS_CAPTURED'},select:{id:true}});
    return{status:prior?'INVALID':'NOT_RECORDED'};
  }
  const starts=events.filter(event=>event.action==='AI_TASK_STARTED');
  if(captures.length!==1||starts.length!==1||events.length!==2)return{status:'INVALID'};
  const evidence=record(captures[0].metadata),start=record(starts[0].metadata);
  if(!evidence||!start||!uuid(source.claimId)||evidence.claimId!==source.claimId||start.claimId!==source.claimId||!uuid(evidence.sourceRevision)||start.revision!==evidence.sourceRevision||evidence.agentKey!==source.agentKey||!['OPERATIONS_AGGREGATE_V1',DEPARTMENT_SOURCE_SCOPE].includes(String(evidence.scope)))return{status:'INVALID'};
  // A legacy worker cannot fulfill a task pinned to department data by
  // returning the old general counters. Old tasks cannot be silently upgraded.
  if(Boolean(source.fingerprint?.startsWith(DIRECTOR_SOURCE_FINGERPRINT))!==(evidence.scope===DEPARTMENT_SOURCE_SCOPE))return{status:'INVALID'};
  const values=evidence.scope===DEPARTMENT_SOURCE_SCOPE?departmentSourceValues(evidence.values,source.agentKey):operationsValues(evidence.values),observedAt=evidence.observedAt;
  if(!values||typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt))||!source.startedAt||!source.finishedAt||Date.parse(observedAt)<source.startedAt.getTime()||Date.parse(observedAt)>source.finishedAt.getTime())return{status:'INVALID'};
  if(evidence.digest!==operationsEvidenceDigest(source.id,source.claimId,evidence.sourceRevision,observedAt,values))return{status:'INVALID'};
  return evidence.scope===DEPARTMENT_SOURCE_SCOPE?{status:'RECORDED',scope:DEPARTMENT_SOURCE_SCOPE,observedAt,values:values as DepartmentSourceValues}:{status:'RECORDED',observedAt,values:values as OperationsValues};
}
