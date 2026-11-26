import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommerceSourceTransferReceipt, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { CommerceFinanceScope, CommerceSourceFinanceService } from './commerce-source-finance.service';
import { COMMERCE_SOURCE_TYPES, commerceEntitlementReference } from './commerce-source-evidence';
import { entitlementContractHash as hash } from './center-service-entitlement';
import { CenterTransferReview, CenterTransferSubmission, transferPdf, transferText, transferTimestamp } from './center-service-transfer.service';

type Tx = Prisma.TransactionClient;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200;
const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const summarySelect = { id: true, financeEntryId: true, activeFinanceEntryId: true, organizationId: true, centerOrgUnitId: true,
  sourceType: true, sourceId: true, invoiceFinalizationId: true, bankName: true, bankReference: true, amountMinor: true, currency: true,
  transferredAt: true, status: true, submittedBy: true, submittedAt: true, reviewedBy: true, reviewedAt: true, receivedAt: true,
  decisionNote: true, documentSha256: true, receiptDocumentSha256: true } satisfies Prisma.CommerceSourceTransferReceiptSelect;
type Summary = Prisma.CommerceSourceTransferReceiptGetPayload<{ select: typeof summarySelect }>;

/** Evidence of an external transfer, with independent incoming receipt confirmation. No bank API is called. */
@Injectable()
export class CommerceSourceTransferService {
  constructor(private readonly db: DatabaseService, private readonly finance: CommerceSourceFinanceService) {}

  private async entry(tx: Tx, scope: CommerceFinanceScope, id: string) {
    const initial = await tx.financeEntry.findFirst({ where: { id, organizationId: scope.organizationId, type: 'SETTLEMENT',
      referenceType: { in: COMMERCE_SOURCE_TYPES.map(commerceEntitlementReference) } } });
    if (!initial) throw new NotFoundException('Commerce settlement not found.');
    const type = COMMERCE_SOURCE_TYPES.find(value => commerceEntitlementReference(value) === initial.referenceType)!;
    await this.finance.lock(tx, scope.organizationId, type, initial.referenceId);
    await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${id} FOR UPDATE`;
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id } });
    if (entry.referenceType !== initial.referenceType || entry.referenceId !== initial.referenceId || entry.organizationId !== scope.organizationId) {
      throw new ConflictException('Settlement source changed.');
    }
    return entry;
  }

  private async reference(tx: Tx, key: string) {
    // Shared lock with B12 so one external bank reference cannot fund two source types.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`center-service-transfer-reference:${key}`},0))`;
  }

  private independent(actor: string, row: Pick<CommerceSourceTransferReceipt, 'submittedBy'>,
    entry: { requestedByAccountId: string; approvedByAccountId: string | null }) {
    return ![row.submittedBy, entry.requestedByAccountId, entry.approvedByAccountId].includes(actor);
  }

  private summary(row: Summary, actor: string, scope: CommerceFinanceScope,
    entry?: { status: string; requestedByAccountId: string; approvedByAccountId: string | null }) {
    const { activeFinanceEntryId: _active, organizationId: _organization, centerOrgUnitId: _center, ...safe } = row;
    return { ...safe, bankTransferExecuted: false, providerVerified: false, externalTransferConfirmed: row.status === 'CONFIRMED',
      canConfirm: Boolean(scope.accountant && row.status === 'PENDING' && entry?.status === 'APPROVED' && this.independent(actor, row, entry)) };
  }

