import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

type CreateOrganizationInput = { displayName: string; legalName?: string; kind: string; registrationNumber?: string; regionCode?: string };
type UpdateOrganizationInput = Partial<CreateOrganizationInput>;
type AddMemberInput = { accountId: string; role: 'ADMIN' | 'OPERATOR' | 'INSTRUCTOR' | 'STAFF' | 'VIEWER' };

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private clean(input: CreateOrganizationInput) {
    const displayName = input.displayName?.trim();
    const kind = input.kind?.trim();
    if (!displayName || !kind) throw new BadRequestException('displayName and kind are required.');
    return {
      displayName,
      kind,
      legalName: input.legalName?.trim() || null,
      registrationNumber: input.registrationNumber?.trim() || null,
      regionCode: input.regionCode?.trim() || null,
    };
  }

  private async auditAction(accountId: string, action: string, resourceId: string, metadata?: object) {
    const account = await this.db.account.findUnique({ where: { id: accountId }, select: { personId: true } });
    await this.audit.record({ actorId: account?.personId, action, resource: 'organization', resourceId, metadata });
  }

  async create(accountId: string, input: CreateOrganizationInput) {
    const data = this.clean(input);
    try {
      const organization = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.organization.create({ data: { ...data, ownerId: accountId, status: 'PENDING_REVIEW' } });
        await tx.organizationMember.create({ data: { organizationId: created.id, accountId, role: 'OWNER', status: 'ACTIVE' } });
        return created;
      });
      await this.auditAction(accountId, 'organization.submitted', organization.id, { kind: organization.kind });
      return organization;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Registration number already exists.');
      throw error;
    }
  }

  mine(accountId: string) {
    return this.db.organizationMember.findMany({
      where: { accountId, status: { in: ['PENDING', 'ACTIVE'] } },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async requireManager(accountId: string, organizationId: string) {
    const member = await this.db.organizationMember.findUnique({ where: { organizationId_accountId: { organizationId, accountId } } });
    if (!member || member.status !== 'ACTIVE' || !['OWNER', 'ADMIN'].includes(member.role)) throw new ForbiddenException('Organization manager scope required.');
    return member;
  }

  async update(accountId: string, organizationId: string, input: UpdateOrganizationInput) {
    await this.requireManager(accountId, organizationId);
    const organization = await this.db.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organization not found.');
    const data = this.clean({ ...organization, ...input } as CreateOrganizationInput);
    try {
      const updated = await this.db.organization.update({ where: { id: organizationId }, data: { ...data, status: organization.status === 'REJECTED' ? 'PENDING_REVIEW' : organization.status } });
      await this.auditAction(accountId, 'organization.updated', organizationId);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Registration number already exists.');
      throw error;
    }
  }

  async members(accountId: string, organizationId: string) {
    await this.requireManager(accountId, organizationId);
    return this.db.organizationMember.findMany({
      where: { organizationId },
      include: { account: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(accountId: string, organizationId: string, input: AddMemberInput) {
    await this.requireManager(accountId, organizationId);
    const account = await this.db.account.findUnique({ where: { id: input.accountId }, select: { id: true } });
    if (!account) throw new NotFoundException('Account not found.');
    try {
      const member = await this.db.organizationMember.create({ data: { organizationId, accountId: input.accountId, role: input.role, status: 'PENDING' } });
      await this.auditAction(accountId, 'organization.member_invited', organizationId, { memberId: member.id, role: input.role });
      return member;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Account is already a member.');
      throw error;
    }
  }

  listForAdmin() {
    return this.db.organization.findMany({
      include: { owner: { select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } } }, _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(reviewerId: string, organizationId: string, input: { outcome: 'APPROVED' | 'REJECTED'; reason?: string }) {
    if (!['APPROVED', 'REJECTED'].includes(input.outcome)) throw new BadRequestException('Invalid decision.');
    const organization = await this.db.organization.findUnique({ where: { id: organizationId } });
    if (!organization || organization.status !== 'PENDING_REVIEW') throw new NotFoundException('Organization is not awaiting review.');
    const status = input.outcome === 'APPROVED' ? 'ACTIVE' : 'REJECTED';
    const updated = await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.organization.update({ where: { id: organizationId }, data: { status, reviewedAt: new Date(), reviewedById: reviewerId } });
      if (status === 'ACTIVE') await tx.organizationMember.updateMany({ where: { organizationId, status: 'PENDING' }, data: { status: 'ACTIVE' } });
      return result;
    });
    await this.auditAction(reviewerId, 'organization.' + input.outcome.toLowerCase(), organizationId, { reason: input.reason || null });
    return updated;
  }
}
