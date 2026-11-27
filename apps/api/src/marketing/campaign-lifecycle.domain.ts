import { BadRequestException, ConflictException } from '@nestjs/common';
import type { AdministrativeTemplateField } from '../document-forms/document-template-input';
import { draftDigest, MARKETING_CHANNELS } from './marketing-draft.domain';

export const CAMPAIGN_POLICY = 'MARKETING_CAMPAIGN_LIFECYCLE_V1';
export const CAMPAIGN_NOTICE = 'جاهزية تجهيز داخلية مرتبطة بالمصادر الحالية وقرار المالك؛ لا تنفّذ نشرًا أو صرفًا، ولا تتحقق من مزود خارجي. وقائع النشر والقياس المسجلة يدويًا تبقى منسوبة إلى مسجلها.';
export const campaignHash = draftDigest;
export const campaignJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function campaignObject(value: unknown, allowed?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new BadRequestException('A plain campaign object is required.');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(key => ['__proto__', 'prototype', 'constructor'].includes(key) || allowed && !allowed.includes(key))) throw new BadRequestException('Unsupported campaign properties.');
  return row;
}
export function campaignText(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new BadRequestException('Bounded nonempty campaign text is required.');
  return value.trim();
}
export function campaignId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new BadRequestException('Invalid campaign source identifier.');
  return value;
}
export function campaignRequestId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new BadRequestException('A UUIDv4 campaign request identifier is required.');
  return value.toLowerCase();
}
export function campaignDigest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new BadRequestException('A current server-computed campaign hash is required.');
  return value;
}
export function campaignInteger(value: unknown, min = 0, nativeField = false): number {
  const n = nativeField && typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < min || n > 2_147_483_647) throw new BadRequestException('An explicit integer within the supported campaign range is required.');
  return n;
}
export function campaignTime(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new BadRequestException('A canonical UTC campaign timestamp is required.');
  return value;
}
function channels(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > MARKETING_CHANNELS.length) throw new BadRequestException('Explicit campaign channel scope is required.');
  const result = value.map(item => {
    const row = campaignObject(item, ['channel']);
    if (typeof row.channel !== 'string' || !MARKETING_CHANNELS.includes(row.channel as never)) throw new BadRequestException('Unsupported campaign channel.');
    return row.channel;
  });
  if (new Set(result).size !== result.length) throw new BadRequestException('Campaign channels cannot repeat.');
  return result.sort();
}
const commonKeys = ['purpose', 'campaignDraftId', 'draftRevision', 'draftDigest', 'channelScope', 'validFrom', 'validUntil'];
function binding(row: Record<string, unknown>) {
  const validFrom = campaignTime(row.validFrom), validUntil = campaignTime(row.validUntil);
  if (validFrom >= validUntil) throw new BadRequestException('Campaign source validity must have a positive duration.');
  return { campaignDraftId: campaignId(row.campaignDraftId), draftRevision: campaignInteger(row.draftRevision, 1, true), draftDigest: campaignDigest(row.draftDigest), channels: channels(row.channelScope), validFrom, validUntil };
}
export function campaignRights(value: unknown) {
  const row = campaignObject(value, [...commonKeys, 'rightsHolderReference', 'contentScope', 'contentPermissionReference', 'dataScope', 'dataPermissionReference', 'restrictions']);
  if (row.purpose !== 'C06_CAMPAIGN_RIGHTS_V1') throw new BadRequestException('The original campaign rights purpose is required.');
  return { ...binding(row), rightsHolderReference: campaignText(row.rightsHolderReference, 500), contentScope: campaignText(row.contentScope), contentPermissionReference: campaignText(row.contentPermissionReference, 1000), dataScope: campaignText(row.dataScope), dataPermissionReference: campaignText(row.dataPermissionReference, 1000), restrictions: campaignText(row.restrictions) };
}
export function campaignBudget(value: unknown) {
  const row = campaignObject(value, [...commonKeys, 'financeAccountId', 'currency', 'amountMinor', 'taxMinor', 'taxBasis', 'taxReason', 'budgetScope']);
  if (row.purpose !== 'C06_CAMPAIGN_BUDGET_V1' || typeof row.currency !== 'string' || !/^[A-Z]{3}$/.test(row.currency)) throw new BadRequestException('An explicit native campaign budget currency and purpose are required.');
  const amountMinor = campaignInteger(row.amountMinor, 0, true), taxMinor = campaignInteger(row.taxMinor, 0, true);
  if (typeof row.taxBasis !== 'string' || !['TAX_INCLUDED', 'ZERO_RATED', 'EXEMPT', 'NO_SPEND'].includes(row.taxBasis) || taxMinor > amountMinor
    || row.taxBasis === 'TAX_INCLUDED' && taxMinor === 0 || row.taxBasis !== 'TAX_INCLUDED' && taxMinor !== 0
    || (amountMinor === 0) !== (row.taxBasis === 'NO_SPEND')) throw new BadRequestException('Campaign tax and zero-spend treatment must match the explicit total.');
  return { ...binding(row), financeAccountId: campaignId(row.financeAccountId), currency: row.currency, amountMinor, taxMinor, taxBasis: row.taxBasis, taxReason: campaignText(row.taxReason, 1000), budgetScope: campaignText(row.budgetScope) };
}
export function campaignSourceRef(value: unknown) {
  const row = campaignObject(value, ['id', 'version', 'hash']);
  return { id: campaignId(row.id), version: campaignInteger(row.version, 1), hash: campaignDigest(row.hash) };
}
export function campaignCommand(value: unknown, extra: readonly string[] = []) {
  const row = campaignObject(value, ['requestId', 'expectedRevision', 'expectedDigest', ...extra]);
  const expectedRevision = campaignInteger(row.expectedRevision);
  if (expectedRevision > 1_000_000) throw new BadRequestException('Campaign revision is outside the supported range.');
  const expectedDigest = expectedRevision === 0 && row.expectedDigest === null ? null : campaignDigest(row.expectedDigest);
  return { row, requestId: campaignRequestId(row.requestId), expectedRevision, expectedDigest };
}
export function campaignPrepare(value: unknown) {
  const command = campaignCommand(value, ['expectedDraftRevision', 'expectedDraftDigest', 'rightsDocument', 'budgetDocument', 'recommendation']);
  return { ...command, expectedDraftRevision: campaignInteger(command.row.expectedDraftRevision, 1), expectedDraftDigest: campaignDigest(command.row.expectedDraftDigest), rightsDocument: campaignSourceRef(command.row.rightsDocument), budgetDocument: campaignSourceRef(command.row.budgetDocument), recommendation: campaignText(command.row.recommendation) };
}
export function campaignDecision(value: unknown) {
  const command = campaignCommand(value, ['expectedReadinessHash', 'decision', 'note', 'confirmed']);
  if (command.row.confirmed !== true || !['APPROVE', 'DECLINE'].includes(command.row.decision as string)) throw new BadRequestException('Confirm an explicit owner campaign decision.');
  return { ...command, expectedReadinessHash: campaignDigest(command.row.expectedReadinessHash), decision: command.row.decision as 'APPROVE' | 'DECLINE', note: campaignText(command.row.note) };
}
export function campaignEvidenceCommand(value: unknown) {
  const command = campaignCommand(value, ['evidenceIds', 'reason', 'confirmed']);
  if (command.row.confirmed !== true || !Array.isArray(command.row.evidenceIds) || command.row.evidenceIds.length > 100) throw new BadRequestException('Confirm up to 100 original campaign evidence links.');
  const evidenceIds = command.row.evidenceIds.map(campaignId);
  if (new Set(evidenceIds).size !== evidenceIds.length) throw new BadRequestException('Campaign evidence links cannot repeat.');
  return { ...command, evidenceIds: evidenceIds.sort(), reason: campaignText(command.row.reason) };
}
export function campaignRevoke(value: unknown) {
  const command = campaignCommand(value, ['reason', 'confirmed']);
  if (command.row.confirmed !== true) throw new BadRequestException('Confirm the campaign revocation.');
  return { ...command, reason: campaignText(command.row.reason) };
}

