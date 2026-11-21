import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Accounting stays in the established ledger, including its real approvals. */
export async function requirePostedRentalCollection(tx: Prisma.TransactionClient, input: {
  financeEntryId: string; rentalId: string; organizationId: string; amountMinor: number;
}) {
  return requirePostedCommerceCollection(tx, { financeEntryId: input.financeEntryId, sourceId: input.rentalId,
    referenceType: 'EQUIPMENT_RENTAL_COLLECTION', organizationId: input.organizationId, amountMinor: input.amountMinor });
}

export async function requirePostedCommerceCollection(tx: Prisma.TransactionClient, input: {
  financeEntryId: string; sourceId: string; organizationId: string; amountMinor: number;
  referenceType: 'EQUIPMENT_RENTAL_COLLECTION' | 'ORGANIZATION_BOOKING_COLLECTION';
}) {
  await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${input.financeEntryId} FOR SHARE`;
  const entry = await tx.financeEntry.findUnique({where: {id: input.financeEntryId}, include: {financeAccount: true, approvals: true}});
  if (!entry || entry.status !== 'POSTED' || entry.type !== 'REVENUE' || entry.organizationId !== input.organizationId
    || entry.amountMinor !== input.amountMinor || entry.currency !== 'SAR'
    || entry.referenceType !== input.referenceType || entry.referenceId !== input.sourceId
    || !entry.financeAccount.active || entry.financeAccount.organizationId !== input.organizationId || entry.financeAccount.currency !== 'SAR'
    || !entry.requestedByAccountId || !entry.approvedByAccountId || !entry.postedByAccountId || !entry.approvedAt || !entry.postedAt
    || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
    || entry.postedAt.getTime() < entry.approvedAt.getTime()
    || !entry.approvals.some(approval => approval.status === 'APPROVED'
      && approval.requestedByAccountId === entry.requestedByAccountId && approval.decidedByAccountId === entry.approvedByAccountId
      && approval.decidedAt?.getTime() === entry.approvedAt!.getTime())) {
    throw new ConflictException({code: input.referenceType === 'EQUIPMENT_RENTAL_COLLECTION' ? 'RENTAL_COLLECTION_EVIDENCE_REQUIRED' : 'ORGANIZATION_BOOKING_COLLECTION_EVIDENCE_REQUIRED',
      message: 'Collection requires its matching posted revenue entry and independent financial approval.'});
  }
  return entry;
}
