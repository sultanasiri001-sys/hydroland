import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockAccountIdentities, requireVerifiedAdmin } from '../admin/admin-authorization';
import { platformOrganization } from '../hr/staffing-catalog';

/** The platform owner can prepare a test without registering a customer organization. */
export async function requireProcurementLabOwner(tx: Prisma.TransactionClient, accountId: string) {
  const actor = await requireVerifiedAdmin(tx, accountId);
  const platform = await platformOrganization(tx);
  if (!platform || platform.ownerId !== accountId) throw new ForbiddenException('Procurement preparation is available to the verified HYDROLAND owner.');
  return actor;
}

export async function lockProcurementLabOwner(tx: Prisma.TransactionClient, accountId: string) {
  await lockAccountIdentities(tx, [accountId]);
  return requireProcurementLabOwner(tx, accountId);
}
