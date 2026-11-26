import { CommerceInvoiceFinalization, Prisma } from '@prisma/client';
import { entitlementContractHash as hash } from './center-service-entitlement';

const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const minor = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;

/** One integrity rule for the accountant and customer projections of the same final invoice. */
export function commerceInvoiceSnapshotValid(invoice: CommerceInvoiceFinalization,
  invoiceKey: { sourceType: string; sourceId: string | null }): boolean {
  const snapshot = object(invoice.snapshot), contract = object(snapshot.originalContract);
  if (snapshot.version !== 'COMMERCE_INVOICE_V1' || snapshot.sourceType !== invoice.sourceType || snapshot.sourceId !== invoice.sourceId
    || object(snapshot.seller).id !== invoice.sellerId || snapshot.customerAccountId !== invoice.customerAccountId
    || snapshot.number !== invoice.number || snapshot.documentSha256 !== invoice.documentSha256
    || snapshot.amountMinor !== invoice.amountMinor || snapshot.currency !== invoice.currency || invoice.currency !== 'SAR'
    || snapshot.contractHash !== invoice.contractHash || hash(snapshot.originalContract) !== invoice.contractHash
    || snapshot.collectionEvidenceId !== invoice.collectionEvidenceId || snapshot.collectionFinanceEntryId !== invoice.collectionFinanceEntryId
    || object(snapshot.invoiceKey).sourceType !== invoiceKey.sourceType || object(snapshot.invoiceKey).sourceId !== invoiceKey.sourceId
    || snapshot.issuedAt !== invoice.issuedAt.toISOString() || snapshot.finalizedBy !== invoice.finalizedBy
    || !minor(invoice.amountMinor) || !minor(invoice.taxMinor) || invoice.taxMinor > invoice.amountMinor
    || snapshot.taxMinor !== invoice.taxMinor || snapshot.subtotalMinor !== invoice.amountMinor - invoice.taxMinor
    || snapshot.taxAuthorityVerified !== false || snapshot.verificationMethod !== 'SELLER_ACCOUNTANT_ORIGINAL_DOCUMENT_REVIEW'
    || invoice.issuedAt > invoice.finalizedAt || invoice.finalizedAt > new Date()
    || snapshot.expectedEvidenceHash !== hash(Object.fromEntries(Object.entries(snapshot).filter(([key]) =>
      !['expectedEvidenceHash', 'issuedAt', 'taxMinor', 'subtotalMinor', 'taxLines', 'finalizedBy'].includes(key))))) return false;
  const sourceLines = invoice.sourceType === 'STORE_ORDER' ? (Array.isArray(contract.lines) ? contract.lines.map((line: any) => ({ id: object(line.source).id, amountMinor: line.amountMinor })) : [])
    : invoice.sourceType === 'EQUIPMENT_RENTAL' ? (Array.isArray(contract.lines) ? contract.lines.map((line: any) => ({ id: line.id, amountMinor: line.amountMinor })) : [])
    : [{ id: invoice.sourceId, amountMinor: invoice.amountMinor }];
  const lines = snapshot.taxLines;
  return Array.isArray(lines) && lines.length === sourceLines.length && lines.length > 0
    && new Set(lines.map((line: any) => object(line).lineId)).size === lines.length
    && lines.every((line: any) => Object.keys(object(line)).sort().join(',') === 'lineId,taxMinor'
      && minor(line.taxMinor) && sourceLines.some((source: any) => source.id === line.lineId && minor(source.amountMinor) && line.taxMinor <= source.amountMinor))
    && sourceLines.reduce((sum: number, line: any) => sum + line.amountMinor, 0) === invoice.amountMinor
    && lines.reduce((sum: number, line: any) => sum + line.taxMinor, 0) === invoice.taxMinor
    && ['EXEMPT', 'TAXABLE'].includes(object(snapshot.sellerFinancialProfile).taxStatus)
    && (object(snapshot.sellerFinancialProfile).taxStatus !== 'EXEMPT' || invoice.taxMinor === 0);
}

/** Existing goods/trip invoice records remain authoritative about issuance and voiding. */
export async function commerceNativeInvoiceValid(tx: Prisma.TransactionClient, invoice: CommerceInvoiceFinalization): Promise<boolean> {
  if (invoice.sourceType !== 'STORE_ORDER' && invoice.sourceType !== 'TRIP_BOOKING') return true;
  const rows = invoice.sourceType === 'STORE_ORDER'
    ? await tx.storeInvoice.findMany({ where: { payment: { orderId: invoice.sourceId } }, select: { status: true, issuedAt: true }, take: 2 })
    : await tx.invoice.findMany({ where: { payment: { bookingId: invoice.sourceId, accountId: invoice.customerAccountId, status: { in: ['CAPTURED', 'REFUNDED'] } } },
      select: { status: true, issuedAt: true }, take: 2 });
  return rows.length === 1 && ['ISSUED', 'PAID'].includes(rows[0].status) && rows[0].issuedAt?.getTime() === invoice.issuedAt.getTime();
}
