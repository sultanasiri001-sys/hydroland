import { BadRequestException } from '@nestjs/common';
import { AgentKey } from './agent.types';
import { DepartmentCode } from '../governance/department-ownership.domain';

export const AGENT_DEPARTMENTS:Record<AgentKey,DepartmentCode>={HR_DIRECTOR:'HR',TRAINING_DIRECTOR:'TRAINING',MARINE_DIRECTOR:'MARINE_OPERATIONS',FINANCE_DIRECTOR:'FINANCE',SAFETY_DIRECTOR:'SAFETY_COMPLIANCE_RISK',FACILITIES_DIRECTOR:'FACILITIES_ASSETS_MAINTENANCE',ADMIN_DIRECTOR:'ADMIN_AFFAIRS_RECORDS',GOVERNANCE_DIRECTOR:'EXECUTIVE_GOVERNANCE',RESEARCH_DIRECTOR:'RND_MARKET_INTELLIGENCE',EXECUTIVE:'EXECUTIVE_GOVERNANCE',MARKETING:'MARKETING_GROWTH',SALES:'MARKETING_GROWTH',SUPPORT:'CUSTOMER_EXPERIENCE',INVENTORY:'INVENTORY_LOGISTICS',SOCIAL:'MARKETING_GROWTH',LEGAL_RISK:'LEGAL_CONTRACTS_INSURANCE',CYBER_SECURITY:'TECHNOLOGY_CYBERSECURITY',GOV_QUALITY_AUDIT:'EXECUTIVE_GOVERNANCE',GOV_TECH_REVIEW:'EXECUTIVE_GOVERNANCE',GOV_SECURITY_RISK:'EXECUTIVE_GOVERNANCE',GOV_COMPLIANCE_POLICY:'EXECUTIVE_GOVERNANCE',GOV_VERIFICATION:'EXECUTIVE_GOVERNANCE',GOV_FINAL_GATE:'EXECUTIVE_GOVERNANCE'};
export const METRICS_MAX_AGE_MS=90_000;
export const TASK_LEASE_MS=90_000;
export const QUEUE_OVERDUE_MS=15*60_000;
export const QUEUE_LIMIT=100;
export const WORKER_STATUS_KEY='AI_RUNTIME_HEARTBEAT:v1';
export const RUNTIME_GUARD_KEY='AI_RUNTIME_SERIALIZATION:v1';
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function inputRecord(value:unknown,allowed:readonly string[]){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new BadRequestException('بيانات الإجراء غير صالحة.');
  return value as Record<string,unknown>;
}
export function decisionReason(value:Record<string,unknown>){
  if(value.reviewed!==true||typeof value.reason!=='string'||value.reason.trim().length<5||value.reason.trim().length>1000)throw new BadRequestException('راجع الإجراء وأدخل سببًا من 5 إلى 1000 حرف.');
  return value.reason.trim();
}
export function workload(counts:{running:number;queued:number;overdue:number;failed:number}|null){
  if(!counts)return 'UNAVAILABLE';
  if(counts.queued>=3||counts.overdue>0||counts.failed>0)return 'HIGH';
  return counts.running>0||counts.queued>0?'BUSY':'AVAILABLE';
}
export function estimateMicroUsd(input:number,output:number,inputRate:number,outputRate:number){
  return Math.ceil((input*inputRate+output*outputRate)/1_000_000);
}
