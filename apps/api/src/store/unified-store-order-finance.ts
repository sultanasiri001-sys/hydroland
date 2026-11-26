import { ConflictException } from '@nestjs/common';
import { Prisma, UnifiedStoreOrderLine } from '@prisma/client';
import { createHash } from 'node:crypto';
import { entitlementContractHash } from '../commerce/center-service-entitlement';
import { commerceInvoiceSnapshotValid, commerceNativeInvoiceValid } from '../commerce/commerce-invoice-finalization';
import { requireAcceptedCourseContract } from '../commerce/course-contract';
import { contractHash as tripContractHash } from '../commerce/payment-contract.service';
import { requireAcceptedRentalContract } from '../commerce/rental-contract';
import { requirePostedCommerceCollection } from '../commerce/rental-collection-ledger';
import { commerceSettlementCandidates } from '../finance/commerce-settlement-lines';
import { requireStoreCheckoutBinding, storeContractHash, storeObject } from './store-checkout-contract';

type Tx = Prisma.TransactionClient;
type Money = {
  capturedMinor: number | null; refundedMinor: number | null; netCollectedMinor: number | null; remainingMinor: number | null;
  collectionVerified: boolean; financialReviewRequired: boolean; refundPending: boolean;
};
type Evidence = { money: Money; collectionId: string | null; collectionEvidenceId: string | null; contract: unknown; paymentId: string | null };
const pendingStatuses = ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'];
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const minor = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const amount = (line: UnifiedStoreOrderLine, captured = 0, refunded = 0, refundPending = false): Money => ({
  capturedMinor: captured, refundedMinor: refunded, netCollectedMinor: captured - refunded,
  remainingMinor: line.amountMinor - captured, collectionVerified: captured > 0,
  financialReviewRequired: false, refundPending,
});
const review = (refundPending = false): Money => ({ capturedMinor: null, refundedMinor: null, netCollectedMinor: null,
  remainingMinor: null, collectionVerified: false, financialReviewRequired: true, refundPending });

async function commerceMoney(tx: Tx, accountId: string, line: UnifiedStoreOrderLine, paymentStatus: string): Promise<Evidence> {
  const key = { sourceType: line.sourceType, sourceId: line.sourceId };
  const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: key } });
  const proof = await tx.commerceCollectionEvidence.findUnique({ where: { sourceType_sourceId: key } });
  const base = { collectionId: proof?.financeEntryId ?? null, collectionEvidenceId: proof?.id ?? null,
    contract: line.contractSnapshot, paymentId: checkout?.id ?? null };
  const refundPending = Boolean(checkout && (line.sourceType === 'EQUIPMENT_RENTAL'
    ? await tx.rentalRefundOperation.count({ where: { checkoutId: checkout.id, status: { in: pendingStatuses } } })
    : await tx.checkoutRefund.count({ where: { checkoutId: checkout.id, status: { notIn: ['POSTED', 'FAILED'] } } })));
  const claimed = Boolean(proof || ['CAPTURED', 'REFUNDED', 'PAID', 'CONFIRMED'].includes(paymentStatus)
    || Number(storeObject(storeObject(checkout?.providerResult).payment).capturedMinor) > 0);
  if (!claimed) return { ...base, money: amount(line, 0, 0, refundPending) };
  if (!checkout || checkout.customerAccountId !== accountId || checkout.organizationId !== line.organizationId
    || checkout.amountMinor !== line.amountMinor || checkout.currency !== 'SAR' || !checkout.providerPaymentId) return { ...base, money: review(refundPending) };
  try {
    if (line.sourceType === 'STORE_ORDER') {
      const original = await tx.storeOrder.findUniqueOrThrow({ where: { id: line.sourceId }, include: { items: true, payment: true } });
      requireStoreCheckoutBinding(checkout, original);
    } else if (line.sourceType === 'TRAINING_ENROLLMENT') requireAcceptedCourseContract(line.contractSnapshot, checkout.contractSnapshot, new Date());
    else requireAcceptedRentalContract(line.contractSnapshot, checkout.contractSnapshot, new Date());
  } catch (error) { if (error instanceof ConflictException) return { ...base, money: review(refundPending) }; throw error; }
  const matched = (await commerceSettlementCandidates(tx, line.organizationId, [checkout.providerPaymentId])).get(checkout.providerPaymentId);
  if (!proof || !matched?.verified || matched.id !== checkout.id || matched.amountMinor !== line.amountMinor
    || !minor(matched.refundedMinor) || matched.refundedMinor > line.amountMinor) return { ...base, money: review(refundPending) };
  return { ...base, money: amount(line, line.amountMinor, matched.refundedMinor, refundPending) };
}

