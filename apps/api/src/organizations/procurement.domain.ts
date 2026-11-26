import { BadRequestException } from '@nestjs/common';
import { entitlementContractHash } from '../commerce/center-service-entitlement';
import { AdministrativeTemplateField } from '../document-forms/document-template-input';

export const PROCUREMENT_SETTLEMENT = 'ORGANIZATION_PROCUREMENT_SETTLEMENT';
export const PROCUREMENT_RECOVERY = 'ORGANIZATION_PROCUREMENT_REVERSAL';
export const PROCUREMENT_ROLES = ['maker', 'recommender', 'receiver', 'accountant', 'treasurer', 'acceptor'] as const;
export type ProcurementRole = typeof PROCUREMENT_ROLES[number];
export type ProcurementLine = { lineId: string; description: string; quantity: number; unitPriceMinor: number; taxMinor: number; taxTreatment: string; taxReason: string };
export type ProcurementTerms = {
  purpose: 'F08_PROCUREMENT_CONTRACT_V1'; purchaseReference: string; supplierDocumentId: string; supplierDocumentHash: string;
  currency: 'SAR'; totalMinor: number; procurementMethod: string; procurementSystem: string;
  integrationMode: 'MANUAL_EVIDENCE' | 'EXTERNAL_REFERENCE_ONLY'; integrationReference: string | null;
  validFrom: string; validUntil: string; participants: Record<ProcurementRole, string>; lines: ProcurementLine[];
  settlementPolicy: 'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE'; cancellationPolicy: 'NONE' | 'BEFORE_ANY_EFFECT'; cancellationTerms: string;
  reversalPolicy: 'NONE' | 'FULL_ORDER_RETURN_AND_RECOVERY'; reversalTerms: string; acceptanceMethod: string;
};

export function object(value: unknown, allowed?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new BadRequestException('A plain object is required.');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(key => ['__proto__', 'prototype', 'constructor'].includes(key) || allowed && !allowed.includes(key))) throw new BadRequestException('Unsupported procurement properties.');
  return row;
}
export function text(value: unknown, label: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new BadRequestException(`${label}: nonempty text up to ${max} characters is required.`);
  return value.trim();
}
export const id = (value: unknown, label = 'Identifier') => {
  const result = text(value, label, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(result)) throw new BadRequestException(`${label}: invalid identifier.`);
  return result;
};
export const digestValue = (value: unknown) => {
  const result = text(value, 'Evidence hash', 64);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new BadRequestException('A server-computed SHA-256 evidence hash is required.');
  return result;
};
export function integer(value: unknown, label: string, minimum = 0): number {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < minimum || number > 2_147_483_647) throw new BadRequestException(`${label}: an integer from ${minimum} to 2147483647 is required.`);
  return number;
}
export function dateOnly(value: unknown, label: string): string {
  const result = text(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(new Date(result + 'T00:00:00.000Z').getTime()) || new Date(result + 'T00:00:00.000Z').toISOString().slice(0, 10) !== result) throw new BadRequestException(`${label}: a valid date is required.`);
  return result;
}
export function timestamp(value: unknown): Date {
  const result = text(value, 'Evidence timestamp', 40);
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/.test(result)) throw new BadRequestException('Evidence timestamp must include a valid explicit UTC offset.');
  const parsed = new Date(result);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() > Date.now()) throw new BadRequestException('Evidence timestamp must be valid and cannot be in the future.');
  // Reject calendar overflow accepted by the JavaScript date parser.
  dateOnly(result.slice(0, 10), 'Evidence date');
  return parsed;
}
export const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export const hash = (value: unknown): string => entitlementContractHash(json(value));
export const bankKey = (bank: string, reference: string): string => entitlementContractHash([
  bank.normalize('NFKC').toUpperCase().replace(/\s+/g, ' '), reference.normalize('NFKC').toUpperCase().replace(/\s+/g, ''),
]);
export const procurementInvoiceKey = (organizationId: string, supplierRef: string, reference: string): string => {
  const normalized = (value: string) => value.normalize('NFKC').trim().toUpperCase().replace(/\s+/g, ' ');
  return hash({ organizationId, supplierRef: normalized(supplierRef), invoiceReference: normalized(reference) });
};

