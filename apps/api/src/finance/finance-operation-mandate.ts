import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { platformOrganization } from '../hr/staffing-catalog';

const object = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;

/** Rechecked under row locks at both reservation and financial dispatch. */
export async function requireFinancialOperationMandate(tx: Prisma.TransactionClient, accountId: string, organizationId: string, operation: string, amountMinor: number, currency: string) {
    const now = new Date();
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id"::text=${accountId} FOR SHARE`;
    const account = await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE' }, select: { id: true, personId: true } });
    if (!account) throw new ForbiddenException('Active financial delegate required.');
    const grants = await tx.financeOperationGrant.findMany({ where: { accountId, organizationId, operation, currency, limitMinor: { gte: amountMinor }, validFrom: { lte: now }, validUntil: { gt: now }, revokedAt: null }, orderBy: { createdAt: 'desc' } });
    const grant = grants.find(row => row.approvedByAccountId !== accountId && !!row.approvalEvidenceReference.trim());
    if (!grant) throw new ForbiddenException({ code: 'FINANCE_OPERATION_MANDATE_REQUIRED', message: 'A current approved financial mandate with a sufficient currency and amount limit is required.' });
    // Lock the exact grant so revocation/expiry changes cannot cross dispatch.
    await tx.$queryRaw`SELECT "id" FROM "FinanceOperationGrant" WHERE "id"=${grant.id} FOR SHARE`;
    const fresh = await tx.financeOperationGrant.findUniqueOrThrow({ where: { id: grant.id } });
    if (fresh.revokedAt || fresh.validUntil <= new Date() || fresh.validFrom > new Date() || fresh.limitMinor < amountMinor
      || fresh.accountId !== accountId || fresh.organizationId !== organizationId || fresh.operation !== operation || fresh.currency !== currency) throw new ForbiddenException('Financial mandate changed.');
    const approver = await tx.account.findFirst({ where: { id: fresh.approvedByAccountId, status: 'ACTIVE' }, select: { id: true, personId: true } });
    if (!approver) throw new ForbiddenException('Financial mandate approver is unavailable.');
    const ownerEmail=process.env.D12_OWNER_EMAIL?.trim().toLowerCase();
    const platform=ownerEmail?await platformOrganization(tx):null;
    const owner=platform&&await tx.account.findFirst({where:{id:platform.ownerId,email:ownerEmail,status:'ACTIVE',emailVerifiedAt:{not:null},roleAssignments:{some:{role:'ADMIN',status:'ACTIVE'}}},select:{id:true}});
    if(!owner||owner.id!==fresh.approvedByAccountId)throw new ForbiddenException('Financial mandate is not bound to the verified platform owner.');
    const evidence = await tx.auditEvent.findFirst({ where: { id: fresh.approvalEvidenceReference, actorId: approver.personId, action: 'FINANCE_OPERATION_GRANT_APPROVED', resource: 'FinanceOperationGrant', resourceId: fresh.id } });
    const approved = object(evidence?.metadata);
    if (!approved || approved.accountId !== accountId || approved.organizationId !== organizationId || approved.operation !== operation
      || approved.currency !== currency || approved.limitMinor !== fresh.limitMinor || approved.validFrom !== fresh.validFrom.toISOString() || approved.validUntil !== fresh.validUntil.toISOString()) throw new ForbiddenException('Financial mandate approval evidence does not match.');
    return account;
  }
