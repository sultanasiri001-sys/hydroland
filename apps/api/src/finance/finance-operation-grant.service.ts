import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { platformOrganization } from '../hr/staffing-catalog';

type GrantInput = { accountId: string; organizationId: string; operation: 'APPROVE_REFUND' | 'EXECUTE_REFUND'; currency: string; limitMinor: number; validFrom: string; validUntil: string };

@Injectable()
export class FinanceOperationGrantService {
  constructor(private readonly db: DatabaseService) {}
  private async owner(tx: Prisma.TransactionClient, accountId: string) {
    const email = process.env.D12_OWNER_EMAIL?.trim().toLowerCase();
    const platform = email ? await platformOrganization(tx) : null;
    const owner = platform && await tx.account.findFirst({ where: { id: platform.ownerId, email, status: 'ACTIVE', emailVerifiedAt: { not: null }, roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } }, select: { id: true, personId: true } });
    if (!owner || owner.id !== accountId) throw new ForbiddenException('The verified platform owner must approve financial mandates.');
    return owner;
  }
  async create(ownerId: string, input: GrantInput) {
    if (!input || typeof input.accountId !== 'string' || typeof input.organizationId !== 'string' || !['APPROVE_REFUND', 'EXECUTE_REFUND'].includes(input.operation)
      || input.currency !== 'SAR' || !Number.isSafeInteger(input.limitMinor) || input.limitMinor <= 0 || input.limitMinor > 2147483647
      || typeof input.validFrom !== 'string' || typeof input.validUntil !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(input.validFrom) || !/(Z|[+-]\d\d:\d\d)$/.test(input.validUntil)) throw new BadRequestException('Financial mandate fields are invalid.');
    const validFrom = new Date(input.validFrom), validUntil = new Date(input.validUntil);
    if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime()) || validUntil <= validFrom || validUntil <= new Date()) throw new BadRequestException('Financial mandate validity is invalid.');
    return this.db.serializable(async tx => {
      const owner = await this.owner(tx, ownerId);
      const delegate = await tx.account.findFirst({ where: { id: input.accountId, status: 'ACTIVE' }, select: { id: true, personId: true } });
      const organization = await tx.organization.findFirst({ where: { id: input.organizationId, status: 'ACTIVE' }, select: { id: true } });
      if (!delegate || !organization) throw new NotFoundException('Active delegate and issuing organization are required.');
      if (delegate.personId === owner.personId) throw new ForbiddenException('A financial mandate cannot be self-approved.');
      const id = randomUUID(), evidenceId = randomUUID();
      const row = await tx.financeOperationGrant.create({ data: { id, accountId: delegate.id, organizationId: organization.id, operation: input.operation,
        currency: input.currency, limitMinor: input.limitMinor, validFrom, validUntil, approvedByAccountId: owner.id, approvalEvidenceReference: evidenceId } });
      await tx.auditEvent.create({ data: { id: evidenceId, actorId: owner.personId, action: 'FINANCE_OPERATION_GRANT_APPROVED', resource: 'FinanceOperationGrant', resourceId: id,
        metadata: { accountId: delegate.id, organizationId: organization.id, operation: row.operation, currency: row.currency, limitMinor: row.limitMinor, validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString() } } });
      return row;
    });
  }
  async revoke(ownerId: string, id: string) {
    return this.db.serializable(async tx => {
      const owner = await this.owner(tx, ownerId);
      await tx.$queryRaw`SELECT "id" FROM "FinanceOperationGrant" WHERE "id"=${id} FOR UPDATE`;
      const row = await tx.financeOperationGrant.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Financial mandate not found.');
      if (row.revokedAt) return row;
      const saved = await tx.financeOperationGrant.update({ where: { id }, data: { revokedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: owner.personId, action: 'FINANCE_OPERATION_GRANT_REVOKED', resource: 'FinanceOperationGrant', resourceId: id, metadata: { organizationId: row.organizationId } } });
      return saved;
    });
  }
}
