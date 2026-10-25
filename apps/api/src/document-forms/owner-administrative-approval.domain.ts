import { BadRequestException, ConflictException } from '@nestjs/common';
import { DOCUMENT_DEPARTMENTS } from './document-form.domain';
import { validateDocumentPayload } from './document-payload';
import { COOPERATION_CODE } from './cooperation-contract.domain';
import { isLibraryCode } from './contract-library.domain';
import { decisionDigest, plain, recordVersion } from './owner-administrative-decision.domain';

export const OWNER_APPROVAL_POLICY = 'OWNER_ADMINISTRATIVE_APPROVAL_V1';
export const OWNER_APPROVAL_PREFIX = 'OWNER_ADMIN_APPROVAL:v1:';
export const OWNER_APPROVAL_NOTICE = 'اعتماد إداري داخلي من مالك هيدرولاند لهذه النسخة. تبقى المراجعات القانونية والفنية وأدلتها والتوقيعات في مساراتها المختصة. لا ينفّذ هذا الاعتماد تعيينًا أو صرفًا أو عقدًا أو تصريحًا أو تغيير صلاحيات.';
export const approvalKey = (org: string, doc: string, version: number) => `${OWNER_APPROVAL_PREFIX}${org}:${doc}:${version}`;

export function approvalInput(value: unknown) {
  const allowed = ['expectedVersion', 'reviewHash', 'note', 'administrativeOnly', 'notIndependentApproval'];
  if (!plain(value) || Object.keys(value).some(k => !allowed.includes(k)) || value.administrativeOnly !== true || value.notIndependentApproval !== true
    || typeof value.reviewHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.reviewHash)) throw new BadRequestException('راجع النسخة وأكّد نطاق الاعتماد الإداري.');
  if (typeof value.note !== 'string' || value.note.trim().length < 5 || value.note.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value.note)) throw new BadRequestException('سجل سبب الاعتماد الإداري.');
  return { expectedVersion: recordVersion(value.expectedVersion), reviewHash: value.reviewHash, note: value.note.trim() };
}

export function administrativeEligibility(d: { organizationId: string; department: string; status: string; payload: unknown;
  approvedByAccountId: string | null; signedByAccountId: string | null; archivedByAccountId: string | null;
  template: { code: string; organizationId: string; department: string; fields: unknown } }) {
  const no = (reason: string) => ({ eligible: false, reason, purpose: null });
  if (d.template.code === COOPERATION_CODE || isLibraryCode(d.template.code)) return no('SPECIALIZED_CONTRACT_WORKFLOW');
  if (d.organizationId !== d.template.organizationId || d.department !== d.template.department || !(DOCUMENT_DEPARTMENTS as readonly string[]).includes(d.department)) return no('DEPARTMENT_MISMATCH');
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(d.status) || d.approvedByAccountId || d.signedByAccountId || d.archivedByAccountId) return no('EXISTING_APPROVAL_OR_FINAL_STATE');
  try { validateDocumentPayload(d.template.fields, d.payload); }
  catch (error) { if (error instanceof BadRequestException) return no('INCOMPLETE_OR_INVALID_CONTENT'); throw error; }
  return { eligible: true, reason: null, purpose: 'INTERNAL_ADMINISTRATIVE_APPROVAL' };
}

export function verifyApproval(value: unknown, org: string, doc: string, version: number): any {
  if (!plain(value)) throw new ConflictException('Invalid stored owner approval.');
  const { receiptHash, ...body } = value;
  if (value.policy !== OWNER_APPROVAL_POLICY || value.organizationId !== org || value.documentId !== doc || value.sourceVersion !== version
    || value.status !== 'ADMINISTRATIVELY_APPROVED' || typeof receiptHash !== 'string' || receiptHash !== decisionDigest(body)
    || !plain(value.source) || value.source.organizationId !== org || value.source.documentId !== doc || value.source.version !== version
    || !plain(value.source.template) || !plain(value.source.branding) || typeof value.actorAccountId !== 'string'
    || typeof value.recordedAt !== 'string' || !Number.isFinite(Date.parse(value.recordedAt)) || value.independentReview !== false
    || value.electronicSignature !== false || value.originalWorkflowUnchanged !== true) throw new ConflictException('Stored owner-approval integrity check failed.');
  return value;
}
