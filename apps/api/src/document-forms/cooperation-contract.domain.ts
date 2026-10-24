import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ContractSourceSnapshot } from './cooperation-contract-sources';
import { createHash } from 'node:crypto';

export const COOPERATION_CODE = 'LEG-DIVE-COOPERATION-V1';
export const CONTRACT_DEPARTMENT = 'LEGAL_CONTRACTS_INSURANCE';
export const CONTRACT_IDENTITY = 'MARINE-INCIDENT-IDENTITY-1';
export type ContractSection = 'center' | 'professional' | 'terms';
export const CONTRACT_FIELDS = [
  ['center', 'legalName', 'الاسم القانوني للمركز', 240],
  ['center', 'registrationNumber', 'السجل التجاري', 120],
  ['center', 'address', 'عنوان المركز', 300],
  ['center', 'license', 'ترخيص المركز ونطاقه وتاريخ انتهائه', 1000],
  ['center', 'representativeCapacity', 'صفة الممثل وسند تفويضه', 300],
  ['center', 'trainingOrganization', 'منظمة التدريب وعضوية المركز', 300],
  ['professional', 'fullName', 'اسم المحترف', 240],
  ['professional', 'license', 'الترخيص الوطني وتاريخ انتهائه', 1000],
  ['professional', 'qualification', 'المنظمة والرتبة والعضوية وتاريخ انتهائها', 1000],
  ['professional', 'eligibility', 'مراجع إثبات الهوية وأهلية العمل واللياقة', 500],
  ['professional', 'contact', 'وسيلة التواصل للتبليغ', 200],
  ['terms', 'services', 'الخدمات وحدود التأهيل والتكليف', 2000],
  ['terms', 'location', 'المدينة ومواقع تقديم الخدمات', 300],
  ['terms', 'startDate', 'تاريخ بداية التعاون', 10],
  ['terms', 'endDate', 'تاريخ نهاية التعاون', 10],
  ['terms', 'fees', 'أساس الأتعاب وقيمتها ووعاء النسبة إن وجدت', 1500],
  ['terms', 'payment', 'مواعيد السداد والمستند المالي', 1000],
  ['terms', 'equipment', 'مسؤوليات المعدات والنقل والرسوم', 1000],
  ['terms', 'insurance', 'التأمين ومقدم التغطية ونطاقها ومرجعها', 1000],
  ['terms', 'cancellation', 'الإلغاء والتأجيل وتكاليفهما', 1000],
  ['terms', 'termination', 'مهلة الإنهاء ومعالجة الإخلال والتجديد', 1000],
] as const;
export type ContractValues = Record<ContractSection, Record<string, string>>;
export interface CooperationPayload extends ContractValues {
  workflow: 'DIVE_COOPERATION_V1';
  identityVersion: typeof CONTRACT_IDENTITY;
  centerAccountId: string;
  professionalAccountId: string;
  clauses: readonly string[];
  sourceSnapshot?:ContractSourceSnapshot;
  librarySource?: { templateId: string; version: number; contentHash: string };
}
// This is a versioned draft based on the existing cooperation document. It is
// not a regulatory approval or an assertion that a particular licence is valid.
export const COOPERATION_CLAUSES = [
  'ينظم العقد الخدمات والأتعاب المحددة في بياناته. يحدد كل تكليف إلكترونيًا ويقبله الطرفان قبل التنفيذ، ولا ينشئ حق تمثيل المركز دون تفويض.',
  'العبرة بحقيقة العلاقة. إذا انطبق نظام العمل تستكمل أحكامه والتوثيق الرسمي والتسجيلات الواجبة، ولا تسقط الحقوق الآمرة بتسمية العقد تعاونًا.',
  'يتحقق المركز من التراخيص وأهلية المحترف للعمل والشهادات واللياقة والتأمين ومتطلبات الجهات المختصة قبل التشغيل، ويحفظ أدلتها عبر مسار التحقق المعتمد.',
  'يوفر المركز التصاريح والمرافق والتجهيزات المتفق عليها وخطة الطوارئ ووسائل الاتصال والإسعاف بحسب متطلبات النشاط، ويسدد الأتعاب في مواعيدها.',
  'يلتزم المحترف بحدود رتبته وتأهيله وترخيصه، والتحقق من أهلية المشاركين وتوثيق الإحاطة والحضور والغوص والتدريب والحوادث. لا تصدر شهادة قبل استيفاء متطلباتها.',
  'يحق للطرفين إيقاف النشاط عند خطر الطقس أو البحر أو المعدات أو الحالة الصحية. توثق الطوارئ وتبلغ الجهات المختصة عند اللزوم، وتحترم المحميات والبيئة البحرية.',
  'توضح الأتعاب ووعاء النسب والخصومات والضرائب والمبالغ المستردة في العقد. تسدد الخدمات المنفذة والمصاريف المستحقة، ولا تفرض تكاليف مخالفة للنظام أو غير متفق عليها.',
  'يتحمل كل طرف مسؤولية خطئه وإخلاله وفق النظام، وتحدد التغطية التأمينية ومدتها واستثناءاتها. لا يتضمن العقد إعفاءً عامًا من المسؤولية أو إسقاطًا لحقوق لا تقبل التنازل.',
  'تستخدم البيانات في حدود الغرض والصلاحية والأساس النظامي، وتحفظ أدلة الهوية واللياقة في مسارها الخاص؛ تسجل مراجع الأدلة فقط في هذا العقد دون تفاصيل طبية.',
  'تطبق أنظمة المملكة العربية السعودية، وتحدد الجهة القضائية المختصة بحسب حقيقة العلاقة. لا يمنع السعي للتسوية الودية التدابير العاجلة أو يخل بالمواعيد النظامية.',
  'يوقع الطرفان الإصدار نفسه بعد مراجعته، ثم يرفع لاعتماد هيدرولاند. كل تعديل لاحق يستلزم إصدارًا جديدًا وتوقيعات جديدة. ختم هيدرولاند اعتماد إداري داخل المنصة، ولا يمنح رخصة مزاولة أو يحل محل التوثيق الرسمي الواجب.',
] as const;

