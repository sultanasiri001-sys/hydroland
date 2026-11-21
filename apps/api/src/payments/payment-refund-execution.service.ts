import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommerceRefundOperation, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { platformOrganization } from '../hr/staffing-catalog';
import { DatabaseService } from '../database/database.service';
import { contractHash, PaymentContractService } from '../commerce/payment-contract.service';
import { MoyasarPayment, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';

const object = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
const text = (value: unknown) => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
type RefundInput = { paymentId: string; requestAuditEventId: string; financeEntryId: string; idempotencyKey: string };

@Injectable()
export class PaymentRefundExecutionService {
  constructor(private readonly db: DatabaseService, private readonly provider: MoyasarPaymentProviderService, private readonly contracts: PaymentContractService) {}

  private result(row: CommerceRefundOperation) {
    const uncertain = ['DISPATCHED', 'RECONCILIATION_REQUIRED'].includes(row.status);
    return { id: row.id, paymentId: row.paymentId, amountMinor: row.amountMinor, currency: row.currency, status: row.status,
      financialActionExecuted: row.status === 'SUCCEEDED' ? true : uncertain ? null : false,
      financialOutcome: row.status === 'SUCCEEDED' ? 'CONFIRMED' : uncertain ? 'UNKNOWN' : 'NOT_EXECUTED', provider: 'MOYASAR',
      providerPaymentReference: row.status === 'SUCCEEDED' ? row.providerPaymentId : null,
      // Moyasar returns the original payment ID, not a distinct refund reference.
      financeEntryId: row.financeEntryId, confirmedAt: row.confirmedAt, automaticResendAllowed: false };
  }

  private async mandate(tx: Prisma.TransactionClient, accountId: string, organizationId: string, operation: string, amountMinor: number, currency: string) {
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

  private async approval(tx: Prisma.TransactionClient, entryId: string, paymentId: string, organizationId: string, actorId: string, amountMinor?: number) {
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${entryId} FOR UPDATE`;
    const entry = await tx.financeEntry.findUnique({ where: { id: entryId }, include: { financeAccount: true, approvals: true } });
    if (!entry || entry.status !== 'APPROVED' || entry.type !== 'REFUND' || entry.referenceType !== 'PAYMENT_REFUND' || entry.referenceId !== paymentId
      || entry.organizationId !== organizationId || entry.financeAccount.organizationId !== organizationId || !entry.financeAccount.active
      || entry.currency !== 'SAR' || entry.financeAccount.currency !== entry.currency || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0
      || (amountMinor !== undefined && entry.amountMinor !== amountMinor) || !entry.approvedByAccountId || !entry.approvedAt) {
      throw new ConflictException('A matching approved refund in the existing financial ledger is required.');
    }
    if (new Set([entry.requestedByAccountId, entry.approvedByAccountId, actorId]).size !== 3) throw new ForbiddenException('Refund preparation, approval and execution require separate actors.');
    if (!entry.approvals.some(row => row.status === 'APPROVED' && row.decidedByAccountId === entry.approvedByAccountId && row.requestedByAccountId === entry.requestedByAccountId && row.decidedAt?.getTime() === entry.approvedAt!.getTime())) throw new ConflictException('Refund approval evidence is missing.');
    await this.mandate(tx, entry.approvedByAccountId, organizationId, 'APPROVE_REFUND', entry.amountMinor, entry.currency);
    await this.mandate(tx, actorId, organizationId, 'EXECUTE_REFUND', entry.amountMinor, entry.currency);
    return entry;
  }

  async execute(actorId: string, input: RefundInput) {
    if (!input || ![actorId, input.paymentId, input.requestAuditEventId, input.financeEntryId, input.idempotencyKey].every(text)) throw new BadRequestException('Refund identifiers are invalid.');
    const fingerprint = createHash('sha256').update(JSON.stringify({ actorId, paymentId: input.paymentId, requestAuditEventId: input.requestAuditEventId, financeEntryId: input.financeEntryId, idempotencyKey: input.idempotencyKey })).digest('hex');
    const prepared = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`commerce-refund:${input.idempotencyKey}`},0))`;
      const prior = await tx.commerceRefundOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (prior) {
        if (prior.requestFingerprint !== fingerprint || prior.executedByAccountId !== actorId) throw new ConflictException('Refund idempotency key is already bound to different details.');
        await this.mandate(tx, actorId, prior.organizationId, 'EXECUTE_REFUND', prior.amountMinor, prior.currency);
        return prior;
      }
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${input.paymentId} FOR UPDATE`;
      const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { booking: { include: { trip: true } } } });
      if (!payment) throw new NotFoundException('Payment not found.');
      const organizationId = payment.booking.trip.organizationId;
      if (!organizationId || payment.status !== 'CAPTURED' || !payment.providerReference || !payment.moyasarPaymentId) throw new ConflictException('A captured center payment with verified provider references is required.');
      const entry = await this.approval(tx, input.financeEntryId, payment.id, organizationId, actorId);
      const request = await tx.auditEvent.findFirst({ where: { id: input.requestAuditEventId, action: 'PAYMENT_REFUND_REQUESTED', resource: 'Payment', resourceId: payment.id } });
      const requestData = object(request?.metadata);
      if (!request || requestData?.accountId !== payment.accountId || requestData?.bookingId !== payment.bookingId || requestData?.currency !== payment.currency
        || !Number.isSafeInteger(requestData?.requestedAmountMinor) || requestData.requestedAmountMinor <= 0
        || requestData.requestedAmountMinor > payment.amountMinor || entry.amountMinor > requestData.requestedAmountMinor) throw new ConflictException('A matching original customer refund request is required.');
      // The customer request is a total authorization, not a fresh allowance
      // for every independently approved ledger entry. The payment row lock
      // serializes this cumulative cap with every other reservation.
      const requestedOperations = await tx.commerceRefundOperation.aggregate({
        where: { paymentId: payment.id, requestAuditEventId: request.id,
          status: { in: ['SUCCEEDED', 'RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'] } },
        _sum: { amountMinor: true },
      });
      const alreadyRequested = requestedOperations._sum.amountMinor ?? 0;
      if (!Number.isSafeInteger(alreadyRequested) || alreadyRequested < 0
        || entry.amountMinor > requestData.requestedAmountMinor - alreadyRequested) {
        throw new ConflictException({ code: 'PAYMENT_REFUND_REQUEST_LIMIT_EXCEEDED',
          message: 'Refund operations cannot exceed the amount in the original customer request.' });
      }
      const pending = await tx.commerceRefundOperation.findFirst({ where: { paymentId: payment.id, status: { in: ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'] } } });
      if (pending) throw new ConflictException({ code: 'PAYMENT_REFUND_RECONCILIATION_PENDING', message: 'An earlier refund is pending or needs reconciliation. It must not be sent again.' });
      const decision = await this.contracts.refundDecision(payment, request.occurredAt, tx);
      if (decision.status !== 'ELIGIBLE' || typeof decision.refundAmountMinor !== 'number' || entry.amountMinor > decision.refundAmountMinor) throw new ConflictException({ code: 'PAYMENT_REFUND_POLICY_REVIEW_REQUIRED', decision });
      if (entry.amountMinor + payment.refundedAmountMinor > payment.amountMinor) throw new ConflictException('Refund exceeds collected funds.');
      const row = await tx.commerceRefundOperation.create({ data: {
        paymentId: payment.id, financeEntryId: entry.id, requestAuditEventId: request.id, idempotencyKey: input.idempotencyKey, requestFingerprint: fingerprint,
        organizationId, requestedByAccountId: entry.requestedByAccountId, approvedByAccountId: entry.approvedByAccountId!, executedByAccountId: actorId,
        amountMinor: entry.amountMinor, currency: payment.currency, baselineRefundedMinor: payment.refundedAmountMinor,
        providerPaymentId: payment.moyasarPaymentId, providerInvoiceId: payment.providerReference, policyDecision: { ...decision, paymentBinding: { accountId: payment.accountId, bookingId: payment.bookingId, amountMinor: payment.amountMinor, currency: payment.currency, contractHash: contractHash(payment.contractSnapshot) } } as Prisma.InputJsonValue,
      } });
      await tx.auditEvent.create({ data: { action: 'PAYMENT_REFUND_RESERVED', resource: 'CommerceRefundOperation', resourceId: row.id,
        metadata: { paymentId: payment.id, financeEntryId: entry.id, actorAccountId: actorId, amountMinor: row.amountMinor, currency: row.currency, financialActionExecuted: false } } });
      return row;
    });
    if (prepared.status !== 'RESERVED') return this.result(prepared);

    const dispatched = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${prepared.paymentId} FOR UPDATE`;
      const current = await tx.commerceRefundOperation.findUniqueOrThrow({ where: { id: prepared.id } });
      if (current.status !== 'RESERVED') return null;
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: current.paymentId } });
      if (payment.status !== 'CAPTURED' || payment.refundedAmountMinor !== current.baselineRefundedMinor || payment.moyasarPaymentId !== current.providerPaymentId || payment.providerReference !== current.providerInvoiceId) throw new ConflictException('Payment changed before refund dispatch.');
      await this.approval(tx, current.financeEntryId, current.paymentId, current.organizationId, actorId, current.amountMinor);
      return tx.commerceRefundOperation.update({ where: { id: current.id }, data: { status: 'DISPATCHED', dispatchedAt: new Date() } });
    });
    if (!dispatched) return this.result(await this.db.commerceRefundOperation.findUniqueOrThrow({ where: { id: prepared.id } }));
    const payment = await this.db.payment.findUniqueOrThrow({ where: { id: dispatched.paymentId } });
    // This POST is intentionally outside every retried database transaction.
    try {
      const observed = await this.provider.refundPayment({ providerPaymentId: dispatched.providerPaymentId, invoiceId: dispatched.providerInvoiceId,
        amountMinor: payment.amountMinor, currency: dispatched.currency, refundAmountMinor: dispatched.amountMinor, expectedRefundedMinor: dispatched.baselineRefundedMinor });
      await this.db.commerceRefundOperation.update({ where: { id: dispatched.id }, data: { providerResult: { source: 'REFUND_POST_RESPONSE', payment: observed } as Prisma.InputJsonValue } });
      return this.result(await this.finalize(dispatched.id, observed));
    } catch {
      const current = await this.db.commerceRefundOperation.findUniqueOrThrow({ where: { id: dispatched.id } });
      if (current.status === 'SUCCEEDED') return this.result(current);
      await this.db.commerceRefundOperation.updateMany({ where: { id: current.id, status: { in: ['DISPATCHED', 'RECONCILIATION_REQUIRED'] } }, data: { status: 'RECONCILIATION_REQUIRED' } });
      const held = await this.db.commerceRefundOperation.findUniqueOrThrow({ where: { id: current.id } });
      if (held.status === 'SUCCEEDED') return this.result(held);
      await this.db.auditEvent.create({ data: { action: 'PAYMENT_REFUND_RECONCILIATION_REQUIRED', resource: 'CommerceRefundOperation', resourceId: held.id,
        metadata: { paymentId: held.paymentId, financeEntryId: held.financeEntryId, automaticResendAllowed: false } } });
      return this.result(held);
    }
  }

  private async finalize(id: string, observed: MoyasarPayment) {
    return this.db.serializable(async tx => {
      const operation = await tx.commerceRefundOperation.findUniqueOrThrow({ where: { id } });
      if (operation.status === 'SUCCEEDED') return operation;
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${operation.paymentId} FOR UPDATE`;
      const freshOperation = await tx.commerceRefundOperation.findUniqueOrThrow({ where: { id } });
      if (freshOperation.status === 'SUCCEEDED') return freshOperation;
      if(!['DISPATCHED','RECONCILIATION_REQUIRED'].includes(freshOperation.status)||!freshOperation.dispatchedAt)throw new ConflictException('Refund was not dispatched.');
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: operation.paymentId } });
      const binding = object(object(operation.policyDecision)?.paymentBinding);
      if (!binding || binding.accountId !== payment.accountId || binding.bookingId !== payment.bookingId || binding.amountMinor !== payment.amountMinor || binding.currency !== payment.currency
        || binding.contractHash !== contractHash(payment.contractSnapshot) || payment.providerReference !== operation.providerInvoiceId || payment.moyasarPaymentId !== operation.providerPaymentId) throw new ConflictException('Original payment binding changed after dispatch.');
      if (observed.id !== operation.providerPaymentId || observed.invoiceId !== operation.providerInvoiceId || observed.amountMinor !== payment.amountMinor
        || observed.currency !== operation.currency || observed.refundedMinor !== operation.baselineRefundedMinor + operation.amountMinor
        || observed.refundedMinor > observed.capturedMinor || payment.refundedAmountMinor !== operation.baselineRefundedMinor) throw new ConflictException('Refund evidence changed during posting.');
      await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${operation.financeEntryId} FOR UPDATE`;
      const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id: operation.financeEntryId } });
      if (entry.status !== 'APPROVED' || entry.type !== 'REFUND' || entry.referenceType !== 'PAYMENT_REFUND' || entry.referenceId !== operation.paymentId || entry.organizationId !== operation.organizationId
        || entry.requestedByAccountId !== operation.requestedByAccountId || entry.amountMinor !== operation.amountMinor || entry.currency !== operation.currency || entry.approvedByAccountId !== operation.approvedByAccountId) throw new ConflictException('Approved ledger entry changed after dispatch.');
      await tx.payment.update({ where: { id: payment.id }, data: { refundedAmountMinor: observed.refundedMinor, status: observed.refundedMinor === payment.amountMinor ? 'REFUNDED' : 'CAPTURED' } });
      const now = new Date();
      await tx.financeEntry.update({ where: { id: entry.id }, data: { status: 'POSTED', postedAt: now, postedByAccountId: operation.executedByAccountId } });
      const saved = await tx.commerceRefundOperation.update({ where: { id }, data: { status: 'SUCCEEDED', confirmedAt: now, resultingRefundedMinor: observed.refundedMinor } });
      const actor = await tx.account.findUniqueOrThrow({ where: { id: operation.executedByAccountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'PAYMENT_REFUND_POSTED', resource: 'CommerceRefundOperation', resourceId: id,
        metadata: { paymentId: payment.id, financeEntryId: entry.id, providerPaymentId: observed.id, baselineRefundedMinor: operation.baselineRefundedMinor,
          resultingRefundedMinor: observed.refundedMinor, amountMinor: operation.amountMinor, currency: operation.currency, providerVerified: true } } });
      return saved;
    });
  }

  async reconcile(actorId: string, id: string) {
    const operation = await this.db.commerceRefundOperation.findUnique({ where: { id } });
    if (!operation) throw new NotFoundException('Refund operation not found.');
    await this.db.serializable(tx => this.mandate(tx, actorId, operation.organizationId, 'EXECUTE_REFUND', operation.amountMinor, operation.currency));
    if (operation.status === 'SUCCEEDED') return this.result(operation);
    const proof = object(operation.providerResult);
    if (proof?.source === 'REFUND_POST_RESPONSE' && object(proof.payment)) return this.result(await this.finalize(operation.id, proof.payment as MoyasarPayment));
    const payment = await this.db.payment.findUniqueOrThrow({ where: { id: operation.paymentId } });
    const observed = await this.provider.fetchPayment(operation.providerPaymentId, { invoiceId: operation.providerInvoiceId, amountMinor: payment.amountMinor, currency: operation.currency });
    // A GET total alone cannot attribute a dashboard refund to this operation.
    // Record the observation without releasing/resending/posting the uncertain request.
    await this.db.auditEvent.create({ data: { action: 'PAYMENT_REFUND_RECONCILIATION_OBSERVED', resource: 'CommerceRefundOperation', resourceId: operation.id,
      metadata: { actorAccountId: actorId, providerPaymentId: observed.id, observedRefundedMinor: observed.refundedMinor, expectedRefundedMinor: operation.baselineRefundedMinor + operation.amountMinor, attribution: 'REVIEW_REQUIRED', automaticResendAllowed: false } } });
    return { ...this.result(operation), observedRefundedMinor: observed.refundedMinor, reconciliation: 'ATTRIBUTION_REVIEW_REQUIRED' };
  }
}
