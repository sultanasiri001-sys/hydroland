import { BadRequestException, ConflictException } from '@nestjs/common';
import { decisionDigest } from '../document-forms/owner-administrative-decision.domain';
import { Participant } from '../document-forms/internal-document-review.domain';
import { templateObject } from '../document-forms/document-template-input';

export const TECHNOLOGY_REQUEST_POLICY = 'TECHNOLOGY_REQUEST_V1';
export const TECHNOLOGY_REQUEST_PREFIX = 'TECHNOLOGY_REQUEST:v1:';
export const TECHNOLOGY_REQUEST_HISTORY = 'TECHNOLOGY_REQUEST_HISTORY:v1:';
export const TECHNOLOGY_REQUEST_KINDS = ['ACCESS','CHANGE','INCIDENT','RISK'] as const;
export const TECHNOLOGY_REQUEST_STATES = ['DRAFT','SUBMITTED','APPROVED','IN_PROGRESS','EXECUTED','TEST_FAILED','VERIFIED','RISK_ACCEPTED','ROLLBACK_REQUIRED','ROLLED_BACK','CLOSED','REJECTED','REVOKED'] as const;
export type TechnologyRequestKind = typeof TECHNOLOGY_REQUEST_KINDS[number];
export type TechnologyRequestState = typeof TECHNOLOGY_REQUEST_STATES[number];
export type TechnologyRequestAction = 'SUBMIT'|'APPROVE'|'REJECT'|'START'|'RECORD_EXECUTION'|'PASS_TEST'|'FAIL_TEST'|'ACCEPT_RISK'|'REQUEST_ROLLBACK'|'RECORD_ROLLBACK'|'CLOSE'|'REVOKE';
export type TechnologyProof = {documentId:string;version:number;contentHash:string;sourceHash:string;reference:string;templateCode:string};
export type TechnologyRequestRecord = {
  policy:typeof TECHNOLOGY_REQUEST_POLICY;id:string;organizationId:string;requestKey:string;requestDigest:string;revision:number;
  kind:TechnologyRequestKind;title:string;scopeReference:string;executionPlan:string;testPlan:string;rollbackPlan:string;
  targetAccountId:string|null;accessAction:'SUSPEND'|'REACTIVATE'|'APPOINTMENT'|null;
  requestedByAccountId:string;assignee:Participant;expiresAt:string;requestProof:TechnologyProof;state:TechnologyRequestState;
  approval:{accountId:string;personId:string;authorityDigest:string;at:string}|null;
  executionProof:TechnologyProof|null;verificationProof:TechnologyProof|null;rollbackProof:TechnologyProof|null;
  executionAuditId:string|null;rollbackAuditId:string|null;riskReviewAt:string|null;outcome:'COMPLETED'|'ROLLED_BACK'|'RISK_ACCEPTED'|null;createdAt:string;updatedAt:string;recordDigest:string;
};
export const requestDigest = decisionDigest;
export const requestKey = (org:string,id:string) => `${TECHNOLOGY_REQUEST_PREFIX}${org}:${id}`;
export const historyKey = (org:string,id:string,revision:number) => `${TECHNOLOGY_REQUEST_HISTORY}${org}:${id}:${String(revision).padStart(7,'0')}`;
export function technologyId(value:unknown):string {
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new BadRequestException('مرجع الطلب أو المستند غير صالح.');
  return value.toLowerCase();
}
function text(value:unknown,max=2000){
  if(typeof value!=='string'||value.trim().length<3||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))throw new BadRequestException('أدخل نصًا واضحًا ضمن الطول المسموح.');return value.trim();
}
function revision(value:unknown){if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>1_000_000)throw new BadRequestException('يلزم إصدار صحيح حالي.');return Number(value);}
export function technologyExpiry(value:unknown,now=Date.now()){
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value||Date.parse(value)<=now||Date.parse(value)>now+7*86400000)throw new BadRequestException('تكليف التنفيذ يجب أن ينتهي خلال سبعة أيام كحد أقصى.');return value;
}
export function technologyCreate(body:unknown){
  const x=templateObject(body,['requestKey','kind','title','scopeReference','executionPlan','testPlan','rollbackPlan','targetAccountId','accessAction','assigneeAccountId','expiresAt','requestDocumentId','requestDocumentVersion','requestDocumentHash']);
  if(!TECHNOLOGY_REQUEST_KINDS.includes(x.kind as TechnologyRequestKind))throw new BadRequestException('نوع الطلب غير صالح.');
  if(typeof x.requestDocumentHash!=='string'||!/^[a-f0-9]{64}$/.test(x.requestDocumentHash))throw new BadRequestException('يلزم تثبيت بصمة مستند الطلب.');
  const kind=x.kind as TechnologyRequestKind;
  if(kind==='ACCESS'&&!['SUSPEND','REACTIVATE','APPOINTMENT'].includes(String(x.accessAction))||kind!=='ACCESS'&&(x.targetAccountId!==undefined||x.accessAction!==undefined))throw new BadRequestException('مسار طلب الوصول أو نطاق الحساب غير صالح.');
  return {requestKey:technologyId(x.requestKey),kind,title:text(x.title,160),scopeReference:text(x.scopeReference,200),executionPlan:text(x.executionPlan),testPlan:text(x.testPlan),rollbackPlan:text(x.rollbackPlan),
    targetAccountId:kind==='ACCESS'?technologyId(x.targetAccountId):null,accessAction:kind==='ACCESS'?x.accessAction as 'SUSPEND'|'REACTIVATE'|'APPOINTMENT':null,
    assigneeAccountId:technologyId(x.assigneeAccountId),expiresAt:technologyExpiry(x.expiresAt),requestDocumentId:technologyId(x.requestDocumentId),requestDocumentVersion:revision(x.requestDocumentVersion),requestDocumentHash:x.requestDocumentHash};
}
export function technologyTransition(body:unknown,action:TechnologyRequestAction){
  const needsProof=['RECORD_EXECUTION','PASS_TEST','RECORD_ROLLBACK','ACCEPT_RISK'].includes(action);
  const x=templateObject(body,['expectedRevision','reason','confirmed',...(needsProof?['proofDocumentId','proofDocumentVersion','proofDocumentHash']:[]),...(['RECORD_EXECUTION','RECORD_ROLLBACK'].includes(action)?['executionAuditId']:[]),...(action==='ACCEPT_RISK'?['riskReviewAt']:[])]);
  if(x.confirmed!==true)throw new BadRequestException('راجع الإجراء ثم أكد القرار.');
  const base={expectedRevision:revision(x.expectedRevision),reason:text(x.reason,1000),confirmed:true};
  if(!needsProof)return {...base,proof:null,executionAuditId:null,riskReviewAt:null};
  if(action==='ACCEPT_RISK'&&(typeof x.riskReviewAt!=='string'||!Number.isFinite(Date.parse(x.riskReviewAt))||Date.parse(x.riskReviewAt)<=Date.now()))throw new BadRequestException('قبول الخطر يحتاج موعد مراجعة مستقبليًا واضحًا.');
  if(typeof x.proofDocumentHash!=='string'||!/^[a-f0-9]{64}$/.test(x.proofDocumentHash))throw new BadRequestException('بصمة مستند الإثبات مطلوبة.');
  return {...base,proof:{documentId:technologyId(x.proofDocumentId),version:revision(x.proofDocumentVersion),contentHash:x.proofDocumentHash},executionAuditId:x.executionAuditId===undefined?null:technologyId(x.executionAuditId),riskReviewAt:action==='ACCEPT_RISK'?new Date(x.riskReviewAt as string).toISOString():null};
}
const transitions:Record<TechnologyRequestAction,{from:TechnologyRequestState[];to:TechnologyRequestState;role:'OWNER'|'ASSIGNEE'|'EITHER'}>={
  SUBMIT:{from:['DRAFT'],to:'SUBMITTED',role:'EITHER'},APPROVE:{from:['SUBMITTED'],to:'APPROVED',role:'OWNER'},REJECT:{from:['SUBMITTED'],to:'REJECTED',role:'OWNER'},
  START:{from:['APPROVED'],to:'IN_PROGRESS',role:'ASSIGNEE'},RECORD_EXECUTION:{from:['IN_PROGRESS'],to:'EXECUTED',role:'ASSIGNEE'},
  PASS_TEST:{from:['EXECUTED','ROLLED_BACK'],to:'VERIFIED',role:'OWNER'},FAIL_TEST:{from:['EXECUTED','ROLLED_BACK'],to:'TEST_FAILED',role:'OWNER'},
  ACCEPT_RISK:{from:['EXECUTED','TEST_FAILED'],to:'RISK_ACCEPTED',role:'OWNER'},
  REQUEST_ROLLBACK:{from:['IN_PROGRESS','EXECUTED','TEST_FAILED','VERIFIED'],to:'ROLLBACK_REQUIRED',role:'OWNER'},RECORD_ROLLBACK:{from:['ROLLBACK_REQUIRED'],to:'ROLLED_BACK',role:'ASSIGNEE'},
  CLOSE:{from:['VERIFIED','RISK_ACCEPTED'],to:'CLOSED',role:'OWNER'},REVOKE:{from:['DRAFT','SUBMITTED','APPROVED','IN_PROGRESS','EXECUTED','TEST_FAILED','VERIFIED','RISK_ACCEPTED','ROLLBACK_REQUIRED','ROLLED_BACK'],to:'REVOKED',role:'OWNER'},
};
export function technologyNext(state:TechnologyRequestState,action:TechnologyRequestAction,role:'OWNER'|'ASSIGNEE'){
  const rule=transitions[action];
  if(!rule||!rule.from.includes(state)||rule.role!=='EITHER'&&rule.role!==role)throw new ConflictException('الإجراء لا يطابق حالة الطلب أو دور صاحبه.');return rule.to;
}
export function technologyActions(state:TechnologyRequestState,role:'OWNER'|'ASSIGNEE'){
  return Object.keys(transitions).filter(action=>{try{technologyNext(state,action as TechnologyRequestAction,role);return true;}catch{return false;}}) as TechnologyRequestAction[];
}
export function technologyRecordDigest(row:Omit<TechnologyRequestRecord,'recordDigest'>|TechnologyRequestRecord){const {recordDigest:_ignored,...body}=row as TechnologyRequestRecord;return requestDigest(body);}
export function readTechnologyRequest(value:unknown):TechnologyRequestRecord {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ConflictException('سجل الطلب غير متاح.');const r=value as TechnologyRequestRecord;
  if(r.policy!==TECHNOLOGY_REQUEST_POLICY||!TECHNOLOGY_REQUEST_KINDS.includes(r.kind)||!TECHNOLOGY_REQUEST_STATES.includes(r.state)||!Number.isSafeInteger(r.revision)||r.revision<1||r.recordDigest!==technologyRecordDigest(r))throw new ConflictException('سجل الطلب لا يطابق بصمته أو إصداره.');
  technologyId(r.id);technologyId(r.organizationId);return r;
}