async function tripMoney(tx: Tx, accountId: string, line: UnifiedStoreOrderLine, paymentId: string | null): Promise<Evidence> {
  const allPayments = await tx.payment.findMany({ where: { bookingId: line.sourceId, accountId } });
  const base = { collectionId: null as string | null, collectionEvidenceId: null, contract: line.contractSnapshot as unknown, paymentId };
  if (!allPayments.length) return { ...base, money: amount(line) };
  const paymentIds = allPayments.map(row => row.id), now = new Date();
  const historicalEntries = await tx.financeEntry.findMany({ where: { referenceType: 'TRIP_PAYMENT_COLLECTION',
    referenceId: { in: paymentIds }, organizationId: line.organizationId, type: 'REVENUE', status: 'POSTED' }, select: { referenceId: true } });
  const historicalCaptures = await tx.auditEvent.findMany({ where: { occurredAt: { lte: now }, OR: [
    { resource: 'Payment', resourceId: { in: paymentIds }, action: 'PAYMENT_PROVIDER_RECONCILED', metadata: { path: ['to'], equals: 'CAPTURED' } },
    { resource: 'Payment', resourceId: { in: paymentIds }, action: 'PAYMENT_CHECKOUT_CREATED', metadata: { path: ['status'], equals: 'CAPTURED' } },
    { resource: 'PaymentProviderWebhook', action: 'PAYMENT_PROVIDER_WEBHOOK_PROCESSED', AND: [
      { metadata: { path: ['to'], equals: 'CAPTURED' } }, { OR: paymentIds.map(id => ({ metadata: { path: ['paymentId'], equals: id } })) } ] },
  ] }, select: { resource: true, resourceId: true, metadata: true } });
  const claimedIds = new Set([...historicalEntries.map(row => row.referenceId),
    ...historicalCaptures.map(row => row.resource === 'Payment' ? row.resourceId : storeObject(row.metadata).paymentId)]);
  const payments = allPayments.filter(row => ['CAPTURED', 'REFUNDED'].includes(row.status) || row.refundedAmountMinor > 0 || claimedIds.has(row.id));
  if (!payments.length) return { ...base, money: amount(line) };
  if (payments.length !== 1) return { ...base, money: review() };
  const payment = payments[0]; base.contract = payment.contractSnapshot; base.paymentId = payment.id;
  const operations = await tx.commerceRefundOperation.findMany({ where: { paymentId: payment.id },
    include: { financeEntry: { include: { financeAccount: true, approvals: true } } }, orderBy: [{ baselineRefundedMinor: 'asc' }, { id: 'asc' }] });
  const refundPending = operations.some(row => pendingStatuses.includes(row.status));
  const invalid = () => ({ ...base, money: review(refundPending) });
  const accepted = storeObject(payment.contractSnapshot), { termsAcceptedAt, acceptedQuoteHash, termsAcceptanceStatus, ...original } = accepted;
  if (!['CAPTURED', 'REFUNDED'].includes(payment.status) || payment.amountMinor !== line.amountMinor || payment.currency !== 'SAR' || !payment.providerReference || !payment.moyasarPaymentId
    || !minor(payment.refundedAmountMinor) || payment.refundedAmountMinor > line.amountMinor
    || termsAcceptanceStatus !== 'ACCEPTED' || !Number.isFinite(Date.parse(termsAcceptedAt)) || Date.parse(termsAcceptedAt) > now.getTime()
    || Date.parse(termsAcceptedAt) < Date.parse(storeObject(line.contractSnapshot).recordedAt)
    || acceptedQuoteHash !== tripContractHash(line.contractSnapshot)
    || storeContractHash({ ...original, termsAcceptanceStatus: 'NOT_RECORDED' }) !== line.contractHash) return invalid();
  const providerAudit = await tx.auditEvent.findFirst({ where: { occurredAt: { lte: now }, OR: [
    { resource: 'Payment', resourceId: payment.id, action: 'PAYMENT_PROVIDER_RECONCILED', AND: [
      { metadata: { path: ['providerReference'], equals: payment.providerReference } },
      { metadata: { path: ['providerStatus'], equals: 'paid' } }, { metadata: { path: ['to'], equals: 'CAPTURED' } } ] },
    { resource: 'Payment', resourceId: payment.id, action: 'PAYMENT_CHECKOUT_CREATED', AND: [
      { metadata: { path: ['providerReference'], equals: payment.providerReference } }, { metadata: { path: ['status'], equals: 'CAPTURED' } } ] },
    { resource: 'PaymentProviderWebhook', action: 'PAYMENT_PROVIDER_WEBHOOK_PROCESSED', AND: [
      { metadata: { path: ['paymentId'], equals: payment.id } }, { metadata: { path: ['invoiceId'], equals: payment.providerReference } },
      { metadata: { path: ['providerVerified'], equals: true } }, { metadata: { path: ['providerStatus'], equals: 'paid' } },
      { metadata: { path: ['to'], equals: 'CAPTURED' } } ] },
  ] }, select: { id: true } });
  const entries = await tx.financeEntry.findMany({ where: { referenceType: 'TRIP_PAYMENT_COLLECTION', referenceId: payment.id,
    organizationId: line.organizationId, type: 'REVENUE', status: 'POSTED' }, take: 2 });
  if (!providerAudit || entries.length !== 1 || entries[0].createdAt > entries[0].approvedAt! || entries[0].postedAt! > now) return invalid();
  try { await requirePostedCommerceCollection(tx, { financeEntryId: entries[0].id, sourceId: payment.id,
    organizationId: line.organizationId, amountMinor: line.amountMinor, referenceType: 'TRIP_PAYMENT_COLLECTION' }); }
  catch (error) { if (error instanceof ConflictException) return invalid(); throw error; }
  base.collectionId = entries[0].id;
  let refunded = 0;
  for (const operation of operations.filter(row => row.status === 'SUCCEEDED')) {
    const evidence = storeObject(operation.providerResult), proof = storeObject(evidence.payment), entry = operation.financeEntry;
    const binding = storeObject(storeObject(operation.policyDecision).paymentBinding);
    if (operation.organizationId !== line.organizationId || operation.currency !== 'SAR' || !minor(operation.amountMinor) || operation.amountMinor === 0
      || operation.baselineRefundedMinor !== refunded || operation.resultingRefundedMinor !== refunded + operation.amountMinor
      || !operation.dispatchedAt || !operation.confirmedAt || operation.createdAt > operation.dispatchedAt
      || operation.dispatchedAt > operation.confirmedAt || operation.confirmedAt > now
      || operation.providerPaymentId !== payment.moyasarPaymentId || operation.providerInvoiceId !== payment.providerReference
      || evidence.source !== 'REFUND_POST_RESPONSE' || proof.id !== payment.moyasarPaymentId || proof.invoiceId !== payment.providerReference
      || !['paid', 'captured', 'refunded'].includes(proof.status) || proof.amountMinor !== payment.amountMinor || proof.capturedMinor !== payment.amountMinor
      || proof.currency !== 'SAR' || proof.refundedMinor !== operation.resultingRefundedMinor
      || binding.accountId !== accountId || binding.bookingId !== line.sourceId || binding.amountMinor !== line.amountMinor
      || binding.currency !== 'SAR' || binding.contractHash !== tripContractHash(payment.contractSnapshot)
      || entry.type !== 'REFUND' || entry.status !== 'POSTED' || entry.referenceType !== 'PAYMENT_REFUND' || entry.referenceId !== payment.id
      || entry.organizationId !== line.organizationId || entry.amountMinor !== operation.amountMinor || entry.currency !== 'SAR'
      || !entry.financeAccount.active || entry.financeAccount.organizationId !== line.organizationId || entry.financeAccount.currency !== 'SAR'
      || entry.requestedByAccountId !== operation.requestedByAccountId || entry.approvedByAccountId !== operation.approvedByAccountId
      || entry.postedByAccountId !== operation.executedByAccountId || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
      || !entry.approvedAt || entry.createdAt > entry.approvedAt || !entry.postedAt || entry.approvedAt > entry.postedAt
      || entry.postedAt.getTime() !== operation.confirmedAt.getTime()
      || !entry.approvals.some(row => row.status === 'APPROVED' && row.requestedByAccountId === entry.requestedByAccountId
        && row.decidedByAccountId === entry.approvedByAccountId && row.decidedAt?.getTime() === entry.approvedAt!.getTime() && row.createdAt <= row.decidedAt!)) return invalid();
    refunded += operation.amountMinor;
  }
  if (refunded !== payment.refundedAmountMinor || (refunded === payment.amountMinor) !== (payment.status === 'REFUNDED')) return invalid();
  return { ...base, money: amount(line, line.amountMinor, refunded, refundPending) };
}

