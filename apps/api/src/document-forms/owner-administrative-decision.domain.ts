import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const OWNER_DECISION_POLICY = 'ROUTINE_OWNER_RECORD_V1';
export const OWNER_DECISION_PREFIX = 'OWNER_ADMIN_DECISION:v1:';
export const OWNER_DECISION_NOTICE = 'قرار إداري من المالك لإثبات محضر أو متابعة روتينية فقط؛ ليس مراجعة مستقلة أو اعتمادًا ماليًا أو قانونيًا أو تعاقديًا أو قرارًا وظيفيًا أو تصريح سلامة أو توقيعًا إلكترونيًا.';
export const OWNER_DECISION_TEMPLATES: Record<string, { department: string; purpose: string; keys: string[] }> = {
  'ADM-MEETING-MINUTES': { department: 'ADMIN_AFFAIRS_RECORDS', purpose: 'RECORD_ROUTINE_MINUTES', keys: ['meetingNo', 'subject', 'decisions'] },
  'EXE-FOLLOWUP': { department: 'EXECUTIVE_GOVERNANCE', purpose: 'NOTE_ROUTINE_PROGRESS', keys: ['decisionNo', 'owner', 'evidence'] },
};
export function plain(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (plain(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export function decisionDigest(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
export function decisionKey(org: string, document: string, version: number): string {
  return `${OWNER_DECISION_PREFIX}${org}:${document}:${version}`;
}
export function scopeId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new BadRequestException('Invalid owner-decision scope.');
}
export function recordVersion(value: unknown): number {
  const n = typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) throw new BadRequestException('Invalid document version.');
  return n;
}
export function decisionInput(value: unknown) {
  const allowed = ['expectedVersion', 'reviewHash', 'note', 'routineOnly', 'notIndependentApproval'];
  if (!plain(value) || Object.keys(value).some(k => !allowed.includes(k)) || value.routineOnly !== true || value.notIndependentApproval !== true || typeof value.reviewHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.reviewHash)) throw new BadRequestException('Explicit routine-only and non-signature confirmation is required.');
  if (typeof value.note !== 'string' || !value.note.trim() || value.note.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value.note)) throw new BadRequestException('A bounded administrative note is required.');
  return { expectedVersion: recordVersion(value.expectedVersion), reviewHash: value.reviewHash, note: value.note.trim() };
}
export type RoutineSource = {
  id: string; organizationId: string; department: string; version: number; status: string; payload: unknown;
  approvedByAccountId: string | null; signedByAccountId: string | null; archivedByAccountId: string | null;
  template: { organizationId: string; code: string; department: string; fields: unknown };
};
export function routineEligibility(d: RoutineSource): { eligible: boolean; reason: string | null; purpose: string | null } {
  const no = (reason: string) => ({ eligible: false, reason, purpose: null });
  const definition = Object.hasOwn(OWNER_DECISION_TEMPLATES, d.template.code) ? OWNER_DECISION_TEMPLATES[d.template.code] : undefined;
  if (!definition) return no('DOCUMENT_TYPE_EXCLUDED');
  if (d.organizationId !== d.template.organizationId || d.department !== definition.department || d.template.department !== definition.department) return no('DEPARTMENT_MISMATCH');
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(d.status) || d.approvedByAccountId || d.signedByAccountId || d.archivedByAccountId) return no('EXISTING_APPROVAL_OR_FINAL_STATE');
  const fields = d.template.fields;
  if (!Array.isArray(fields) || fields.length !== definition.keys.length || new Set(fields.map(f => f?.key)).size !== fields.length || fields.some(f => !plain(f) || !definition.keys.includes(String(f.key)) || f.type !== 'TEXT' || f.required !== true || (f.options !== undefined && (!Array.isArray(f.options) || f.options.length > 0)))) return no('TEMPLATE_BINDING_CHANGED');
  const payload = d.payload;
  if (!plain(payload) || Object.keys(payload).length !== definition.keys.length || Object.keys(payload).some(k => !definition.keys.includes(k)) || definition.keys.some(k => typeof payload[k] !== 'string' || !(payload[k] as string).trim() || (payload[k] as string).length > 8000) || Buffer.byteLength(JSON.stringify(payload)) > 32000) return no('INCOMPLETE_OR_UNBOUNDED_CONTENT');
  return { eligible: true, reason: null, purpose: definition.purpose };
}
export function verifyDecision(value: unknown, org: string, document: string, version: number): any {
  if (!plain(value)) throw new ConflictException('Invalid stored owner decision.');
  const { receiptHash, ...body } = value;
  if (value.policy !== OWNER_DECISION_POLICY || value.organizationId !== org || value.documentId !== document || value.sourceVersion !== version || value.status !== 'OWNER_DECISION_RECORDED' || typeof receiptHash !== 'string' || receiptHash !== decisionDigest(body) || !plain(value.source) || !plain(value.source.template) || !plain(value.source.branding) || typeof value.actorAccountId !== 'string' || typeof value.recordedAt !== 'string' || !Number.isFinite(Date.parse(value.recordedAt)) || value.independentReview !== false || value.electronicSignature !== false) throw new ConflictException('Stored owner-decision integrity check failed.');
  return value;
}
