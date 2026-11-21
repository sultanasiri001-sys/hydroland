import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCase as StoredCase, Prisma } from '@prisma/client';
import { platformOrganization } from '../hr/staffing-catalog';
import { requireVerifiedAdmin } from '../admin/admin-authorization';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CustomerCase } from './customer-service.domain';
import { CustomerServiceOperationsService } from './customer-service-operations.service';
import { CustomerServiceWorkflowService } from './customer-service-workflow.service';

export const providerAppealReferenceType = 'PROVIDER_QUALITY_TRIP_REHEARSAL_V1';

export function assertOrdinaryCustomerCase(record: { referenceType: string | null }) {
  if (record.referenceType === providerAppealReferenceType) throw new ConflictException('Provider observations must use the independent provider-appeal workflow.');
}

type StaffAction = 'ASSIGN' | 'WAIT' | 'ESCALATE' | 'RESOLVE';
type StaffInput = { assignedAccountId?: string; message?: string; dueAt?: string };
export type ResolutionResponse = { decision?: 'ACCEPT' | 'OBJECT'; message?: string };

const ordinaryCases: Prisma.CustomerCaseWhereInput = {
  OR: [{ referenceType: null }, { referenceType: { not: providerAppealReferenceType } }],
};
const asWorkflowCase = (record: StoredCase): CustomerCase => ({
  ...record, referenceType: record.referenceType ?? undefined, referenceId: record.referenceId ?? undefined,
  assignedAccountId: record.assignedAccountId ?? undefined,
});
const withDeadline = <T extends Pick<StoredCase, 'status' | 'dueAt'>>(record: T, now = new Date()) => ({
  ...record, overdue: record.status !== 'CLOSED' && record.dueAt !== null && record.dueAt < now,
});

