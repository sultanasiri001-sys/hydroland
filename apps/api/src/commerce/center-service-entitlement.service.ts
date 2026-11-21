import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService, FinanceEmploymentScope } from '../finance/finance-access.service';
import { platformOrganization } from '../hr/staffing-catalog';
import { CenterTripEntitlementInput, evaluateCenterTripEntitlement } from './center-service-entitlement';

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
const PENDING_REFUNDS = ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'];
const SETTLEMENT_REFERENCE = 'CENTER_SERVICE_ENTITLEMENT';
const minor = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647;

export interface CenterTripAllocationApprovalInput {
  financeAccountId: string;
  commissionAmountMinor: number;
  otherDeductionsMinor: number;
  expectedEvidenceHash: string;
}

export interface CenterTripAllocationRevocationInput {
  allocationApprovalEventId: string;
  reason: string;
}

@Injectable()
export class CenterServiceEntitlementService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService) {}

  private async platformOwner(tx: Prisma.TransactionClient) {
    const ownerEmail = process.env.D12_OWNER_EMAIL?.trim().toLowerCase();
    const platform = ownerEmail ? await platformOrganization(tx) : null;
    return platform ? tx.account.findFirst({ where: { id: platform.ownerId, email: ownerEmail,
      status: 'ACTIVE', emailVerifiedAt: { not: null }, roleAssignments: { some: { role: 'ADMIN', status: 'ACTIVE' } } },
      select: { id: true, personId: true } }) : null;
  }

  private async ownerScope(tx: Prisma.TransactionClient, accountId: string, organizationId: string) {
    if (![accountId, organizationId].every(identifier)) throw new BadRequestException('Financial scope identifiers are invalid.');
    const owner = await this.platformOwner(tx);
    if (!owner || owner.id !== accountId) throw new ForbiddenException('Active verified platform owner authority is required.');
    const organization = await tx.organization.findFirst({ where: { id: organizationId, status: 'ACTIVE' }, select: { id: true } });
    const centers = organization ? await tx.orgUnit.findMany({ where: { organizationId, type: 'CENTER', active: true }, select: { id: true }, take: 2 }) : [];
    if (!organization || centers.length !== 1) throw new NotFoundException('One active supplying center is required.');
    return { organizationId, owner };
  }

  private latestAllocationDecision(tx: Prisma.TransactionClient, bookingId: string) {
    return tx.auditEvent.findFirst({ where: { resource: 'Booking', resourceId: bookingId,
      action: { in: ['CENTER_SERVICE_ALLOCATION_APPROVED', 'CENTER_SERVICE_ALLOCATION_REVOKED'] }, occurredAt: { lte: new Date() },
    }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] });
  }

  private async lockBooking(tx: Prisma.TransactionClient, organizationId: string, bookingId: string) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`center-service-entitlement:${organizationId}:${bookingId}`},0))`;
  }

  private async nextDecisionAt(tx: Prisma.TransactionClient, bookingId: string) {
    const previous = (await this.latestAllocationDecision(tx, bookingId))?.occurredAt.getTime() ?? 0;
    // Audit timestamps have millisecond precision through Prisma. Distinct
    // owner decisions must not depend on the lexical order of random IDs.
    if (Date.now() <= previous) await new Promise(resolve => setTimeout(resolve, 2));
    const occurredAt = new Date();
    if (occurredAt.getTime() <= previous) throw new ConflictException('The decision clock changed. Review the current allocation again.');
    return occurredAt;
  }

  private async scope(tx: Prisma.TransactionClient, accountId: string, centerOrgUnitId: string) {
    if (![accountId, centerOrgUnitId].every(identifier)) throw new BadRequestException('Financial scope identifiers are invalid.');
    const scope = await this.access.requireBranchAccountant(accountId, centerOrgUnitId, tx);
    await this.access.requireCenterOrganizationAccountant(accountId, scope.organizationId, tx);
    if (!await tx.organization.findFirst({ where: { id: scope.organizationId, status: 'ACTIVE' }, select: { id: true } })) {
      throw new NotFoundException('Active supplying center is required.');
    }
    return scope;
  }

  private async allocation(tx: Prisma.TransactionClient, bookingId: string, evidenceId?: string): Promise<CenterTripEntitlementInput['allocation']> {
    const event = await this.latestAllocationDecision(tx, bookingId);
    const value = object(event?.metadata);
    if (!event || !value || event.action !== 'CENTER_SERVICE_ALLOCATION_APPROVED' || (evidenceId && event.id !== evidenceId)) return null;
    const owner = await this.platformOwner(tx);
    return {
      evidenceId: event.id, ownerVerified: Boolean(owner && event.actorId === owner.personId && value.approvedByAccountId === owner.id),
      organizationId: value.organizationId as string, bookingId: value.bookingId as string, paymentId: value.paymentId as string,
      completionEventId: value.completionEventId as string, contractHash: value.contractHash as string,
      currency: value.currency as string, grossAmountMinor: value.grossAmountMinor as number,
      commissionAmountMinor: value.commissionAmountMinor as number, otherDeductionsMinor: value.otherDeductionsMinor as number,
      netAmountMinor: value.netAmountMinor as number, financeAccountId: value.financeAccountId as string,
      occurredAt: event.occurredAt.toISOString(), participantIds: value.participantIds, completedParticipantIds: value.completedParticipantIds,
      allocationEvidenceHash: value.allocationEvidenceHash as string,
    };
  }

  private async resolve(tx: Prisma.TransactionClient, scope: Pick<FinanceEmploymentScope, 'organizationId'>, bookingId: string, allocationEvidenceId?: string) {
    if (!identifier(bookingId)) throw new BadRequestException('Booking identifier is invalid.');
    const booking = await tx.booking.findFirst({ where: { id: bookingId, trip: { organizationId: scope.organizationId } },
      include: { trip: true, participants: { select: { id: true } } } });
    if (!booking) throw new NotFoundException('Booking not found in the supplying center.');
    const payments = await tx.payment.findMany({ where: { bookingId, accountId: booking.accountId, status: { in: ['CAPTURED', 'REFUNDED'] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 2 });
    const payment = payments.length === 1 ? payments[0] : null;
    const pendingRefund = payment ? await tx.commerceRefundOperation.findFirst({ where: { paymentId: payment.id, status: { in: PENDING_REFUNDS } }, select: { id: true } }) : null;
    const entries = payment ? await tx.financeEntry.findMany({ where: { organizationId: scope.organizationId,
      referenceType: 'TRIP_PAYMENT_COLLECTION', referenceId: payment.id, status: 'POSTED', type: 'REVENUE' },
      include: { financeAccount: true, approvals: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 2 }) : [];
    const entry = entries.length === 1 ? entries[0] : null;
    const completion = await tx.auditEvent.findFirst({ where: { resource: 'Trip', resourceId: booking.tripId,
      action: 'TRIP_COMPLETED', occurredAt: { lte: new Date() } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] });
    const completed = object(completion?.metadata);
    const allocation = await this.allocation(tx, bookingId, allocationEvidenceId);
    const settlements = await tx.financeEntry.findMany({ where: { organizationId: scope.organizationId,
      referenceType: SETTLEMENT_REFERENCE, referenceId: bookingId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 2 });
    const existing = settlements.length === 1 ? settlements[0] : null;
    const approvalAndPostingVerified = Boolean(entry?.approvedByAccountId && entry.approvedAt && entry.postedByAccountId && entry.postedAt
      && entry.createdAt <= entry.approvedAt && entry.postedAt >= entry.approvedAt && entry.postedAt <= new Date()
      && [entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId].every(identifier)
      && new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size === 3
      && entry.approvals.some(approval => approval.status === 'APPROVED' && approval.decidedByAccountId === entry.approvedByAccountId
        && approval.requestedByAccountId === entry.requestedByAccountId && approval.decidedAt && approval.createdAt <= approval.decidedAt
        && approval.decidedAt.getTime() === entry.approvedAt?.getTime()));
    const input: CenterTripEntitlementInput = {
      organizationId: scope.organizationId, booking, tripStatus: booking.trip.status,
      participantIds: booking.participants.map(participant => participant.id), payment,
      ambiguousPayment: payments.length > 1, pendingRefund: Boolean(pendingRefund),
      collection: entry ? { id: entry.id, organizationId: entry.organizationId, referenceType: entry.referenceType,
        referenceId: entry.referenceId, type: entry.type, status: entry.status, amountMinor: entry.amountMinor,
        currency: entry.currency, accountOrganizationId: entry.financeAccount.organizationId, accountCurrency: entry.financeAccount.currency,
        accountActive: entry.financeAccount.active, approvalAndPostingVerified } : null,
      ambiguousCollection: entries.length > 1,
      completion: completion ? { id: completion.id, tripId: completion.resourceId!, occurredAt: completion.occurredAt.toISOString(),
        attendedParticipantIds: completed?.attendedParticipantIds, absentParticipantIds: completed?.absentParticipantIds } : null,
      allocation, existingSettlement: existing, ambiguousSettlement: settlements.length > 1, observedAt: new Date().toISOString(),
    };
    return { input, readiness: evaluateCenterTripEntitlement(input), allocation, existing };
  }

  async readTrip(accountId: string, centerOrgUnitId: string, bookingId: string) {
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerOrgUnitId);
      return (await this.resolve(tx, scope, bookingId)).readiness;
    });
  }

  async readTripForOwner(accountId: string, organizationId: string, bookingId: string) {
    return this.db.serializable(async tx => {
      const scope = await this.ownerScope(tx, accountId, organizationId);
      return (await this.resolve(tx, scope, bookingId)).readiness;
    });
  }

  /** Records explicitly supplied allocation amounts; there is no default rate. */
  async approveTripAllocation(accountId: string, organizationId: string, bookingId: string, input: CenterTripAllocationApprovalInput) {
    if (!input || !identifier(bookingId) || !identifier(input.financeAccountId)
      || !minor(input.commissionAmountMinor) || !minor(input.otherDeductionsMinor)
      || typeof input.expectedEvidenceHash !== 'string' || !/^[0-9a-f]{64}$/.test(input.expectedEvidenceHash)
      || Object.keys(input).some(key => !['financeAccountId', 'commissionAmountMinor', 'otherDeductionsMinor', 'expectedEvidenceHash'].includes(key))) {
      throw new BadRequestException('Explicit allocation amounts and the current evidence hash are required.');
    }
    return this.db.serializable(async tx => {
      const scope = await this.ownerScope(tx, accountId, organizationId);
      await this.lockBooking(tx, organizationId, bookingId);
      const resolved = await this.resolve(tx, scope, bookingId);
      if (resolved.input.ambiguousSettlement || resolved.existing) throw new ConflictException('Existing settlement history requires reconciliation before a different allocation.');
      if (resolved.readiness.grossReadiness !== 'ELIGIBLE' || resolved.readiness.allocationEvidenceHash !== input.expectedEvidenceHash) {
        throw new ConflictException({ code: 'ALLOCATION_SOURCE_EVIDENCE_CHANGED', readiness: resolved.readiness });
      }
      const netAmountMinor = resolved.readiness.eligibleGrossAmountMinor - input.commissionAmountMinor - input.otherDeductionsMinor;
      if (!minor(netAmountMinor)) throw new BadRequestException('Allocation deductions exceed the completed and collected gross amount.');
      const account = await tx.financeAccount.findFirst({ where: { id: input.financeAccountId, organizationId, currency: 'SAR', active: true } });
      if (!account) throw new NotFoundException('Active supplying center ledger account is required.');
      if (resolved.allocation?.ownerVerified && resolved.readiness.netPayoutAmountMinor === netAmountMinor
        && resolved.allocation.financeAccountId === account.id && resolved.allocation.commissionAmountMinor === input.commissionAmountMinor
        && resolved.allocation.otherDeductionsMinor === input.otherDeductionsMinor) {
        return { ...resolved.readiness, alreadyApproved: true };
      }
      const attended = resolved.input.completion?.attendedParticipantIds;
      const event = await tx.auditEvent.create({ data: { actorId: scope.owner.personId, action: 'CENTER_SERVICE_ALLOCATION_APPROVED',
        resource: 'Booking', resourceId: bookingId, occurredAt: await this.nextDecisionAt(tx, bookingId), metadata: {
          approvedByAccountId: scope.owner.id, organizationId, bookingId, paymentId: resolved.readiness.paymentId,
          completionEventId: resolved.readiness.completionEventId, collectionFinanceEntryId: resolved.readiness.collectionFinanceEntryId,
          contractHash: resolved.readiness.contractHash, allocationEvidenceHash: resolved.readiness.allocationEvidenceHash,
          currency: 'SAR', grossAmountMinor: resolved.readiness.eligibleGrossAmountMinor,
          commissionAmountMinor: input.commissionAmountMinor, otherDeductionsMinor: input.otherDeductionsMinor, netAmountMinor,
          financeAccountId: account.id, participantIds: [...resolved.input.participantIds].sort(),
          completedParticipantIds: resolved.input.participantIds.filter(id => Array.isArray(attended) && attended.includes(id)).sort(),
          financialActionExecuted: false, bankTransferExecuted: false,
        } } });
      return { ...(await this.resolve(tx, scope, bookingId, event.id)).readiness, alreadyApproved: false };
    });
  }

  async revokeTripAllocation(accountId: string, organizationId: string, bookingId: string, input: CenterTripAllocationRevocationInput) {
    if (!input || ![bookingId, input.allocationApprovalEventId].every(identifier) || typeof input.reason !== 'string'
      || input.reason.trim().length < 5 || input.reason.trim().length > 1000
      || Object.keys(input).some(key => !['allocationApprovalEventId', 'reason'].includes(key))) {
      throw new BadRequestException('The current allocation and a review reason are required.');
    }
    return this.db.serializable(async tx => {
      const scope = await this.ownerScope(tx, accountId, organizationId);
      await this.lockBooking(tx, organizationId, bookingId);
      // Resolving first also binds the booking to this supplying organization.
      await this.resolve(tx, scope, bookingId);
      const latest = await this.latestAllocationDecision(tx, bookingId), value = object(latest?.metadata);
      if (latest?.action === 'CENTER_SERVICE_ALLOCATION_REVOKED' && latest.actorId === scope.owner.personId
        && value?.allocationApprovalEventId === input.allocationApprovalEventId && value?.reason === input.reason.trim()) {
        return { ...(await this.resolve(tx, scope, bookingId)).readiness, revocationEventId: latest.id, alreadyRevoked: true };
      }
      if (!latest || latest.action !== 'CENTER_SERVICE_ALLOCATION_APPROVED' || latest.id !== input.allocationApprovalEventId) {
        throw new ConflictException('Allocation decision changed. Review the current decision.');
      }
      const event = await tx.auditEvent.create({ data: { actorId: scope.owner.personId, action: 'CENTER_SERVICE_ALLOCATION_REVOKED',
        resource: 'Booking', resourceId: bookingId, occurredAt: await this.nextDecisionAt(tx, bookingId), metadata: { approvedByAccountId: scope.owner.id,
          organizationId, bookingId, allocationApprovalEventId: latest.id, reason: input.reason.trim(),
          financialActionExecuted: false, bankTransferExecuted: false } } });
      return { ...(await this.resolve(tx, scope, bookingId)).readiness, revocationEventId: event.id, alreadyRevoked: false };
    });
  }

  /** Creates only the existing ledger's approval draft. It never sends a bank transfer. */
  async prepareTrip(accountId: string, centerOrgUnitId: string, bookingId: string,
    input: { financeAccountId: string; allocationApprovalEventId: string }) {
    if (!input || ![bookingId, input.financeAccountId, input.allocationApprovalEventId].every(identifier)
      || Object.keys(input).some(key => !['financeAccountId', 'allocationApprovalEventId'].includes(key))) {
      throw new BadRequestException('Settlement preparation identifiers are invalid.');
    }
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerOrgUnitId);
      // One booking lock is stronger than a per-completion lock: duplicated or
      // corrected completion events cannot silently prepare another entitlement.
      await this.lockBooking(tx, scope.organizationId, bookingId);
      const resolved = await this.resolve(tx, scope, bookingId, input.allocationApprovalEventId);
      if (resolved.input.ambiguousSettlement) throw new ConflictException({ code: 'SETTLEMENT_HISTORY_REQUIRES_RECONCILIATION', readiness: resolved.readiness });
      if (resolved.existing) {
        const original = await tx.auditEvent.findFirst({ where: { action: 'CENTER_SERVICE_SETTLEMENT_PREPARED', resource: 'FinanceEntry', resourceId: resolved.existing.id } });
        const proof = object(original?.metadata);
        if (!proof || proof.paymentId !== resolved.readiness.paymentId || proof.allocationApprovalEventId !== input.allocationApprovalEventId
          || resolved.existing.financeAccountId !== input.financeAccountId) throw new ConflictException('Existing settlement belongs to different source evidence and requires reconciliation.');
        return { ...resolved.readiness, alreadyPrepared: true, financialActionExecuted: false, bankTransferExecuted: false };
      }
      if (!resolved.readiness.canPrepareSettlement || resolved.readiness.netPayoutAmountMinor === null
        || resolved.allocation?.financeAccountId !== input.financeAccountId) throw new ConflictException({ code: 'CENTER_ENTITLEMENT_REVIEW_REQUIRED', readiness: resolved.readiness });
      const account = await tx.financeAccount.findFirst({ where: { id: input.financeAccountId, organizationId: scope.organizationId, currency: 'SAR', active: true } });
      if (!account) throw new NotFoundException('Active center settlement ledger account is required.');
      const entry = await tx.financeEntry.create({ data: {
        organizationId: scope.organizationId, financeAccountId: account.id, type: 'SETTLEMENT', status: 'PENDING_APPROVAL',
        amountMinor: resolved.readiness.netPayoutAmountMinor, currency: 'SAR', referenceType: SETTLEMENT_REFERENCE,
        referenceId: bookingId, description: 'مستحق خدمة منفذة ومحصلّة؛ مسودة اعتماد دون تحويل بنكي.', requestedByAccountId: accountId,
      } });
      await tx.financeApproval.create({ data: { financeEntryId: entry.id, requestedByAccountId: accountId } });
      const actor = await tx.account.findUniqueOrThrow({ where: { id: accountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'CENTER_SERVICE_SETTLEMENT_PREPARED', resource: 'FinanceEntry', resourceId: entry.id,
        metadata: { organizationId: scope.organizationId, bookingId, paymentId: resolved.readiness.paymentId,
          completionEventId: resolved.readiness.completionEventId, collectionFinanceEntryId: resolved.readiness.collectionFinanceEntryId,
          allocationApprovalEventId: input.allocationApprovalEventId, contractHash: resolved.readiness.contractHash,
          grossAmountMinor: resolved.readiness.eligibleGrossAmountMinor, completedQuantity: resolved.readiness.completedQuantity,
          participantIds: resolved.input.participantIds,
          completedParticipantIds: resolved.input.participantIds.filter(id => Array.isArray(resolved.input.completion?.attendedParticipantIds)
            && resolved.input.completion.attendedParticipantIds.includes(id)),
          commissionAmountMinor: resolved.readiness.commissionAmountMinor, otherDeductionsMinor: resolved.readiness.otherDeductionsMinor,
          netAmountMinor: entry.amountMinor, currency: entry.currency, financialActionExecuted: false, bankTransferExecuted: false } } });
      return { ...resolved.readiness, canPrepareSettlement: false, payoutReadiness: 'ALREADY_PREPARED' as const,
        settlementFinanceEntryId: entry.id, settlementLedgerStatus: entry.status, alreadyPrepared: false,
        financialActionExecuted: false, bankTransferExecuted: false };
    });
  }
}
