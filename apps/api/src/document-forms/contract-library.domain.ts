import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { contractKeys, contractRecord, contractText, CONTRACT_FIELDS, COOPERATION_CLAUSES } from './cooperation-contract.domain';
import { platformOrganization } from '../hr/staffing-catalog';
import { OwnerDepartmentEvidence, validOwnerDepartmentEvidence } from '../hr/owner-department-responsibility';
import { OwnerReviewEvidence, validOwnerReviewEvidence } from '../hr/temporary-owner-review';

export const LIBRARY_PREFIX = 'CLIB-';
export const DIVE_LIBRARY_CODE = 'CLIB-DIVE-COOPERATION';
export const isLibraryCode = (code: string) => code.startsWith(LIBRARY_PREFIX);
export type LibraryState = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'APPROVED_FOR_DRAFTS' | 'RETIRED' | 'SUPERSEDED';
export type LibraryField = { key: string; label: string; source: string; required: boolean };
export type LibraryContent = {
  schemaVersion: 1;
  category: 'COOPERATION' | 'EMPLOYMENT' | 'GENERAL';
  workflow: 'DIVE_COOPERATION_V1' | 'HR_EMPLOYMENT_TEMPLATE_V1' | 'REFERENCE_TEMPLATE_V1';
  ownerDepartment: 'LEGAL_CONTRACTS_INSURANCE';
  linkedDepartments: string[];
  fields: LibraryField[];
  clauses: string[];
  usageNotes: string;
  source: { name: string; revision: string; status: 'ADAPTED_DRAFT' };
};
type Review = { accountId: string; at: string; contentHash: string; reference: string; temporaryOwnerReview?:OwnerReviewEvidence };
export type InternalApproval = { accountId: string; at: string; contentHash: string; reference: string; purpose: 'INTERNAL_DRAFT_PREPARATION_ONLY' };
export type OwnerDepartmentApproval={accountId:string;at:string;contentHash:string;reference:string;purpose:'INTERNAL_DRAFT_PREPARATION_ONLY';authority:OwnerDepartmentEvidence};
export type LibraryEnvelope = {
  kind: 'CONTRACT_LIBRARY_V1'; state: LibraryState; content: LibraryContent; contentHash: string;
  createdBy: string; createdAt: string; changeReason: string; previousId: string | null;
  internalApproval?: InternalApproval; ownerDepartmentApproval?:OwnerDepartmentApproval; legalReview?: Review; hrReview?: Review; publishedBy?: string; publishedAt?: string;
};
export function libraryHash(code: string, titleAr: string, titleEn: string, content: LibraryContent) {
  // JSONB sorts object keys; recursive canonical ordering is part of this hash contract.
  const stable = (x: unknown): unknown => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])) : x;
  return 'sha256:' + createHash('sha256').update(JSON.stringify(stable({code,titleAr,titleEn,content}))).digest('hex');
}
export function readLibrary(row: { code: string; titleAr: string; titleEn: string; fields: unknown }): LibraryEnvelope {
  const e = contractRecord(row.fields) as unknown as LibraryEnvelope;
  if (!isLibraryCode(row.code) || e.kind !== 'CONTRACT_LIBRARY_V1' || !['DRAFT','IN_REVIEW','PUBLISHED','APPROVED_FOR_DRAFTS','RETIRED','SUPERSEDED'].includes(e.state) || !e.content || e.content.schemaVersion !== 1 || !Array.isArray(e.content.fields) || !Array.isArray(e.content.clauses) || libraryHash(row.code,row.titleAr,row.titleEn,e.content)!==e.contentHash) throw new ConflictException('سجل قالب العقد يحتاج مراجعة.');
  for(const review of [e.legalReview,e.hrReview])if(review?.temporaryOwnerReview&&(!validOwnerReviewEvidence(review.temporaryOwnerReview)||review.temporaryOwnerReview.ownerId!==review.accountId))throw new ConflictException('بيانات صلاحية المراجعة المؤقتة تحتاج مراجعة.');
  if(e.internalApproval!==undefined){
    const approval=e.internalApproval;
    if(!approval||Array.isArray(approval)||e.content.category!=='EMPLOYMENT'||Object.keys(approval).some(k=>!['accountId','at','contentHash','reference','purpose'].includes(k))||typeof approval.accountId!=='string'||!approval.accountId||typeof approval.at!=='string'||!Number.isFinite(Date.parse(approval.at))||new Date(approval.at).toISOString()!==approval.at||approval.contentHash!==e.contentHash||typeof approval.reference!=='string'||approval.reference.trim().length<3||approval.reference.length>240||approval.purpose!=='INTERNAL_DRAFT_PREPARATION_ONLY')throw new ConflictException('بيانات الموافقة الداخلية تحتاج مراجعة.');
  }
  if(e.ownerDepartmentApproval!==undefined){
    const approval=e.ownerDepartmentApproval;
    if(!approval||Array.isArray(approval)||Object.keys(approval).some(k=>!['accountId','at','contentHash','reference','purpose','authority'].includes(k))||e.content.category!=='EMPLOYMENT'||e.content.workflow!=='HR_EMPLOYMENT_TEMPLATE_V1'||!validOwnerDepartmentEvidence(approval.authority)||approval.accountId!==approval.authority.ownerId||typeof approval.at!=='string'||!Number.isFinite(Date.parse(approval.at))||new Date(approval.at).toISOString()!==approval.at||approval.contentHash!==e.contentHash||typeof approval.reference!=='string'||approval.reference.trim().length<3||approval.reference.length>240||approval.purpose!=='INTERNAL_DRAFT_PREPARATION_ONLY'||e.internalApproval?.accountId!==approval.accountId)throw new ConflictException('اعتماد مسؤول الإدارتين للمسودات يحتاج مراجعة.');
  }
  if(e.state==='APPROVED_FOR_DRAFTS'&&!e.ownerDepartmentApproval)throw new ConflictException('مرجع الاعتماد الإداري للمسودات غير مكتمل.');
  return e;
}
// This static provenance check also protects consumption of historical HR
// publications. An internal approval or owner exception is never legal review.
export function independentEmploymentLegalReview(e:LibraryEnvelope,ownerId?:string){
  const review=e.legalReview;
  return Boolean(review&&typeof review.accountId==='string'&&review.accountId&&review.contentHash===e.contentHash&&!review.temporaryOwnerReview&&review.accountId!==e.createdBy&&review.accountId!==e.publishedBy&&review.accountId!==ownerId);
}
export function editLibraryContent(body: unknown, current: LibraryContent) {
  const x=contractKeys(body,['titleAr','titleEn','clauses','usageNotes']);
  const titleAr=contractText(x.titleAr,180),titleEn=contractText(x.titleEn,180);
  if(!titleAr||!titleEn||!Array.isArray(x.clauses)||x.clauses.length<1||x.clauses.length>40)throw new BadRequestException('أكمل اسم القالب وبنوده.');
  const clauses=x.clauses.map(c=>contractText(c,4000));
  if(clauses.some(c=>!c)||clauses.join('').length>60000)throw new BadRequestException('أكمل البنود ضمن الحد المتاح.');
  return {titleAr,titleEn,content:{...current,clauses,usageNotes:contractText(x.usageNotes,3000)}};
}
const field=(key:string,label:string,source='CONTRACT_TERMS',required=true):LibraryField=>({key,label,source,required});
const hrFields=[field('employer','اسم صاحب العمل القانوني','ORGANIZATION'),field('registration','السجل أو الرقم الموحد','ORGANIZATION'),field('employerAddress','عنوان صاحب العمل','ORGANIZATION'),field('representative','الممثل وصفته وسند التفويض','AUTHORIZED_REPRESENTATIVE'),field('employeeName','اسم العامل','EMPLOYMENT_ACCOUNT'),field('identityReference','مرجع الهوية وأهلية العمل','HR_RESTRICTED_EVIDENCE'),field('contact','التواصل والعنوان','EMPLOYMENT_ACCOUNT'),field('jobTitle','المسمى والمهام','EMPLOYMENT_POSITION'),field('department','الإدارة والمسؤول المباشر','EMPLOYMENT_ORG_UNIT'),field('startDate','تاريخ المباشرة','EMPLOYMENT'),field('location','موقع العمل ونفقات الانتقال'),field('pay','الأجر والبدلات وموعد الصرف'),field('hours','الساعات والراحة والإجازات'),field('policies','نسخة اللائحة والوصف الوظيفي'),field('marineEvidence','نطاق النشاط البحري والتراخيص أو عدم الانطباق'),field('officialReference','مرجع التوثيق الرسمي وحالته')];
const hrCommon=[
  'يعمل العامل لدى صاحب العمل المحدد وتحت إدارته أو إشرافه ضمن المهام والموقع المتفق عليهما. لا تخول عضوية هيدرولاند تشغيل العامل لدى كيان آخر دون المسار النظامي، وتراجع التغييرات الجوهرية في المهام أو الموقع قبل اعتمادها.',
  'تحدد الأجور والبدلات ومواعيد الصرف ووسيلته بوضوح. تسجل الساعات الفعلية ويحق للعامل مراجعتها والاعتراض عليها، وتوثق الحسميات وأسبابها وإجراءاتها النظامية.',
  'يوفر صاحب العمل الأدوات والتدريب والحماية اللازمة. يلتزم العامل بتعليمات السلامة وصدق السجلات وحفظ العهد والإبلاغ عن المخاطر. تحفظ الأدلة الصحية في مسار مقيد الصلاحيات، ويقتصر العقد على مراجعها اللازمة.',
  'تتاح للعامل نسخة محددة من اللائحة والوصف الوظيفي والعقد وملحقاته. تضبط السرية في حدود الغرض المشروع، وتحفظ حقوق الإبلاغ والاعتراض والمطالبة بالحقوق، وتراجع المنازعات والجزاءات وفق النظام المنطبق.',
  'عند انطباق الغوص أو العمل البحري، توثق حدود التأهيل والترخيص وخطة الطوارئ ومسؤوليات السلامة ومراجع التحقق. تراجع ملاءمة نوع العقد قبل تكليف الربان أو البحار أو العامل على السفن.',
  'تستكمل البيانات الجوهرية والمراجعة القانونية والتوثيق الرسمي المنطبق قبل التشغيل. اعتماد القالب داخل هيدرولاند لا ينشئ علاقة وظيفية ولا يغني عن إجراءات التوظيف والتوثيق الرسمية.'
];
export function starterContracts():Array<{code:string;titleAr:string;titleEn:string;content:LibraryContent}>{
  const content=(category:LibraryContent['category'],fields:LibraryField[],clauses:string[],name:string,usageNotes:string,revision='2 — 2026-10-23'):LibraryContent=>({schemaVersion:1,category,workflow:category==='COOPERATION'?'DIVE_COOPERATION_V1':category==='EMPLOYMENT'?'HR_EMPLOYMENT_TEMPLATE_V1':'REFERENCE_TEMPLATE_V1',ownerDepartment:'LEGAL_CONTRACTS_INSURANCE',linkedDepartments:category==='EMPLOYMENT'?['HR','LEGAL_CONTRACTS_INSURANCE','ADMIN_AFFAIRS_RECORDS']:['LEGAL_CONTRACTS_INSURANCE','ADMIN_AFFAIRS_RECORDS'],fields,clauses,usageNotes,source:{name,revision,status:'ADAPTED_DRAFT'}});
  return [
    {code:DIVE_LIBRARY_CODE,titleAr:'عقد تعاون محترف غوص',titleEn:'Diving Professional Cooperation Contract',content:content('COOPERATION',CONTRACT_FIELDS.map(([section,key,label])=>field(section+'.'+key,label,section==='center'?'CENTER_PROFILE':section==='professional'?'MEMBER_PROFILE':'CONTRACT_TERMS')),[...COOPERATION_CLAUSES],'HYDROLAND_Diving_Professional_Cooperation_Contract.pdf','تسحب بيانات الطرفين من ملفيهما. يوقع الطرفان النسخة نفسها ثم يعتمدها مالك هيدرولاند. تراجع حقيقة العلاقة والتراخيص والتوثيق المنطبق قبل الاستخدام.','3 — 2026-10-23')},
    {code:'CLIB-HR-PERMANENT',titleAr:'عقد عمل غير محدد المدة',titleEn:'Indefinite Employment Contract',content:content('EMPLOYMENT',hrFields,[...hrCommon.slice(0,2),'تحدد الساعات والراحة والإجازات والتجربة إن اتفق عليها صراحة، وتراجع الحقوق والتأمينات والتغطيات الواجبة. يخضع الإنهاء والاستقالة والإشعار والتعويض وتسوية الحقوق للأحكام المنطبقة، ولا ينشئ تقييم الأداء حق فصل تلقائي.',...hrCommon.slice(2)],'HYDROLAND_Permanent_Electronic_Contract.pdf','مسودة من النموذج السابق؛ يلزم تحقق الموارد البشرية والشؤون القانونية من أهلية العامل لهذا النوع وأحدث المتطلبات قبل اعتماد القالب. ربط بيانات الموظف يعتمد سجل Employment القائم.')},
    {code:'CLIB-HR-TEMPORARY',titleAr:'عقد عمل مؤقت لمهمة محددة',titleEn:'Temporary Task Employment Contract',content:content('EMPLOYMENT',[...hrFields,field('task','المهمة ونتيجتها وآلية قبولها'),field('endDate','نهاية المهمة أو المدة')],[...hrCommon.slice(0,2),'تحدد المهمة ومدتها ونتيجتها وأساس الأجر بوضوح. تراجع ملاءمة تصنيف العمل المؤقت وحدوده قبل التمديد أو التكرار، وتوثق الساعات والمستحقات وتسوية الحقوق والتأمينات والتغطيات المنطبقة.',...hrCommon.slice(2)],'HYDROLAND_Temporary_Electronic_Contract.pdf','مسودة مهمة محددة؛ يراجع المختص التصنيف والمدة والحقوق المنطبقة. لا يعامل كل عقد محدد المدة باعتباره عملاً مؤقتاً.')},
    {code:'CLIB-HR-FLEXIBLE',titleAr:'عقد عمل مرن بالأجر الساعي',titleEn:'Hourly Flexible Employment Contract',content:content('EMPLOYMENT',[...hrFields,field('hourlyRate','أجر الساعة والساعات الإضافية'),field('shifts','عرض الورديات وقبولها وإلغاؤها'),field('flexibleEligibility','مرجع أهلية العامل والمنشأة والتسجيل الرسمي')],[...hrCommon.slice(0,2),'تحدد قيمة الساعة والورديات وقبولها وإثبات الساعات وآلية الاعتراض والإلغاء والمزايا المتفق عليها. تتحقق الموارد البشرية والشؤون القانونية من أهلية العامل والمنشأة والمهنة وحدود التشغيل والتوثيق الرسمي والأحكام الخاصة بهذا النوع قبل الاستخدام.',...hrCommon.slice(2)],'HYDROLAND_Flexible_Electronic_Contract.pdf','مسودة مقتبسة من النموذج السابق. تتطلب مراجعة محدثة للأهلية وحدود الساعات والحقوق والتسجيل؛ لا تنقل أحكام العمل المرن إلى العقود العادية.')},
  ];
}
// Called inside the same serializable transaction as a new party contract.
// A retired version remains pinned to existing contracts, never used for a new one.
export async function publishedCooperationTemplate(tx:Prisma.TransactionClient){
  const platform=await platformOrganization(tx);
  if(!platform)throw new ConflictException('هيّئ الجهة الداخلية ومكتبة العقود أولاً.');
  const rows=await tx.documentTemplate.findMany({where:{organizationId:platform.id,code:DIVE_LIBRARY_CODE,status:'ACTIVE'},orderBy:{version:'desc'}});
  if(rows.length!==1)throw new ConflictException('اعتمد قالب عقد تعاون محترف غوص من مكتبة العقود قبل إنشاء عقد جديد.');
  const row=rows[0],e=readLibrary(row);
  if(e.state!=='PUBLISHED'||!e.legalReview||e.legalReview.contentHash!==e.contentHash||!e.publishedBy)throw new ConflictException('قالب العقد لم يستكمل المراجعة والاعتماد.');
  await tx.$queryRaw`SELECT "id" FROM "DocumentTemplate" WHERE "id"::text=${row.id} FOR SHARE`;
  return {row,envelope:e};
}