const field = (key: string, labelAr: string, labelEn: string, type = 'TEXT', options?: string[]): AdministrativeTemplateField => ({ key, labelAr, labelEn, type, required: true, ...(options ? { options } : {}) });
const sourceFields = [field('campaignDraftId', 'الحملة الأصلية', 'Original campaign'), field('draftRevision', 'إصدار الحملة', 'Campaign revision', 'NUMBER'), field('draftDigest', 'بصمة الحملة الأصلية', 'Original campaign digest'), field('channelScope', 'القنوات المشمولة', 'Covered channels', 'TABLE', ['channel']), field('validFrom', 'بداية السريان UTC', 'Valid from UTC'), field('validUntil', 'نهاية السريان UTC', 'Valid until UTC')];
export const CAMPAIGN_TEMPLATES = [
  { code: 'C06-CAMPAIGN-RIGHTS-V1', titleAr: 'إذن محتوى وبيانات الحملة', titleEn: 'Campaign content and data permission', department: 'MARKETING_GROWTH', fields: [field('purpose', 'الغرض', 'Purpose', 'SELECT', ['C06_CAMPAIGN_RIGHTS_V1']), ...sourceFields, field('rightsHolderReference', 'مرجع صاحب الحق', 'Rights holder reference'), field('contentScope', 'نطاق المحتوى', 'Content scope', 'LONG_TEXT'), field('contentPermissionReference', 'مرجع إذن المحتوى الأصلي', 'Original content permission reference'), field('dataScope', 'نطاق البيانات المستخدمة', 'Data use scope', 'LONG_TEXT'), field('dataPermissionReference', 'مرجع إذن البيانات أو أساس عدم استخدامها', 'Data permission or non-use basis'), field('restrictions', 'القيود الصريحة', 'Explicit restrictions', 'LONG_TEXT')] },
  { code: 'C06-CAMPAIGN-BUDGET-V1', titleAr: 'ميزانية الحملة ونطاقها', titleEn: 'Campaign budget and scope', department: 'FINANCE', fields: [field('purpose', 'الغرض', 'Purpose', 'SELECT', ['C06_CAMPAIGN_BUDGET_V1']), ...sourceFields, field('financeAccountId', 'الحساب المالي الأصلي', 'Original finance account'), field('currency', 'عملة الحساب', 'Account currency'), field('amountMinor', 'السقف بوحدة العملة الصغرى شامل الضريبة', 'Budget cap in minor units including tax', 'NUMBER'), field('taxMinor', 'الضريبة الصريحة بوحدة العملة الصغرى', 'Explicit tax in minor units', 'NUMBER'), field('taxBasis', 'أساس الضريبة أو عدم الإنفاق', 'Tax or no-spend basis', 'SELECT', ['TAX_INCLUDED', 'ZERO_RATED', 'EXEMPT', 'NO_SPEND']), field('taxReason', 'سبب المعالجة الضريبية', 'Tax treatment reason'), field('budgetScope', 'نطاق الميزانية والمصروف المسموح', 'Budget and permitted spending scope', 'LONG_TEXT')] },
] as const;

