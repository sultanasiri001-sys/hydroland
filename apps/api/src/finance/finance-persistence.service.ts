import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinanceEntryStatus, FinanceEntryType, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

export interface CreateFinanceAccountInput {
  organizationId: string;
  name: string;
  currency?: string;
}

export interface CreateFinanceEntryInput {
  organizationId: string;
  financeAccountId: string;
  type: FinanceEntryType;
  amountMinor: number;
  currency?: string;
  referenceType: string;
  referenceId: string;
  description?: string;
  requestedByAccountId: string;
}

@Injectable()
export class FinancePersistenceService {
  constructor(private readonly db: DatabaseService) {}

  createAccount(input: CreateFinanceAccountInput) {
    const name = input.name?.trim();
    if (!input.organizationId || !name) throw new BadRequestException('Finance account scope and name are required.');
    return this.db.financeAccount.create({ data: { organizationId: input.organizationId, name, currency: input.currency || 'SAR' } });
  }

  listAccounts(organizationId: string) {
    return this.db.financeAccount.findMany({ where: { organizationId, active: true }, orderBy: { createdAt: 'asc' } });
  }

  async createEntry(input: CreateFinanceEntryInput) {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw new BadRequestException('Finance entry amount must be a positive integer.');
    if (!input.referenceType || !input.referenceId || !input.requestedByAccountId) throw new BadRequestException('Finance entry reference and requester are required.');
    const account = await this.db.financeAccount.findUnique({ where: { id: input.financeAccountId } });
    if (!account || !account.active) throw new NotFoundException('Finance account not found.');
    if (account.organizationId !== input.organizationId) throw new BadRequestException('Finance entry scope mismatch.');
    const currency = input.currency || account.currency;
    if (currency !== account.currency) throw new BadRequestException('Finance entry currency mismatch.');
    return this.db.serializable(async (tx: Prisma.TransactionClient) => {
      const entry = await tx.financeEntry.create({ data: { organizationId: input.organizationId, financeAccountId: input.financeAccountId, type: input.type, status: FinanceEntryStatus.PENDING_APPROVAL, amountMinor: input.amountMinor, currency, referenceType: input.referenceType, referenceId: input.referenceId, description: input.description, requestedByAccountId: input.requestedByAccountId } });
      await tx.financeApproval.create({ data: { financeEntryId: entry.id, requestedByAccountId: input.requestedByAccountId } });
      return entry;
    });
  }

  listEntries(organizationId: string) {
    return this.db.financeEntry.findMany({ where: { organizationId }, include: { financeAccount: true, approvals: true }, orderBy: { createdAt: 'desc' } });
  }

  async decideEntry(entryId: string, decidedByAccountId: string, approved: boolean, note?: string) {
    return this.db.serializable(async (tx: Prisma.TransactionClient) => {
      const entry = await tx.financeEntry.findUnique({ where: { id: entryId }, include: { approvals: { where: { status: 'REQUESTED' }, orderBy: { createdAt: 'desc' }, take: 1 } } });
      if (!entry) throw new NotFoundException('Finance entry not found.');
      if (entry.status !== FinanceEntryStatus.PENDING_APPROVAL || !entry.approvals[0]) throw new BadRequestException('Finance entry is not pending approval.');
      const now = new Date();
      await tx.financeApproval.update({ where: { id: entry.approvals[0].id }, data: { status: approved ? 'APPROVED' : 'REJECTED', decidedByAccountId, decisionNote: note, decidedAt: now } });
      return tx.financeEntry.update({ where: { id: entryId }, data: { status: approved ? FinanceEntryStatus.APPROVED : FinanceEntryStatus.REJECTED, approvedByAccountId: approved ? decidedByAccountId : null, approvedAt: approved ? now : null } });
    });
  }

  async postEntry(entryId: string) {
    const entry = await this.db.financeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Finance entry not found.');
    if (entry.status !== FinanceEntryStatus.APPROVED) throw new BadRequestException('Only approved finance entries can be posted.');
    return this.db.financeEntry.update({ where: { id: entryId }, data: { status: FinanceEntryStatus.POSTED, postedAt: new Date() } });
  }
}
