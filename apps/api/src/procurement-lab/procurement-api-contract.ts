import { BadRequestException, HttpException } from '@nestjs/common';
import { digestValue, hash, id, integer, object, purchaseLines, quantities, text, timestamp } from '../organizations/procurement.domain';

export const PROCUREMENT_EXCHANGE_PROTOCOL = 'HYDROLAND_PROCUREMENT_EXCHANGE_V1' as const;
export const PROCUREMENT_EXCHANGE_KINDS = ['PURCHASE_ORDER', 'INVOICE', 'RECEIPT', 'REVERSAL'] as const;
export type ExchangeKind = typeof PROCUREMENT_EXCHANGE_KINDS[number];
export const MAX_EXCHANGE_BYTES = 65_536;
const jsonNumber = (value: unknown, label: string) => { if (typeof value !== 'number') throw new BadRequestException(`${label}: a JSON number is required.`); };
const jsonLineNumbers = (value: unknown, keys: string[]) => {
  if (!Array.isArray(value) || value.length > 50) throw new BadRequestException('A bounded JSON line array is required.');
  for (const input of value) { const row = object(input); for (const key of keys) jsonNumber(row[key], key); }
};

export function exchangeMessage(input: unknown) {
  const row = object(input, ['schemaVersion', 'messageId', 'kind', 'mode', 'occurredAt', 'organizationReference', 'purchaseReference', 'sourceRevision', 'sourceDigest', 'payload']);
  if (row.schemaVersion !== PROCUREMENT_EXCHANGE_PROTOCOL || !PROCUREMENT_EXCHANGE_KINDS.includes(row.kind as ExchangeKind)) throw new BadRequestException('Choose a supported procurement exchange version and message kind.');
  if (typeof row.mode !== 'string' || !['TEST', 'LIVE'].includes(row.mode)) throw new BadRequestException('An explicit TEST or LIVE message mode is required.');
  jsonNumber(row.sourceRevision, 'Source revision');
  const kind = row.kind as ExchangeKind;
  let payload: Record<string, unknown>;
  if (kind === 'PURCHASE_ORDER' || kind === 'INVOICE') {
    const ref = kind === 'PURCHASE_ORDER' ? 'supplierReference' : 'invoiceReference';
    const source = object(row.payload, ['currency', ref, 'lines', 'totalMinor']);
    jsonLineNumbers(source.lines, ['quantity', 'unitPriceMinor', 'taxMinor']); jsonNumber(source.totalMinor, 'Total minor units');
    const lines = purchaseLines(source.lines), totalMinor = integer(source.totalMinor, 'Total minor units', 1);
    if (source.currency !== 'SAR' || lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor + line.taxMinor, 0) !== totalMinor) throw new BadRequestException('The SAR total must equal the explicit lines and taxes.');
    payload = { currency: 'SAR', [ref]: text(source[ref], ref, 200), lines, totalMinor };
  } else if (kind === 'RECEIPT') {
    const source = object(row.payload, ['receiptReference', 'quantities']);
    jsonLineNumbers(source.quantities, ['quantity']);
    const received = quantities(source.quantities);
    if (!received.length) throw new BadRequestException('At least one received quantity is required.');
    payload = { receiptReference: text(source.receiptReference, 'Receipt reference', 200), quantities: received };
  } else {
    const source = object(row.payload, ['returnReference', 'quantities', 'currency', 'amountMinor', 'reason']);
    jsonLineNumbers(source.quantities, ['quantity']); jsonNumber(source.amountMinor, 'Returned amount');
    if (source.currency !== 'SAR') throw new BadRequestException('Reversal currency must be SAR.');
    payload = { returnReference: text(source.returnReference, 'Return reference', 200), quantities: quantities(source.quantities), currency: 'SAR', amountMinor: integer(source.amountMinor, 'Returned amount'), reason: text(source.reason, 'Return reason', 1000) };
  }
  const result = { schemaVersion: PROCUREMENT_EXCHANGE_PROTOCOL, messageId: id(row.messageId, 'Message identifier'), kind, mode: row.mode as 'TEST' | 'LIVE',
    occurredAt: timestamp(row.occurredAt).toISOString(), organizationReference: text(row.organizationReference, 'Organization reference', 200),
    purchaseReference: text(row.purchaseReference, 'Purchase reference', 200), sourceRevision: integer(row.sourceRevision, 'Source revision', 1), sourceDigest: digestValue(row.sourceDigest), payload };
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_EXCHANGE_BYTES) throw new BadRequestException('The exchange message exceeds 64 KiB.');
  return result;
}

export function validateExchangeMessage(input: unknown) {
  try {
    const normalized = exchangeMessage(input);
    return { valid: true, normalized, issues: [], messageDigest: hash(normalized), execution: 'VALIDATION_ONLY', businessEffects: false };
  } catch (error) {
    if (!(error instanceof HttpException) || error.getStatus() >= 500) throw error;
    return { valid: false, normalized: null, issues: [{ message: error.message }], messageDigest: null, execution: 'VALIDATION_ONLY', businessEffects: false };
  }
}

