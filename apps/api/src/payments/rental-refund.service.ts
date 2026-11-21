import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RentalRefundOperation } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { requireFinancialOperationMandate } from '../finance/finance-operation-mandate';
import { CommerceRefundCause, CommerceRefundEvidence, CommerceRefundPolicySnapshot, evaluateCommerceRefund } from '../commerce/commerce-refund-policy';
import { RentalContractLine, RentalContractRecord, rentalCanonicalJson, rentalContractHash, rentalObject, requireAcceptedRentalContract, requireRentalContract } from '../commerce/rental-contract';
import { requirePostedRentalCollection } from '../commerce/rental-collection-ledger';
import { MoyasarPayment, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';

type Rental = RentalContractRecord & { status: string; paymentStatus: string };
type RefundRequestInput = { idempotencyKey: string; requestedAmountMinor: number; cause: CommerceRefundCause; reason: string };
type RefundExecutionInput = { requestId: string; financeEntryId: string; idempotencyKey: string };
const pendingStates = ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'];
const sourceType = 'EQUIPMENT_RENTAL';
const json = (value: unknown) => value as Prisma.InputJsonObject;
const canonicalText = (value: unknown, max = 200): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;
const requestUuid = (accountId: string, key: string) => {
  const hash = createHash('sha256').update(JSON.stringify(['rental-refund-request-v1', accountId, key])).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

@Injectable()
export class RentalRefundService {
  private readonly access: FinanceAccessService;
  constructor(private readonly db: DatabaseService, private readonly provider: MoyasarPaymentProviderService) {
    this.access = new FinanceAccessService(db);
  }

  private async binding(tx: Prisma.TransactionClient, rentalId: string, customerAccountId?: string, postingRefundedMinor?: number) {
    // The same lock is used by checkout refresh, cancellation and equipment handover.
    const [rental] = await tx.$queryRaw<Rental[]>`SELECT * FROM "EquipmentRental" WHERE "id"=${rentalId} FOR UPDATE`;
    if (!rental || customerAccountId && rental.renterAccountId !== customerAccountId) throw new NotFoundException('Rental not found.');
    // Suspension can deny a new request or dispatch, but cannot erase the
    // customer's original identity or prevent accounting for money already
    // moved by our dispatched POST. Posting/recovery still verifies the exact
    // immutable source and POST proof; reconciliation separately checks its
    // caller's active financial mandate.
    const customer = await tx.account.findFirst({ where: { id: rental.renterAccountId,
      ...(postingRefundedMinor === undefined ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, personId: true } });
    if (!customer) throw new ConflictException('The original rental customer requires review.');
    const lines = await tx.$queryRaw<Array<RentalContractLine & { handedOverAt: Date | null; returnedAt: Date | null }>>`
      SELECT i.*, b."organizationId"::text AS "organizationId" FROM "EquipmentRentalItem" i
      JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId" WHERE i."rentalId"=${rentalId} ORDER BY i."resourceId" FOR UPDATE OF b`;
    const original = requireRentalContract(rental, lines);
    const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId: rentalId } } });
    const evidence = await tx.commerceCollectionEvidence.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId: rentalId } } });
    if (!checkout || !evidence || checkout.provider !== 'MOYASAR' || evidence.provider !== 'MOYASAR'
      || checkout.customerAccountId !== customer.id || evidence.customerAccountId !== customer.id
      || checkout.organizationId !== original.organizationId || evidence.organizationId !== original.organizationId
      || checkout.amountMinor !== original.amountMinor || evidence.amountMinor !== original.amountMinor
      || checkout.currency !== 'SAR' || evidence.currency !== 'SAR' || evidence.providerCapturedMinor !== original.amountMinor
      || !checkout.providerPaymentId || !checkout.providerInvoiceId || checkout.providerPaymentId !== evidence.providerPaymentId
      || checkout.providerInvoiceId !== evidence.providerInvoiceId || evidence.providerRefundedMinor < 0
      || evidence.providerRefundedMinor > evidence.amountMinor || rentalCanonicalJson(checkout.contractSnapshot) !== rentalCanonicalJson(evidence.contractSnapshot)) {
      throw new ConflictException('A source-bound rental collection and original accepted terms are required.');
    }
    requireAcceptedRentalContract(original, checkout.contractSnapshot, evidence.providerVerifiedAt);
    const observed = rentalObject(rentalObject(checkout.providerResult).payment), saved = rentalObject(evidence.providerSnapshot);
    const metadata = rentalObject(saved.invoiceMetadata);
    if (observed.id !== checkout.providerPaymentId || observed.invoiceId !== checkout.providerInvoiceId || observed.amountMinor !== checkout.amountMinor
      || observed.currency !== 'SAR' || observed.capturedMinor !== checkout.amountMinor
      || observed.refundedMinor !== evidence.providerRefundedMinor && observed.refundedMinor !== postingRefundedMinor
      || saved.id !== checkout.providerPaymentId || saved.invoiceId !== checkout.providerInvoiceId || saved.amountMinor !== checkout.amountMinor
      || saved.currency !== 'SAR' || saved.capturedMinor !== checkout.amountMinor || saved.refundedMinor !== evidence.providerRefundedMinor
      || !['paid', 'captured', 'refunded'].includes(saved.status) || !['paid', 'captured', 'refunded'].includes(observed.status)
      || metadata.hydroland_checkout_id !== checkout.id || metadata.hydroland_source_type !== sourceType || metadata.hydroland_source_id !== rentalId
      || metadata.hydroland_customer_account_id !== customer.id || metadata.hydroland_organization_id !== original.organizationId) {
      throw new ConflictException('Rental provider evidence or its cumulative balance requires reconciliation.');
    }
    await requirePostedRentalCollection(tx, { financeEntryId: evidence.financeEntryId, rentalId, organizationId: evidence.organizationId, amountMinor: evidence.amountMinor });
    return { rental, lines, original, customer, checkout, evidence };
  }

  private async decision(tx: Prisma.TransactionClient, binding: Awaited<ReturnType<RentalRefundService['binding']>>, request: { occurredAt: Date; metadata: unknown }, excludeOperationId?: string) {
    const { rental, lines, original, evidence } = binding, data = rentalObject(request.metadata);
    const handedOver = lines.map(row => row.handedOverAt).filter((date): date is Date => !!date).sort((a, b) => a.getTime() - b.getTime());
    const facts: CommerceRefundEvidence = { lineId: rental.id, handoverAt: handedOver[0]?.toISOString() ?? null,
      consumption: handedOver.some(date => date <= request.occurredAt) ? 'CONSUMED' : 'NONE', statutoryClassification: 'UNKNOWN' };
    const classification = rentalObject((await tx.operationalSetting.findUnique({ where: { key: `commerce-legal-classification:RENTAL:${rental.id}` } }))?.value);
    if (classification.sourceId === rental.id && classification.sourceType === 'RENTAL' && canonicalText(classification.evidenceReference)
      && ['ELIGIBLE', 'EXEMPT'].includes(classification.classification)) {
      facts.statutoryClassification = classification.classification; facts.legalEvidenceReference = classification.evidenceReference;
      if (classification.exception) facts.statutoryException = classification.exception;
    }
    if (data.cause === 'PROVIDER_CANCELLATION') {
      const failure = await tx.auditEvent.findFirst({ where: { resource: 'EquipmentRental', resourceId: rental.id,
        action: 'RENTAL_PROVIDER_HANDOVER_FAILURE_CONFIRMED', occurredAt: { lte: request.occurredAt } }, orderBy: { occurredAt: 'desc' } });
      const failureData = rentalObject(failure?.metadata);
      if (failure && failureData.organizationId === evidence.organizationId && failureData.contractHash === rentalContractHash(binding.checkout.contractSnapshot)
        && canonicalText(failureData.evidenceReference)) {
        facts.providerFailureVerified = true; facts.providerEvidenceReference = failure.id;
      }
    }
    const pending = await tx.rentalRefundOperation.aggregate({ where: { rentalId: rental.id, status: { in: pendingStates },
      ...(excludeOperationId ? { id: { not: excludeOperationId } } : {}) }, _sum: { amountMinor: true } });
    return evaluateCommerceRefund({ snapshot: original.policySnapshot as CommerceRefundPolicySnapshot, requestedAt: request.occurredAt.toISOString(),
      evidenceAsOf: new Date().toISOString(), cause: data.cause, collectedAmountMinor: evidence.providerCapturedMinor,
      refundedAmountMinor: evidence.providerRefundedMinor, reservedRefundAmountMinor: pending._sum.amountMinor ?? 0, evidence: facts });
  }

  private requestBinding(request: { actorId: string | null; resource: string; resourceId: string | null; action: string; metadata: unknown }, binding: Awaited<ReturnType<RentalRefundService['binding']>>) {
    const data = rentalObject(request.metadata);
    if (request.action !== 'RENTAL_REFUND_REQUESTED' || request.resource !== 'EquipmentRental' || request.resourceId !== binding.rental.id
      || request.actorId !== binding.customer.personId || data.customerAccountId !== binding.customer.id || data.checkoutId !== binding.checkout.id
      || data.organizationId !== binding.checkout.organizationId || data.currency !== 'SAR' || data.contractHash !== rentalContractHash(binding.checkout.contractSnapshot)
      || !Number.isSafeInteger(data.requestedAmountMinor) || data.requestedAmountMinor <= 0 || data.requestedAmountMinor > binding.checkout.amountMinor) {
      throw new ConflictException('The original rental customer refund request does not match.');
    }
    return data;
  }

  async request(accountId: string, rentalId: string, input: RefundRequestInput) {
    if (!input || !canonicalText(input.idempotencyKey, 160) || !/^[A-Za-z0-9:_-]{8,160}$/.test(input.idempotencyKey)
      || !canonicalText(input.reason, 1000) || !Number.isSafeInteger(input.requestedAmountMinor) || input.requestedAmountMinor <= 0
      || !['CUSTOMER_CANCELLATION', 'PROVIDER_CANCELLATION', 'DEFECT', 'NON_CONFORMITY', 'WARRANTY'].includes(input.cause)) throw new BadRequestException('Refund request fields are invalid.');
    const id = requestUuid(accountId, input.idempotencyKey), fingerprint = rentalContractHash({ accountId, rentalId,
      idempotencyKey: input.idempotencyKey, requestedAmountMinor: input.requestedAmountMinor, cause: input.cause, reason: input.reason });
    const work = async (tx: Prisma.TransactionClient, recovering = false) => {
      const binding = await this.binding(tx, rentalId, accountId);
      const prior = await tx.auditEvent.findUnique({ where: { id } });
      if (prior) {
        const metadata = this.requestBinding(prior, binding);
        if (metadata.requestFingerprint !== fingerprint) throw new ConflictException('Refund request key is already bound to different details.');
        return { requestId: id, rentalId, requestedAmountMinor: metadata.requestedAmountMinor, currency: 'SAR', decision: await this.decision(tx, binding, prior),
          rentalStatus: binding.rental.status, cancellationRecorded: metadata.cancellationRecorded === true, financialActionExecuted: false };
      }
      if (recovering) throw new ConflictException('Refund request conflict could not be recovered.');
      if (input.requestedAmountMinor > binding.evidence.amountMinor - binding.evidence.providerRefundedMinor) throw new ConflictException('Requested refund exceeds the remaining collected amount.');
      const now = new Date(), beforeHandover = binding.lines.every(row => row.handedOverAt === null);
      const cancellationRecorded = beforeHandover && ['RESERVED', 'CANCELLED'].includes(binding.rental.status)
        && ['CUSTOMER_CANCELLATION', 'PROVIDER_CANCELLATION'].includes(input.cause);
      if (cancellationRecorded) {
        await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='CANCELLED',"updatedAt"=NOW() WHERE "id"=${rentalId}`;
        binding.rental.status = 'CANCELLED';
      }
      const request = await tx.auditEvent.create({ data: { id, actorId: binding.customer.personId, action: 'RENTAL_REFUND_REQUESTED', resource: 'EquipmentRental', resourceId: rentalId,
        occurredAt: now, metadata: { customerAccountId: accountId, checkoutId: binding.checkout.id, organizationId: binding.checkout.organizationId,
          requestedAmountMinor: input.requestedAmountMinor, currency: 'SAR', cause: input.cause, reason: input.reason,
          requestFingerprint: fingerprint, contractHash: rentalContractHash(binding.checkout.contractSnapshot), cancellationRecorded, financialActionExecuted: false } } });
      return { requestId: id, rentalId, requestedAmountMinor: input.requestedAmountMinor, currency: 'SAR', decision: await this.decision(tx, binding, request),
        rentalStatus: binding.rental.status, cancellationRecorded, financialActionExecuted: false };
    };
    return this.db.serializable(tx => work(tx)).catch(error => {
      if (error?.code !== 'P2002' || error?.meta?.modelName !== 'AuditEvent') throw error;
      return this.db.serializable(tx => work(tx, true));
    });
  }

  async requests(accountId: string, rentalId: string) {
    return this.db.serializable(async tx => {
      const [rental] = await tx.$queryRaw<Rental[]>`SELECT * FROM "EquipmentRental" WHERE "id"=${rentalId} AND "renterAccountId"=${accountId} FOR UPDATE`;
      const customer = await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE' }, select: { personId: true } });
      if (!rental || !customer) throw new NotFoundException('Rental not found.');
      // History remains visible to its owner when newer provider observations
      // need reconciliation. Financial execution still uses strict binding.
      let binding: Awaited<ReturnType<RentalRefundService['binding']>> | null = null;
      try { binding = await this.binding(tx, rentalId, accountId); }
      catch (error) { if (!(error instanceof ConflictException)) throw error; }
      const requests = await tx.auditEvent.findMany({ where: { actorId: customer.personId, resource: 'EquipmentRental', resourceId: rentalId,
        action: 'RENTAL_REFUND_REQUESTED' }, orderBy: { occurredAt: 'desc' }, take: 50 });
      const rows = [];
      for (const request of requests) {
        const metadata = binding ? this.requestBinding(request, binding) : rentalObject(request.metadata);
        if (metadata.customerAccountId !== accountId) continue;
        const operations = await tx.rentalRefundOperation.findMany({ where: { requestAuditEventId: request.id, rentalId }, orderBy: { createdAt: 'asc' } });
        rows.push({ requestId: request.id, requestedAt: request.occurredAt, requestedAmountMinor: metadata.requestedAmountMinor, currency: 'SAR',
          cause: metadata.cause, reason: metadata.reason,
          decision: binding ? await this.decision(tx, binding, request) : { status: 'REVIEW_REQUIRED', reasonCode: 'RENTAL_COLLECTION_RECONCILIATION_REQUIRED', refundAmountMinor: null },
          operations: operations.map(row => this.result(row)) });
      }
      return { rentalId, rentalStatus: rental.status, refundedAmountMinor: binding?.evidence.providerRefundedMinor ?? null, requests: rows };
    });
  }

  async confirmProviderFailure(accountId: string, rentalId: string, input: { evidenceReference: string; reason: string }) {
    if (!input || !canonicalText(input.evidenceReference) || !canonicalText(input.reason, 1000)) throw new BadRequestException('A handover failure evidence reference and reason are required.');
    return this.db.serializable(async tx => {
      const checkout = await tx.commerceCheckout.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId: rentalId } } });
      if (!checkout) throw new NotFoundException('Rental checkout not found.');
      try { await this.access.requireCenterOrganizationAccountant(accountId, checkout.organizationId, tx); }
      catch { throw new ForbiddenException('An active accountant for this rental center must confirm handover failure.'); }
      const binding = await this.binding(tx, rentalId);
      if (binding.lines.some(row => row.handedOverAt) || !['RESERVED', 'CANCELLED'].includes(binding.rental.status)) throw new ConflictException('Delivered equipment cannot be recorded as not handed over.');
      const actor = await tx.account.findFirst({ where: { id: accountId, status: 'ACTIVE' }, select: { personId: true } });
      if (!actor) throw new ForbiddenException('An active center accountant is required.');
      const event = await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'RENTAL_PROVIDER_HANDOVER_FAILURE_CONFIRMED', resource: 'EquipmentRental', resourceId: rentalId,
        metadata: { organizationId: binding.checkout.organizationId, evidenceReference: input.evidenceReference, reason: input.reason,
          contractHash: rentalContractHash(binding.checkout.contractSnapshot), financialActionExecuted: false } } });
      await tx.$executeRaw`UPDATE "EquipmentRental" SET "status"='CANCELLED',"updatedAt"=NOW() WHERE "id"=${rentalId}`;
      return { rentalId, evidenceId: event.id, financialActionExecuted: false };
    });
  }

  private result(row: RentalRefundOperation) {
    const uncertain = ['DISPATCHED', 'RECONCILIATION_REQUIRED'].includes(row.status);
    return { id: row.id, rentalId: row.rentalId, requestId: row.requestAuditEventId, amountMinor: row.amountMinor, currency: row.currency, status: row.status,
      financialActionExecuted: row.status === 'SUCCEEDED' ? true : uncertain ? null : false,
      financialOutcome: row.status === 'SUCCEEDED' ? 'CONFIRMED' : uncertain ? 'UNKNOWN' : 'NOT_EXECUTED',
      confirmedAt: row.confirmedAt, automaticResendAllowed: false };
  }

  private async approval(tx: Prisma.TransactionClient, entryId: string, rentalId: string, organizationId: string, executor: string, expectedAmount?: number) {
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${entryId} FOR UPDATE`;
    const entry = await tx.financeEntry.findUnique({ where: { id: entryId }, include: { financeAccount: true, approvals: true } });
    if (!entry || entry.status !== 'APPROVED' || entry.type !== 'REFUND' || entry.referenceType !== 'EQUIPMENT_RENTAL_REFUND' || entry.referenceId !== rentalId
      || entry.organizationId !== organizationId || entry.financeAccount.organizationId !== organizationId || !entry.financeAccount.active
      || entry.currency !== 'SAR' || entry.financeAccount.currency !== 'SAR' || !Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0
      || expectedAmount !== undefined && entry.amountMinor !== expectedAmount || !entry.approvedByAccountId || !entry.approvedAt
      || !entry.approvals.some(row => row.status === 'APPROVED' && row.decidedByAccountId === entry.approvedByAccountId
        && row.requestedByAccountId === entry.requestedByAccountId && row.decidedAt?.getTime() === entry.approvedAt!.getTime())) throw new ConflictException('A matching independently approved rental refund entry is required.');
    if (new Set([entry.requestedByAccountId, entry.approvedByAccountId, executor]).size !== 3) throw new ForbiddenException('Refund preparation, approval and execution require separate actors.');
    await requireFinancialOperationMandate(tx, entry.approvedByAccountId, organizationId, 'APPROVE_REFUND', entry.amountMinor, 'SAR');
    await requireFinancialOperationMandate(tx, executor, organizationId, 'EXECUTE_REFUND', entry.amountMinor, 'SAR');
    return entry;
  }

  private async replay(tx: Prisma.TransactionClient, prior: RentalRefundOperation, executor: string, rentalId: string, input: RefundExecutionInput, fingerprint: string) {
    if (prior.executedByAccountId !== executor || prior.rentalId !== rentalId || prior.requestAuditEventId !== input.requestId
      || prior.financeEntryId !== input.financeEntryId || prior.idempotencyKey !== input.idempotencyKey || prior.requestFingerprint !== fingerprint) throw new ConflictException('Refund operation key is already bound to different details.');
    // An exact replay of a cancelled, never-dispatched reservation is only a
    // receipt. Revoking its original executor must not turn that receipt into
    // another attempt or require restoring financial authority to read it.
    if (prior.status === 'CANCELLED') return prior;
    await requireFinancialOperationMandate(tx, executor, prior.organizationId, 'EXECUTE_REFUND', prior.amountMinor, prior.currency);
    return prior;
  }

  async cancelReservation(executor: string, rentalId: string, id: string, input: { reason: string }) {
    if (!input || !canonicalText(input.reason, 1000) || input.reason.length < 10) throw new BadRequestException('An explicit reservation cancellation reason is required.');
    return this.db.serializable(async tx => {
      // Dispatch acquires this same lock before it durably claims the POST.
      // Releasing a hold never needs to reinstate the original customer's or
      // executor's status, and never deletes/reassigns their financial journal.
      const rentals = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "EquipmentRental" WHERE "id"=${rentalId} FOR UPDATE`;
      const row = rentals.length ? await tx.rentalRefundOperation.findUnique({ where: { id } }) : null;
      if (!row || row.rentalId !== rentalId) throw new NotFoundException('Rental refund operation not found.');
      const actor = await requireFinancialOperationMandate(tx, executor, row.organizationId, 'EXECUTE_REFUND', row.amountMinor, row.currency);
      if (row.status === 'CANCELLED') return this.result(row);
      if (row.status !== 'RESERVED' || row.dispatchedAt !== null || row.providerResult !== null
        || row.confirmedAt !== null || row.resultingRefundedMinor !== null) throw new ConflictException('Only an undispatched refund reservation without provider proof can be cancelled.');
      const cancelled = await tx.rentalRefundOperation.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'RENTAL_REFUND_RESERVATION_CANCELLED', resource: 'RentalRefundOperation', resourceId: id,
        metadata: { rentalId, organizationId: row.organizationId, financeEntryId: row.financeEntryId, requestId: row.requestAuditEventId,
          originalExecutorAccountId: row.executedByAccountId, cancelledByAccountId: executor,
          amountMinor: row.amountMinor, currency: row.currency, reason: input.reason, financialActionExecuted: false,
          automaticResendAllowed: false, independentlyApprovedNewEntryRequired: true } } });
      return this.result(cancelled);
    });
  }

  async execute(executor: string, rentalId: string, input: RefundExecutionInput) {
    if (!input || ![executor, rentalId, input.requestId, input.financeEntryId, input.idempotencyKey].every(value => canonicalText(value))) throw new BadRequestException('Refund operation identifiers are invalid.');
    const fingerprint = rentalContractHash({ executor, rentalId, requestId: input.requestId, financeEntryId: input.financeEntryId, idempotencyKey: input.idempotencyKey });
    const prepared = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`rental-refund:${input.idempotencyKey}`},0))`;
      const prior = await tx.rentalRefundOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (prior) return this.replay(tx, prior, executor, rentalId, input, fingerprint);
      const binding = await this.binding(tx, rentalId);
      const entry = await this.approval(tx, input.financeEntryId, rentalId, binding.checkout.organizationId, executor);
      const request = await tx.auditEvent.findUnique({ where: { id: input.requestId } });
      if (!request) throw new ConflictException('An original customer request is required.');
      const data = this.requestBinding(request, binding);
      const cumulative = await tx.rentalRefundOperation.aggregate({ where: { rentalId, requestAuditEventId: request.id, status: { in: ['SUCCEEDED', ...pendingStates] } }, _sum: { amountMinor: true } });
      if (entry.amountMinor > data.requestedAmountMinor - (cumulative._sum.amountMinor ?? 0)) throw new ConflictException('Refund exceeds the original cumulative customer request.');
      if (await tx.rentalRefundOperation.findFirst({ where: { rentalId, status: { in: pendingStates } } })) throw new ConflictException('An earlier refund needs reconciliation before another operation.');
      const decision = await this.decision(tx, binding, request);
      if (decision.status !== 'ELIGIBLE' || decision.refundAmountMinor === null || entry.amountMinor > decision.refundAmountMinor
        || entry.amountMinor > binding.evidence.amountMinor - binding.evidence.providerRefundedMinor) throw new ConflictException({ code: 'RENTAL_REFUND_POLICY_REVIEW_REQUIRED', decision });
      if (binding.lines.some(row => row.handedOverAt) || binding.rental.status !== 'CANCELLED') throw new ConflictException('Automatic rental refunds require a recorded pre-handover cancellation.');
      const operation = await tx.rentalRefundOperation.create({ data: { checkoutId: binding.checkout.id, rentalId, collectionEvidenceId: binding.evidence.id,
        financeEntryId: entry.id, requestAuditEventId: request.id, idempotencyKey: input.idempotencyKey, requestFingerprint: fingerprint,
        organizationId: binding.checkout.organizationId, requestedByAccountId: entry.requestedByAccountId, approvedByAccountId: entry.approvedByAccountId!, executedByAccountId: executor,
        amountMinor: entry.amountMinor, currency: 'SAR', baselineRefundedMinor: binding.evidence.providerRefundedMinor,
        providerPaymentId: binding.evidence.providerPaymentId, providerInvoiceId: binding.evidence.providerInvoiceId,
        policyDecision: json({ ...decision, contractHash: rentalContractHash(binding.checkout.contractSnapshot), originalAmountMinor: binding.checkout.amountMinor,
          customerAccountId: binding.customer.id, collectionFinanceEntryId: binding.evidence.financeEntryId }) } });
      await tx.auditEvent.create({ data: { action: 'RENTAL_REFUND_RESERVED', resource: 'RentalRefundOperation', resourceId: operation.id,
        metadata: { rentalId, requestId: request.id, financeEntryId: entry.id, executorAccountId: executor, amountMinor: entry.amountMinor, currency: 'SAR', financialActionExecuted: false } } });
      return operation;
    }).catch(error => {
      const target = error?.meta?.target;
      if (error?.code !== 'P2002' || error?.meta?.modelName !== 'RentalRefundOperation' || !Array.isArray(target) || target.length !== 1 || !['idempotencyKey', 'financeEntryId'].includes(target[0])) throw error;
      return this.db.serializable(async tx => {
        const prior = await tx.rentalRefundOperation.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (!prior) throw new ConflictException('The refund entry is already reserved for another operation.');
        return this.replay(tx, prior, executor, rentalId, input, fingerprint);
      });
    });
    if (prepared.status !== 'RESERVED') return this.result(prepared);
    const dispatched = await this.db.serializable(async tx => {
      const binding = await this.binding(tx, rentalId);
      const row = await tx.rentalRefundOperation.findUniqueOrThrow({ where: { id: prepared.id } });
      if (row.status !== 'RESERVED') return null;
      this.originalBinding(row, binding);
      await this.approval(tx, row.financeEntryId, rentalId, row.organizationId, executor, row.amountMinor);
      const request = await tx.auditEvent.findUniqueOrThrow({ where: { id: row.requestAuditEventId } });
      this.requestBinding(request, binding);
      const decision = await this.decision(tx, binding, request, row.id);
      if (decision.status !== 'ELIGIBLE' || decision.refundAmountMinor === null || row.amountMinor > decision.refundAmountMinor
        || binding.lines.some(item => item.handedOverAt) || binding.rental.status !== 'CANCELLED') throw new ConflictException('Rental evidence changed before financial dispatch.');
      return tx.rentalRefundOperation.update({ where: { id: row.id }, data: { status: 'DISPATCHED', dispatchedAt: new Date() } });
    });
    if (!dispatched) return this.result(await this.db.rentalRefundOperation.findUniqueOrThrow({ where: { id: prepared.id } }));
    // Never repeat a provider POST after any committed dispatch, including a timeout.
    try {
      const observed = await this.provider.refundPayment({ providerPaymentId: dispatched.providerPaymentId, invoiceId: dispatched.providerInvoiceId,
        amountMinor: Number(rentalObject(dispatched.policyDecision).originalAmountMinor), currency: 'SAR', refundAmountMinor: dispatched.amountMinor,
        expectedRefundedMinor: dispatched.baselineRefundedMinor });
      await this.db.rentalRefundOperation.update({ where: { id: dispatched.id }, data: { providerResult: json({ source: 'REFUND_POST_RESPONSE', payment: observed }) } });
      return this.result(await this.finalize(dispatched.id, observed));
    } catch {
      await this.db.rentalRefundOperation.updateMany({ where: { id: dispatched.id, status: { in: ['DISPATCHED', 'RECONCILIATION_REQUIRED'] } }, data: { status: 'RECONCILIATION_REQUIRED' } });
      return this.result(await this.db.rentalRefundOperation.findUniqueOrThrow({ where: { id: dispatched.id } }));
    }
  }

  private originalBinding(operation: RentalRefundOperation, binding: Awaited<ReturnType<RentalRefundService['binding']>>) {
    const saved = rentalObject(operation.policyDecision);
    if (operation.rentalId !== binding.rental.id || operation.checkoutId !== binding.checkout.id || operation.collectionEvidenceId !== binding.evidence.id
      || operation.organizationId !== binding.checkout.organizationId || operation.providerPaymentId !== binding.checkout.providerPaymentId
      || operation.providerInvoiceId !== binding.checkout.providerInvoiceId || saved.customerAccountId !== binding.customer.id
      || saved.originalAmountMinor !== binding.checkout.amountMinor || saved.contractHash !== rentalContractHash(binding.checkout.contractSnapshot)
      || saved.collectionFinanceEntryId !== binding.evidence.financeEntryId || operation.baselineRefundedMinor !== binding.evidence.providerRefundedMinor) {
      throw new ConflictException('The original rental refund financial binding changed.');
    }
  }

  private async finalize(id: string, observed: MoyasarPayment) {
    return this.db.serializable(async tx => {
      const candidate = await tx.rentalRefundOperation.findUniqueOrThrow({ where: { id } });
      // A provider webhook may observe this exact refund between POST and
      // posting. That authenticated observation is not a second refund and
      // cannot prevent posting the saved, exact POST evidence.
      const binding = await this.binding(tx, candidate.rentalId, undefined, observed.refundedMinor);
      const operation = await tx.rentalRefundOperation.findUniqueOrThrow({ where: { id } });
      if (operation.status === 'SUCCEEDED') return operation;
      if (!operation.dispatchedAt || !['DISPATCHED', 'RECONCILIATION_REQUIRED'].includes(operation.status)) throw new ConflictException('Refund has not been dispatched.');
      this.originalBinding(operation, binding);
      if (observed.id !== operation.providerPaymentId || observed.invoiceId !== operation.providerInvoiceId || observed.amountMinor !== binding.checkout.amountMinor
        || observed.currency !== 'SAR' || observed.capturedMinor !== binding.checkout.amountMinor
        || observed.refundedMinor !== operation.baselineRefundedMinor + operation.amountMinor || observed.refundedMinor > observed.capturedMinor) throw new ConflictException('Provider refund proof is not bound to this operation.');
      await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${operation.financeEntryId} FOR UPDATE`;
      const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id: operation.financeEntryId } });
      if (entry.status !== 'APPROVED' || entry.type !== 'REFUND' || entry.referenceType !== 'EQUIPMENT_RENTAL_REFUND' || entry.referenceId !== operation.rentalId
        || entry.organizationId !== operation.organizationId || entry.amountMinor !== operation.amountMinor || entry.currency !== operation.currency
        || entry.requestedByAccountId !== operation.requestedByAccountId || entry.approvedByAccountId !== operation.approvedByAccountId) throw new ConflictException('Approved refund entry changed after dispatch.');
      const now = new Date();
      await tx.commerceCollectionEvidence.update({ where: { id: binding.evidence.id }, data: { providerRefundedMinor: observed.refundedMinor, providerVerifiedAt: now,
        providerSnapshot: json({ ...observed, invoiceMetadata: rentalObject(binding.evidence.providerSnapshot).invoiceMetadata }) } });
      await tx.commerceCheckout.update({ where: { id: binding.checkout.id }, data: { status: 'RECONCILIATION_REQUIRED',
        providerResult: json({ ...rentalObject(binding.checkout.providerResult), payment: observed, verifiedAt: now.toISOString() }) } });
      if (observed.refundedMinor === binding.checkout.amountMinor) await tx.$executeRaw`UPDATE "EquipmentRental" SET "paymentStatus"='REFUNDED',"updatedAt"=NOW() WHERE "id"=${operation.rentalId}`;
      await tx.financeEntry.update({ where: { id: entry.id }, data: { status: 'POSTED', postedAt: now, postedByAccountId: operation.executedByAccountId } });
      const completed = await tx.rentalRefundOperation.update({ where: { id }, data: { status: 'SUCCEEDED', resultingRefundedMinor: observed.refundedMinor, confirmedAt: now } });
      const actor = await tx.account.findUniqueOrThrow({ where: { id: operation.executedByAccountId }, select: { personId: true } });
      await tx.auditEvent.create({ data: { actorId: actor.personId, action: 'RENTAL_REFUND_POSTED', resource: 'RentalRefundOperation', resourceId: id,
        metadata: { rentalId: operation.rentalId, financeEntryId: entry.id, providerPaymentId: observed.id, amountMinor: operation.amountMinor,
          currency: operation.currency, baselineRefundedMinor: operation.baselineRefundedMinor, resultingRefundedMinor: observed.refundedMinor, providerVerified: true } } });
      return completed;
    });
  }

  async reconcile(executor: string, rentalId: string, id: string) {
    const operation = await this.db.rentalRefundOperation.findUnique({ where: { id } });
    if (!operation || operation.rentalId !== rentalId) throw new NotFoundException('Rental refund operation not found.');
    await this.db.serializable(tx => requireFinancialOperationMandate(tx, executor, operation.organizationId, 'EXECUTE_REFUND', operation.amountMinor, operation.currency));
    if (['SUCCEEDED', 'CANCELLED'].includes(operation.status)) return this.result(operation);
    const proof = rentalObject(operation.providerResult);
    if (proof.source === 'REFUND_POST_RESPONSE' && proof.payment) return this.result(await this.finalize(operation.id, proof.payment as MoyasarPayment));
    const observed = await this.provider.fetchPayment(operation.providerPaymentId, { invoiceId: operation.providerInvoiceId,
      amountMinor: Number(rentalObject(operation.policyDecision).originalAmountMinor), currency: operation.currency });
    await this.db.auditEvent.create({ data: { action: 'RENTAL_REFUND_RECONCILIATION_OBSERVED', resource: 'RentalRefundOperation', resourceId: id,
      metadata: { executorAccountId: executor, observedRefundedMinor: observed.refundedMinor, expectedRefundedMinor: operation.baselineRefundedMinor + operation.amountMinor,
        attribution: 'REVIEW_REQUIRED', automaticResendAllowed: false } } });
    return { ...this.result(operation), observedRefundedMinor: observed.refundedMinor, reconciliation: 'ATTRIBUTION_REVIEW_REQUIRED' };
  }
}