  list(accountId: string, centerId: string) {
    return this.db.serializable(async tx => {
      const scope = await this.finance.scope(tx, accountId, centerId);
      const rows = await tx.commerceSourceTransferReceipt.findMany({ where: { centerOrgUnitId: centerId, organizationId: scope.organizationId },
        select: summarySelect, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }], take: 100 });
      const entries = await tx.financeEntry.findMany({ where: { organizationId: scope.organizationId, type: 'SETTLEMENT',
        referenceType: { in: COMMERCE_SOURCE_TYPES.map(commerceEntitlementReference) }, OR: [{ status: 'APPROVED' }, { id: { in: rows.map(row => row.financeEntryId) } }] },
        select: { id: true, referenceType: true, referenceId: true, amountMinor: true, currency: true, status: true, requestedByAccountId: true, approvedByAccountId: true },
        orderBy: { createdAt: 'desc' }, take: 200 });
      const byId = new Map(entries.map(entry => [entry.id, entry]));
      const active = await tx.commerceSourceTransferReceipt.findMany({ where: { activeFinanceEntryId: { in: entries.map(row => row.id) } }, select: { financeEntryId: true } });
      const legacy = await tx.centerServiceTransferReceipt.findMany({ where: { activeFinanceEntryId: { in: entries.map(row => row.id) } }, select: { financeEntryId: true } });
      const activeIds = new Set([...active, ...legacy].map(row => row.financeEntryId));
      const personalTrips = new Set((await tx.booking.findMany({ where: { organizationId: null,
        id: { in: entries.filter(row => row.referenceType === 'CENTER_SERVICE_ENTITLEMENT').map(row => row.referenceId) } }, select: { id: true } })).map(row => row.id));
      return { canSubmit: scope.owner, items: rows.map(row => this.summary(row, accountId, scope, byId.get(row.financeEntryId))),
        candidates: scope.owner ? entries.filter(entry => entry.status === 'APPROVED' && !activeIds.has(entry.id)
          && (entry.referenceType !== 'CENTER_SERVICE_ENTITLEMENT' || personalTrips.has(entry.referenceId))).map(entry => ({
          financeEntryId: entry.id, sourceType: COMMERCE_SOURCE_TYPES.find(type => commerceEntitlementReference(type) === entry.referenceType),
          sourceId: entry.referenceId, amountMinor: entry.amountMinor, currency: entry.currency })) : [] };
    });
  }

  async submit(accountId: string, centerId: string, input: CenterTransferSubmission) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key =>
      !['requestId', 'financeEntryId', 'bankName', 'bankReference', 'amountMinor', 'currency', 'transferredAt', 'documentBase64'].includes(key))
      || typeof input.requestId !== 'string' || !uuid.test(input.requestId) || !identifier(input.financeEntryId)
      || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > 2147483647 || input.currency !== 'SAR') {
      throw new BadRequestException('External transfer fields are invalid.');
    }
    const bankName = transferText(input.bankName, 'Bank name'), bankReference = transferText(input.bankReference, 'Bank reference');
    const transferredAt = transferTimestamp(input.transferredAt, 'Transfer time');
    const bankReferenceKey = hash([bankName.normalize('NFKC').toUpperCase().replace(/\s+/g, ' '), bankReference.normalize('NFKC').toUpperCase().replace(/\s+/g, '')]);
    await this.db.serializable(tx => this.finance.scope(tx, accountId, centerId, 'OWNER'));
    const document = await transferPdf(input.documentBase64);
    const persist = () => this.db.serializable(async tx => {
      const scope = await this.finance.scope(tx, accountId, centerId, 'OWNER'), entry = await this.entry(tx, scope, input.financeEntryId);
      await this.reference(tx, bankReferenceKey);
      const previous = await tx.commerceSourceTransferReceipt.findUnique({ where: { id: input.requestId } });
      if (previous) {
        if (previous.financeEntryId !== entry.id || previous.organizationId !== scope.organizationId || previous.centerOrgUnitId !== centerId
          || previous.submittedBy !== accountId || previous.bankName !== bankName || previous.bankReference !== bankReference
          || previous.bankReferenceKey !== bankReferenceKey || previous.amountMinor !== input.amountMinor || previous.currency !== 'SAR'
          || previous.transferredAt.getTime() !== transferredAt.getTime() || previous.documentSha256 !== document.sha256) throw new ConflictException('Transfer request was used with different evidence.');
        return this.summary(previous, accountId, scope, entry);
      }
      if (await tx.commerceSourceTransferReceipt.findUnique({ where: { activeFinanceEntryId: entry.id } })
        || await tx.centerServiceTransferReceipt.findUnique({ where: { activeFinanceEntryId: entry.id } })) throw new ConflictException('This settlement already has transfer evidence.');
      const [history, previousSystem] = await Promise.all([
        tx.commerceSourceTransferReceipt.findMany({ where: { bankReferenceKey }, select: { financeEntryId: true, status: true } }),
        tx.centerServiceTransferReceipt.findMany({ where: { bankReferenceKey }, select: { financeEntryId: true, status: true } }),
      ]);
      const procurement = await tx.procurementMoneyProof.findUnique({ where: { bankReferenceKey }, select: { id: true } });
      if (procurement || [...history, ...previousSystem].some(row => row.financeEntryId !== entry.id || row.status !== 'REJECTED')) {
        throw new ConflictException('Bank reference is already attributed to another or unresolved transfer.');
      }
      const source = await this.finance.transferSource(tx, scope, entry.id);
      if (entry.amountMinor !== input.amountMinor || transferredAt < source.entry.approvedAt! || transferredAt < source.invoice.issuedAt) {
        throw new ConflictException('Transfer amount and time must match the approved net settlement and issued invoice.');
      }
      const row = await tx.commerceSourceTransferReceipt.create({ data: { id: input.requestId, financeEntryId: entry.id, activeFinanceEntryId: entry.id,
        organizationId: scope.organizationId, centerOrgUnitId: centerId, sourceType: source.sourceType, sourceId: source.sourceId,
        invoiceFinalizationId: source.invoice.id, bankName, bankReference, bankReferenceKey, amountMinor: input.amountMinor, currency: 'SAR', transferredAt,
        document: document.bytes, documentSha256: document.sha256, evidenceSnapshot: source.snapshot, status: 'PENDING', submittedBy: accountId } });
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'COMMERCE_SOURCE_EXTERNAL_TRANSFER_SUBMITTED', resource: 'CommerceSourceTransferReceipt',
        resourceId: row.id, metadata: { sourceType: row.sourceType, sourceId: row.sourceId, financeEntryId: entry.id, organizationId: scope.organizationId,
          invoiceFinalizationId: source.invoice.id, amountMinor: row.amountMinor, currency: 'SAR', documentSha256: document.sha256, bankReferenceKey,
          bankTransferExecuted: false, providerVerified: false } } });
      return this.summary(row, accountId, scope, entry);
    });
    try { return await persist(); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return persist(); throw error; }
  }

  async review(accountId: string, centerId: string, id: string, input: CenterTransferReview) {
    if (!identifier(id) || !input || typeof input !== 'object' || Array.isArray(input) || !['CONFIRMED', 'REJECTED'].includes(input.decision)
      || Object.keys(input).some(key => !['decision', 'note', 'receivedAt', 'documentBase64'].includes(key))) throw new BadRequestException('Review fields are invalid.');
    const note = transferText(input.note, 'Review note', 1000);
    if (note.length < 5 || input.decision === 'REJECTED' && (input.receivedAt !== undefined || input.documentBase64 !== undefined)) throw new BadRequestException('Explain the independent decision and attach receipt proof only for confirmation.');
    await this.db.serializable(tx => this.finance.scope(tx, accountId, centerId, 'ACCOUNTANT'));
    const receivedAt = input.decision === 'CONFIRMED' ? transferTimestamp(input.receivedAt, 'Receipt time') : null;
    const receipt = input.decision === 'CONFIRMED' ? await transferPdf(input.documentBase64) : null;
    return this.db.serializable(async tx => {
      const scope = await this.finance.scope(tx, accountId, centerId, 'ACCOUNTANT');
      const initial = await tx.commerceSourceTransferReceipt.findFirst({ where: { id, centerOrgUnitId: centerId, organizationId: scope.organizationId } });
      if (!initial) throw new NotFoundException('Transfer evidence not found.');
      const entry = await this.entry(tx, scope, initial.financeEntryId); await this.reference(tx, initial.bankReferenceKey);
      const row = await tx.commerceSourceTransferReceipt.findUniqueOrThrow({ where: { id } });
      if (!this.independent(accountId, row, entry)) throw new ForbiddenException('An independent center accountant must confirm incoming receipt.');
      if (row.status !== 'PENDING') {
        if (row.status !== input.decision || row.reviewedBy !== accountId || row.decisionNote !== note
          || row.receivedAt?.getTime() !== receivedAt?.getTime() || row.receiptDocumentSha256 !== (receipt?.sha256 ?? null)) throw new ConflictException('Transfer already reviewed with different evidence.');
        return this.summary(row, accountId, scope, entry);
      }
      if (row.activeFinanceEntryId !== entry.id || entry.status !== 'APPROVED') throw new ConflictException('Original approved settlement requires reconciliation.');
      const now = new Date();
      if (input.decision === 'CONFIRMED') {
        if (!receipt || !receivedAt || receivedAt < row.transferredAt || receipt.sha256 === row.documentSha256
          || digest(row.document) !== row.documentSha256 || row.amountMinor !== entry.amountMinor || row.currency !== 'SAR') {
          throw new ConflictException('Independent incoming receipt must match the original transfer.');
        }
        const source = await this.finance.transferSource(tx, scope, entry.id);
        if (source.sourceType !== row.sourceType || source.sourceId !== row.sourceId || source.invoice.id !== row.invoiceFinalizationId
          || hash(source.snapshot) !== hash(row.evidenceSnapshot)) throw new ConflictException('Transfer source evidence changed; reconcile before confirming receipt.');
        const posted = await tx.financeEntry.updateMany({ where: { id: entry.id, status: 'APPROVED', postedAt: null, postedByAccountId: null },
          data: { status: 'POSTED', postedByAccountId: accountId, postedAt: now } });
        if (posted.count !== 1) throw new ConflictException('Settlement changed during receipt confirmation.');
        await tx.auditEvent.create({ data: { actorId: scope.personId, action: 'FINANCE_ENTRY_POSTED', resource: 'FinanceEntry', resourceId: entry.id,
          metadata: { organizationId: scope.organizationId, transferReceiptId: id, sourceType: row.sourceType, sourceId: row.sourceId,
            invoiceFinalizationId: row.invoiceFinalizationId, externalTransferConfirmed: true, bankTransferExecuted: false, providerVerified: false } } });
      }
      const saved = await tx.commerceSourceTransferReceipt.updateMany({ where: { id, status: 'PENDING', activeFinanceEntryId: entry.id }, data: {
        status: input.decision, activeFinanceEntryId: input.decision === 'REJECTED' ? null : entry.id,
        reviewedBy: accountId, reviewedAt: now, decisionNote: note, receivedAt, receiptDocument: receipt?.bytes ?? null, receiptDocumentSha256: receipt?.sha256 ?? null } });
      if (saved.count !== 1) throw new ConflictException('Transfer changed during receipt review.');
      await tx.auditEvent.create({ data: { actorId: scope.personId, action: `COMMERCE_SOURCE_EXTERNAL_TRANSFER_${input.decision}`,
        resource: 'CommerceSourceTransferReceipt', resourceId: id, metadata: { sourceType: row.sourceType, sourceId: row.sourceId,
          financeEntryId: entry.id, organizationId: scope.organizationId, note, documentSha256: row.documentSha256,
          receiptDocumentSha256: receipt?.sha256 ?? null, externalTransferConfirmed: input.decision === 'CONFIRMED', bankTransferExecuted: false, providerVerified: false } } });
      return this.summary(await tx.commerceSourceTransferReceipt.findUniqueOrThrow({ where: { id } }), accountId, scope,
        { ...entry, status: input.decision === 'CONFIRMED' ? 'POSTED' : entry.status });
    });
  }

  download(accountId: string, centerId: string, id: string, kind: string) {
    if (!identifier(id) || !['transfer', 'receipt'].includes(kind)) throw new BadRequestException('Document reference is invalid.');
    return this.db.serializable(async tx => {
      const scope = await this.finance.scope(tx, accountId, centerId);
      const row = await tx.commerceSourceTransferReceipt.findFirst({ where: { id, centerOrgUnitId: centerId, organizationId: scope.organizationId } });
      const bytes = kind === 'transfer' ? row?.document : row?.receiptDocument;
      const originalHash = kind === 'transfer' ? row?.documentSha256 : row?.receiptDocumentSha256;
      if (!bytes || !originalHash) throw new NotFoundException('Original document not found.');
      if (digest(bytes) !== originalHash) throw new ConflictException('Original document integrity requires review.');
      return Buffer.from(bytes);
    });
  }
}