const lineKeys = ['lineId', 'description', 'quantity', 'unitPriceMinor', 'taxMinor', 'taxTreatment', 'taxReason'];
export function purchaseLines(value: unknown): ProcurementLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new BadRequestException('One to fifty explicit purchase lines are required.');
  const lines = value.map(input => {
    const row = object(input, lineKeys);
    const quantity = integer(row.quantity, 'Quantity', 1), unitPriceMinor = integer(row.unitPriceMinor, 'Unit price', 1), taxMinor = integer(row.taxMinor, 'Explicit line tax');
    if (!Number.isSafeInteger(quantity * unitPriceMinor + taxMinor) || quantity * unitPriceMinor + taxMinor > 2_147_483_647) throw new BadRequestException('Purchase line amount exceeds the supported range.');
    const taxTreatment = text(row.taxTreatment, 'Tax treatment');
    if (!['TAXABLE', 'EXEMPT', 'ZERO_RATED'].includes(taxTreatment) || taxTreatment === 'TAXABLE' && taxMinor <= 0 || taxTreatment !== 'TAXABLE' && taxMinor !== 0) throw new BadRequestException('Line tax must match its explicit treatment.');
    return { lineId: id(row.lineId, 'Line identifier'), description: text(row.description, 'Line description', 1000), quantity, unitPriceMinor, taxMinor, taxTreatment, taxReason: text(row.taxReason, 'Tax basis', 1000) };
  });
  if (new Set(lines.map(line => line.lineId)).size !== lines.length) throw new BadRequestException('Purchase line identifiers must be unique.');
  return lines;
}
export function quantities(value: unknown): { lineId: string; quantity: number }[] {
  if (!Array.isArray(value) || value.length > 50) throw new BadRequestException('A receipt or return quantity table is required.');
  const lines = value.map(input => { const row = object(input, ['lineId', 'quantity']); return { lineId: id(row.lineId, 'Line identifier'), quantity: integer(row.quantity, 'Quantity', 1) }; });
  if (new Set(lines.map(line => line.lineId)).size !== lines.length) throw new BadRequestException('Quantity line identifiers must be unique.');
  return lines;
}
export function contractTerms(value: unknown): ProcurementTerms {
  const row = object(value);
  if (row.purpose !== 'F08_PROCUREMENT_CONTRACT_V1' || row.currency !== 'SAR' || row.settlementPolicy !== 'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE') throw new BadRequestException('The signed procurement contract must explicitly select the supported complete-order SAR settlement policy.');
  const lines = purchaseLines(row.lines), totalMinor = integer(row.totalMinor, 'Contract total', 1);
  if (lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor + line.taxMinor, 0) !== totalMinor) throw new BadRequestException('The signed total must equal the explicit purchase lines and taxes.');
  const validFrom = dateOnly(row.validFrom, 'Valid from'), validUntil = dateOnly(row.validUntil, 'Valid until');
  if (validFrom > validUntil) throw new BadRequestException('The contract validity period is invalid.');
  const cancellationPolicy = text(row.cancellationPolicy, 'Cancellation policy'), reversalPolicy = text(row.reversalPolicy, 'Reversal policy');
  if (!['NONE', 'BEFORE_ANY_EFFECT'].includes(cancellationPolicy) || !['NONE', 'FULL_ORDER_RETURN_AND_RECOVERY'].includes(reversalPolicy)) throw new BadRequestException('An explicit supported cancellation and reversal policy is required.');
  const integrationMode = text(row.integrationMode, 'Integration boundary');
  if (!['MANUAL_EVIDENCE', 'EXTERNAL_REFERENCE_ONLY'].includes(integrationMode)) throw new BadRequestException('No external integration is enabled by this procurement contract.');
  const integrationReference = row.integrationReference ? text(row.integrationReference, 'External reference', 1000) : null;
  if (integrationMode === 'EXTERNAL_REFERENCE_ONLY' && !integrationReference) throw new BadRequestException('The externally managed process requires its explicit reference.');
  const participants = Object.fromEntries(PROCUREMENT_ROLES.map(role => [role, id(row[`${role}AccountId`], `${role} account`)])) as Record<ProcurementRole, string>;
  return {
    purpose: 'F08_PROCUREMENT_CONTRACT_V1', purchaseReference: text(row.purchaseReference, 'Purchase reference', 200), supplierDocumentId: id(row.supplierDocumentId), supplierDocumentHash: digestValue(row.supplierDocumentHash),
    currency: 'SAR', totalMinor, procurementMethod: text(row.procurementMethod, 'Procurement method', 200), procurementSystem: text(row.procurementSystem, 'Procurement system', 200),
    integrationMode: integrationMode as ProcurementTerms['integrationMode'], integrationReference, validFrom, validUntil, participants, lines,
    settlementPolicy: 'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE', cancellationPolicy: cancellationPolicy as ProcurementTerms['cancellationPolicy'], cancellationTerms: text(row.cancellationTerms, 'Cancellation terms', 8000),
    reversalPolicy: reversalPolicy as ProcurementTerms['reversalPolicy'], reversalTerms: text(row.reversalTerms, 'Reversal terms', 8000), acceptanceMethod: text(row.acceptanceMethod, 'Acceptance method', 1000),
  };
}

