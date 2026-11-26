import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CenterServiceTransferReceipt, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';
import { CenterServiceEntitlementService } from './center-service-entitlement.service';
import { entitlementContractHash } from './center-service-entitlement';

type Tx = Prisma.TransactionClient;
type Scope = { organizationId: string; centerOrgUnitId: string; personId: string; owner: boolean; accountant: boolean };
const referenceType = 'CENTER_SERVICE_ENTITLEMENT';
const maxPdfBytes = 5 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
const json = (value: unknown) => value as Prisma.InputJsonObject;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const receiptSummarySelect = {
  id: true, financeEntryId: true, bookingId: true, paymentId: true, invoiceFinalizationId: true,
  bankName: true, bankReference: true, amountMinor: true, currency: true, transferredAt: true,
  status: true, submittedBy: true, submittedAt: true, reviewedBy: true, reviewedAt: true,
  receivedAt: true, decisionNote: true, documentSha256: true, receiptDocumentSha256: true,
} satisfies Prisma.CenterServiceTransferReceiptSelect;
type ReceiptSummary = Prisma.CenterServiceTransferReceiptGetPayload<{ select: typeof receiptSummarySelect }>;

export interface CenterTransferSubmission {
  requestId: string;
  financeEntryId: string;
  bankName: string;
  bankReference: string;
  amountMinor: number;
  currency: 'SAR';
  transferredAt: string;
  documentBase64: string;
}

export interface CenterTransferReview {
  decision: 'CONFIRMED' | 'REJECTED';
  note: string;
  receivedAt?: string;
  documentBase64?: string;
}

function text(value: unknown, label: string, limit = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new BadRequestException(`${label} is invalid.`);
  }
  return value.trim();
}

function timestamp(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new BadRequestException(`${label} requires a timestamp with an explicit time zone.`);
  }
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  const offset = value.endsWith('Z') ? null : value.slice(-6);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
    || hour > 23 || minute > 59 || second > 59 || (offset && (Number(offset.slice(1, 3)) > 14 || Number(offset.slice(4)) > 59
      || (Number(offset.slice(1, 3)) === 14 && Number(offset.slice(4)) !== 0)))) throw new BadRequestException(`${label} is invalid.`);
  const result = new Date(value);
  if (!Number.isFinite(result.getTime()) || result > new Date()) throw new BadRequestException(`${label} is invalid or in the future.`);
  return result;
}

async function pdf(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > Math.ceil(maxPdfBytes / 3) * 4
    || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new BadRequestException('Attach an original PDF no larger than 5 MB, encoded as base64.');
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > maxPdfBytes || bytes.length < 5 || bytes.subarray(0, 5).toString() !== '%PDF-' || bytes.toString('base64') !== value) {
    throw new BadRequestException('The transfer document must be an original PDF no larger than 5 MB.');
  }
  try {
    const parsed = await PDFDocument.load(bytes, { ignoreEncryption: false });
    if (parsed.isEncrypted || parsed.getPageCount() < 1) throw new Error('Empty or encrypted PDF');
  } catch {
    throw new BadRequestException('The PDF could not be read.');
  }
  return { bytes: Uint8Array.from(bytes), sha256: hash(bytes) };
}

export { text as transferText, timestamp as transferTimestamp, pdf as transferPdf };

/** Records and independently confirms an external bank transfer. This service never sends money. */
@Injectable()
export class CenterServiceTransferService {
  constructor(private readonly db: DatabaseService, private readonly access: FinanceAccessService,
    private readonly entitlements: CenterServiceEntitlementService) {}