export function contractRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('بيانات العقد غير صالحة.');
  return value as Record<string, unknown>;
}
export function contractKeys(value: unknown, keys: readonly string[]) {
  const x = contractRecord(value);
  if (Object.keys(x).some(k => !keys.includes(k))) throw new BadRequestException('يتضمن الطلب حقولًا غير متاحة.');
  return x;
}
export function contractText(value: unknown, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new BadRequestException('أدخل بيانات نصية صالحة ضمن الحد المتاح.');
  return value.trim().normalize('NFC');
}
export function contractValues(value: unknown): ContractValues {
  const x = contractKeys(value, ['center', 'professional', 'terms']);
  const out: ContractValues = { center: {}, professional: {}, terms: {} };
  for (const section of ['center', 'professional', 'terms'] as const) {
    const source = contractKeys(x[section] ?? {}, CONTRACT_FIELDS.filter(f => f[0] === section).map(f => f[1]));
    for (const [group, key, , max] of CONTRACT_FIELDS) if (group === section) out[section][key] = contractText(source[key], max, true);
  }
  for (const key of ['startDate', 'endDate']) {
    const date = out.terms[key];
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new BadRequestException('تاريخ العقد غير صالح.');
  }
  if (out.terms.startDate && out.terms.endDate && out.terms.startDate > out.terms.endDate) throw new BadRequestException('نهاية العقد تسبق بدايته.');
  return out;
}
export function readCooperation(value: unknown): CooperationPayload {
  const x = contractRecord(value);
  if (x.workflow !== 'DIVE_COOPERATION_V1' || x.identityVersion !== CONTRACT_IDENTITY || typeof x.centerAccountId !== 'string' || typeof x.professionalAccountId !== 'string' || !Array.isArray(x.clauses) || x.clauses.some(c => typeof c !== 'string')) throw new ConflictException('سجل العقد يحتاج مراجعة.');
  if(x.sourceSnapshot!==undefined){const s=contractRecord(x.sourceSnapshot);if(s.version!==1||typeof s.capturedAt!=='string'||typeof s.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(s.fingerprint)||!Array.isArray(s.professionalCredentialIds)||s.professionalCredentialIds.some(id=>typeof id!=='string')||(s.centerLicenseId!==null&&typeof s.centerLicenseId!=='string'))throw new ConflictException('مصدر بيانات العقد يحتاج مراجعة.');}
  const l=x.librarySource===undefined?null:contractRecord(x.librarySource);
  if(l&&(typeof l.templateId!=='string'||!Number.isInteger(l.version)||Number(l.version)<1||typeof l.contentHash!=='string'||!/^sha256:[a-f0-9]{64}$/.test(l.contentHash)))throw new ConflictException('مرجع قالب العقد يحتاج مراجعة.');
  return { ...contractValues({ center: x.center, professional: x.professional, terms: x.terms }), workflow: 'DIVE_COOPERATION_V1', identityVersion: CONTRACT_IDENTITY, centerAccountId: x.centerAccountId, professionalAccountId: x.professionalAccountId, ...(x.sourceSnapshot?{sourceSnapshot:{version:1 as const,capturedAt:(x.sourceSnapshot as ContractSourceSnapshot).capturedAt,fingerprint:(x.sourceSnapshot as ContractSourceSnapshot).fingerprint,professionalCredentialIds:(x.sourceSnapshot as ContractSourceSnapshot).professionalCredentialIds,centerLicenseId:(x.sourceSnapshot as ContractSourceSnapshot).centerLicenseId}}:{}), ...(l?{librarySource:{templateId:l.templateId as string,version:l.version as number,contentHash:l.contentHash as string}}:{}), clauses: x.clauses as string[] };
}
export function contractHash(payload: CooperationPayload, templateId: string, brandVersion: number) {
  return 'sha256:' + createHash('sha256').update(JSON.stringify({ templateId, brandVersion, payload })).digest('hex');
}
export function assertContractRevision(body: Record<string, unknown>, current: { version: number; contentHash: string }) {
  if (body.expectedVersion !== current.version || body.expectedContentHash !== current.contentHash) throw new ConflictException('تغير إصدار العقد؛ حدّث الصفحة وراجع النسخة قبل الإجراء.');
}
