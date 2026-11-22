import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export function requirePostingEnabled() {
  if (process.env.HYDROLAND_B03_LEDGER_POSTING !== 'enabled') {
    throw new ServiceUnavailableException('Financial posting is disabled.');
  }
}

export async function verifiedEntry(tx: Prisma.TransactionClient, id: string) {
  const entry = await tx.financeEntry.findUnique({
    where: {id}, include: {financeAccount: true, approvals: true},
  });
  if (!entry || entry.status !== 'POSTED' || entry.currency !== 'SAR' || entry.amountMinor <= 0
    || !entry.financeAccount.active || entry.financeAccount.organizationId !== entry.organizationId
    || entry.financeAccount.currency !== entry.currency || !entry.approvedByAccountId || !entry.postedByAccountId
    || !entry.approvedAt || !entry.postedAt || entry.postedAt < entry.approvedAt
    || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
    || !entry.approvals.some(a => a.status === 'APPROVED' && a.requestedByAccountId === entry.requestedByAccountId
      && a.decidedByAccountId === entry.approvedByAccountId && a.decidedAt?.getTime() === entry.approvedAt?.getTime())) {
    throw new ConflictException('An independently approved and posted SAR entry is required.');
  }
  return entry;
}

// A simultaneous first delivery can lose a unique-key insert before PostgreSQL reports a serialization conflict.
export async function postingTransaction<T>(db: import('../../database/database.service').DatabaseService, work:(tx:Prisma.TransactionClient)=>Promise<T>) {
  try {return await db.serializable(work);}
  catch(error) {
    if (!error || typeof error!=='object' || !('code' in error) || error.code!=='P2002') throw error;
    return db.serializable(work);
  }
}
