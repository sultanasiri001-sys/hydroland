import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdministrativeTemplateField } from '../document-forms/document-template-input';
import { dateOnly, hash, id, integer, json, object, text, timestamp } from '../organizations/procurement.domain';

export { dateOnly, hash, id, integer, json, object, text, timestamp };
export const LEGAL_DEPARTMENT = 'LEGAL_CONTRACTS_INSURANCE';
export const LEGAL_CLAIM_REFERENCE = 'B06_INSURANCE_CLAIM';
export const LEGAL_CONTRACT_CODE = 'B06-LEGAL-CONTRACT-V1';
export const LEGAL_EVIDENCE_CODE = 'B06-LEGAL-EVIDENCE-V1';
export const LEGAL_ACTIONS = ['ADD_OBLIGATION','FULFILL_OBLIGATION','VERIFY_OBLIGATION','REJECT_OBLIGATION','REOPEN_OBLIGATION',
  'ADD_POLICY','CANCEL_POLICY','OPEN_CLAIM','APPROVE_CLAIM','REJECT_CLAIM','REOPEN_CLAIM','LINK_SETTLEMENT','RENEW','TERMINATE','ARCHIVE'] as const;
export type LegalAction = typeof LEGAL_ACTIONS[number];
export type LegalSource = { id: string; organizationId: string; version: number; hash: string; referenceNumber: string;
  titleAr: string; titleEn: string; snapshot: Record<string, unknown>; payload: Record<string, unknown>; signedAt: string };
export type LegalSourceRef = Pick<LegalSource, 'id'|'version'|'hash'|'referenceNumber'>;
export const sourceRef = (source: LegalSource): LegalSourceRef => ({id: source.id, version: source.version, hash: source.hash, referenceNumber: source.referenceNumber});
export type LegalProof = { source: LegalSourceRef; sourceSnapshot: Record<string, unknown>; recordedBy: string; personId: string; recordedAt: string };
export type LegalObligationRecord = { id: string; title: string; dueAt: string; responsibleAccountId: string; status: 'OPEN'|'AWAITING_VERIFICATION'|'FULFILLED';
  original: LegalProof; completion: LegalProof|null; verification: LegalProof|null };
export type LegalPolicyRecord = { id: string; provider: string; policyNumber: string; coverageFrom: string; coverageUntil: string;
  scope: string; status: 'ACTIVE'|'CANCELLED'; original: LegalProof; cancellation: LegalProof|null };
export type LegalClaimRecord = { id: string; policyId: string; title: string; occurredAt: string; amountMinor: number; currency: 'SAR';
  status: 'OPEN'|'APPROVED'|'REJECTED'|'SETTLED'; original: LegalProof; decision: LegalProof|null; settlement: (LegalProof & {financeEntryId: string; ledgerHash: string})|null };
export type LegalLifecycleState = { schemaVersion: 1; contract: LegalSourceRef; contractSnapshot: Record<string, unknown>;
  subject: string; effectiveFrom: string; expiresOn: string; applicabilityReference: string; applicabilityScope: string;
  predecessorId: string|null; successorId: string|null; status: 'OPEN'|'RENEWED'|'TERMINATED'|'ARCHIVED';
  obligations: LegalObligationRecord[]; policies: LegalPolicyRecord[]; claims: LegalClaimRecord[];
  termination: LegalProof|null; archive: (LegalProof & {retainUntil: string})|null };
export type LegalLifecycleRow = { id: string; organizationId: string; documentId: string; documentVersion: number; documentHash: string;
  revision: number; digest: string; state: LegalLifecycleState; createdByAccountId: string; createdAt: Date; updatedAt: Date };
export type LegalLifecycleEvent = { id: string; organizationId: string; lifecycleId: string; commandId: string; actorAccountId: string;
  requestHash: string; action: string; beforeRevision: number; afterRevision: number; previousDigest: string|null; resultDigest: string;
  evidence: Record<string, unknown>; createdAt: Date };
