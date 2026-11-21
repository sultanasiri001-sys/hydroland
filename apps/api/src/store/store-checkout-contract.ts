import { ConflictException } from '@nestjs/common';
import { CommerceCheckout, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { COMMERCE_CONTRACT_SNAPSHOT_VERSION, createCommerceContractSnapshot } from '../commerce/commerce-contract-snapshot';

export const STORE_CHECKOUT_VERSION = COMMERCE_CONTRACT_SNAPSHOT_VERSION;
export const STORE_CHECKOUT_SOURCE = 'STORE_ORDER';
export type StoreCheckoutOrder = Prisma.StoreOrderGetPayload<{include: {items: true; payment: true}}>;
export const storeObject = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
export const storeCanonicalTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function storeCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(storeCanonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, child]) => JSON.stringify(key) + ':' + storeCanonicalJson(child)).join(',') + '}';
  return JSON.stringify(value);
}
export const storeContractHash = (value: unknown) => createHash('sha256').update(storeCanonicalJson(value)).digest('hex');

/** This first collection path is for original physical-goods lines from one
 * supplying center. Missing identity, historical contracts, services or mixed
 * suppliers require review; the current catalog cannot invent their contract. */
export function requireStoreCheckoutContract(order: StoreCheckoutOrder) {
  const fail = (): never => {throw new ConflictException({code: 'STORE_CHECKOUT_REVIEW_REQUIRED', status: 'REVIEW_REQUIRED',
    message: 'The original goods, supplying center, prices and policy require review before payment.'});};
  if (order.currency !== 'SAR' || !Number.isSafeInteger(order.totalMinor) || order.totalMinor < 100 || order.totalMinor > 2_147_483_647
    || !order.items.length || new Set(order.items.map(item => item.id)).size !== order.items.length) fail();
  let organizationId: string | undefined, issuer: Record<string, any> | undefined, total = 0;
  const lines = [...order.items].sort((a, b) => a.id.localeCompare(b.id)).map(item => {
    const original = storeObject(item.contractSnapshot), source = storeObject(original.source), supplier = storeObject(original.issuer);
    if (original.version !== STORE_CHECKOUT_VERSION || original.kind !== 'PHYSICAL_GOOD' || source.kind !== 'STORE_ORDER_ITEM'
      || source.id !== item.id || source.parentId !== order.id || source.offeringId !== item.productId
      || original.customerAccountId !== order.accountId || original.quantity !== item.quantity || original.unitPriceMinor !== item.unitPriceMinor
      || original.currency !== 'SAR' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.unitPriceMinor)
      || item.unitPriceMinor < 0 || original.amountMinor !== item.unitPriceMinor * item.quantity
      || typeof supplier.organizationId !== 'string' || !supplier.organizationId
      || ['legalName', 'registrationNumber', 'address'].some(key => typeof supplier[key] !== 'string' || !supplier[key].trim())
      || organizationId && organizationId !== supplier.organizationId) fail();
    let expected;
    try {
      expected = createCommerceContractSnapshot({sourceKind: 'STORE_ORDER_ITEM', sourceId: item.id, parentId: order.id,
        offeringId: item.productId, customerAccountId: order.accountId, organizationId: supplier.organizationId,
        organization: {id: supplier.organizationId, displayName: supplier.displayName, legalName: supplier.legalName,
          registrationNumber: supplier.registrationNumber, address: supplier.address}, kind: 'PHYSICAL_GOOD', title: original.title,
        quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, currency: 'SAR', recordedAt: original.recordedAt});
    } catch { fail(); }
    if (storeCanonicalJson(expected) !== storeCanonicalJson(original) || issuer && storeCanonicalJson(issuer) !== storeCanonicalJson(supplier)) fail();
    organizationId = supplier.organizationId; issuer = supplier; total += original.amountMinor;
    return original;
  });
  if (!organizationId || !issuer || total !== order.totalMinor || !Number.isSafeInteger(total)) fail();
  return {version: STORE_CHECKOUT_VERSION, sourceType: STORE_CHECKOUT_SOURCE, sourceId: order.id,
    organizationId: organizationId!, customerAccountId: order.accountId, amountMinor: order.totalMinor, currency: 'SAR' as const,
    issuer: issuer!, lines, collectionModel: 'HYDROLAND_ON_BEHALF_OF_PROVIDER', invoiceReadiness: 'REVIEW_REQUIRED'};
}