/** This projection deliberately excludes the original draft and its digest.
 * Existing MarketingCampaignDraftRevision snapshots are never rewritten. */
export function campaignRecordBody(row: any) {
  return { policy: CAMPAIGN_POLICY, id: row.id, organizationId: row.organizationId, campaignDraftId: row.campaignDraftId, revision: row.revision, status: row.status,
    boundDraftRevision: row.boundDraftRevision, boundDraftDigest: row.boundDraftDigest, rightsDocumentId: row.rightsDocumentId, rightsVersion: row.rightsVersion, rightsHash: row.rightsHash, rightsSnapshot: row.rightsSnapshot,
    budgetDocumentId: row.budgetDocumentId, budgetVersion: row.budgetVersion, budgetHash: row.budgetHash, budgetSnapshot: row.budgetSnapshot, financeAccountId: row.financeAccountId,
    budgetAmountMinor: row.budgetAmountMinor, budgetTaxMinor: row.budgetTaxMinor, budgetCurrency: row.budgetCurrency, budgetTaxBasis: row.budgetTaxBasis, validFrom: row.validFrom, validUntil: row.validUntil,
    recommendation: row.recommendation, ownerBinding: row.ownerBinding, decision: row.decision, evidenceBindings: row.evidenceBindings, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
export const campaignRecordHash = (row: any) => campaignHash(campaignRecordBody(row));
export function campaignPreparationHash(row: any) {
  const { id, organizationId, campaignDraftId, boundDraftRevision, boundDraftDigest, rightsHash, budgetHash, financeAccountId, budgetAmountMinor, budgetTaxMinor, budgetCurrency, budgetTaxBasis, validFrom, validUntil, recommendation, ownerBinding } = campaignRecordBody(row);
  return campaignHash({ id, organizationId, campaignDraftId, boundDraftRevision, boundDraftDigest, rightsHash, budgetHash, financeAccountId, budgetAmountMinor, budgetTaxMinor, budgetCurrency, budgetTaxBasis, validFrom, validUntil, recommendation, ownerBinding });
}
export function assertCampaignRecord(row: any) {
  if (!row || !['PREPARED', 'APPROVED', 'DECLINED', 'REVOKED'].includes(row.status) || !Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 1_000_000 || row.recordDigest !== campaignRecordHash(row)) throw new ConflictException('CAMPAIGN_RECORD_INTEGRITY');
  return row;
}