export const legalBusinessDate = (date=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function command(value: unknown, registration = false):Record<string,unknown>&{commandId:string} {
  const row=object(value, registration ? ['commandId','contractDocumentId','expectedDocumentVersion','expectedDocumentHash'] : ['commandId','expectedRevision','action','evidenceDocumentId','subjectId','newContractDocumentId','newContractVersion','newContractHash']);
  const commandId=id(row.commandId,'Command identifier');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(commandId))throw new BadRequestException('Use a UUID command identifier.');
  if(!registration && !LEGAL_ACTIONS.includes(String(row.action) as LegalAction))throw new BadRequestException('Unsupported legal lifecycle action.');
  return {...row,commandId,...(!registration?{expectedRevision:integer(row.expectedRevision,'Revision',1),action:row.action as LegalAction,evidenceDocumentId:id(row.evidenceDocumentId,'Signed evidence document')}:{})};
}
export function requireState(ok: unknown, message: string): asserts ok { if(!ok)throw new ConflictException(message); }
export const field = (key: string, labelAr: string, labelEn: string, type = 'TEXT', required = true): AdministrativeTemplateField => ({key,labelAr,labelEn,type,required});
export const LEGAL_TEMPLATES = [
  {code:LEGAL_CONTRACT_CODE,titleAr:'عقد قانوني مرتبط بمكتبة العقود',titleEn:'Legal contract linked to the contract library',fields:[
    field('purpose','نوع المستند','Document purpose','SELECT'),field('libraryTemplateId','قالب مكتبة العقود','Contract library template'),
    field('libraryVersion','إصدار المكتبة','Library version','NUMBER'),field('libraryContentHash','بصمة نسخة المكتبة','Library content hash'),
    field('subject','موضوع العقد','Contract subject'),field('partyReferences','الأطراف وصفاتهم وتفويض التوقيع','Parties, capacity and signing authority','TEXTAREA'),
    field('terms','الشروط المعتمدة لهذا الإصدار','Terms approved for this version','TEXTAREA'),field('effectiveFrom','بدء السريان','Effective from','DATE'),
    field('expiresOn','نهاية السريان','Expires on','DATE'),field('applicabilityReference','مرجع مراجعة المصدر والانطباق','Source and applicability review reference'),
    field('applicabilityScope','نطاق الانطباق وحدود الاعتماد','Applicability scope and approval limits','TEXTAREA'),
    field('previousContractDocumentId','العقد السابق عند التجديد','Previous contract document when renewing','TEXT',false),
  ].map(f=>f.key==='purpose'?{...f,options:['B06_CONTRACT_V1']}:f)},
  {code:LEGAL_EVIDENCE_CODE,titleAr:'دليل متابعة العقد والالتزام والتأمين',titleEn:'Contract, obligation and insurance evidence',fields:[
    field('purpose','نوع المستند','Document purpose','SELECT'),field('kind','الإجراء المثبت','Evidenced action','SELECT'),
    field('contractDocumentId','مرجع أصل العقد','Original contract document'),field('contractVersion','إصدار أصل العقد','Original contract version','NUMBER'),
    field('contractHash','بصمة أصل العقد','Original contract digest'),field('lifecycleId','سجل متابعة العقد','Contract follow-up record'),
    field('subjectId','معرّف الالتزام أو الوثيقة أو المطالبة','Obligation, policy or claim identifier','TEXT',false),
    field('reference','مرجع الإثبات','Evidence reference'),field('findings','الوقائع ونتيجة التحقق','Facts and verification findings','TEXTAREA'),
    field('occurredAt','وقت الواقعة مع المنطقة الزمنية','Occurrence time with timezone'),field('title','العنوان','Title','TEXT',false),
    field('responsibleAccountId','المسؤول عن الالتزام','Responsible account','TEXT',false),field('dueAt','موعد الالتزام','Obligation due date','DATE',false),
    field('provider','شركة التأمين','Insurer','TEXT',false),field('policyNumber','رقم وثيقة التأمين','Insurance policy number','TEXT',false),
    field('coverageFrom','بدء التغطية','Coverage starts','DATE',false),field('coverageUntil','نهاية التغطية','Coverage ends','DATE',false),
    field('scope','نطاق التغطية','Coverage scope','TEXTAREA',false),field('policyId','معرّف وثيقة التأمين المرتبطة','Linked policy identifier','TEXT',false),
    field('amountMinor','مبلغ المطالبة بالهللات','Claim amount in halalas','NUMBER',false),field('currency','العملة','Currency','SELECT',false),
    field('financeEntryId','مرجع القيد المالي المرحل','Posted finance entry','TEXT',false),field('retainUntil','الاحتفاظ حتى','Retain until','DATE',false),
    field('newContractDocumentId','أصل العقد المجدد','Renewed contract document','TEXT',false),
    field('newContractVersion','إصدار أصل العقد المجدد','Renewed contract version','NUMBER',false),
    field('newContractHash','بصمة أصل العقد المجدد','Renewed contract digest','TEXT',false),
  ].map(f=>f.key==='purpose'?{...f,options:['B06_LEGAL_EVIDENCE_V1']}:f.key==='kind'?{...f,options:[...LEGAL_ACTIONS]}:f.key==='currency'?{...f,options:['SAR']}:f)},
];
