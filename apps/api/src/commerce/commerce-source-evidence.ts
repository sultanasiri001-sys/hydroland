import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { commerceSettlementCandidates } from '../finance/commerce-settlement-lines';
import { requireStoreCheckoutBinding, requireStoreCheckoutContract } from '../store/store-checkout-contract';
import { requireAcceptedCourseContract, requireCourseContract } from './course-contract';
import { RentalContractLine, RentalContractRecord, rentalObject, requireAcceptedRentalContract, requireRentalContract } from './rental-contract';
import { entitlementContractHash } from './center-service-entitlement';
import { trainingCompletion } from '../governance/training-completion-policy';
import { assertTrainingStandardCompletion } from '../governance/training-standard-store';

export const COMMERCE_SOURCE_TYPES = ['STORE_ORDER', 'TRAINING_ENROLLMENT', 'EQUIPMENT_RENTAL', 'TRIP_BOOKING'] as const;
export type CommerceSourceType = typeof COMMERCE_SOURCE_TYPES[number];
export const commerceEntitlementReference = (type: CommerceSourceType) => ({ STORE_ORDER: 'CENTER_STORE_ENTITLEMENT',
  TRAINING_ENROLLMENT: 'CENTER_COURSE_ENTITLEMENT', EQUIPMENT_RENTAL: 'CENTER_RENTAL_ENTITLEMENT', TRIP_BOOKING: 'CENTER_SERVICE_ENTITLEMENT' }[type]);
export const commerceSourceObject = rentalObject;
export type CommerceSourceEvidence = {
  sourceType: CommerceSourceType; sourceId: string; organizationId: string; customerAccountId: string;
  amountMinor: number; refundedMinor: number; currency: 'SAR'; contract: unknown; contractHash: string;
  invoiceKey: { sourceType: string; sourceId: string }; collectionEvidenceId: string | null; collectionFinanceEntryId: string | null;
  providerPaymentId: string | null; collectionVerified: boolean; pendingRefund: boolean; completed: boolean;
  eligibleGrossAmountMinor: number; blockers: string[]; completion: unknown; evidenceHash: string;
};