export function requireAcceptedStoreContract(original: ReturnType<typeof requireStoreCheckoutContract>, accepted: unknown, verifiedAt = new Date()) {
  const snapshot = storeObject(accepted), {acceptedQuoteHash, termsAcceptedAt, checkoutExpiresAt, ...base} = snapshot;
  if (!storeCanonicalTime(termsAcceptedAt) || Date.parse(termsAcceptedAt) > verifiedAt.getTime()
    || original.lines.some(line => Date.parse(termsAcceptedAt) < Date.parse(line.recordedAt))
    || !storeCanonicalTime(checkoutExpiresAt) || Date.parse(checkoutExpiresAt) <= Date.parse(termsAcceptedAt)
    || acceptedQuoteHash !== storeContractHash(original) || storeCanonicalJson(base) !== storeCanonicalJson(original)) {
    throw new ConflictException({code: 'STORE_ACCEPTED_TERMS_REQUIRED', message: 'The original order quote must be accepted before collection.'});
  }
  return snapshot;
}

export function requireStoreCheckoutBinding(checkout: CommerceCheckout, order: StoreCheckoutOrder, contract = requireStoreCheckoutContract(order)) {
  if (checkout.sourceType !== STORE_CHECKOUT_SOURCE || checkout.sourceId !== order.id || checkout.customerAccountId !== order.accountId
    || checkout.organizationId !== contract.organizationId || checkout.amountMinor !== order.totalMinor || checkout.currency !== order.currency
    || checkout.provider !== 'MOYASAR' || !order.payment || order.payment.accountId !== order.accountId
    || order.payment.amountMinor !== order.totalMinor || order.payment.currency !== order.currency
    || order.payment.providerReference !== checkout.providerInvoiceId) {
    throw new ConflictException({code: 'STORE_CHECKOUT_BINDING_REQUIRED', message: 'The original order and provider references require reconciliation.'});
  }
  return requireAcceptedStoreContract(contract, checkout.contractSnapshot);
}

