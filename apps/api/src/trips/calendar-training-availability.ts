import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { trainingOperationalPolicy } from '../governance/training-operational-policy';

const HUMAN_RESOURCE_TYPES = ['INSTRUCTOR', 'CREW', 'CAPTAIN'];

// Run these reads inside the SAME serializable transaction as the reservation
// write. Both domains read the other's source of truth, so PostgreSQL SSI rejects
// a concurrent write-skew and DatabaseService.serializable retries the loser.
// Resource IDs identify assets; human referenceId identifies the canonical Account.
export async function assertTrainingCalendarAvailable(
  tx: Prisma.TransactionClient, accountIds: string[], startsAt: Date, endsAt: Date,
) {
  const conflict = await tx.calendarAllocation.findFirst({
    where: {
      status: 'ACTIVE', startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
      resource: { type: { in: HUMAN_RESOURCE_TYPES }, referenceId: { in: accountIds } },
    },
    select: { id: true },
  });
  // Deliberately do not ignore an active allocation on an inactive resource/event:
  // release must be explicit, not inferred from inconsistent legacy metadata.
  if (conflict) throw new ConflictException('Calendar resource conflict detected.');
}

export async function trainingBusyAccounts(
  tx: Prisma.TransactionClient, accountIds: string[], startsAt: Date, endsAt: Date,
): Promise<Set<string>> {
  if (!accountIds.length || !(await trainingOperationalPolicy(tx)).scheduleConflict) return new Set();
  const sessions = await tx.trainingSession.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CHECK_IN_OPEN', 'IN_PROGRESS'] },
      AND: [
        { OR: [{ instructorAccountId: { in: accountIds } }, { trainingRecord: { enrollment: { studentAccountId: { in: accountIds } } } }] },
        // Preserve training's existing conservative handling of open sessions.
        { OR: [{ status: 'IN_PROGRESS' }, { startsAt: { lt: endsAt }, OR: [{ endsAt: { gt: startsAt } }, { endsAt: null }] }] },
      ],
    },
    select: { instructorAccountId: true, trainingRecord: { select: { enrollment: { select: { studentAccountId: true } } } } },
  });
  return new Set(sessions.flatMap(row => [row.instructorAccountId, row.trainingRecord.enrollment.studentAccountId]));
}

export async function assertCalendarTrainingAvailable(
  tx: Prisma.TransactionClient, resourceIds: string[], startsAt: Date, endsAt: Date,
) {
  const resources = await tx.calendarResource.findMany({
    where: { id: { in: resourceIds }, type: { in: HUMAN_RESOURCE_TYPES } },
    select: { referenceId: true },
  });
  // Human resources without an account link cannot be proved available.
  if (resources.some(row => !row.referenceId?.trim())) throw new ConflictException('Human calendar resource has no account reference.');
  const accountIds = [...new Set(resources.map(row => row.referenceId!))];
  if (accountIds.length) {
    // Match as text to tolerate the repository's supported TEXT/UUID account keys.
    const accounts = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id"::text AS "id" FROM "Account" WHERE "id"::text=ANY(${accountIds}::text[])`;
    if (accounts.length !== accountIds.length) throw new ConflictException('Human calendar resource has an unknown account reference.');
  }
  if ((await trainingBusyAccounts(tx, accountIds, startsAt, endsAt)).size) throw new ConflictException('Calendar resource conflict detected.');
}
