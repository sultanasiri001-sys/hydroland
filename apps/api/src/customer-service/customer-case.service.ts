import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCasePriority, CustomerCaseType, CustomerInteractionChannel } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CustomerCaseService {
  constructor(private readonly db: DatabaseService) {}

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
