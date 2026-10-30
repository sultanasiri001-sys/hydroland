import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AgentAction, AgentDescriptor, AgentKey, AgentPlan, SupportedLanguage } from './agent.types';

const prohibited=[
  'OVERRIDE_SAFETY_DECISION',
  'OVERRIDE_REGULATORY_BLOCK',
  'CHANGE_ROLE',
  'CAPTURE_PAYMENT',
  'REFUND_PAYMENT',
  'SIGN_CONTRACT',
  'ACCESS_DATABASE_DIRECTLY',
];

const reviewActions:readonly AgentAction[]=['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'];

const agents:readonly AgentDescriptor[]=[
  {key:'HR_DIRECTOR',nameAr:'مدير الموارد البشرية',nameEn:'Human Resources director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'TRAINING_DIRECTOR',nameAr:'مدير التدريب',nameEn:'Training director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'MARINE_DIRECTOR',nameAr:'مدير الرحلات والعمليات البحرية',nameEn:'Marine Operations director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'FINANCE_DIRECTOR',nameAr:'مدير المالية',nameEn:'Finance director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'SAFETY_DIRECTOR',nameAr:'مدير السلامة والامتثال والمخاطر',nameEn:'Safety Compliance and Risk director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'FACILITIES_DIRECTOR',nameAr:'مدير المرافق والأصول والصيانة',nameEn:'Facilities and Maintenance director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'ADMIN_DIRECTOR',nameAr:'مدير الشؤون الإدارية والوثائق',nameEn:'Administrative Affairs director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOVERNANCE_DIRECTOR',nameAr:'مدير الإدارة العليا والحوكمة',nameEn:'Executive Governance department director',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'RESEARCH_DIRECTOR',nameAr:'مدير الأبحاث والتطوير وتحليل السوق',nameEn:'Research and Market Intelligence director',allowedActions:reviewActions,forbiddenActions:prohibited},

  {key:'EXECUTIVE',nameAr:'عبدالله التنفيذي',nameEn:'Abdullah Executive',allowedActions:['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'MARKETING',nameAr:'مدير التسويق والعلامة التجارية والنمو',nameEn:'Marketing agent',allowedActions:['READ_OPERATIONS','DRAFT_CAMPAIGN','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'SALES',nameAr:'وكيل المبيعات',nameEn:'Sales agent',allowedActions:['READ_OPERATIONS','DRAFT_MESSAGE','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'SUPPORT',nameAr:'مدير خدمة العملاء وتجربة العميل',nameEn:'Customer support agent',allowedActions:['READ_OPERATIONS','DRAFT_MESSAGE','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'INVENTORY',nameAr:'مدير المخزون والمستودعات والخدمات اللوجستية',nameEn:'Inventory agent',allowedActions:['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'SOCIAL',nameAr:'وكيل التواصل الاجتماعي',nameEn:'Social agent',allowedActions:['DRAFT_CAMPAIGN','DRAFT_MESSAGE','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'LEGAL_RISK',nameAr:'مدير الشؤون القانونية والعقود والتأمين',nameEn:'Legal and risk agent',allowedActions:['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'CYBER_SECURITY',nameAr:'مدير التقنية والأنظمة والأمن السيبراني',nameEn:'Cybersecurity agent',allowedActions:['READ_OPERATIONS','DRAFT_REPORT','REQUEST_HUMAN_APPROVAL'],forbiddenActions:prohibited},
  {key:'GOV_QUALITY_AUDIT',nameAr:'وكيل تدقيق الجودة',nameEn:'Governance quality audit agent',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOV_TECH_REVIEW',nameAr:'وكيل المراجعة الفنية',nameEn:'Governance technical review agent',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOV_SECURITY_RISK',nameAr:'وكيل الأمن والمخاطر',nameEn:'Governance security and risk agent',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOV_COMPLIANCE_POLICY',nameAr:'وكيل الامتثال والسياسات',nameEn:'Governance compliance and policy agent',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOV_VERIFICATION',nameAr:'وكيل التحقق والاختبارات',nameEn:'Governance verification and testing agent',allowedActions:reviewActions,forbiddenActions:prohibited},
  {key:'GOV_FINAL_GATE',nameAr:'وكيل بوابة الاعتماد النهائي',nameEn:'Governance final approval gate agent',allowedActions:reviewActions,forbiddenActions:prohibited},
];

@Injectable()
export class AgentService {
  constructor(private readonly audit:AuditService){}
  list(){return agents}
  async plan(accountId:string,input:{agent:AgentKey;action:AgentAction;language:SupportedLanguage;prompt:string}):Promise<AgentPlan>{
    const agent=agents.find(item=>item.key===input.agent);
    if(!agent)throw new BadRequestException('Unknown agent.');
    if(!['ar-SA','en'].includes(input.language))throw new BadRequestException('Only Arabic (Saudi) and English are supported.');
    if(!agent.allowedActions.includes(input.action))throw new ForbiddenException('This action is outside the agent boundary.');
    if(input.prompt.trim().length<3||input.prompt.length>2000)throw new BadRequestException('Prompt length is invalid.');
    const approvalRequired=input.action!=='READ_OPERATIONS'||input.agent==='GOV_FINAL_GATE';
    const result=input.language==='ar-SA'
      ?`تم إعداد مسودة آمنة بواسطة ${agent.nameAr}. ${approvalRequired?'تتطلب موافقة بشرية قبل أي إرسال أو تنفيذ.':'لا يملك الوكيل صلاحية تنفيذ تغييرات.'}`
      :`A safe draft was prepared by ${agent.nameEn}. ${approvalRequired?'Human approval is required before any send or execution.':'The agent cannot execute changes.'}`;
    await this.audit.record({action:'agent.plan.created',resource:'agent',resourceId:input.agent,metadata:{accountId,action:input.action,language:input.language,approvalRequired}});
    return{agent:input.agent,language:input.language,action:input.action,approvalRequired,result};
  }
}