/** Buyer projection only: original collection/refund journals, never an aggregate ledger. */
export async function unifiedLineFinance(tx: Tx, accountId: string, line: UnifiedStoreOrderLine,
  paymentStatus: string, paymentId: string | null, unchanged: boolean) {
  const evidence = unchanged ? line.sourceType === 'TRIP_BOOKING' ? await tripMoney(tx, accountId, line, paymentId)
    : await commerceMoney(tx, accountId, line, paymentStatus)
    : { money: review(), collectionId: null, collectionEvidenceId: null, contract: line.contractSnapshot, paymentId };
  const key = { sourceType: line.sourceType === 'TRIP_BOOKING' ? 'TRIP_PAYMENT' : line.sourceType,
    sourceId: line.sourceType === 'TRIP_BOOKING' ? evidence.paymentId : line.sourceId };
  const document = key.sourceId ? await tx.accountInvoiceDocument.findUnique({ where: { sourceType_sourceId: { ...key, sourceId: key.sourceId } } }) : null;
  const final = await tx.commerceInvoiceFinalization.findUnique({ where: { sourceType_sourceId: { sourceType: line.sourceType, sourceId: line.sourceId } } });
  const hasDocument = Boolean(document && document.sellerId === line.organizationId && document.buyerOrganizationId === null
    && digest(document.content) === document.sha256);
  const finalized = Boolean(unchanged && hasDocument && final && final.sellerId === line.organizationId && final.customerAccountId === accountId
    && final.amountMinor === line.amountMinor && final.currency === 'SAR' && final.number === document!.number
    && final.documentSha256 === document!.sha256 && final.contractHash === entitlementContractHash(evidence.contract)
    && final.collectionFinanceEntryId === evidence.collectionId && final.collectionEvidenceId === evidence.collectionEvidenceId
    && final.issuedAt <= final.finalizedAt && final.finalizedAt <= new Date()
    && commerceInvoiceSnapshotValid(final, key) && await commerceNativeInvoiceValid(tx, final));
  return { ...evidence.money, invoice: { ...key, number: hasDocument ? document!.number : null, hasDocument,
    documentUrl: hasDocument ? `/account/invoices/${encodeURIComponent(key.sourceType)}/${encodeURIComponent(key.sourceId!)}/document` : null,
    finalizationStatus: finalized ? 'FINALIZED' : final ? 'REVIEW_REQUIRED' : 'DRAFT', finalizationId: finalized ? final!.id : null,
    issuedAt: finalized ? final!.issuedAt.toISOString() : null } };
}
