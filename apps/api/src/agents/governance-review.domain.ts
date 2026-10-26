import { AgentKey } from './agent.types';

export const GOVERNANCE_REVIEW_ORDER = [
  'GOV_QUALITY_AUDIT', 'GOV_TECH_REVIEW', 'GOV_SECURITY_RISK',
  'GOV_COMPLIANCE_POLICY', 'GOV_VERIFICATION', 'GOV_FINAL_GATE',
] as const satisfies readonly AgentKey[];
export type GovernanceAgentKey = typeof GOVERNANCE_REVIEW_ORDER[number];
export const isGovernanceAgent = (key:string):key is GovernanceAgentKey =>
  (GOVERNANCE_REVIEW_ORDER as readonly string[]).includes(key);

export const GOVERNANCE_SPECIALTIES:Record<GovernanceAgentKey,string> = {
  GOV_QUALITY_AUDIT:'requirements, scope, acceptance criteria and completeness',
  GOV_TECH_REVIEW:'architecture, APIs, data design, integration and maintainability',
  GOV_SECURITY_RISK:'permissions, isolation, privacy, safety and operational risk',
  GOV_COMPLIANCE_POLICY:'policy, delegation, budget, contractual and regulatory boundaries',
  GOV_VERIFICATION:'objective test evidence, logs, CI and before/after verification',
  GOV_FINAL_GATE:'consolidation of all five prior reviews into an owner recommendation',
};

export interface GovernanceReview {
  decision:'PASS'|'PASS_WITH_NOTES'|'RETURN_FOR_CORRECTION';
  riskLevel:'LOW'|'MEDIUM'|'HIGH';
  findings:string[];
  evidenceGaps:string[];
  ownerEscalationRequired:boolean;
}

// Model text is advisory data. Only a complete, bounded result can advance a
// review; prose, missing fields and unknown values never imply a passed gate.
export function parseGovernanceReview(text:string):GovernanceReview|null {
  try {
    const value=JSON.parse(text);
    const keys=['decision','riskLevel','findings','evidenceGaps','ownerEscalationRequired'];
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))return null;
    if(!['PASS','PASS_WITH_NOTES','RETURN_FOR_CORRECTION'].includes(value.decision)||!['LOW','MEDIUM','HIGH'].includes(value.riskLevel)||typeof value.ownerEscalationRequired!=='boolean')return null;
    for(const key of ['findings','evidenceGaps'])if(!Array.isArray(value[key])||value[key].length>12||value[key].some((item:unknown)=>typeof item!=='string'||!item.trim()||item.length>1000))return null;
    return value as GovernanceReview;
  }catch{return null;}
}

export function governanceRouteDecision(review:GovernanceReview|null){
  if(!review)return 'INVALID_REVIEW' as const;
  if(review.riskLevel==='HIGH'||review.ownerEscalationRequired)return 'OWNER_ESCALATION_REQUIRED' as const;
  if(review.decision==='RETURN_FOR_CORRECTION'||review.evidenceGaps.length)return 'CORRECTION_REQUIRED' as const;
  return 'CONTINUE' as const;
}
