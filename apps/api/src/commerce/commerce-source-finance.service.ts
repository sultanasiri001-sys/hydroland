import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';
import { CenterServiceEntitlementService } from './center-service-entitlement.service';
import { entitlementContractHash as hash } from './center-service-entitlement';
import { transferTimestamp } from './center-service-transfer.service';
import { commerceInvoiceSnapshotValid, commerceNativeInvoiceValid } from './commerce-invoice-finalization';
import { COMMERCE_SOURCE_TYPES, CommerceSourceEvidence, CommerceSourceType, commerceEntitlementReference,
  commerceSourceObject as object, readCommerceSourceEvidence } from './commerce-source-evidence';

type Tx = Prisma.TransactionClient;
export type CommerceFinanceScope = { organizationId: string; centerOrgUnitId: string; personId: string; owner: boolean; accountant: boolean };
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value;
const minor = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
const sourceResource = (type: CommerceSourceType) => `CommerceSource:${type}`;
export type CommerceAllocationInput = { financeAccountId: string; commissionAmountMinor: number; otherDeductionsMinor: number; expectedEvidenceHash: string };

/** B08 adapts the existing source journals to the existing settlement ledger. */
@Injectable()
export class CommerceSourceFinanceService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService,
    private readonly trips: CenterServiceEntitlementService) {}

  type(value: unknown): CommerceSourceType {
    if (typeof value !== 'string' || !COMMERCE_SOURCE_TYPES.includes(value as CommerceSourceType)) throw new BadRequestException('Unknown commerce source.');
    return value as CommerceSourceType;
  }

  async scope(tx: Tx, accountId: string, centerId: string, mode: 'READ' | 'OWNER' | 'ACCOUNTANT' = 'READ'): Promise<CommerceFinanceScope> {
    if (![accountId, centerId].every(identifier)) throw new BadRequestException('Financial scope is invalid.');
    const center = await tx.orgUnit.findFirst({ where: { id: centerId, type: 'CENTER', active: true,
      organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } }, select: { organizationId: true } });
    if (!center) throw new NotFoundException('Active center not found.');
    let owner: { id: string; personId: string } | null = null;
    if (mode !== 'ACCOUNTANT') {
      try { owner = await requirePlatformFinanceApprover(tx, accountId); }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    if (mode === 'OWNER' && !owner) throw new ForbiddenException('Verified platform finance authority is required.');
    if (owner) return { organizationId: center.organizationId, centerOrgUnitId: centerId, personId: owner.personId, owner: true, accountant: false };
    await this.access.requireBranchAccountant(accountId, centerId, tx);
    await this.access.requireCenterOrganizationAccountant(accountId, center.organizationId, tx);
    const actor = await tx.account.findUniqueOrThrow({ where: { id: accountId }, select: { personId: true } });
    return { organizationId: center.organizationId, centerOrgUnitId: centerId, personId: actor.personId, owner: false, accountant: true };
  }

  async lock(tx: Tx, organizationId: string, sourceType: CommerceSourceType, sourceId: string) {
    if (!identifier(sourceId)) throw new BadRequestException('Source identifier is invalid.');
    const key = sourceType === 'TRIP_BOOKING' ? `center-service-entitlement:${organizationId}:${sourceId}`
      : `commerce-source-entitlement:${organizationId}:${sourceType}:${sourceId}`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key},0))`;
  }

  async source(tx: Tx, organizationId: string, sourceType: CommerceSourceType, sourceId: string): Promise<CommerceSourceEvidence> {
    if (!identifier(sourceId)) throw new BadRequestException('Source identifier is invalid.');
    if (sourceType !== 'TRIP_BOOKING') return readCommerceSourceEvidence(tx, organizationId, sourceType, sourceId);
    const resolved = await this.trips.transferSource(tx, organizationId, sourceId, '');
    const { input, readiness } = resolved;
    if (input.booking.organizationId) throw new ConflictException('Organization bookings retain their original B12 invoice and transfer workflow.');
    const payment = input.payment, collection = input.collection;
    const executionOnly = new Set(['TRIP_NOT_COMPLETED', 'ACTUAL_COMPLETION_ATTENDANCE_REQUIRED', 'NO_PERFORMED_SERVICE_FOR_THIS_BOOKING',
      'CONTRADICTORY_OR_INCOMPLETE_ATTENDANCE', 'ELIGIBLE_GROSS_AMOUNT_REVIEW_REQUIRED']);
    const collectionVerified = Boolean(payment && collection && !readiness.blockers.some(code => !executionOnly.has(code)));
    return { sourceType, sourceId, organizationId, customerAccountId: input.booking.accountId,
      amountMinor: payment?.amountMinor ?? Number(object(input.booking.contractSnapshot).amountMinor || 0),
      refundedMinor: payment?.refundedAmountMinor ?? 0, currency: 'SAR', contract: payment?.contractSnapshot ?? input.booking.contractSnapshot,
      contractHash: hash(payment?.contractSnapshot ?? input.booking.contractSnapshot),
      invoiceKey: { sourceType: 'TRIP_PAYMENT', sourceId: payment?.id ?? '' }, collectionEvidenceId: null,
      collectionFinanceEntryId: collection?.id ?? null, providerPaymentId: payment?.moyasarPaymentId ?? null,
      collectionVerified, pendingRefund: input.pendingRefund, completed: readiness.grossReadiness === 'ELIGIBLE',
      eligibleGrossAmountMinor: readiness.eligibleGrossAmountMinor, blockers: readiness.blockers,
      completion: input.completion, evidenceHash: readiness.allocationEvidenceHash };
  }

  private async invoiceEvidence(tx: Tx, source: CommerceSourceEvidence) {
    const seller = await tx.organization.findUniqueOrThrow({ where: { id: source.organizationId } });
    const profile = object((await tx.operationalSetting.findUnique({ where: { key: 'organization-financial-profile:' + seller.id } }))?.value);
    const document = source.invoiceKey.sourceId ? await tx.accountInvoiceDocument.findUnique({ where: { sourceType_sourceId: source.invoiceKey } }) : null;
    const blockers: string[] = [];
    if (!source.collectionVerified || !source.collectionFinanceEntryId || source.pendingRefund) blockers.push('VERIFIED_ORIGINAL_COLLECTION_REQUIRED');
    if (!seller.legalName?.trim() || !seller.address?.trim() || profile.currency !== 'SAR'
      || !['EXEMPT', 'TAXABLE'].includes(profile.taxStatus) || !Number.isSafeInteger(profile.revision) || profile.revision < 1
      || !['REGISTERED', 'IN_PROGRESS', 'NOT_REGISTERED', 'EXPIRED'].includes(profile.registrationStatus)
      || profile.registrationStatus === 'REGISTERED' && !seller.registrationNumber?.trim()) blockers.push('DECLARED_SELLER_FISCAL_PROFILE_REQUIRED');
    if (!document || document.sellerId !== seller.id || document.buyerOrganizationId !== null
      || createHash('sha256').update(document.content).digest('hex') !== document.sha256) blockers.push('ORIGINAL_SELLER_INVOICE_DOCUMENT_REQUIRED');
    const snapshot = { version: 'COMMERCE_INVOICE_V1', sourceType: source.sourceType, sourceId: source.sourceId,
      seller: { id: seller.id, legalName: seller.legalName, registrationNumber: seller.registrationNumber, address: seller.address },
      customerAccountId: source.customerAccountId, sellerFinancialProfile: profile, invoiceKey: source.invoiceKey,
      number: document?.number ?? null, documentSha256: document?.sha256 ?? null,
      amountMinor: source.amountMinor, currency: 'SAR', contractHash: source.contractHash, originalContract: source.contract,
      collectionEvidenceId: source.collectionEvidenceId, collectionFinanceEntryId: source.collectionFinanceEntryId,
      providerPaymentId: source.providerPaymentId, verificationMethod: 'SELLER_ACCOUNTANT_ORIGINAL_DOCUMENT_REVIEW', taxAuthorityVerified: false };
    return { document, blockers, snapshot, expectedEvidenceHash: hash(snapshot) };
  }

  private latestDecision(tx: Tx, sourceType: CommerceSourceType, sourceId: string) {
    return tx.auditEvent.findFirst({ where: { resource: sourceResource(sourceType), resourceId: sourceId,
      action: { in: ['COMMERCE_SOURCE_ALLOCATION_APPROVED', 'COMMERCE_SOURCE_ALLOCATION_REVOKED'] }, occurredAt: { lte: new Date() } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }] });
  }

  async validInvoice(tx: Tx, source: CommerceSourceEvidence) {
    const invoice = await tx.commerceInvoiceFinalization.findUnique({ where: { sourceType_sourceId: { sourceType: source.sourceType, sourceId: source.sourceId } } });
    const document = source.invoiceKey.sourceId ? await tx.accountInvoiceDocument.findUnique({ where: { sourceType_sourceId: source.invoiceKey } }) : null;
    if (!invoice || !document || invoice.sellerId !== source.organizationId || invoice.customerAccountId !== source.customerAccountId
      || invoice.amountMinor !== source.amountMinor || invoice.currency !== 'SAR' || invoice.contractHash !== source.contractHash
      || invoice.collectionFinanceEntryId !== source.collectionFinanceEntryId || invoice.collectionEvidenceId !== source.collectionEvidenceId
      || invoice.number !== document.number || invoice.documentSha256 !== document.sha256 || document.sellerId !== source.organizationId
      || document.buyerOrganizationId !== null || createHash('sha256').update(document.content).digest('hex') !== document.sha256
      || invoice.finalizedAt > new Date() || invoice.issuedAt > invoice.finalizedAt) return null;
    if (!commerceInvoiceSnapshotValid(invoice, source.invoiceKey) || !await commerceNativeInvoiceValid(tx, invoice)) return null;
    return invoice;
  }

  private async state(tx: Tx, organizationId: string, sourceType: CommerceSourceType, sourceId: string) {
    const source = await this.source(tx, organizationId, sourceType, sourceId);
    const invoice = await this.validInvoice(tx, source);
    if (sourceType === 'TRIP_BOOKING') {
      const trip = await this.trips.transferSource(tx, organizationId, sourceId, '');
      return { source, invoice, allocation: trip.allocation, entry: trip.existing,
        readiness: { ...trip.readiness, sourceType, sourceId, amountMinor: source.amountMinor, refundedMinor: source.refundedMinor,
          invoiceFinalized: Boolean(invoice), invoiceFinalizationId: invoice?.id ?? null, collectionVerified: source.collectionVerified,
          allocationFinanceAccountId: trip.allocation?.financeAccountId ?? null } };
    }
    const decision = await this.latestDecision(tx, sourceType, sourceId), value = object(decision?.metadata);
    let ownerVerified = false;
    if (decision?.action === 'COMMERCE_SOURCE_ALLOCATION_APPROVED' && identifier(value.approvedByAccountId)) {
      try { const owner = await requirePlatformFinanceApprover(tx, value.approvedByAccountId); ownerVerified = owner.personId === decision.actorId; } catch { /* revoked authority is not allocation proof */ }
    }
    const valid = Boolean(ownerVerified && value.organizationId === organizationId && value.sourceType === sourceType && value.sourceId === sourceId
      && value.evidenceHash === source.evidenceHash && value.grossAmountMinor === source.eligibleGrossAmountMinor
      && minor(value.commissionAmountMinor) && minor(value.otherDeductionsMinor) && minor(value.netAmountMinor)
      && value.netAmountMinor + value.commissionAmountMinor + value.otherDeductionsMinor === source.eligibleGrossAmountMinor
      && identifier(value.financeAccountId) && decision!.occurredAt <= new Date());
    const entries = await tx.financeEntry.findMany({ where: { organizationId, referenceType: commerceEntitlementReference(sourceType), referenceId: sourceId }, take: 2 });
    const entry = entries.length === 1 ? entries[0] : null;
    const blockers = [...source.blockers, ...(entries.length > 1 ? ['DUPLICATE_SETTLEMENT_REQUIRES_RECONCILIATION'] : [])];
    const reviewReasons = [...(!valid ? ['OWNER_APPROVED_ALLOCATION_REQUIRED'] : []), ...(!invoice ? ['FINALIZED_ORIGINAL_INVOICE_REQUIRED'] : [])];
    const allocation = valid ? { ...value, evidenceId: decision!.id, ownerVerified: true } : null;
    return { source, invoice, allocation, entry, readiness: { sourceType, sourceId, currency: 'SAR', amountMinor: source.amountMinor,
      refundedMinor: source.refundedMinor, collectionVerified: source.collectionVerified, invoiceFinalized: Boolean(invoice), invoiceFinalizationId: invoice?.id ?? null,
      grossReadiness: blockers.length ? 'BLOCKED' : 'ELIGIBLE', eligibleGrossAmountMinor: source.eligibleGrossAmountMinor,
      commissionAmountMinor: valid ? value.commissionAmountMinor : null, otherDeductionsMinor: valid ? value.otherDeductionsMinor : null,
      netPayoutAmountMinor: valid && !blockers.length ? value.netAmountMinor : null, allocationEvidenceHash: source.evidenceHash,
      allocationFinanceAccountId: valid ? value.financeAccountId : null,
      allocationApprovalEventId: valid ? decision!.id : null, settlementFinanceEntryId: entry?.id ?? null,
      settlementLedgerStatus: entry?.status ?? null, collectionFinanceEntryId: source.collectionFinanceEntryId,
      canPrepareSettlement: !blockers.length && !reviewReasons.length && valid && value.netAmountMinor > 0 && !entries.length,
      blockers, reviewReasons, financialActionExecuted: false, bankTransferExecuted: false } };
  }

  read(accountId: string, centerId: string, type: string, sourceId: string) {
    const sourceType = this.type(type);
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId); await this.lock(tx, scope.organizationId, sourceType, sourceId);
      const state = await this.state(tx, scope.organizationId, sourceType, sourceId);
      const preview = await this.invoiceEvidence(tx, state.source);
      const contract = object(state.source.contract);
      const lines = sourceType === 'STORE_ORDER' ? contract.lines.map((line: any) => ({ lineId: line.source.id, amountMinor: line.amountMinor, title: line.title }))
        : sourceType === 'EQUIPMENT_RENTAL' ? contract.lines.map((line: any) => ({ lineId: line.id, amountMinor: line.amountMinor, title: line.equipmentName }))
        : [{ lineId: sourceId, amountMinor: state.source.amountMinor, title: contract.title ?? sourceType }];
      return { ...state.readiness, canAllocate: scope.owner, canPrepare: scope.accountant, invoice: {
        status: state.invoice ? 'FINALIZED' : 'DRAFT', number: state.invoice?.number ?? preview.document?.number ?? null,
        issuedAt: state.invoice?.issuedAt ?? null, amountMinor: state.source.amountMinor, taxMinor: state.invoice?.taxMinor ?? null,
        documentKey: state.source.invoiceKey, expectedEvidenceHash: preview.expectedEvidenceHash,
        canFinalize: scope.accountant && !state.invoice && !preview.blockers.length, blockers: preview.blockers,
        sellerFinancialProfile: state.invoice ? object(state.invoice.snapshot).sellerFinancialProfile : preview.snapshot.sellerFinancialProfile,
        lines, taxAuthorityVerified: false } };
    });
  }

  finalize(accountId: string, centerId: string, type: string, sourceId: string, input: Record<string, unknown>) {
    const sourceType = this.type(type);
    if (!input || Object.keys(input).some(key => !['issuedAt', 'expectedEvidenceHash', 'taxLines'].includes(key))
      || typeof input.expectedEvidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedEvidenceHash)
      || typeof input.issuedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.issuedAt)
      || !Array.isArray(input.taxLines) || !input.taxLines.length) throw new BadRequestException('Review the original invoice, issuance time and explicit line tax amounts.');
    const issuedAt = transferTimestamp(input.issuedAt, 'Invoice issue time');
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'ACCOUNTANT'); await this.lock(tx, scope.organizationId, sourceType, sourceId);
      const source = await this.source(tx, scope.organizationId, sourceType, sourceId), preview = await this.invoiceEvidence(tx, source);
      const contract = object(source.contract);
      const originalTimes = sourceType === 'STORE_ORDER' ? contract.lines.map((line: any) => Date.parse(line.recordedAt))
        : [Date.parse(contract.recordedAt ?? contract.contractedAt)];
      if (originalTimes.some((time: number) => !Number.isFinite(time) || issuedAt.getTime() < time)) throw new ConflictException('The invoice cannot predate its original order.');
      const expectedLines = sourceType === 'STORE_ORDER' ? contract.lines.map((line: any) => ({ id: line.source.id, amountMinor: line.amountMinor }))
        : sourceType === 'EQUIPMENT_RENTAL' ? contract.lines.map((line: any) => ({ id: line.id, amountMinor: line.amountMinor }))
        : [{ id: sourceId, amountMinor: source.amountMinor }];
      const lines = (input.taxLines as unknown[]).map(line => {
        const row = object(line);
        if (Object.keys(row).sort().join(',') !== 'lineId,taxMinor' || !identifier(row.lineId) || !minor(row.taxMinor)) throw new BadRequestException('Invoice tax lines are invalid.');
        return { lineId: row.lineId, taxMinor: row.taxMinor };
      }).sort((a, b) => a.lineId.localeCompare(b.lineId));
      if (lines.length !== expectedLines.length || new Set(lines.map(line => line.lineId)).size !== lines.length
        || lines.some(line => !expectedLines.some((expected: any) => expected.id === line.lineId && line.taxMinor <= expected.amountMinor))) {
        throw new ConflictException('Invoice lines must match every original source line exactly.');
      }
      const taxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);
      const prior = await tx.commerceInvoiceFinalization.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId } } });
      if (prior) {
        if (prior.issuedAt.getTime() !== issuedAt.getTime() || prior.finalizedBy !== accountId || object(prior.snapshot).expectedEvidenceHash !== input.expectedEvidenceHash
          || hash(object(prior.snapshot).taxLines) !== hash(lines) || !await this.validInvoice(tx, source)) throw new ConflictException('This invoice was finalized with different evidence.');
        return { id: prior.id, status: 'FINALIZED', replayed: true, amountMinor: prior.amountMinor, taxMinor: prior.taxMinor, taxAuthorityVerified: false };
      }
      if (preview.blockers.length || preview.expectedEvidenceHash !== input.expectedEvidenceHash || !preview.document
        || preview.snapshot.sellerFinancialProfile.taxStatus === 'EXEMPT' && taxMinor !== 0) {
        throw new ConflictException({ code: 'COMMERCE_INVOICE_REVIEW_REQUIRED', blockers: preview.blockers });
      }
      const finalized = await tx.commerceInvoiceFinalization.create({ data: { sourceType, sourceId, sellerId: scope.organizationId,
        customerAccountId: source.customerAccountId, number: preview.document.number, issuedAt, documentSha256: preview.document.sha256,
        collectionEvidenceId: source.collectionEvidenceId, collectionFinanceEntryId: source.collectionFinanceEntryId!, contractHash: source.contractHash,
        amountMinor: source.amountMinor, currency: 'SAR', taxMinor, finalizedBy: accountId,
        snapshot: json({ ...preview.snapshot, expectedEvidenceHash: preview.expectedEvidenceHash, issuedAt: issuedAt.toISOString(),
          taxLines: lines, taxMinor, subtotalMinor: source.amountMinor - taxMinor, finalizedBy: accountId }) } });
      if (sourceType === 'STORE_ORDER') {
        const payment = await tx.storePayment.findUniqueOrThrow({ where: { orderId: sourceId } });
        const native = await tx.storeInvoice.findUnique({ where: { paymentId: payment.id } });
        // Hosted goods checkout intentionally creates no final invoice. Its
        // first native invoice is issued only with this reviewed seller original.
        // Keep the native reference globally unique; seller numbering stays in
        // the attached original and seller-scoped finalization record.
        if (!native) await tx.storeInvoice.create({ data: { paymentId: payment.id, number: `HL-STORE-${payment.id}`, status: 'PAID', issuedAt } });
        else if (native.status === 'DRAFT') await tx.storeInvoice.updateMany({ where: { id: native.id, status: 'DRAFT' }, data: { status: 'PAID', issuedAt } });
      }
      if (sourceType === 'TRIP_BOOKING') await tx.invoice.updateMany({ where: { paymentId: source.invoiceKey.sourceId, status: 'DRAFT' }, data: { status: 'PAID', issuedAt } });
      if (!commerceInvoiceSnapshotValid(finalized, source.invoiceKey) || !await commerceNativeInvoiceValid(tx, finalized)) {
        throw new ConflictException('The original invoice must match its issuance and cannot be voided.');
      }
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'COMMERCE_SOURCE_INVOICE_FINALIZED', resource: sourceResource(sourceType),
        resourceId: sourceId, metadata: { finalizationId: finalized.id, documentSha256: finalized.documentSha256, amountMinor: finalized.amountMinor,
          taxMinor, currency: 'SAR', collectionFinanceEntryId: source.collectionFinanceEntryId, taxAuthorityVerified: false } } });
      return { id: finalized.id, status: 'FINALIZED', replayed: false, amountMinor: finalized.amountMinor, taxMinor, taxAuthorityVerified: false };
    });
  }

  async allocate(accountId: string, centerId: string, type: string, sourceId: string, input: CommerceAllocationInput) {
    const sourceType = this.type(type);
    if (!input || Object.keys(input).some(key => !['financeAccountId', 'commissionAmountMinor', 'otherDeductionsMinor', 'expectedEvidenceHash'].includes(key))
      || !identifier(input.financeAccountId) || !minor(input.commissionAmountMinor) || !minor(input.otherDeductionsMinor)
      || typeof input.expectedEvidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedEvidenceHash)) throw new BadRequestException('Explicit allocation and source evidence are required.');
    if (sourceType === 'TRIP_BOOKING') {
      const scope = await this.db.serializable(tx => this.scope(tx, accountId, centerId, 'OWNER'));
      return this.trips.approveTripAllocation(accountId, scope.organizationId, sourceId, input);
    }
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'OWNER'); await this.lock(tx, scope.organizationId, sourceType, sourceId);
      const state = await this.state(tx, scope.organizationId, sourceType, sourceId), source = state.source;
      if (state.entry || source.blockers.length || source.evidenceHash !== input.expectedEvidenceHash) throw new ConflictException('Review current completion, collection and existing settlement before allocation.');
      const netAmountMinor = source.eligibleGrossAmountMinor - input.commissionAmountMinor - input.otherDeductionsMinor;
      if (!minor(netAmountMinor)) throw new BadRequestException('Deductions exceed the completed, collected amount after refunds.');
      const account = await tx.financeAccount.findFirst({ where: { id: input.financeAccountId, organizationId: scope.organizationId, active: true, currency: 'SAR' } });
      if (!account) throw new NotFoundException('Active center ledger account not found.');
      const previous = await this.latestDecision(tx, sourceType, sourceId), prior = object(previous?.metadata);
      if (previous?.action === 'COMMERCE_SOURCE_ALLOCATION_APPROVED' && previous.actorId === scope.personId
        && prior.evidenceHash === source.evidenceHash && prior.financeAccountId === input.financeAccountId
        && prior.commissionAmountMinor === input.commissionAmountMinor && prior.otherDeductionsMinor === input.otherDeductionsMinor) {
        return { ...state.readiness, alreadyApproved: true };
      }
      if (previous && previous.occurredAt.getTime() >= Date.now()) throw new ConflictException('The decision clock changed. Refresh before allocating.');
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'COMMERCE_SOURCE_ALLOCATION_APPROVED', resource: sourceResource(sourceType),
        resourceId: sourceId, metadata: { sourceType, sourceId, organizationId: scope.organizationId, approvedByAccountId: accountId,
          evidenceHash: source.evidenceHash, financeAccountId: account.id, grossAmountMinor: source.eligibleGrossAmountMinor,
          commissionAmountMinor: input.commissionAmountMinor, otherDeductionsMinor: input.otherDeductionsMinor, netAmountMinor, currency: 'SAR', bankTransferExecuted: false } } });
      return { ...(await this.state(tx, scope.organizationId, sourceType, sourceId)).readiness, alreadyApproved: false };
    });
  }

  async revoke(accountId: string, centerId: string, type: string, sourceId: string, input: { allocationApprovalEventId: string; reason: string }) {
    const sourceType = this.type(type);
    if (!input || Object.keys(input).some(key => !['allocationApprovalEventId', 'reason'].includes(key)) || !identifier(input.allocationApprovalEventId)
      || typeof input.reason !== 'string' || input.reason.trim().length < 5 || input.reason.length > 1000) throw new BadRequestException('Current allocation and revocation reason are required.');
    if (sourceType === 'TRIP_BOOKING') {
      const scope = await this.db.serializable(tx => this.scope(tx, accountId, centerId, 'OWNER'));
      return this.trips.revokeTripAllocation(accountId, scope.organizationId, sourceId, input);
    }
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'OWNER'); await this.lock(tx, scope.organizationId, sourceType, sourceId);
      await this.source(tx, scope.organizationId, sourceType, sourceId);
      const previous = await this.latestDecision(tx, sourceType, sourceId), value = object(previous?.metadata);
      if (previous?.action === 'COMMERCE_SOURCE_ALLOCATION_REVOKED' && value.allocationApprovalEventId === input.allocationApprovalEventId
        && value.reason === input.reason.trim() && previous.actorId === scope.personId) return { revoked: true, alreadyRevoked: true };
      if (previous?.action !== 'COMMERCE_SOURCE_ALLOCATION_APPROVED' || previous.id !== input.allocationApprovalEventId) throw new ConflictException('Allocation decision changed.');
      if (previous.occurredAt.getTime() >= Date.now()) throw new ConflictException('Refresh before revoking this decision.');
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'COMMERCE_SOURCE_ALLOCATION_REVOKED', resource: sourceResource(sourceType),
        resourceId: sourceId, metadata: { sourceType, sourceId, organizationId: scope.organizationId, allocationApprovalEventId: previous.id,
          reason: input.reason.trim(), approvedByAccountId: accountId, bankTransferExecuted: false } } });
      return { revoked: true, alreadyRevoked: false };
    });
  }

  async prepare(accountId: string, centerId: string, type: string, sourceId: string, input: { financeAccountId: string; allocationApprovalEventId: string }) {
    const sourceType = this.type(type);
    if (!input || Object.keys(input).some(key => !['financeAccountId', 'allocationApprovalEventId'].includes(key))
      || ![input.financeAccountId, input.allocationApprovalEventId].every(identifier)) throw new BadRequestException('Allocation and ledger identifiers are required.');
    if (sourceType === 'TRIP_BOOKING') return this.trips.prepareTrip(accountId, centerId, sourceId, input);
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'ACCOUNTANT'); await this.lock(tx, scope.organizationId, sourceType, sourceId);
      const state = await this.state(tx, scope.organizationId, sourceType, sourceId), allocation = object(state.allocation);
      if (state.entry) {
        const prepared = await tx.auditEvent.findFirst({ where: { action: 'COMMERCE_SOURCE_SETTLEMENT_PREPARED', resource: 'FinanceEntry', resourceId: state.entry.id } });
        if (state.entry.financeAccountId !== input.financeAccountId || object(prepared?.metadata).allocationApprovalEventId !== input.allocationApprovalEventId) throw new ConflictException('Existing settlement has different evidence.');
        return { ...state.readiness, alreadyPrepared: true };
      }
      if (!state.readiness.canPrepareSettlement || allocation.evidenceId !== input.allocationApprovalEventId
        || allocation.financeAccountId !== input.financeAccountId) throw new ConflictException({ code: 'COMMERCE_ENTITLEMENT_REVIEW_REQUIRED', readiness: state.readiness });
      const account = await tx.financeAccount.findFirst({ where: { id: input.financeAccountId, organizationId: scope.organizationId, active: true, currency: 'SAR' } });
      if (!account) throw new NotFoundException('Center ledger account not found.');
      const entry = await tx.financeEntry.create({ data: { organizationId: scope.organizationId, financeAccountId: account.id, type: 'SETTLEMENT',
        status: 'PENDING_APPROVAL', amountMinor: allocation.netAmountMinor, currency: 'SAR', referenceType: commerceEntitlementReference(sourceType),
        referenceId: sourceId, requestedByAccountId: accountId, description: 'مستحق بند منفذ ومحصل بعد مطابقة الأصل والاسترداد؛ بانتظار اعتماد التحويل.' } });
      await tx.financeApproval.create({ data: { financeEntryId: entry.id, requestedByAccountId: accountId } });
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'COMMERCE_SOURCE_SETTLEMENT_PREPARED', resource: 'FinanceEntry', resourceId: entry.id,
        metadata: { sourceType, sourceId, organizationId: scope.organizationId, allocationApprovalEventId: input.allocationApprovalEventId,
          sourceEvidenceHash: state.source.evidenceHash, invoiceFinalizationId: state.invoice!.id, netAmountMinor: entry.amountMinor, currency: 'SAR', bankTransferExecuted: false } } });
      return { ...state.readiness, canPrepareSettlement: false, settlementFinanceEntryId: entry.id, settlementLedgerStatus: entry.status, alreadyPrepared: false };
    });
  }

  /** Called again at submission and independent receipt confirmation, in the caller's transaction. */
  async transferSource(tx: Tx, scope: CommerceFinanceScope, entryId: string) {
    const entry = await tx.financeEntry.findFirst({ where: { id: entryId, organizationId: scope.organizationId, type: 'SETTLEMENT',
      referenceType: { in: COMMERCE_SOURCE_TYPES.map(commerceEntitlementReference) } }, include: { financeAccount: true, approvals: true } });
    if (!entry) throw new NotFoundException('Source settlement not found.');
    const sourceType = COMMERCE_SOURCE_TYPES.find(type => commerceEntitlementReference(type) === entry.referenceType)!;
    await this.lock(tx, scope.organizationId, sourceType, entry.referenceId);
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${entry.id} FOR UPDATE`;
    if (entry.status !== 'APPROVED' || !entry.approvedAt || entry.approvedAt > new Date() || entry.createdAt > entry.approvedAt
      || !entry.approvedByAccountId || entry.requestedByAccountId === entry.approvedByAccountId || entry.postedAt || entry.postedByAccountId
      || entry.currency !== 'SAR' || !entry.financeAccount.active || entry.financeAccount.organizationId !== scope.organizationId
      || entry.financeAccount.currency !== 'SAR' || !entry.approvals.some(row => row.status === 'APPROVED'
        && row.requestedByAccountId === entry.requestedByAccountId && row.decidedByAccountId === entry.approvedByAccountId
        && row.decidedAt?.getTime() === entry.approvedAt!.getTime() && row.createdAt <= row.decidedAt!)) {
      throw new ConflictException('An independently approved and unposted settlement is required.');
    }
    const state = await this.state(tx, scope.organizationId, sourceType, entry.referenceId), allocation = object(state.allocation);
    const prepared = await tx.auditEvent.findFirst({ where: { resource: 'FinanceEntry', resourceId: entry.id,
      action: sourceType === 'TRIP_BOOKING' ? 'CENTER_SERVICE_SETTLEMENT_PREPARED' : 'COMMERCE_SOURCE_SETTLEMENT_PREPARED' }, orderBy: { occurredAt: 'asc' } });
    const evidence = object(prepared?.metadata);
    const reasons = state.readiness.reviewReasons.filter((reason: string) => reason !== 'EXISTING_SETTLEMENT_REQUIRES_CURRENT_RECONCILIATION');
    if (!state.source.collectionVerified || state.source.blockers.length || !state.invoice || !prepared || prepared.occurredAt > entry.approvedAt
      || state.entry?.id !== entry.id || reasons.length || state.readiness.netPayoutAmountMinor !== entry.amountMinor
      || allocation.financeAccountId !== entry.financeAccountId || evidence.allocationApprovalEventId !== allocation.evidenceId
      || evidence.netAmountMinor !== entry.amountMinor || evidence.organizationId !== scope.organizationId
      || sourceType !== 'TRIP_BOOKING' && (evidence.sourceType !== sourceType || evidence.sourceId !== entry.referenceId
        || evidence.sourceEvidenceHash !== state.source.evidenceHash || evidence.invoiceFinalizationId !== state.invoice.id)) {
      throw new ConflictException('Reconcile the original invoice, completion, collection, refunds and approved allocation before transfer.');
    }
    return { entry, sourceType, sourceId: entry.referenceId, invoice: state.invoice,
      snapshot: { version: 'COMMERCE_SOURCE_TRANSFER_V1', sourceType, sourceId: entry.referenceId, organizationId: scope.organizationId,
        centerOrgUnitId: scope.centerOrgUnitId, financeEntryId: entry.id, financeAccountId: entry.financeAccountId,
        requestedBy: entry.requestedByAccountId, approvedBy: entry.approvedByAccountId, approvedAt: entry.approvedAt.toISOString(),
        sourceEvidenceHash: state.source.evidenceHash, contractHash: state.source.contractHash,
        invoiceFinalizationId: state.invoice.id, invoiceDocumentSha256: state.invoice.documentSha256,
        invoiceSnapshotHash: hash(state.invoice.snapshot), collectionFinanceEntryId: state.source.collectionFinanceEntryId,
        allocationApprovalEventId: allocation.evidenceId, grossAmountMinor: state.source.eligibleGrossAmountMinor,
        commissionAmountMinor: state.readiness.commissionAmountMinor, otherDeductionsMinor: state.readiness.otherDeductionsMinor,
        netAmountMinor: entry.amountMinor, currency: 'SAR' } };
  }

  centers(accountId: string) {
    return this.db.serializable(async tx => {
      await requirePlatformFinanceApprover(tx, accountId);
      const rows = await tx.orgUnit.findMany({ where: { type: 'CENTER', active: true, organization: { kind: 'DIVE_CENTER', status: 'ACTIVE' } },
        select: { id: true, nameAr: true, organizationId: true, organization: { select: { displayName: true, legalName: true } } }, orderBy: { nameAr: 'asc' } });
      return { centers: rows.map(row => ({ id: row.id, organizationId: row.organizationId, nameAr: row.nameAr,
        organizationName: row.organization.legalName || row.organization.displayName })) };
    });
  }

  list(accountId: string, centerId: string) {
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId);
      const lines = await tx.unifiedStoreOrderLine.findMany({ where: { organizationId: scope.organizationId }, orderBy: { order: { createdAt: 'desc' } }, take: 100 });
      const accounts = await tx.financeAccount.findMany({ where: { organizationId: scope.organizationId, active: true, currency: 'SAR' }, select: { id: true, name: true } });
      return { canAllocate: scope.owner, canPrepare: scope.accountant, accounts,
        items: lines.map(line => ({ sourceType: line.sourceType, sourceId: line.sourceId, orderId: line.orderId,
          title: line.title, amountMinor: line.amountMinor, currency: line.currency })) };
    });
  }
}