const field = (key: string, labelAr: string, labelEn: string, type = 'TEXT', required = true, options?: string[]): AdministrativeTemplateField => ({ key, labelAr, labelEn, type, required, ...(options ? { options } : {}) });
export const PROCUREMENT_TEMPLATES = [
  { code: 'F08-PROCUREMENT-SUPPLIER-V1', titleAr: 'تأهيل مورد مشتريات الجهة', titleEn: 'Organization procurement supplier qualification', department: 'INVENTORY_LOGISTICS', fields: [
    field('purpose', 'الغرض', 'Purpose', 'SELECT', true, ['F08_PROCUREMENT_SUPPLIER_V1']), field('supplierRef', 'مرجع المورد', 'Supplier reference'), field('supplierName', 'اسم المورد', 'Supplier name'),
    field('supplierAcceptanceRef', 'مرجع قبول المورد', 'Supplier acceptance reference'), field('validUntil', 'صالح حتى', 'Valid until', 'DATE'), field('scope', 'نطاق التأهيل', 'Qualification scope', 'LONG_TEXT'),
  ] },
  { code: 'F08-PROCUREMENT-CONTRACT-V1', titleAr: 'عقد وتفويض مشتريات الجهة', titleEn: 'Organization procurement contract and mandate', department: 'INVENTORY_LOGISTICS', fields: [
    field('purpose', 'الغرض', 'Purpose', 'SELECT', true, ['F08_PROCUREMENT_CONTRACT_V1']), field('purchaseReference', 'مرجع أمر الشراء', 'Purchase reference'),
    field('supplierDocumentId', 'مستند تأهيل المورد', 'Supplier qualification document'), field('supplierDocumentHash', 'بصمة تأهيل المورد', 'Supplier qualification evidence hash'),
    field('currency', 'العملة', 'Currency', 'SELECT', true, ['SAR']), field('totalMinor', 'الإجمالي بالهللات شامل الضريبة', 'Total minor units including tax', 'NUMBER'),
    field('procurementMethod', 'طريقة المشتريات المتفق عليها', 'Agreed procurement method'), field('procurementSystem', 'نظام أو وسيلة التبادل المتفق عليها', 'Agreed procurement system'),
    field('integrationMode', 'حدود الربط', 'Integration boundary', 'SELECT', true, ['MANUAL_EVIDENCE', 'EXTERNAL_REFERENCE_ONLY']), field('integrationReference', 'مرجع العملية الخارجية عند اختيارها', 'External process reference when selected', 'TEXT', false),
    field('validFrom', 'سريان التفويض من', 'Mandate valid from', 'DATE'), field('validUntil', 'سريان التفويض حتى', 'Mandate valid until', 'DATE'),
    ...PROCUREMENT_ROLES.map((role, i) => field(`${role}AccountId`, ['حساب منشئ الطلب', 'حساب ممثل المشتريات الموصي', 'حساب المستلم', 'حساب المحاسب المعد', 'حساب مؤكد التنفيذ المالي', 'حساب القابل المستقل'][i], `${role} account`)),
    field('lines', 'البنود والقيم والضريبة الصريحة لكل بند', 'Purchase lines and explicit tax', 'TABLE', true, lineKeys),
    field('settlementPolicy', 'سياسة التسوية', 'Settlement policy', 'SELECT', true, ['FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE']),
    field('cancellationPolicy', 'سياسة الإلغاء', 'Cancellation policy', 'SELECT', true, ['NONE', 'BEFORE_ANY_EFFECT']), field('cancellationTerms', 'الشروط الفعلية للإلغاء', 'Actual cancellation terms', 'LONG_TEXT'),
    field('reversalPolicy', 'سياسة العكس والاسترداد', 'Reversal policy', 'SELECT', true, ['NONE', 'FULL_ORDER_RETURN_AND_RECOVERY']), field('reversalTerms', 'الشروط الفعلية للعكس والاسترداد', 'Actual reversal and recovery terms', 'LONG_TEXT'), field('acceptanceMethod', 'طريقة القبول المستقل', 'Independent acceptance method', 'LONG_TEXT'),
  ] },
  { code: 'F08-PROCUREMENT-EVIDENCE-V1', titleAr: 'دليل تنفيذ مشتريات الجهة', titleEn: 'Organization procurement execution evidence', department: 'INVENTORY_LOGISTICS', fields: [
    field('purpose', 'الغرض', 'Purpose', 'SELECT', true, ['F08_PROCUREMENT_EVIDENCE_V1']), field('kind', 'نوع الدليل', 'Evidence kind', 'SELECT', true, ['INVOICE', 'RECEIPT', 'RECEIPT_ACCEPTANCE', 'SETTLEMENT', 'REVERSAL', 'RECOVERY', 'FINAL_ACCEPTANCE']),
    field('orderId', 'معرف طلب المشتريات', 'Procurement order'), field('contractHash', 'بصمة عقد الطلب', 'Order contract hash'), field('reference', 'مرجع المستند الأصلي', 'Original document reference'), field('occurredAt', 'وقت الواقعة مع فارق UTC', 'Occurrence time including UTC offset'),
    field('currency', 'عملة الدليل المالي', 'Financial evidence currency', 'SELECT', false, ['SAR']), field('amountMinor', 'المبلغ بالهللات', 'Amount in minor units', 'NUMBER', false),
    field('lines', 'بنود الفاتورة وضريبتها', 'Invoice lines and tax', 'TABLE', false, lineKeys),
    field('quantities', 'كميات الاستلام أو الإعادة', 'Received or returned quantities', 'TABLE', false, ['lineId', 'quantity']),
    field('financeEntryId', 'القيد المالي الأصلي', 'Native finance entry', 'TEXT', false), field('bankName', 'اسم البنك', 'Bank name', 'TEXT', false), field('bankReference', 'مرجع التنفيذ البنكي', 'Bank execution reference', 'TEXT', false),
    field('evidenceDigest', 'بصمة الأدلة الجارية للقبول', 'Current evidence digest for acceptance', 'TEXT', false), field('findings', 'نتيجة التحقق والسبب', 'Verification findings and reason', 'LONG_TEXT'),
  ] },
] as const;