  private async scope(tx: Tx, accountId: string, centerId: string, mode: 'READ' | 'SUBMIT' | 'REVIEW'): Promise<Scope> {
    if (![accountId, centerId].every(identifier)) throw new BadRequestException('Financial scope identifiers are invalid.');
    const center = await tx.orgUnit.findFirst({ where: { id: centerId, type: 'CENTER', active: true,
      organization: { status: 'ACTIVE', kind: 'DIVE_CENTER' } }, select: { organizationId: true } });
    if (!center) throw new NotFoundException('Active supplying center not found.');
    let owner: { id: string; personId: string } | null = null;
    if (mode !== 'REVIEW') {
      try { owner = await requirePlatformFinanceApprover(tx, accountId); }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    if (mode === 'SUBMIT' && !owner) throw new ForbiddenException('The verified platform finance approver must submit the external transfer.');
    if (owner) return { organizationId: center.organizationId, centerOrgUnitId: centerId, personId: owner.personId, owner: true, accountant: false };
    await this.access.requireBranchAccountant(accountId, centerId, tx);
    await this.access.requireCenterOrganizationAccountant(accountId, center.organizationId, tx);
    const actor = await tx.account.findUniqueOrThrow({ where: { id: accountId }, select: { personId: true } });
    return { organizationId: center.organizationId, centerOrgUnitId: centerId, personId: actor.personId, owner: false, accountant: true };
  }

  private async lockBooking(tx: Tx, organizationId: string, bookingId: string) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`center-service-entitlement:${organizationId}:${bookingId}`},0))`;
  }

  private async lockReference(tx: Tx, key: string) {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`center-service-transfer-reference:${key}`},0))`;
  }

  private async entry(tx: Tx, scope: Scope, id: string) {
    const source = await tx.financeEntry.findFirst({ where: { id, organizationId: scope.organizationId, referenceType, type: 'SETTLEMENT' },
      select: { referenceId: true } });
    if (!source) throw new NotFoundException('Center service settlement not found.');
    await this.lockBooking(tx, scope.organizationId, source.referenceId);
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${id} FOR UPDATE`;
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id }, include: { financeAccount: true, approvals: true } });
    if (entry.organizationId !== scope.organizationId || entry.referenceId !== source.referenceId || entry.referenceType !== referenceType || entry.type !== 'SETTLEMENT') {
      throw new ConflictException('Settlement source changed.');
    }
    return entry;
  }

  private independent(accountId: string, receipt: Pick<CenterServiceTransferReceipt, 'submittedBy'>,
    entry: { requestedByAccountId: string; approvedByAccountId: string | null }) {
    return ![receipt.submittedBy, entry.requestedByAccountId, entry.approvedByAccountId].includes(accountId);
  }

  private summary(row: ReceiptSummary, accountId: string, scope: Scope,
    entry?: { status: string; requestedByAccountId: string; approvedByAccountId: string | null }) {
    return {
      id: row.id, financeEntryId: row.financeEntryId, bookingId: row.bookingId, paymentId: row.paymentId,
      invoiceFinalizationId: row.invoiceFinalizationId, bankName: row.bankName, bankReference: row.bankReference,
      amountMinor: row.amountMinor, currency: row.currency, transferredAt: row.transferredAt,
      status: row.status, submittedBy: row.submittedBy, submittedAt: row.submittedAt,
      reviewedBy: row.reviewedBy, reviewedAt: row.reviewedAt, receivedAt: row.receivedAt, decisionNote: row.decisionNote,
      documentSha256: row.documentSha256, receiptDocumentSha256: row.receiptDocumentSha256,
      bankTransferExecuted: false, externalTransferConfirmed: row.status === 'CONFIRMED', providerVerified: false,
      canConfirm: Boolean(scope.accountant && row.status === 'PENDING' && entry?.status === 'APPROVED' && this.independent(accountId, row, entry)),
    };
  }

  private async source(tx: Tx, scope: Scope, entry: Awaited<ReturnType<CenterServiceTransferService['entry']>>) {
    if (entry.status !== 'APPROVED' || entry.currency !== 'SAR' || !entry.approvedAt || entry.approvedAt > new Date()
      || entry.createdAt > entry.approvedAt || !entry.approvedByAccountId || entry.requestedByAccountId === entry.approvedByAccountId
      || entry.postedAt || entry.postedByAccountId || !entry.financeAccount.active
      || entry.financeAccount.organizationId !== scope.organizationId || entry.financeAccount.currency !== 'SAR'
      || !entry.approvals.some(approval => approval.status === 'APPROVED' && approval.requestedByAccountId === entry.requestedByAccountId
        && approval.decidedByAccountId === entry.approvedByAccountId && approval.decidedAt?.getTime() === entry.approvedAt!.getTime()
        && approval.createdAt <= approval.decidedAt)) {
      throw new ConflictException('An independently approved, unposted center settlement is required.');
    }
    await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "bookingId"::text=${entry.referenceId} ORDER BY "id" FOR UPDATE`;
    const prepared = await tx.auditEvent.findFirst({ where: { action: 'CENTER_SERVICE_SETTLEMENT_PREPARED', resource: 'FinanceEntry', resourceId: entry.id },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
    const original = object(prepared?.metadata);
    if (!prepared || !original || !identifier(original.allocationApprovalEventId)) throw new ConflictException('Original settlement preparation evidence is required.');
    const { input, readiness, allocation, existing } = await this.entitlements.transferSource(tx, scope.organizationId, entry.referenceId, original.allocationApprovalEventId);
    const remainingReviews = readiness.reviewReasons.filter(reason => reason !== 'EXISTING_SETTLEMENT_REQUIRES_CURRENT_RECONCILIATION');
    if (!input.booking.organizationId || !input.payment || !input.collection || !input.completion || input.ambiguousSettlement
      || readiness.grossReadiness !== 'ELIGIBLE' || remainingReviews.length || !allocation || existing?.id !== entry.id
      || readiness.netPayoutAmountMinor !== entry.amountMinor || allocation.financeAccountId !== entry.financeAccountId
      || original.organizationId !== scope.organizationId || original.bookingId !== entry.referenceId || original.paymentId !== input.payment.id
      || original.completionEventId !== input.completion.id || original.collectionFinanceEntryId !== input.collection.id
      || original.contractHash !== readiness.contractHash || original.netAmountMinor !== entry.amountMinor || original.currency !== 'SAR'
      || prepared.occurredAt > entry.approvedAt) {
      throw new ConflictException({ code: 'CENTER_TRANSFER_SOURCE_REVIEW_REQUIRED', message: 'Recheck the current collection, completion, allocation and settlement evidence.', readiness });
    }
    const finalization = await tx.organizationBookingInvoiceFinalization.findUnique({ where: { paymentId: input.payment.id } });
    if (!finalization) throw new ConflictException('Finalize the center invoice before recording a transfer.');
    const [invoice, document, collection] = await Promise.all([
      tx.invoice.findUnique({ where: { id: finalization.invoiceId } }),
      tx.accountInvoiceDocument.findUnique({ where: { sourceType_sourceId: { sourceType: 'TRIP_PAYMENT', sourceId: input.payment.id } } }),
      tx.commerceCollectionEvidence.findUnique({ where: { id: finalization.collectionEvidenceId } }),
    ]);
    const paymentHash = entitlementContractHash(input.payment.contractSnapshot);
    if (finalization.sellerId !== scope.organizationId || finalization.buyerOrganizationId !== input.booking.organizationId
      || finalization.collectionFinanceEntryId !== input.collection.id || finalization.contractHash !== paymentHash || finalization.finalizedAt > new Date()
      || !invoice || invoice.paymentId !== input.payment.id || !['ISSUED', 'PAID'].includes(invoice.status)
      || invoice.issuedAt?.getTime() !== finalization.issuedAt.getTime()
      || !document || document.sellerId !== scope.organizationId || document.buyerOrganizationId !== input.booking.organizationId
      || document.number !== finalization.number || document.sha256 !== finalization.documentSha256 || hash(document.content) !== document.sha256
      || !collection || collection.sourceType !== 'ORGANIZATION_BOOKING_PREPAYMENT' || collection.sourceId !== input.booking.id
      || collection.organizationId !== scope.organizationId || collection.customerAccountId !== input.payment.accountId
      || collection.financeEntryId !== input.collection.id || collection.amountMinor !== input.payment.amountMinor || collection.currency !== 'SAR'
      || collection.providerPaymentId !== input.payment.moyasarPaymentId || collection.providerInvoiceId !== input.payment.providerReference
      || collection.providerCapturedMinor !== input.payment.amountMinor || collection.providerRefundedMinor !== 0
      || object(collection.providerSnapshot)?.paymentId !== input.payment.id
      || entitlementContractHash(collection.contractSnapshot) !== paymentHash) {
      throw new ConflictException('The final invoice, original document and collection must match this center and booking.');
    }
    const snapshot = {
      version: '2026-11-26.1', mode: 'EXTERNAL_TRANSFER_RECEIPT', organizationId: scope.organizationId, centerOrgUnitId: scope.centerOrgUnitId,
      bookingId: input.booking.id, paymentId: input.payment.id, financeEntryId: entry.id, financeAccountId: entry.financeAccountId,
      requestedBy: entry.requestedByAccountId, approvedBy: entry.approvedByAccountId, approvedAt: entry.approvedAt.toISOString(),
      invoiceFinalizationId: finalization.id, invoiceFinalizationHash: entitlementContractHash({ ...finalization,
        issuedAt: finalization.issuedAt.toISOString(), finalizedAt: finalization.finalizedAt.toISOString() }), invoiceDocumentSha256: document.sha256,
      collectionEvidenceId: collection.id, collectionFinanceEntryId: input.collection.id, paymentContractHash: paymentHash,
      bookingContractHash: readiness.contractHash, completionEventId: input.completion.id,
      allocationApprovalEventId: allocation.evidenceId, allocationEvidenceHash: readiness.allocationEvidenceHash,
      grossAmountMinor: readiness.eligibleGrossAmountMinor, commissionAmountMinor: readiness.commissionAmountMinor,
      otherDeductionsMinor: readiness.otherDeductionsMinor, netAmountMinor: entry.amountMinor, currency: 'SAR',
    };
    return { finalization, snapshot, paymentId: input.payment.id, bookingId: input.booking.id };
  }

  ownerCenters(accountId: string) {
    return this.db.serializable(async tx => {
      await requirePlatformFinanceApprover(tx, accountId);
      const entries = await tx.financeEntry.findMany({ where: { referenceType, type: 'SETTLEMENT', status: { in: ['APPROVED', 'POSTED'] } },
        select: { organizationId: true }, distinct: ['organizationId'] });
      const history = await tx.centerServiceTransferReceipt.findMany({ select: { organizationId: true }, distinct: ['organizationId'] });
      const organizationIds = [...new Set([...entries, ...history].map(row => row.organizationId))];
      const centers = await tx.orgUnit.findMany({ where: { type: 'CENTER', active: true, organizationId: { in: organizationIds },
        organization: { status: 'ACTIVE', kind: 'DIVE_CENTER' } },
        select: { id: true, organizationId: true, nameAr: true, organization: { select: { legalName: true, displayName: true } } },
        orderBy: [{ nameAr: 'asc' }, { id: 'asc' }] });
      return { centers: centers.map(row => ({ id: row.id, organizationId: row.organizationId, nameAr: row.nameAr,
        organizationName: row.organization.legalName || row.organization.displayName })) };
    });
  }

  list(accountId: string, centerId: string, bookingId?: string) {
    if (bookingId !== undefined && !identifier(bookingId)) throw new BadRequestException('Booking identifier is invalid.');
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'READ');
      const rows = await tx.centerServiceTransferReceipt.findMany({ where: { organizationId: scope.organizationId, centerOrgUnitId: centerId,
        ...(bookingId ? { bookingId } : {}) }, select: receiptSummarySelect, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }], take: 100 });
      const entries = await tx.financeEntry.findMany({ where: { organizationId: scope.organizationId, referenceType, type: 'SETTLEMENT',
        ...(bookingId ? { referenceId: bookingId } : {}), OR: [{ id: { in: rows.map(row => row.financeEntryId) } }, { status: 'APPROVED' }] },
        select: { id: true, referenceId: true, amountMinor: true, currency: true, status: true, requestedByAccountId: true, approvedByAccountId: true },
        orderBy: { createdAt: 'desc' }, take: 200 });
      const byId = new Map(entries.map(entry => [entry.id, entry]));
      const active = await tx.centerServiceTransferReceipt.findMany({ where: { activeFinanceEntryId: { in: entries.map(entry => entry.id) } }, select: { financeEntryId: true } });
      const activeIds = new Set(active.map(row => row.financeEntryId));
      return { items: rows.map(row => this.summary(row, accountId, scope, byId.get(row.financeEntryId))), canSubmit: scope.owner,
        candidates: scope.owner ? entries.filter(entry => entry.status === 'APPROVED' && !activeIds.has(entry.id)).map(entry => ({
          financeEntryId: entry.id, bookingId: entry.referenceId, amountMinor: entry.amountMinor, currency: entry.currency,
        })) : [] };
    });
  }

  async submit(accountId: string, centerId: string, input: CenterTransferSubmission) {
    if (!object(input) || Object.keys(input).some(key => !['requestId', 'financeEntryId', 'bankName', 'bankReference', 'amountMinor', 'currency', 'transferredAt', 'documentBase64'].includes(key))
      || typeof input.requestId !== 'string' || !uuid.test(input.requestId) || !identifier(input.financeEntryId) || !Number.isSafeInteger(input.amountMinor)
      || input.amountMinor <= 0 || input.amountMinor > 2_147_483_647 || input.currency !== 'SAR') throw new BadRequestException('External transfer fields are invalid.');
    const bankName = text(input.bankName, 'Bank name'), bankReference = text(input.bankReference, 'Bank reference');
    const transferredAt = timestamp(input.transferredAt, 'Transfer time');
    const normalizedBank = bankName.normalize('NFKC').toUpperCase().replace(/\s+/g, ' ');
    const normalizedReference = bankReference.normalize('NFKC').toUpperCase().replace(/\s+/g, '');
    const bankReferenceKey = entitlementContractHash([normalizedBank, normalizedReference]);
    await this.db.serializable(tx => this.scope(tx, accountId, centerId, 'SUBMIT'));
    const document = await pdf(input.documentBase64);
    const persist = () => this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'SUBMIT');
      const entry = await this.entry(tx, scope, input.financeEntryId);
      await this.lockReference(tx, bankReferenceKey);
      const prior = await tx.centerServiceTransferReceipt.findUnique({ where: { id: input.requestId } });
      if (prior) {
        if (prior.financeEntryId !== entry.id || prior.centerOrgUnitId !== centerId || prior.organizationId !== scope.organizationId
          || prior.submittedBy !== accountId || prior.bankName !== bankName || prior.bankReference !== bankReference
          || prior.bankReferenceKey !== bankReferenceKey || prior.amountMinor !== input.amountMinor || prior.currency !== input.currency
          || prior.transferredAt.getTime() !== transferredAt.getTime() || prior.documentSha256 !== document.sha256) {
          throw new ConflictException('The request identifier already belongs to different transfer evidence.');
        }
        return this.summary(prior, accountId, scope, entry);
      }
      if (await tx.centerServiceTransferReceipt.findUnique({ where: { activeFinanceEntryId: entry.id } })) {
        throw new ConflictException('An existing transfer for this settlement requires review; no additional transfer is authorized.');
      }
      if (await tx.commerceSourceTransferReceipt.findUnique({ where: { activeFinanceEntryId: entry.id } })) {
        throw new ConflictException('This settlement already has commerce transfer evidence.');
      }
      const referenceHistory = await tx.centerServiceTransferReceipt.findMany({ where: { bankReferenceKey }, select: { financeEntryId: true, status: true } });
      const commerceHistory = await tx.commerceSourceTransferReceipt.findMany({ where: { bankReferenceKey }, select: { financeEntryId: true, status: true } });
      const procurement = await tx.procurementMoneyProof.findUnique({ where: { bankReferenceKey }, select: { id: true } });
      if (procurement || [...referenceHistory, ...commerceHistory].some(row => row.financeEntryId !== entry.id || row.status !== 'REJECTED')) {
        throw new ConflictException('This bank reference is already attributed to an unresolved or different settlement.');
      }
      const source = await this.source(tx, scope, entry);
      if (entry.amountMinor !== input.amountMinor || transferredAt < entry.approvedAt! || transferredAt < source.finalization.issuedAt) {
        throw new ConflictException('The transfer must match the approved net amount and follow settlement approval and invoice issuance.');
      }
      const row = await tx.centerServiceTransferReceipt.create({ data: {
        id: input.requestId, financeEntryId: entry.id, activeFinanceEntryId: entry.id, organizationId: scope.organizationId, centerOrgUnitId: centerId,
        bookingId: source.bookingId, paymentId: source.paymentId, invoiceFinalizationId: source.finalization.id,
        bankName, bankReference, bankReferenceKey, amountMinor: input.amountMinor, currency: 'SAR', transferredAt,
        document: document.bytes, documentSha256: document.sha256, evidenceSnapshot: json(source.snapshot), status: 'PENDING', submittedBy: accountId,
      } });
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'CENTER_SERVICE_EXTERNAL_TRANSFER_SUBMITTED',
        resource: 'CenterServiceTransferReceipt', resourceId: row.id, metadata: { organizationId: scope.organizationId, financeEntryId: entry.id,
          bookingId: source.bookingId, invoiceFinalizationId: source.finalization.id, amountMinor: row.amountMinor, currency: 'SAR',
          documentSha256: row.documentSha256, bankReferenceKey, bankTransferExecuted: false, providerVerified: false } } });
      return this.summary(row, accountId, scope, entry);
    });
    try { return await persist(); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return persist();
      throw error;
    }
  }

  async review(accountId: string, centerId: string, id: string, input: CenterTransferReview) {
    if (!identifier(id) || !object(input) || !['CONFIRMED', 'REJECTED'].includes(input.decision)
      || Object.keys(input).some(key => !['decision', 'note', 'receivedAt', 'documentBase64'].includes(key))) {
      throw new BadRequestException('Transfer review fields are invalid.');
    }
    const note = text(input.note, 'Review note', 1000);
    if (note.length < 5) throw new BadRequestException('Explain the independent receipt confirmation or rejection.');
    if (input.decision === 'REJECTED' && (input.receivedAt !== undefined || input.documentBase64 !== undefined)) {
      throw new BadRequestException('A rejected transfer cannot contain a receipt confirmation.');
    }
    await this.db.serializable(tx => this.scope(tx, accountId, centerId, 'REVIEW'));
    const receivedAt = input.decision === 'CONFIRMED' ? timestamp(input.receivedAt, 'Receipt time') : null;
    const receipt = input.decision === 'CONFIRMED' ? await pdf(input.documentBase64) : null;
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'REVIEW');
      const initial = await tx.centerServiceTransferReceipt.findFirst({ where: { id, centerOrgUnitId: centerId, organizationId: scope.organizationId } });
      if (!initial) throw new NotFoundException('Transfer receipt not found.');
      const entry = await this.entry(tx, scope, initial.financeEntryId);
      await this.lockReference(tx, initial.bankReferenceKey);
      const row = await tx.centerServiceTransferReceipt.findUniqueOrThrow({ where: { id } });
      if (!this.independent(accountId, row, entry)) throw new ForbiddenException('Receipt confirmation requires a center accountant independent of the requester, approver and submitter.');
      if (row.status !== 'PENDING') {
        if (row.status !== input.decision || row.reviewedBy !== accountId || row.decisionNote !== note
          || row.receivedAt?.getTime() !== receivedAt?.getTime() || row.receiptDocumentSha256 !== (receipt?.sha256 ?? null)) {
          throw new ConflictException('This transfer has already been reviewed with different evidence.');
        }
        return this.summary(row, accountId, scope, entry);
      }
      if (row.activeFinanceEntryId !== entry.id || entry.status !== 'APPROVED') throw new ConflictException('The original transfer and approved settlement require reconciliation.');
      const now = new Date();
      if (input.decision === 'CONFIRMED') {
        if (!receipt || !receivedAt || receivedAt < row.transferredAt || receipt.sha256 === row.documentSha256
          || hash(row.document) !== row.documentSha256 || row.amountMinor !== entry.amountMinor || row.currency !== 'SAR') {
          throw new ConflictException('Independent bank receipt evidence must match the original transfer and its time.');
        }
        const source = await this.source(tx, scope, entry);
        if (row.bookingId !== source.bookingId || row.paymentId !== source.paymentId || row.invoiceFinalizationId !== source.finalization.id
          || entitlementContractHash(row.evidenceSnapshot) !== entitlementContractHash(source.snapshot)) {
          throw new ConflictException('Transfer source evidence changed; reconcile it before confirming receipt.');
        }
        const posted = await tx.financeEntry.updateMany({ where: { id: entry.id, status: 'APPROVED', postedAt: null, postedByAccountId: null },
          data: { status: 'POSTED', postedByAccountId: accountId, postedAt: now } });
        if (posted.count !== 1) throw new ConflictException('Settlement changed during receipt confirmation.');
        await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'FINANCE_ENTRY_POSTED', resource: 'FinanceEntry', resourceId: entry.id,
          metadata: { organizationId: scope.organizationId, transferReceiptId: id, invoiceFinalizationId: row.invoiceFinalizationId,
            externalTransferConfirmed: true, bankTransferExecuted: false, providerVerified: false } } });
      }
      const saved = await tx.centerServiceTransferReceipt.updateMany({ where: { id, status: 'PENDING', activeFinanceEntryId: entry.id }, data: {
        status: input.decision, activeFinanceEntryId: input.decision === 'REJECTED' ? null : entry.id,
        reviewedBy: accountId, reviewedAt: now, decisionNote: note, receivedAt,
        receiptDocument: receipt?.bytes ?? null, receiptDocumentSha256: receipt?.sha256 ?? null,
      } });
      if (saved.count !== 1) throw new ConflictException('Transfer evidence changed during review.');
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: `CENTER_SERVICE_EXTERNAL_TRANSFER_${input.decision}`,
        resource: 'CenterServiceTransferReceipt', resourceId: id, metadata: { organizationId: scope.organizationId, financeEntryId: entry.id,
          invoiceFinalizationId: row.invoiceFinalizationId, documentSha256: row.documentSha256, receiptDocumentSha256: receipt?.sha256 ?? null,
          note, externalTransferConfirmed: input.decision === 'CONFIRMED', bankTransferExecuted: false, providerVerified: false } } });
      return this.summary(await tx.centerServiceTransferReceipt.findUniqueOrThrow({ where: { id } }), accountId, scope,
        { ...entry, status: input.decision === 'CONFIRMED' ? 'POSTED' : entry.status });
    });
  }

  download(accountId: string, centerId: string, id: string, kind: string) {
    if (!identifier(id) || !['transfer', 'receipt'].includes(kind)) throw new BadRequestException('Transfer document reference is invalid.');
    return this.db.serializable(async tx => {
      const scope = await this.scope(tx, accountId, centerId, 'READ');
      const row = await tx.centerServiceTransferReceipt.findFirst({ where: { id, centerOrgUnitId: centerId, organizationId: scope.organizationId } });
      const bytes = kind === 'transfer' ? row?.document : row?.receiptDocument;
      const digest = kind === 'transfer' ? row?.documentSha256 : row?.receiptDocumentSha256;
      if (!bytes || !digest) throw new NotFoundException('Transfer document not found.');
      if (hash(bytes) !== digest) throw new ConflictException('The stored original document requires reconciliation.');
      return Buffer.from(bytes);
    });
  }
}