@Injectable()
export class CustomerCaseManagementService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService,
    private readonly workflow: CustomerServiceWorkflowService, private readonly operations: CustomerServiceOperationsService) {}

  async assignees(actorId: string) {
    return this.db.serializable(async tx => {
      await requireVerifiedAdmin(tx, actorId);
      const rows = await tx.account.findMany({ where: { status: 'ACTIVE', emailVerifiedAt: { not: null }, roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } },
        select: { id: true, email: true, person: { select: { firstName: true, lastName: true } } }, orderBy: { email: 'asc' } });
      return rows.map(row => ({ id: row.id, email: row.email, displayName: [row.person.firstName, row.person.lastName].filter(Boolean).join(' ') }));
    });
  }

  async list(actorId: string, page = 1, pageSize = 20) {
    if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new BadRequestException('Invalid pagination.');
    return this.db.serializable(async tx => {
      await requireVerifiedAdmin(tx, actorId);
      const [items, total] = await Promise.all([
        tx.customerCase.findMany({ where: ordinaryCases, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
        tx.customerCase.count({ where: ordinaryCases }),
      ]);
      const observedAt = new Date();
      return { items: items.map(item => withDeadline(item, observedAt)), total, page, pageSize, observedAt };
    });
  }

  async get(actorId: string, caseId: string) {
    return this.db.serializable(async tx => {
      await requireVerifiedAdmin(tx, actorId);
      const record = await tx.customerCase.findUnique({ where: { id: caseId }, include: { interactions: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } });
      if (!record) throw new NotFoundException('Customer case not found.');
      assertOrdinaryCustomerCase(record);
      const history = await tx.auditEvent.findMany({ where: { resource: 'CustomerCase', resourceId: caseId },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { id: true, action: true, actorId: true, occurredAt: true, metadata: true } });
      return { ...withDeadline(record), history };
    });
  }

  async act(actorId: string, caseId: string, action: StaffAction, input: StaffInput) {
    const assignment = action === 'ASSIGN' || action === 'ESCALATE';
    const keys = assignment ? (action === 'ASSIGN' ? ['assignedAccountId', 'dueAt'] : ['assignedAccountId', 'message', 'dueAt']) : ['message'];
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) throw new BadRequestException('Invalid action fields.');
    const assigneeId = assignment ? this.text(input.assignedAccountId, 200) : undefined;
    const message = action === 'ASSIGN' ? undefined : this.text(input.message, 10000);
    let suppliedDueAt: Date | undefined;
    if (input.dueAt !== undefined) {
      const parts = typeof input.dueAt === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(input.dueAt) : null;
      if (!parts) throw new BadRequestException('An explicit deadline with a timezone is required.');
      const [year, month, day, hour, minute, second, offsetHour, offsetMinute] = parts.slice(1).map(value => value === undefined ? 0 : Number(value));
      const calendar = new Date(Date.UTC(year, month - 1, day));
      if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
        || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) throw new BadRequestException('Invalid case deadline.');
      suppliedDueAt = new Date(input.dueAt);
      if (Number.isNaN(suppliedDueAt.getTime())) throw new BadRequestException('Invalid case deadline.');
    }
    return this.db.serializable(async tx => {
      await requireVerifiedAdmin(tx, actorId);
      const current = await tx.customerCase.findUnique({ where: { id: caseId } });
      if (!current) throw new NotFoundException('Customer case not found.');
      assertOrdinaryCustomerCase(current);
      if (assignment && current.referenceType==='PRIVATE_MESSAGE_ABUSE') {
        const platform = await platformOrganization(tx);
        if (platform?.ownerId !== actorId) throw new ForbiddenException('Only the platform owner may delegate evidence review.');
      }
      const record = asWorkflowCase(current);
      const dueAt = suppliedDueAt ?? current.dueAt;
      let next: CustomerCase;
      if (assignment) {
        if (!dueAt) throw new BadRequestException('Set an explicit case deadline; no default SLA has been configured.');
        if (suppliedDueAt && suppliedDueAt <= new Date()) throw new BadRequestException('The new case deadline must be in the future.');
        await requireVerifiedAdmin(tx, assigneeId!);
        next = this.workflow.assign(record, assigneeId!);
        if (action === 'ASSIGN' && current.status === next.status && current.assignedAccountId === next.assignedAccountId && current.dueAt?.getTime() === dueAt.getTime()) return withDeadline(current);
      } else if (action === 'WAIT') next = this.workflow.waitForCustomer(record);
      else next = this.workflow.resolve(record, actorId);
      const route = action === 'ESCALATE' ? this.operations.escalationRoute(record) : null;
      const updated = await tx.customerCase.update({ where: { id: caseId }, data: { status: next.status, assignedAccountId: next.assignedAccountId, ...(assignment ? { dueAt } : {}) } });
      const interaction = message ? await tx.customerInteraction.create({ data: { caseId, actorId, actorType: 'STAFF', channel: 'WEB', message } }) : null;
      await this.audit.record({ actorId, action: `customer_case.${action.toLowerCase()}`, resource: 'CustomerCase', resourceId: caseId,
        metadata: { organizationId: current.organizationId, from: current.status, to: next.status,
          previousAssignedAccountId: current.assignedAccountId, assignedAccountId: next.assignedAccountId ?? null,
          previousDueAt: current.dueAt?.toISOString() ?? null, dueAt: dueAt?.toISOString() ?? null, deadlineBasis: 'EXPLICIT_CASE_DEADLINE',
          interactionId: interaction?.id ?? null, escalationRoute: route } }, tx);
      return { ...withDeadline(updated), interaction, escalationRoute: route };
    });
  }

  async respondToResolution(actorId: string, caseId: string, input: ResolutionResponse, organizationId: string | null = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['decision', 'message'].includes(key)) || !['ACCEPT', 'OBJECT'].includes(String(input.decision))) throw new BadRequestException('Choose ACCEPT or OBJECT.');
    const message = this.text(input.message, 10000);
    return this.db.serializable(async tx => {
      if (organizationId) {
        const member = await tx.organizationMember.findFirst({ where: { organizationId, accountId: actorId, status: 'ACTIVE',
          role: { in: ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF'] }, account: { status: 'ACTIVE' }, organization: { status: 'ACTIVE' } }, select: { id: true } });
        if (!member) throw new ForbiddenException('Active organization membership with write access is required.');
      }
      const current = await tx.customerCase.findFirst({ where: { id: caseId, customerId: actorId, organizationId, customer: { status: 'ACTIVE', emailVerifiedAt: { not: null } } } });
      if (!current) throw new NotFoundException('Customer case not found.');
      assertOrdinaryCustomerCase(current);
      const record = asWorkflowCase(current);
      // Closure follows the requesting customer's explicit acceptance. An objection
      // retains the assigned owner and reopens work without discarding the history.
      const next = input.decision === 'ACCEPT' ? this.workflow.close(record) : this.workflow.objectToResolution(record, actorId);
      const updated = await tx.customerCase.update({ where: { id: caseId }, data: { status: next.status } });
      const interaction = await tx.customerInteraction.create({ data: { caseId, actorId, actorType: 'CUSTOMER', channel: 'WEB', message } });
      await this.audit.record({ actorId, action: input.decision === 'ACCEPT' ? 'customer_case.resolution_accepted' : 'customer_case.resolution_objected', resource: 'CustomerCase', resourceId: caseId,
        metadata: { organizationId, from: current.status, to: next.status, assignedAccountId: current.assignedAccountId, interactionId: interaction.id } }, tx);
      return { id: updated.id, status: updated.status, assignedAccountId: updated.assignedAccountId, dueAt: updated.dueAt,
        overdue: withDeadline(updated).overdue, updatedAt: updated.updatedAt, interaction };
    });
  }

  private text(value: unknown, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException('A valid assignee or message is required.');
    return value.trim();
  }
}
