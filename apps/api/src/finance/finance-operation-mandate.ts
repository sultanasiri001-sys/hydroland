import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { platformOrganization } from '../hr/staffing-catalog';

const object = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;

// Document forms submit NUMBER fields as text. Accept integer halalas only.
export function mandateAmountMinor(value: unknown): number | null {
  const amount = typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : value;
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 && amount <= 2147483647 ? amount : null;
}

export const BOOKING_PREPAYMENT_OPERATION = 'INITIATE_ORGANIZATION_BOOKING_PREPAYMENT';

/** Rechecked under row locks at both reservation and financial dispatch. */
async function currentMandate(tx: Prisma.TransactionClient, accountId: string, organizationId: string, operation: string, amountMinor: number, currency: string) {
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
    if (operation === BOOKING_PREPAYMENT_OPERATION) {
      const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId, status: 'ACTIVE', organization: { status: 'ACTIVE' } }, select: { id: true } });
      if (approved.documentId !== fresh.id || !Number.isSafeInteger(approved.documentVersion) || typeof approved.documentHash !== 'string'
        || !approved.documentHash.trim()) throw new ForbiddenException('The signed appointment reference is incomplete.');
      const document = await tx.managedDocument.findFirst({
        where: { id: approved.documentId, organizationId, version: approved.documentVersion, contentHash: approved.documentHash,
          signedAt: { not: null }, status: { in: ['SIGNED', 'ARCHIVED'] } }, select: { id: true, payload: true },
      });
      const terms = object(document && document.payload);
      if (!member || !document || terms?.purpose !== 'ORGANIZATION_BOOKING_PREPAYMENT' || terms.decision !== 'APPOINT'
        || terms.delegateAccountId !== accountId || terms.currency !== currency || mandateAmountMinor(terms.limitMinor) !== fresh.limitMinor
        || Date.parse(terms.validFrom) !== fresh.validFrom.getTime() || Date.parse(terms.validUntil) !== fresh.validUntil.getTime()) {
        throw new ForbiddenException('Organization membership or signed appointment no longer matches the financial mandate.');
      }
    }
    return { account, grantId: fresh.id, approvalEvidenceReference: fresh.approvalEvidenceReference };
  }

export async function requireFinancialOperationMandate(tx: Prisma.TransactionClient, accountId: string, organizationId: string, operation: string, amountMinor: number, currency: string) {
  return (await currentMandate(tx, accountId, organizationId, operation, amountMinor, currency)).account;
}

export function requireBookingPrepaymentMandate(tx: Prisma.TransactionClient, accountId: string, organizationId: string, amountMinor: number) {
  return currentMandate(tx, accountId, organizationId, BOOKING_PREPAYMENT_OPERATION, amountMinor, 'SAR');
}