/** Balances and independent approval remain in the existing financial ledger. */
export async function requirePostedStoreCollection(tx: Prisma.TransactionClient, input: {financeEntryId: string; orderId: string; organizationId: string; amountMinor: number}) {
  await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${input.financeEntryId} FOR SHARE`;
  const entry = await tx.financeEntry.findUnique({where: {id: input.financeEntryId}, include: {financeAccount: true, approvals: true}});
  if (!entry || entry.status !== 'POSTED' || entry.type !== 'REVENUE' || entry.organizationId !== input.organizationId
    || entry.referenceType !== 'STORE_ORDER_COLLECTION' || entry.referenceId !== input.orderId || entry.amountMinor !== input.amountMinor || entry.currency !== 'SAR'
    || !entry.financeAccount.active || entry.financeAccount.organizationId !== input.organizationId || entry.financeAccount.currency !== 'SAR'
    || !entry.requestedByAccountId || !entry.approvedByAccountId || !entry.postedByAccountId || !entry.approvedAt || !entry.postedAt
    || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
    || entry.postedAt.getTime() < entry.approvedAt.getTime()
    || !entry.approvals.some(row => row.status === 'APPROVED' && row.requestedByAccountId === entry.requestedByAccountId
      && row.decidedByAccountId === entry.approvedByAccountId && row.decidedAt?.getTime() === entry.approvedAt!.getTime())) {
    throw new ConflictException({code: 'STORE_COLLECTION_EVIDENCE_REQUIRED', message: 'A matching posted revenue entry and independent approval are required.'});
  }
  return entry;
}

/** The administrative order label is never proof of a paid, fulfillable order. */
export async function requireVerifiedStoreCollection(tx: Prisma.TransactionClient, order: StoreCheckoutOrder) {
  const contract = requireStoreCheckoutContract(order);
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${contract.organizationId} FOR SHARE`;
  const activeCenter = await tx.organization.findFirst({where: {id: contract.organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}});
  if (!activeCenter) throw new ConflictException({code: 'STORE_CHECKOUT_REVIEW_REQUIRED', message: 'The original supplying center must be active before fulfillment.'});
  const checkout = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType: STORE_CHECKOUT_SOURCE, sourceId: order.id}}});
  const proof = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType: STORE_CHECKOUT_SOURCE, sourceId: order.id}}});
  if (!checkout || !proof || checkout.status !== 'CAPTURED' || order.payment?.status !== 'CAPTURED') {
    throw new ConflictException({code: 'STORE_COLLECTION_EVIDENCE_REQUIRED', message: 'Provider capture and its posted collection must be verified before fulfillment.'});
  }
  requireStoreCheckoutBinding(checkout, order, contract);
  const observation = storeObject(checkout.providerResult), payment = storeObject(observation.payment), provider = storeObject(proof.providerSnapshot);
  const metadata = storeObject(provider.invoiceMetadata);
  if (proof.organizationId !== contract.organizationId || proof.customerAccountId !== order.accountId || proof.amountMinor !== order.totalMinor
    || proof.currency !== 'SAR' || proof.provider !== 'MOYASAR' || proof.providerCapturedMinor !== order.totalMinor || proof.providerRefundedMinor !== 0
    || proof.providerInvoiceId !== checkout.providerInvoiceId || proof.providerPaymentId !== checkout.providerPaymentId
    || !storeCanonicalTime(observation.verifiedAt) || Date.parse(observation.verifiedAt) > Date.now()
    || !Number.isFinite(proof.providerVerifiedAt.getTime()) || proof.providerVerifiedAt.getTime() > Date.now()
    || payment.id !== checkout.providerPaymentId || payment.invoiceId !== checkout.providerInvoiceId || payment.capturedMinor !== order.totalMinor
    || payment.amountMinor !== order.totalMinor || payment.currency !== 'SAR'
    || !storeCanonicalTime(payment.updatedAt) || Date.parse(payment.updatedAt) > Date.parse(observation.verifiedAt)
    || payment.refundedMinor !== 0 || payment.refundedAt !== null || !['paid', 'captured'].includes(payment.status)
    || provider.id !== proof.providerPaymentId || provider.invoiceId !== proof.providerInvoiceId || provider.capturedMinor !== order.totalMinor
    || provider.amountMinor !== order.totalMinor || provider.currency !== 'SAR'
    || !storeCanonicalTime(provider.updatedAt) || Date.parse(provider.updatedAt) > proof.providerVerifiedAt.getTime()
    || provider.refundedMinor !== 0 || provider.refundedAt !== null || !['paid', 'captured'].includes(provider.status)
    || metadata.hydroland_checkout_id !== checkout.id || metadata.hydroland_source_type !== STORE_CHECKOUT_SOURCE
    || metadata.hydroland_source_id !== order.id || metadata.hydroland_organization_id !== contract.organizationId
    || metadata.hydroland_customer_account_id !== order.accountId
    || storeCanonicalJson(proof.contractSnapshot) !== storeCanonicalJson(checkout.contractSnapshot)) {
    throw new ConflictException({code: 'STORE_COLLECTION_EVIDENCE_REQUIRED', message: 'The original order, provider and ledger evidence must agree before fulfillment.'});
  }
  await requirePostedStoreCollection(tx, {financeEntryId: proof.financeEntryId, orderId: order.id, organizationId: contract.organizationId, amountMinor: order.totalMinor});
  return proof;
}
