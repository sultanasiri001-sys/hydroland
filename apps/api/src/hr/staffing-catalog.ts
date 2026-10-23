import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HYDROLAND_DEPARTMENTS, DepartmentCode } from '../governance/department-ownership.domain';

export const PLATFORM_STAFFING_KEY='PLATFORM_STAFFING_ORGANIZATION:v1';
export const PLATFORM_STAFFING_KIND='HYDROLAND_INTERNAL_PLATFORM';
const names:Record<DepartmentCode,string>={HR:'الموارد البشرية',TRAINING:'التدريب',MARINE_OPERATIONS:'الرحلات والعمليات البحرية',INVENTORY_LOGISTICS:'المخزون والمستودعات والخدمات اللوجستية',FINANCE:'المالية',SAFETY_COMPLIANCE_RISK:'السلامة والامتثال والمخاطر',CUSTOMER_EXPERIENCE:'خدمة العملاء وتجربة العميل',MARKETING_GROWTH:'التسويق والعلامة التجارية والنمو',TECHNOLOGY_CYBERSECURITY:'التقنية والأنظمة والأمن السيبراني',FACILITIES_ASSETS_MAINTENANCE:'المرافق والأصول والصيانة',ADMIN_AFFAIRS_RECORDS:'الشؤون الإدارية والوثائق',EXECUTIVE_GOVERNANCE:'الإدارة العليا والحوكمة',RND_MARKET_INTELLIGENCE:'الأبحاث والتطوير وتحليل السوق',LEGAL_CONTRACTS_INSURANCE:'الشؤون القانونية والعقود والتأمين'};
export const STAFFING_DEPARTMENTS=HYDROLAND_DEPARTMENTS.map(d=>({code:d.code,nameAr:names[d.code],nameEn:d.name}));
export const STAFFING_PROFILES=[
  {code:'STAFF',label:'موظف',description:'حساب موظف دون صلاحيات إدارة أو اعتماد.',roles:['STAFF']},
  {code:'HR_REVIEWER',label:'مراجع موارد بشرية',description:'التحقق من المرشحين وفتح حالات العلاقات الوظيفية في نطاق هيدرولاند الداخلي.',roles:['STAFF','HR_REVIEWER']},
  {code:'HR_MANAGER',label:'مدير موارد بشرية',description:'مراجعة المرشحين وطلبات التوظيف والتغييرات الوظيفية في النطاق الداخلي؛ الاعتماد التنفيذي منفصل.',roles:['STAFF','HR_MANAGER']},
] as const;
export type StaffingProfile=typeof STAFFING_PROFILES[number]['code'];
export type StaffingIntent={version:1;employmentId:string;accountId:string;organizationId:string;orgUnitId:string;positionId:string;profile:StaffingProfile;verificationMethod?:'EMAIL'|'GOOGLE'|'EXISTING'};
export const intentKey=(id:string)=>`STAFFING_APPOINTMENT:${id}`;
export function profileFor(code:unknown,departmentCode?:string){
  const profile=STAFFING_PROFILES.find(p=>p.code===code);
  if(!profile||departmentCode&&departmentCode!=='HR'&&profile.code!=='STAFF')throw new BadRequestException('اختر صلاحيات متاحة للإدارة المحددة.');
  return profile;
}
export function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
// The canonical internal organization's owner is responsible for its staff
// review, including requests the owner created. This is not a platform-wide
// exception for other administrators, center memberships or final approval.
export function platformOwnerCanReview(organization:{ownerId:string},actorId:string,employeeId:string){
  return actorId===organization.ownerId&&actorId!==employeeId;
}
export function readIntent(value:Prisma.JsonValue|undefined):StaffingIntent{
  const x=record(value);
  if(x.version!==1||!['employmentId','accountId','organizationId','orgUnitId','positionId'].every(k=>typeof x[k]==='string'&&x[k])||!STAFFING_PROFILES.some(p=>p.code===x.profile))throw new ConflictException('بيانات طلب الصلاحيات غير مكتملة؛ يلزم مراجعة الطلب.');
  return x as StaffingIntent;
}
export async function platformOrganization(tx:Prisma.TransactionClient){
  const setting=await tx.operationalSetting.findUnique({where:{key:PLATFORM_STAFFING_KEY}}),id=record(setting?.value).organizationId;
  if(typeof id!=='string'){if(setting)throw new ConflictException('إعداد الجهة الداخلية غير صالح.');return null;}
  const organization=await tx.organization.findUnique({where:{id},select:{id:true,kind:true,status:true,ownerId:true}});
  if(!organization||organization.kind!==PLATFORM_STAFFING_KIND||organization.status!=='ACTIVE')throw new ConflictException('الهيكل الداخلي غير متاح؛ راجع حالة جهة هيدرولاند.');
  return organization;
}
export function reviewedReason(body:unknown,keys:readonly string[]){
  const x=record(body);
  if(!body||Object.keys(x).some(k=>!keys.includes(k)))throw new BadRequestException('حقول الطلب غير صالحة.');
  if(x.reviewed!==true||typeof x.reason!=='string'||x.reason.trim().length<5||x.reason.trim().length>1000)throw new BadRequestException('راجع الإجراء وأدخل سببًا من 5 إلى 1000 حرف.');
  return x.reason.trim();
}
export function textField(value:unknown,label:string,max=120){
  if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u001f\u007f]/.test(value))throw new BadRequestException(`أدخل ${label} صالحًا.`);
  return value.trim();
}
