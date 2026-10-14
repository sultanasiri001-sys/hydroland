import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCasePriority, CustomerCaseType, CustomerInteractionChannel, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomerCaseService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  private async assertOrganizationMember(tx: Prisma.TransactionClient, accountId: string, organizationId: string, write: boolean) {
    const organization = await tx.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE' }, select: { id: true } });
    const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId, status: 'ACTIVE', ...(write ? { role: { in: ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'] } } : {}) }, select: { id: true } });
    if (!organization || !member) throw new ForbiddenException('Active organization membership is required.');
  }

  async listForOrganization(accountId: string, organizationId: string, requestedPage = 1, pageSize = 20) {
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > 100000) throw new BadRequestException('Invalid page number.');
    const page = requestedPage;
    const size = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 20;
    if (!Number.isInteger(pageSize) || pageSize < 1) throw new BadRequestException('Invalid page size.');
    return this.db.serializable(async tx => {
      await this.assertOrganizationMember(tx, accountId, organizationId, false);
      const where = { organizationId };
      const [items, total] = await Promise.all([
        tx.customerCase.findMany({ where, select: { id: true, type: true, status: true, priority: true, subject: true, description: true, referenceType: true, referenceId: true, createdAt: true, updatedAt: true, interactions: { select: { id: true, actorType: true, channel: true, message: true, createdAt: true }, orderBy: { createdAt: 'asc' } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: size, skip: (page - 1) * size }),
        tx.customerCase.count({ where }),
      ]);
      return { items, total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) };
    });
  }

  async getForOrganization(accountId: string, organizationId: string, caseId: string) {
    return this.db.serializable(async tx => {
      await this.assertOrganizationMember(tx, accountId, organizationId, false);
      const record = await tx.customerCase.findFirst({ where: { id: caseId, organizationId }, select: { id: true, type: true, status: true, priority: true, subject: true, description: true, referenceType: true, referenceId: true, createdAt: true, updatedAt: true, interactions: { select: { id: true, actorType: true, channel: true, message: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } });
      if (!record) throw new NotFoundException('Customer case not found.');
      return record;
    });
  }

  async createForOrganization(accountId: string, organizationId: string, input: { type: CustomerCaseType; subject: string; description: string }) {
    const subject = input.subject?.trim(); const description = input.description?.trim();
    if (!subject || !description) throw new BadRequestException('Subject and description are required.');
    if (!Object.values(CustomerCaseType).includes(input.type)) throw new BadRequestException('Invalid request type.');
    if (subject.length > 180 || description.length > 10000) throw new BadRequestException('Subject or description exceeds the allowed length.');
    return this.db.serializable(async tx => {
      await this.assertOrganizationMember(tx, accountId, organizationId, true);
      const record = await tx.customerCase.create({ data: { organizationId, customerId: accountId, type: input.type, priority: CustomerCasePriority.NORMAL, subject, description, interactions: { create: { actorType: 'CUSTOMER', actorId: accountId, channel: CustomerInteractionChannel.WEB, message: description } } }, select: { id: true, type: true, status: true, priority: true, subject: true, description: true, createdAt: true, updatedAt: true, interactions: { select: { id: true, actorType: true, channel: true, message: true, createdAt: true } } } });
      await this.audit.record({ actorId: accountId, action: 'organization.customer_case.created', resource: 'CustomerCase', resourceId: record.id, metadata: { organizationId, type: input.type } }, tx);
      return record;
    });
  }

  async replyForOrganization(accountId: string, organizationId: string, caseId: string, message: string) {
    const clean = message?.trim(); if (!clean || clean.length > 10000) throw new BadRequestException('Message is required and must be within the allowed length.');
    return this.db.serializable(async tx => {
      await this.assertOrganizationMember(tx, accountId, organizationId, true);
      const found = await tx.customerCase.findFirst({ where: { id: caseId, organizationId }, select: { id: true } });
      if (!found) throw new NotFoundException('Customer case not found.');
      const interaction = await tx.customerInteraction.create({ data: { caseId, actorType: 'CUSTOMER', actorId: accountId, channel: CustomerInteractionChannel.WEB, message: clean }, select: { id: true, actorType: true, channel: true, message: true, createdAt: true } });
      await this.audit.record({ actorId: accountId, action: 'organization.customer_case.replied', resource: 'CustomerCase', resourceId: caseId, metadata: { organizationId, interactionId: interaction.id } }, tx);
      return interaction;
    });
  }

  listMine(accountId: string) {
    return this.db.customerCase.findMany({ where: { customerId: accountId }, include: { interactions: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  }

  async create(accountId: string, input: { type: CustomerCaseType; subject: string; description: string; priority?: CustomerCasePriority; referenceType?: string; referenceId?: string }) {
    const subject = input.subject?.trim(); const description = input.description?.trim();
    if (!subject || !description) throw new BadRequestException('Subject and description are required.');
    return this.db.customerCase.create({ data: { customerId: accountId, type: input.type, priority: input.priority ?? CustomerCasePriority.NORMAL, subject, description, referenceType: input.referenceType?.trim() || null, referenceId: input.referenceId?.trim() || null, interactions: { create: { actorType: 'CUSTOMER', actorId: accountId, channel: CustomerInteractionChannel.WEB, message: description } } }, include: { interactions: true } });
  }

  async reply(accountId: string, caseId: string, message: string) {
    const clean = message?.trim(); if (!clean) throw new BadRequestException('Message is required.');
    const found = await this.db.customerCase.findFirst({ where: { id: caseId, customerId: accountId } });
    if (!found) throw new NotFoundException('Customer case not found.');
    return this.db.customerInteraction.create({ data: { caseId, actorType: 'CUSTOMER', actorId: accountId, channel: CustomerInteractionChannel.WEB, message: clean } });
  }
}
