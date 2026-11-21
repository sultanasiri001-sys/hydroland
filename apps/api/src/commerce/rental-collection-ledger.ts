import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Accounting stays in the established ledger, including its real approvals. */
export async function requirePostedRentalCollection(tx: Prisma.TransactionClient, input: {
  financeEntryId: string; rentalId: string; organizationId: string; amountMinor: number;
}) {
  await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${input.financeEntryId} FOR SHARE`;
  const entry = await tx.financeEntry.findUnique({where: {id: input.financeEntryId}, include: {financeAccount: true, approvals: true}});
  if (!entry || entry.status !== 'POSTED' || entry.type !== 'REVENUE' || entry.organizationId !== input.organizationId
    || entry.amountMinor !== input.amountMinor || entry.currency !== 'SAR'
    || entry.referenceType !== 'EQUIPMENT_RENTAL_COLLECTION' || entry.referenceId !== input.rentalId
    || !entry.financeAccount.active || entry.financeAccount.organizationId !== input.organizationId || entry.financeAccount.currency !== 'SAR'
    || !entry.requestedByAccountId || !entry.approvedByAccountId || !entry.postedByAccountId || !entry.approvedAt || !entry.postedAt
    || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
    || entry.postedAt.getTime() < entry.approvedAt.getTime()
    || !entry.approvals.some(approval => approval.status === 'APPROVED'
      && approval.requestedByAccountId === entry.requestedByAccountId && approval.decidedByAccountId === entry.approvedByAccountId
      && approval.decidedAt?.getTime() === entry.approvedAt!.getTime())) {
    throw new ConflictException({code: 'RENTAL_COLLECTION_EVIDENCE_REQUIRED',
      message: 'Rental collection requires its matching posted revenue entry and independent financial approval.'});
  }
  return entry;
}