/** Read the original product and existing provider/ledger journals. This is not a new balance ledger. */
export async function readCommerceSourceEvidence(tx: Prisma.TransactionClient, organizationId: string,
  sourceType: Exclude<CommerceSourceType, 'TRIP_BOOKING'>, sourceId: string): Promise<CommerceSourceEvidence> {
  const now = new Date();
  const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId } } });
  let customerAccountId: string, amountMinor: number, contract: Record<string, any>, completed = false, completion: unknown = null;
  let pendingClaim = false;
  if (sourceType === 'STORE_ORDER') {
    await tx.$queryRaw`SELECT "id" FROM "StoreOrder" WHERE "id"::text=${sourceId} FOR UPDATE`;
    const order = await tx.storeOrder.findUnique({ where: { id: sourceId }, include: { payment: true,
      items: { orderBy: { id: 'asc' }, include: { deliveries: { orderBy: { id: 'asc' }, include: { returns: { orderBy: { id: 'asc' } } } } } } } });
    if (!order) throw new NotFoundException('Store source not found.');
    contract = requireStoreCheckoutContract(order);
    customerAccountId = order.accountId; amountMinor = order.totalMinor;
    if (checkout) requireStoreCheckoutBinding(checkout, order, requireStoreCheckoutContract(order));
    const deliveryIds = order.items.flatMap(item => item.deliveries.map(row => row.id));
    const receipts = await tx.auditEvent.findMany({ where: { resource: 'StoreGoodsDelivery',
      action: 'STORE_GOODS_CUSTOMER_RECEIVED', resourceId: { in: deliveryIds }, occurredAt: { lte: now } }, select: { id: true, resourceId: true, metadata: true } });
    const receiptMap = new Map(receipts.map(row => [row.resourceId, row]));
    const returned = order.items.flatMap(item => item.deliveries.flatMap(row => row.returns));
    const postedReturns = checkout ? await tx.checkoutRefund.findMany({ where: { checkoutId: checkout.id,
      status: 'POSTED', claimId: { in: returned.map(row => row.id) } }, select: { claimId: true } }) : [];
    const settledClaims = new Set(postedReturns.map(row => row.claimId));
    pendingClaim = returned.some(row => !row.sellerReceivedAt || !settledClaims.has(row.id));
    completed = ['CONFIRMED', 'FULFILLED'].includes(order.status) && order.items.every(item => {
      const policy = rentalObject(rentalObject(rentalObject(item.contractSnapshot).refundPolicy).snapshot);
      return item.deliveries.reduce((sum, row) => sum + row.quantity, 0) === item.quantity
        && Boolean(item.actualReceivedAt && item.actualReceivedAt <= now)
        && item.deliveries.every(row => {
          const receipt = receiptMap.get(row.id), value = rentalObject(receipt?.metadata);
          return row.organizationId === organizationId && row.customerAccountId === customerAccountId && row.receivedAt <= now
            && row.receivedAt >= order.createdAt && row.policyVersion === policy.version
            && value.orderId === sourceId && value.itemId === item.id && value.quantity === row.quantity;
        });
    });
    completion = order.items.map(item => ({ id: item.id, quantity: item.quantity, actualReceivedAt: item.actualReceivedAt?.toISOString() ?? null,
      deliveries: item.deliveries.map(row => ({ id: row.id, quantity: row.quantity, receivedAt: row.receivedAt.toISOString(),
        auditId: receiptMap.get(row.id)?.id ?? null, returns: row.returns.map(ret => ({ id: ret.id, quantity: ret.quantity,
          sellerReceivedAt: ret.sellerReceivedAt?.toISOString() ?? null, refundPosted: settledClaims.has(ret.id) })) })) }));
  } else if (sourceType === 'TRAINING_ENROLLMENT') {
    await tx.$queryRaw`SELECT "id" FROM "TrainingEnrollment" WHERE "id"::text=${sourceId} FOR UPDATE`;
    const enrollment = await tx.trainingEnrollment.findUnique({ where: { id: sourceId }, include: { record: {
      include: { stages: { include: { skills: true }, orderBy: { sequence: 'asc' } }, sessions: true } } } });
    if (!enrollment) throw new NotFoundException('Training source not found.');
    contract = requireCourseContract(enrollment); customerAccountId = enrollment.studentAccountId; amountMinor = contract.amountMinor;
    if (checkout) requireAcceptedCourseContract(contract, checkout.contractSnapshot, now);
    const record = enrollment.record;
    const receipt = await tx.auditEvent.findFirst({ where: { resource: 'trainingEnrollment', resourceId: sourceId,
      action: 'training.course_completed', occurredAt: { lte: now } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] });
    completed = Boolean(record && enrollment.status === 'COMPLETED' && record.status === 'COMPLETED'
      && enrollment.completedAt && enrollment.completedAt <= now && record.completedAt && record.completedAt <= now
      && enrollment.completedAt.getTime() === record.completedAt.getTime()
      && record.completedAt.getTime() >= Date.parse(rentalObject(contract.originalSchedule).startsAt)
      && record.progressPercent === 100 && trainingCompletion(record).ready && receipt
      && rentalObject(receipt.metadata).trainingRecordId === record.id);
    if (completed) {
      try { await assertTrainingStandardCompletion(tx, sourceId); } catch { completed = false; }
    }
    completion = { enrollmentStatus: enrollment.status, completedAt: enrollment.completedAt?.toISOString() ?? null,
      recordId: record?.id ?? null, recordRevision: record?.updatedAt.toISOString() ?? null, auditId: receipt?.id ?? null,
      courseReady: completed };
  } else {
    const [rental] = await tx.$queryRaw<Array<RentalContractRecord & { status: string; paymentStatus: string; returnedAt: Date | null }>>`
      SELECT * FROM "EquipmentRental" WHERE "id"=${sourceId} FOR UPDATE`;
    if (!rental) throw new NotFoundException('Rental source not found.');
    const items = await tx.$queryRaw<Array<RentalContractLine & { handedOverAt: Date | null; returnedAt: Date | null; returnCondition: string | null }>>`
      SELECT i.*, b."organizationId"::text AS "organizationId" FROM "EquipmentRentalItem" i
      JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE i."rentalId"=${sourceId} ORDER BY i."resourceId"`;
    contract = requireRentalContract(rental, items); customerAccountId = rental.renterAccountId; amountMinor = Number(rental.totalHalala);
    if (checkout) requireAcceptedRentalContract(contract, checkout.contractSnapshot, now);
    const receipts = await tx.auditEvent.findMany({ where: { resource: 'EquipmentRental', resourceId: sourceId,
      action: { in: ['EQUIPMENT_RENTAL_HANDED_OVER', 'EQUIPMENT_RENTAL_ITEM_HANDED_OVER', 'EQUIPMENT_RENTAL_ITEM_RETURNED', 'EQUIPMENT_RENTAL_RETURNED'] },
      occurredAt: { lte: now } }, select: { id: true, action: true, metadata: true } });
    completed = rental.status === 'RETURNED' && rental.paymentStatus === 'PAID' && Boolean(rental.returnedAt && rental.returnedAt <= now)
      && items.length > 0 && receipts.some(row => row.action === 'EQUIPMENT_RENTAL_RETURNED')
      && items.every(item => item.handedOverAt && item.returnedAt && item.handedOverAt <= item.returnedAt && item.returnedAt <= now
        && receipts.some(row => row.action === 'EQUIPMENT_RENTAL_ITEM_RETURNED' && rentalObject(row.metadata).resourceId === item.resourceId));
    completion = { status: rental.status, returnedAt: rental.returnedAt?.toISOString() ?? null,
      items: items.map(item => ({ id: item.id, resourceId: item.resourceId, handedOverAt: item.handedOverAt?.toISOString() ?? null,
        returnedAt: item.returnedAt?.toISOString() ?? null, condition: item.returnCondition })), auditIds: receipts.map(row => row.id).sort() };
  }
  const originalSeller = contract.organizationId ?? rentalObject(contract.issuer).organizationId;
  if (originalSeller !== organizationId) throw new NotFoundException('Source not found in this center.');
  if (checkout && (checkout.organizationId !== organizationId || checkout.customerAccountId !== customerAccountId
    || checkout.amountMinor !== amountMinor || checkout.currency !== 'SAR' || checkout.provider !== 'MOYASAR')) {
    throw new ConflictException('The checkout no longer matches the original source.');
  }
  const proof = await tx.commerceCollectionEvidence.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId } } });
  const candidates = checkout?.providerPaymentId ? await commerceSettlementCandidates(tx, organizationId, [checkout.providerPaymentId]) : new Map();
  const matched = checkout?.providerPaymentId ? candidates.get(checkout.providerPaymentId) : null;
  const collectionVerified = Boolean(checkout && proof && matched?.verified && matched.id === checkout.id
    && proof.financeEntryId && proof.providerPaymentId === checkout.providerPaymentId && proof.amountMinor === amountMinor);
  const refundedMinor = collectionVerified ? proof!.providerRefundedMinor : 0;
  const openRefunds = checkout ? sourceType === 'EQUIPMENT_RENTAL'
    ? await tx.rentalRefundOperation.count({ where: { checkoutId: checkout.id, status: { in: ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'] } } })
    : await tx.checkoutRefund.count({ where: { checkoutId: checkout.id, status: { notIn: ['POSTED', 'FAILED'] } } }) : 0;
  const pendingRefund = pendingClaim || openRefunds > 0;
  const blockers = [...(!collectionVerified ? ['VERIFIED_COLLECTION_AND_REFUND_LEDGER_REQUIRED'] : []),
    ...(!completed ? ['ACTUAL_SOURCE_COMPLETION_REQUIRED'] : []), ...(pendingRefund ? ['PENDING_REFUND_REQUIRES_RECONCILIATION'] : [])];
  const evidence = { sourceType, sourceId, organizationId, customerAccountId, amountMinor, refundedMinor, currency: 'SAR' as const,
    contract, contractHash: entitlementContractHash(contract), invoiceKey: { sourceType, sourceId },
    collectionEvidenceId: proof?.id ?? null, collectionFinanceEntryId: proof?.financeEntryId ?? null,
    providerPaymentId: checkout?.providerPaymentId ?? null, collectionVerified, pendingRefund, completed,
    eligibleGrossAmountMinor: blockers.length ? 0 : amountMinor - refundedMinor, blockers, completion };
  return { ...evidence, evidenceHash: entitlementContractHash({ ...evidence, contract: undefined,
    providerContractHash: entitlementContractHash(checkout?.contractSnapshot), providerProofHash: entitlementContractHash(proof?.providerSnapshot),
    refundProofs: matched?.refunds ?? [] }) };
}