const string = (maxLength: number, extra: Record<string, unknown> = {}) => ({ type: 'string', minLength: 1, maxLength, ...extra });
const amount = (minimum = 0) => ({ type: 'integer', minimum, maximum: 2_147_483_647 });
const strictObject = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const quantitySchema = { type: 'array', minItems: 0, maxItems: 50, items: strictObject({ lineId: string(160, { pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' }), quantity: amount(1) }) };
const lineSchema = { type: 'array', minItems: 1, maxItems: 50, items: strictObject({ lineId: string(160, { pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' }), description: string(1000), quantity: amount(1), unitPriceMinor: amount(1), taxMinor: amount(), taxTreatment: { enum: ['TAXABLE', 'EXEMPT', 'ZERO_RATED'] }, taxReason: string(1000) }) };
const common = { schemaVersion: { const: PROCUREMENT_EXCHANGE_PROTOCOL }, messageId: string(160, { pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]*$' }), mode: { enum: ['TEST', 'LIVE'] }, occurredAt: string(40, { format: 'date-time' }), organizationReference: string(200), purchaseReference: string(200), sourceRevision: amount(1), sourceDigest: string(64, { pattern: '^[a-f0-9]{64}$' }) };
const payloads = {
  PURCHASE_ORDER: strictObject({ currency: { const: 'SAR' }, supplierReference: string(200), lines: lineSchema, totalMinor: amount(1) }),
  INVOICE: strictObject({ currency: { const: 'SAR' }, invoiceReference: string(200), lines: lineSchema, totalMinor: amount(1) }),
  RECEIPT: strictObject({ receiptReference: string(200), quantities: { ...quantitySchema, minItems: 1 } }),
  REVERSAL: strictObject({ returnReference: string(200), quantities: quantitySchema, currency: { const: 'SAR' }, amountMinor: amount(), reason: string(1000) }),
};

/** Examples are authored fixtures. No production organization or document is exported. */
export function procurementExchangeContract() {
  const lines = [
    { lineId: 'TEST-FIN-01', description: 'Synthetic training item', quantity: 2, unitPriceMinor: 1000, taxMinor: 300, taxTreatment: 'TAXABLE', taxReason: 'Explicit synthetic fixture amount; not a tax policy.' },
    { lineId: 'TEST-BOOK-01', description: 'Synthetic sample item', quantity: 1, unitPriceMinor: 2000, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'Synthetic exemption for validator testing only.' },
  ];
  const base = { schemaVersion: PROCUREMENT_EXCHANGE_PROTOCOL, mode: 'TEST', occurredAt: '2026-01-01T00:00:00.000Z', organizationReference: 'SYNTHETIC-ORGANIZATION', purchaseReference: 'TEST-PO-001', sourceRevision: 1, sourceDigest: hash({ fixture: 'F08_API_EXCHANGE_V1' }) };
  const examples = {
    purchaseOrder: { ...base, messageId: 'test-purchase-001', kind: 'PURCHASE_ORDER', payload: { currency: 'SAR', supplierReference: 'SYNTHETIC-SUPPLIER', lines, totalMinor: 4300 } },
    invoice: { ...base, messageId: 'test-invoice-001', kind: 'INVOICE', payload: { currency: 'SAR', invoiceReference: 'SYNTHETIC-INVOICE-001', lines, totalMinor: 4300 } },
    receipt: { ...base, messageId: 'test-receipt-001', kind: 'RECEIPT', payload: { receiptReference: 'SYNTHETIC-RECEIPT-001', quantities: [{ lineId: lines[0].lineId, quantity: 1 }] } },
    reversal: { ...base, messageId: 'test-return-001', kind: 'REVERSAL', payload: { returnReference: 'SYNTHETIC-RETURN-001', quantities: lines.map(line => ({ lineId: line.lineId, quantity: line.quantity })), currency: 'SAR', amountMinor: 4300, reason: 'Synthetic full-return example.' } },
  };
  return {
    protocol: PROCUREMENT_EXCHANGE_PROTOCOL, version: 1,
    transport: { method: 'GET', capabilitiesPath: 'capabilities', authentication: ['BEARER', 'API_KEY', 'NONE'], apiKeyHeader: 'X-API-Key', maximumResponseBytes: MAX_EXCHANGE_BYTES, timeoutMs: 8000 },
    messageSchema: { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'HYDROLAND procurement exchange V1', oneOf: PROCUREMENT_EXCHANGE_KINDS.map(kind => strictObject({ ...common, kind: { const: kind }, payload: payloads[kind] })) },
    semanticRules: ['Line identifiers are unique.', 'Totals equal quantities × prices plus explicit line taxes.', 'Tax amounts agree with the explicit tax treatment.', 'Occurrence timestamps cannot be in the future.', 'A digest in a message is not proof of an original signed source.'],
    examples,
    capabilitiesResponseExample: { protocol: PROCUREMENT_EXCHANGE_PROTOCOL, version: 1, capabilities: [...PROCUREMENT_EXCHANGE_KINDS], currency: 'SAR' },
    boundary: { businessWrites: false, liveConnectionRequiredForLab: false, independentAcceptanceGranted: false, receivedMessagesExecuteBusinessActions: false, supportedProvider: 'A provider implementing this published protocol. Other protocols require an adapter.' },
  };
}
