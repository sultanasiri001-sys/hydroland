export type AgentKey=
  | 'HR_DIRECTOR'
  | 'TRAINING_DIRECTOR'
  | 'MARINE_DIRECTOR'
  | 'FINANCE_DIRECTOR'
  | 'SAFETY_DIRECTOR'
  | 'FACILITIES_DIRECTOR'
  | 'ADMIN_DIRECTOR'
  | 'GOVERNANCE_DIRECTOR'
  | 'RESEARCH_DIRECTOR'
  | 'EXECUTIVE'
  | 'MARKETING'
  | 'SALES'
  | 'SUPPORT'
  | 'INVENTORY'
  | 'SOCIAL'
  | 'LEGAL_RISK'
  | 'CYBER_SECURITY'
  | 'GOV_QUALITY_AUDIT'
  | 'GOV_TECH_REVIEW'
  | 'GOV_SECURITY_RISK'
  | 'GOV_COMPLIANCE_POLICY'
  | 'GOV_VERIFICATION'
  | 'GOV_FINAL_GATE';
export type SupportedLanguage='ar-SA'|'en';
export type AgentAction='READ_OPERATIONS'|'DRAFT_MESSAGE'|'DRAFT_CAMPAIGN'|'DRAFT_REPORT'|'REQUEST_HUMAN_APPROVAL';
export interface AgentDescriptor{key:AgentKey;nameAr:string;nameEn:string;allowedActions:readonly AgentAction[];forbiddenActions:readonly string[]}
export interface AgentPlan{agent:AgentKey;language:SupportedLanguage;action:AgentAction;approvalRequired:boolean;result:string}
