import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const F03_KIND = 'COMMUNITY_F03_PROGRAM';
export const F03_TEMPLATE = 'HYD-COMMUNITY-F03';
export const F03_BOUNDARY_AR = 'المطابقة موافقة على التنسيق فقط؛ لا تمنح تصريح غوص أو أهلية طبية أو شهادة خارجية. التدريب والرحلات يخضعان لمساراتهما المعتمدة، ويمكن سحب موافقة المطابقة.';
export const F03_BOUNDARY_EN = 'Matching records consent to coordinate only. It grants no dive clearance, medical eligibility or external certificate. Training and trips use their existing authorized workflows. Matching consent can be withdrawn.';
export type F03Activity = 'ACADEMY' | 'ENVIRONMENT' | 'VOLUNTEER';
export type F03Payload = {
  kind: typeof F03_KIND; titleAr: string; titleEn: string; contentAr: string; contentEn: string;
  consentAr: string; consentEn: string; privacyAr: string; privacyEn: string; safetyAr: string; safetyEn: string;
  coordinatorAccountId: string; academy: boolean; environment: boolean; volunteering: boolean; buddyMatching: boolean;
  validFrom: string; validUntil: string;
};
export const f03Fields = [
  { key:'kind', labelAr:'نوع البرنامج', labelEn:'Program kind', type:'SELECT', required:true, options:[F03_KIND] },
  ...[['title','اسم البرنامج','Program title','TEXT'],['content','محتوى البرنامج ونطاقه','Program content and scope','TEXTAREA'],['consent','شروط الموافقة','Consent terms','TEXTAREA'],['privacy','إشعار الخصوصية','Privacy notice','TEXTAREA'],['safety','قواعد السلامة والمشاركة','Safety and participation rules','TEXTAREA']].flatMap(([key,ar,en,type])=>[
    {key:key+'Ar',labelAr:ar+' بالعربية',labelEn:en+' in Arabic',type,required:true},
    {key:key+'En',labelAr:ar+' بالإنجليزية',labelEn:en+' in English',type,required:true},
  ]),
  {key:'coordinatorAccountId',labelAr:'منسق البرنامج المسمى',labelEn:'Named program coordinator',type:'TEXT',required:true},
  ...[['academy','الأكاديمية','Academy'],['environment','الأنشطة البيئية','Environmental activities'],['volunteering','التطوع المتقدم','Advanced volunteering'],['buddyMatching','مطابقة زملاء الغوص','Dive buddy matching']].map(([key,labelAr,labelEn])=>({key,labelAr,labelEn,type:'BOOLEAN',required:true})),
  {key:'validFrom',labelAr:'بداية نفاذ البرنامج',labelEn:'Program valid from',type:'TEXT',required:true},
  {key:'validUntil',labelAr:'نهاية نفاذ البرنامج',labelEn:'Program valid until',type:'TEXT',required:true},
  {key:'boundary',labelAr:'حدود البرنامج',labelEn:'Program boundary',type:'STATEMENT',required:false,contentAr:F03_BOUNDARY_AR,contentEn:F03_BOUNDARY_EN},
];
export function f03Text(value: unknown, label: string, min = 3, max = 2000) {
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))throw new BadRequestException(label);
  return value.trim();
}
export function f03Object(value: unknown, allowed: string[]) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new BadRequestException('Invalid F03 fields.');
  return value as Record<string,unknown>;
}
export function f03Payload(value: unknown): F03Payload {
  const keys=['kind','titleAr','titleEn','contentAr','contentEn','consentAr','consentEn','privacyAr','privacyEn','safetyAr','safetyEn','coordinatorAccountId','academy','environment','volunteering','buddyMatching','validFrom','validUntil'];
  const p=f03Object(value,keys);
  if(p.kind!==F03_KIND)throw new BadRequestException('F03 program source required.');
  const out: Record<string,unknown>={kind:F03_KIND};
  for(const key of ['titleAr','titleEn','coordinatorAccountId'])out[key]=f03Text(p[key],key,3,160);
  for(const key of ['contentAr','contentEn','consentAr','consentEn','privacyAr','privacyEn','safetyAr','safetyEn'])out[key]=f03Text(p[key],key,10,key.startsWith('content')?5000:2000);
  for(const key of ['academy','environment','volunteering','buddyMatching']){if(typeof p[key]!=='boolean')throw new BadRequestException('Explicit program choices are required.');out[key]=p[key];}
  if(![out.academy,out.environment,out.volunteering,out.buddyMatching].some(Boolean))throw new BadRequestException('Select the proposed program scope.');
  for(const key of ['validFrom','validUntil']){const v=p[key];if(typeof v!=='string'||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)throw new BadRequestException('Explicit ISO program dates are required.');out[key]=v;}
  if(String(out.validUntil)<=String(out.validFrom))throw new BadRequestException('Program dates are not ordered.');
  return out as F03Payload;
}
export function f03Consent(value: unknown, sourceHash: string) {
  const p=f03Object(value,['sourceHash','consent','safetyAcknowledged']);
  if(p.sourceHash!==sourceHash||p.consent!==true||p.safetyAcknowledged!==true)throw new BadRequestException('Read and explicitly accept the current program consent, privacy and safety terms.');
}
export const f03Hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const f03ActivityEnabled=(p:F03Payload,kind:F03Activity)=>({ACADEMY:p.academy,ENVIRONMENT:p.environment,VOLUNTEER:p.volunteering})[kind]===true;
