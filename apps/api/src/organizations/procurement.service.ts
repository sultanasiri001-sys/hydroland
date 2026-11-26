import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { postingTransaction, verifiedEntry } from '../finance/posting/ledger-proof';
import { bankKey, digestValue, hash, id, integer, json, object, PROCUREMENT_RECOVERY, PROCUREMENT_SETTLEMENT, PROCUREMENT_TEMPLATES, procurementInvoiceKey, ProcurementTerms, purchaseLines, quantities, text, timestamp } from './procurement.domain';
import { documentReference, procurementAuthority, procurementAuthorityBinding, procurementContract, procurementDocument, ProcurementDocument, procurementScope, procurementSupplier } from './procurement-evidence';

const include = { receipts: { orderBy: { id: 'asc' as const } }, moneyProofs: { orderBy: { id: 'asc' as const } }, events: { orderBy: { afterRevision: 'asc' as const } } };
type Order = Prisma.ProcurementOrderGetPayload<{ include: typeof include }>;
type Ledger = Prisma.FinanceEntryGetPayload<{ include: { approvals: true; financeAccount: true } }>;
type Scope = Awaited<ReturnType<typeof procurementScope>>;
type Authority = Awaited<ReturnType<typeof procurementAuthority>>;
type Occurrence = { orderId: string; eventId: string; receiptId: string; proofId: string; entryId: string; approvalId: string; auditId: string; financeAuditId: string; at: Date };
const occurrence = (): Occurrence => ({ orderId: randomUUID(), eventId: randomUUID(), receiptId: randomUUID(), proofId: randomUUID(), entryId: randomUUID(), approvalId: randomUUID(), auditId: randomUUID(), financeAuditId: randomUUID(), at: new Date() });
const nullable = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const activeProof = (order: Order, kind: 'SETTLEMENT' | 'RECOVERY') => order.moneyProofs.find(proof => proof.kind === kind && proof.activeKey !== null);
const completed = (order: Order) => ['SETTLED', 'REVERSED', 'RECOVERED'].includes(order.status);
const access = (allowed: boolean, reason: string | null = null) => ({ allowed, reason: allowed ? null : reason ?? 'The current source state and named authority do not permit this action.' });
const errorMessage = (error: unknown): string => {
  if (error instanceof HttpException && error.getStatus() >= 400 && error.getStatus() < 500) return error.message;
  // A query outage, a Prisma error or a programming error is not domain evidence
  // of drift. Let Nest return its generic server error without leaking internals.
  throw error;
};

@Injectable()
export class ProcurementService {
  constructor(private readonly db: DatabaseService) {}

  private async load(tx: Prisma.TransactionClient, organizationId: string, orderId: string) {
    const order = await tx.procurementOrder.findFirst({ where: { id: orderId, organizationId }, include });
    if (!order) throw new NotFoundException('Procurement order not found in the organization.');
    return order;
  }

  private async ledgers(tx: Prisma.TransactionClient, order: Order) {
    return tx.financeEntry.findMany({ where: { id: { in: order.moneyProofs.map(proof => proof.financeEntryId) } }, include: { approvals: true, financeAccount: true }, orderBy: { id: 'asc' } });
  }

  private storedState(order: Order, entries: Ledger[]) {
    const { events: _events, ...stored } = order;
    return { order: stored, entries: entries.map(entry => ({ ...entry, financeAccount: { id: entry.financeAccount.id, organizationId: entry.financeAccount.organizationId, currency: entry.financeAccount.currency }, approvals: [...entry.approvals].sort((a, b) => a.id.localeCompare(b.id)) })) };
  }

  private completionDigest(order: Order, entries: Ledger[]) {
    const state = this.storedState(order, entries);
    const { acceptanceSnapshot: _acceptance, revision: _revision, updatedAt: _updated, ...effects } = state.order;
    return hash({ schemaVersion: 1, order: effects, entries: state.entries });
  }

  private receiptDigest(order: Order) {
    return hash({ schemaVersion: 1, orderId: order.id, contractHash: order.contractHash, supplierHash: order.supplierHash,
      receipts: order.receipts.map(receipt => ({ id: receipt.id, documentId: receipt.documentId, documentVersion: receipt.documentVersion, documentHash: receipt.documentHash, lines: receipt.lines, receivedByAccountId: receipt.receivedByAccountId, receivedByPersonId: receipt.receivedByPersonId })) });
  }

  private quantities(order: Order) {
    const terms = order.terms as unknown as ProcurementTerms;
    const received = new Map<string, number>();
    for (const receipt of order.receipts) for (const line of quantities(receipt.lines)) received.set(line.lineId, (received.get(line.lineId) ?? 0) + line.quantity);
    if ([...received.keys()].some(lineId => !terms.lines.some(line => line.lineId === lineId))) throw new ConflictException('Receipt evidence contains an unknown purchase line.');
    const reversed = Boolean(order.reversalSnapshot);
    const lines = terms.lines.map(line => {
      const receivedQuantity = received.get(line.lineId) ?? 0;
      if (receivedQuantity > line.quantity) throw new ConflictException('Cumulative receipts exceed the approved purchase quantity.');
      return { ...line, subtotalMinor: line.quantity * line.unitPriceMinor, totalMinor: line.quantity * line.unitPriceMinor + line.taxMinor, receivedQuantity, remainingQuantity: line.quantity - receivedQuantity, returnedQuantity: reversed ? receivedQuantity : 0 };
    });
    return { lines, full: lines.every(line => line.remainingQuantity === 0), any: lines.some(line => line.receivedQuantity > 0) };
  }

  private documentProof(source: ProcurementDocument, actorAccountId: string, at: Date) {
    return json({ document: documentReference(source), documentSnapshot: source.snapshot, payload: source.payload, attachments: source.attachments, recordedByAccountId: actorAccountId, recordedAt: at.toISOString() });
  }

  private async validateProof(tx: Prisma.TransactionClient, order: Order, value: unknown, kind: string, pdf = false) {
    const proof = object(value), ref = object(proof.document);
    const source = await procurementDocument(tx, order.organizationId, id(ref.id), { pdf });
    if (source.version !== ref.version || source.hash !== ref.hash || hash(source.snapshot) !== hash(proof.documentSnapshot) || hash(source.payload) !== hash(proof.payload)) throw new ConflictException('Recorded procurement evidence no longer matches its original document.');
    this.bindDocument(order, source, kind);
    return source;
  }

  private bindDocument(order: Order, source: ProcurementDocument, kind: string) {
    const payload = source.payload;
    if (payload.purpose !== 'F08_PROCUREMENT_EVIDENCE_V1' || payload.kind !== kind || payload.orderId !== order.id || payload.contractHash !== order.contractHash) throw new ConflictException('The signed evidence does not bind this order, contract and operation.');
    text(payload.reference, 'Original evidence reference'); text(payload.findings, 'Verification findings', 8000);
    const occurredAt = timestamp(payload.occurredAt).getTime(), approvalAt = Date.parse(String(nullable(order.approval)?.occurredAt ?? ''));
    const receiptTimes = order.receipts.flatMap(receipt => [receipt.createdAt.getTime(), Date.parse(String(nullable(nullable(receipt.documentSnapshot)?.payload)?.occurredAt ?? ''))]);
    let prerequisites: number[] = [];
    if (kind === 'RECEIPT') prerequisites = [approvalAt];
    if (kind === 'RECEIPT_ACCEPTANCE') prerequisites = [approvalAt, ...receiptTimes];
    if (kind === 'REVERSAL') prerequisites = [approvalAt, ...receiptTimes, ...order.moneyProofs.filter(proof => proof.kind === 'SETTLEMENT' && proof.status === 'CONFIRMED').flatMap(proof => [proof.transferredAt?.getTime() ?? NaN, proof.confirmedAt?.getTime() ?? NaN])];
    if (kind === 'FINAL_ACCEPTANCE') prerequisites = [approvalAt, ...receiptTimes,
      ...order.moneyProofs.filter(proof => proof.status === 'CONFIRMED').map(proof => proof.confirmedAt?.getTime() ?? NaN),
      ...(order.reversalSnapshot ? [Date.parse(String(nullable(order.reversalSnapshot)?.recordedAt))] : []),
      ...(order.receiptAcceptanceSnapshot ? [Date.parse(String(nullable(order.receiptAcceptanceSnapshot)?.recordedAt))] : [])];
    if (prerequisites.some(time => !Number.isFinite(time) || occurredAt < time)) throw new ConflictException('Execution or acceptance evidence cannot predate the authority and completed source effects it attests.');
  }

  private async sourceForCommand(tx: Prisma.TransactionClient, order: Order, input: Record<string, unknown>, kind: string, pdf = false) {
    const source = await procurementDocument(tx, order.organizationId, id(input.documentId), { pdf });
    if (source.version !== integer(input.documentVersion, 'Document version', 1) || source.hash !== digestValue(input.documentHash)) throw new ConflictException('The source document changed. Reload its current evidence hash.');
    this.bindDocument(order, source, kind);
    return source;
  }

  private async integrity(tx: Prisma.TransactionClient, order: Order, entries: Ledger[]): Promise<{ reasons: string[]; authority: Authority | null }> {
    const reasons: string[] = []; let authority: Authority | null = null;
    const check = async (work: () => Promise<void>) => { try { await work(); } catch (error) { reasons.push(errorMessage(error)); } };
    await check(async () => {
      const live = await procurementContract(tx, order.organizationId, order.contractDocumentId);
      if (live.source.version !== order.contractVersion || live.source.hash !== order.contractHash || hash(live.source.snapshot) !== hash(order.contractSnapshot)
        || live.supplier.id !== order.supplierDocumentId || live.supplier.version !== order.supplierVersion || live.supplier.hash !== order.supplierHash || hash(live.supplier.snapshot) !== hash(order.supplierSnapshot)
        || hash(live.terms) !== hash(order.terms) || live.terms.totalMinor !== order.amountMinor || order.currency !== 'SAR' || live.terms.purchaseReference !== order.purchaseReference) throw new ConflictException('The stored purchase terms or supplier source no longer match the signed contract.');
      authority = await procurementAuthority(tx, order.organizationId, live.terms, order.ownerAccountId);
      if (hash(procurementAuthorityBinding(authority)) !== hash(order.authoritySnapshot)) throw new ConflictException('A named participant identity or membership mandate changed after creation.');
    });
    await check(async () => {
      if (order.events.length !== order.revision) throw new ConflictException('The procurement event chain is incomplete.');
      const audits = await tx.auditEvent.findMany({ where: { resource: 'ProcurementOrder', resourceId: order.id, action: { startsWith: 'ORGANIZATION_PROCUREMENT_' } } });
      let previousHash: string | null = null;
      for (const [index, event] of order.events.entries()) {
        const result = object(event.result);
        if (event.beforeRevision !== index || event.afterRevision !== index + 1 || result.previousEvidenceHash !== previousHash || event.evidenceHash !== this.eventHash(event)) throw new ConflictException('The immutable procurement event sequence or hash is invalid.');
        const corresponding = audits.filter(audit => nullable(audit.metadata)?.eventId === event.id);
        if (corresponding.length !== 1 || corresponding[0].actorId !== event.actorPersonId || corresponding[0].action !== `ORGANIZATION_PROCUREMENT_${event.action}`
          || nullable(corresponding[0].metadata)?.evidenceHash !== event.evidenceHash || nullable(corresponding[0].metadata)?.actorAccountId !== event.actorAccountId) throw new ConflictException('The independent audit record does not bind the procurement transition.');
        previousHash = event.evidenceHash;
      }
      if (nullable(order.events.at(-1)?.result)?.stateHash !== hash(this.storedState(order, entries))) throw new ConflictException('The stored order or its native financial evidence has changed outside its audited transition.');
    });
    await check(async () => { this.quantities(order); });
    for (const receipt of order.receipts) await check(async () => {
      const source = await procurementDocument(tx, order.organizationId, receipt.documentId);
      this.bindDocument(order, source, 'RECEIPT');
      if (source.version !== receipt.documentVersion || source.hash !== receipt.documentHash || hash(source.snapshot) !== hash(receipt.documentSnapshot) || hash(quantities(source.payload.quantities)) !== hash(receipt.lines)) throw new ConflictException('A receipt no longer matches its signed native source.');
    });
    if (order.invoiceSnapshot) await check(async () => {
      const source = await this.validateProof(tx, order, order.invoiceSnapshot, 'INVOICE', true);
      if (this.invoiceMatches(order, source.payload) !== order.invoiceKey) throw new ConflictException('The original supplier invoice identity no longer matches its exclusive order claim.');
    });
    if (order.receiptAcceptanceSnapshot) await check(async () => {
      const source = await this.validateProof(tx, order, order.receiptAcceptanceSnapshot, 'RECEIPT_ACCEPTANCE');
      if (source.payload.evidenceDigest !== this.receiptDigest(order) || !this.quantities(order).full) throw new ConflictException('Receipt acceptance no longer binds the complete current receipts.');
    });
    if (order.reversalSnapshot) await check(async () => { await this.validateProof(tx, order, order.reversalSnapshot, 'REVERSAL', true); });
    for (const proof of order.moneyProofs) await check(async () => {
      const entry = entries.find(candidate => candidate.id === proof.financeEntryId);
      if (!entry || entry.organizationId !== order.organizationId || entry.referenceId !== order.id || entry.referenceType !== (proof.kind === 'SETTLEMENT' ? PROCUREMENT_SETTLEMENT : PROCUREMENT_RECOVERY)
        || entry.type !== (proof.kind === 'SETTLEMENT' ? 'EXPENSE' : 'REVENUE') || entry.amountMinor !== order.amountMinor || proof.amountMinor !== order.amountMinor || entry.currency !== 'SAR' || proof.currency !== 'SAR'
        || entry.requestedByAccountId !== proof.preparedByAccountId || entry.financeAccount.organizationId !== order.organizationId || !entry.financeAccount.active || entry.financeAccount.currency !== 'SAR') throw new ConflictException('The native finance entry does not match this exact procurement source.');
      const expectedStatus: Record<string, string> = { PREPARED: 'PENDING_APPROVAL', APPROVED: 'APPROVED', CONFIRMED: 'POSTED', REJECTED: 'REJECTED', VOIDED: 'VOIDED' };
      if (entry.status !== expectedStatus[proof.status]) throw new ConflictException('The finance journal and procurement proof statuses disagree.');
      if (proof.status === 'CONFIRMED') {
        await verifiedEntry(tx, entry.id);
        const source = await procurementDocument(tx, order.organizationId, id(proof.documentId), { pdf: true });
        this.bindDocument(order, source, proof.kind);
        if (source.version !== proof.documentVersion || source.hash !== proof.documentHash || hash(source.snapshot) !== hash(proof.documentSnapshot) || source.payload.financeEntryId !== entry.id
          || integer(source.payload.amountMinor, 'Execution amount', 1) !== entry.amountMinor || source.payload.currency !== 'SAR'
          || text(source.payload.bankName, 'Bank name', 200) !== proof.bankName || text(source.payload.bankReference, 'Bank execution reference', 200) !== proof.bankReference || !proof.bankName || !proof.bankReference
          || bankKey(proof.bankName, proof.bankReference) !== proof.bankReferenceKey || timestamp(source.payload.occurredAt).getTime() !== proof.transferredAt?.getTime()
          || entry.approvedByAccountId !== proof.approvedByAccountId || entry.postedByAccountId !== proof.confirmedByAccountId || entry.postedAt?.getTime() !== proof.confirmedAt?.getTime()) throw new ConflictException('The confirmed financial movement no longer matches its original execution evidence.');
      }
    });
    return { reasons: [...new Set(reasons)], authority };
  }

  private invoiceMatches(order: Order, payload: Record<string, unknown>) {
    const terms = order.terms as unknown as ProcurementTerms;
    if (payload.currency !== 'SAR' || integer(payload.amountMinor, 'Invoice amount', 1) !== order.amountMinor || hash(purchaseLines(payload.lines).sort((a, b) => a.lineId.localeCompare(b.lineId))) !== hash([...terms.lines].sort((a, b) => a.lineId.localeCompare(b.lineId)))) throw new ConflictException('The invoice must match every approved purchase line, price and explicit tax exactly.');
    return procurementInvoiceKey(order.organizationId, text(nullable(nullable(order.supplierSnapshot)?.payload)?.supplierRef, 'Signed supplier reference'), text(payload.reference, 'Original invoice reference'));
  }

  private actionMap(order: Order, scope: Scope, integrity: { reasons: string[]; authority: Authority | null }) {
    const authority = integrity.authority, terms = (nullable(order.terms) ?? {}) as Partial<ProcurementTerms>, actorId = scope.actor.accountId;
    const reason = integrity.reasons[0] ?? null, valid = integrity.reasons.length === 0 && Boolean(authority);
    let quantity = { full: false, any: false }; try { quantity = this.quantities(order); } catch { /* Integrity above supplies the reason. */ }
    const role = (name: keyof ProcurementTerms['participants']) => terms.participants?.[name] === actorId;
    const owner = authority?.owner.accountId === actorId;
    const settlement = activeProof(order, 'SETTLEMENT'), recovery = activeProof(order, 'RECOVERY');
    return {
      recommend: access(valid && role('recommender') && order.status === 'REQUESTED', reason),
      approve: access(valid && owner && order.status === 'RECOMMENDED', reason),
      invoice: access(valid && role('accountant') && order.status === 'APPROVED' && !order.invoiceSnapshot && !settlement, reason),
      receive: access(valid && role('receiver') && order.status === 'APPROVED' && !quantity.full && !settlement, reason),
      receiptAcceptance: access(valid && role('acceptor') && order.status === 'APPROVED' && quantity.full && !order.receiptAcceptanceSnapshot && !settlement, reason),
      prepareSettlement: access(valid && role('accountant') && order.status === 'APPROVED' && quantity.full && Boolean(order.invoiceSnapshot) && Boolean(order.receiptAcceptanceSnapshot) && !settlement, reason),
      approveSettlement: access(valid && owner && order.status === 'APPROVED' && settlement?.status === 'PREPARED', reason),
      confirmSettlement: access(valid && role('treasurer') && order.status === 'APPROVED' && settlement?.status === 'APPROVED', reason),
      cancel: access(valid && owner && ['REQUESTED', 'RECOMMENDED', 'APPROVED'].includes(order.status) && terms.cancellationPolicy === 'BEFORE_ANY_EFFECT' && !quantity.any && !order.invoiceSnapshot && order.moneyProofs.length === 0, reason),
      reverse: access(valid && owner && ['APPROVED', 'SETTLED'].includes(order.status) && terms.reversalPolicy === 'FULL_ORDER_RETURN_AND_RECOVERY' && !order.reversalSnapshot && (quantity.any || Boolean(order.invoiceSnapshot) || Boolean(settlement)), reason),
      prepareRecovery: access(valid && role('accountant') && order.status === 'RECOVERY_REQUIRED' && !recovery, reason),
      approveRecovery: access(valid && owner && order.status === 'RECOVERY_REQUIRED' && recovery?.status === 'PREPARED', reason),
      confirmRecovery: access(valid && role('treasurer') && order.status === 'RECOVERY_REQUIRED' && recovery?.status === 'APPROVED', reason),
      acceptance: access(valid && role('acceptor') && completed(order) && !order.acceptanceSnapshot, reason),
    };
  }

  private async view(tx: Prisma.TransactionClient, scope: Scope, order: Order, command?: { eventId: string; requestId: string; replayed: boolean }) {
    const entries = await this.ledgers(tx, order), integrity = await this.integrity(tx, order, entries), actions = this.actionMap(order, scope, integrity);
    let lines: ReturnType<ProcurementService['quantities']>['lines'] = [];
    try { lines = this.quantities(order).lines; } catch { /* A corrupt quantity is not presented as a valid financial result. */ }
    const terms = order.terms as unknown as ProcurementTerms, valid = integrity.reasons.length === 0;
    const settledMinor = valid ? order.moneyProofs.filter(proof => proof.kind === 'SETTLEMENT' && proof.status === 'CONFIRMED').reduce((sum, proof) => sum + proof.amountMinor, 0) : null;
    const recoveredMinor = valid ? order.moneyProofs.filter(proof => proof.kind === 'RECOVERY' && proof.status === 'CONFIRMED').reduce((sum, proof) => sum + proof.amountMinor, 0) : null;
    const completionDigest = this.completionDigest(order, entries), receiptDigest = this.receiptDigest(order);
    let acceptanceValid = false, acceptanceReason: string | null = null;
    if (order.acceptanceSnapshot) {
      try {
        const source = await this.validateProof(tx, order, order.acceptanceSnapshot, 'FINAL_ACCEPTANCE');
        if (!valid || !completed(order) || source.payload.evidenceDigest !== completionDigest) throw new ConflictException('Final acceptance does not bind the complete current native evidence.');
        acceptanceValid = true;
      } catch (error) { acceptanceReason = errorMessage(error); }
    }
    const snapshotReference = (value: unknown) => nullable(nullable(value)?.document);
    const contractSnapshot = nullable(order.contractSnapshot) ?? {}, supplierSnapshot = nullable(order.supplierSnapshot) ?? {};
    return {
      id: order.id, organizationId: order.organizationId, purchaseReference: order.purchaseReference, status: order.status, revision: order.revision,
      digest: hash({ revision: order.revision, stateHash: hash(this.storedState(order, entries)), completionDigest, reviewReasons: integrity.reasons }),
      receiptDigest, completionDigest, currency: order.currency, amountMinor: order.amountMinor, terms, lines,
      contract: { id: order.contractDocumentId, version: order.contractVersion, hash: order.contractHash, referenceNumber: contractSnapshot.referenceNumber, title: nullable(contractSnapshot.template)?.titleAr },
      supplier: { id: order.supplierDocumentId, version: order.supplierVersion, hash: order.supplierHash, referenceNumber: supplierSnapshot.referenceNumber, name: nullable(supplierSnapshot.payload)?.supplierName ?? nullable(supplierSnapshot.payload)?.supplierRef, supplierRef: nullable(supplierSnapshot.payload)?.supplierRef },
      participants: integrity.authority?.participants ?? null, owner: integrity.authority?.owner ?? null,
      recommendation: order.recommendation, approval: order.approval, invoice: snapshotReference(order.invoiceSnapshot), invoiceSnapshot: order.invoiceSnapshot,
      receiptAcceptance: snapshotReference(order.receiptAcceptanceSnapshot), reversal: snapshotReference(order.reversalSnapshot),
      totals: { amountMinor: order.amountMinor, settledMinor, recoveredMinor, netPaidMinor: settledMinor === null || recoveredMinor === null ? null : settledMinor - recoveredMinor,
        remainingMinor: settledMinor === null ? null : ['CANCELLED', 'DECLINED', 'REVERSED', 'RECOVERY_REQUIRED', 'RECOVERED'].includes(order.status) ? 0 : order.amountMinor - settledMinor,
        recoveryRequiredMinor: settledMinor === null || recoveredMinor === null ? null : order.status === 'RECOVERY_REQUIRED' ? settledMinor - recoveredMinor : 0 },
      receipts: order.receipts.map(receipt => ({ id: receipt.id, document: { id: receipt.documentId, version: receipt.documentVersion, hash: receipt.documentHash, referenceNumber: nullable(receipt.documentSnapshot)?.referenceNumber }, lines: receipt.lines, receivedByAccountId: receipt.receivedByAccountId, createdAt: receipt.createdAt })),
      moneyProofs: order.moneyProofs.map(proof => ({ id: proof.id, kind: proof.kind, status: proof.status, financeEntryId: proof.financeEntryId, financeEntryStatus: entries.find(entry => entry.id === proof.financeEntryId)?.status ?? null, amountMinor: proof.amountMinor, currency: proof.currency,
        document: proof.documentId ? { id: proof.documentId, version: proof.documentVersion, hash: proof.documentHash, referenceNumber: nullable(proof.documentSnapshot)?.referenceNumber } : null,
        preparedByAccountId: proof.preparedByAccountId, approvedByAccountId: proof.approvedByAccountId, confirmedByAccountId: proof.confirmedByAccountId, transferredAt: proof.transferredAt, confirmedAt: proof.confirmedAt })),
      acceptance: { document: snapshotReference(order.acceptanceSnapshot), valid: acceptanceValid, reason: acceptanceReason, scope: 'ORDER_EVIDENCE', globalClosureGranted: false,
        actorAccountId: nullable(order.acceptanceSnapshot)?.recordedByAccountId ?? null, actorName: integrity.authority?.participants.acceptor.name ?? null, acceptedAt: nullable(order.acceptanceSnapshot)?.recordedAt ?? null },
      events: order.events.map(event => ({ id: event.id, action: event.action, actorAccountId: event.actorAccountId, beforeRevision: event.beforeRevision, afterRevision: event.afterRevision, evidenceHash: event.evidenceHash, createdAt: event.createdAt })),
      integrity: { valid, reviewReasons: integrity.reasons }, actions, createdAt: order.createdAt, updatedAt: order.updatedAt, ...(command ? { command } : {}),
    };
  }

  async detail(accountId: string, organizationId: string, orderId: string) {
    return this.db.serializable(async tx => { const scope = await procurementScope(tx, id(organizationId), accountId); return this.view(tx, scope, await this.load(tx, organizationId, id(orderId))); });
  }

  async workspace(accountId: string, organizationId: string) {
    const scope = await procurementScope(this.db, id(organizationId), accountId);
    const templates = await this.db.documentTemplate.findMany({ where: { organizationId, code: { in: PROCUREMENT_TEMPLATES.map(template => template.code) }, status: 'ACTIVE' }, orderBy: { code: 'asc' } });
    const members = scope.actor.memberRole === 'VIEWER' ? [] : await this.db.organizationMember.findMany({ where: { organizationId, status: 'ACTIVE', account: { status: 'ACTIVE', emailVerifiedAt: { not: null } } }, select: { accountId: true, role: true, account: { select: { personId: true, person: { select: { firstName: true, lastName: true } } } } }, orderBy: { accountId: 'asc' } });
    const candidates = await this.db.managedDocument.findMany({ where: { organizationId, status: { in: ['SIGNED', 'ARCHIVED', 'APPROVED'] }, OR: [
      { template: { code: { in: [...PROCUREMENT_TEMPLATES.map(template => template.code), 'INV-SUPPLIER-QUALIFICATION'] } } },
      { payload: { path: ['purpose'], equals: 'F08_PROCUREMENT_CONTRACT_V1' } }, { payload: { path: ['purpose'], equals: 'F08_PROCUREMENT_SUPPLIER_V1' } }, { payload: { path: ['purpose'], equals: 'F08_PROCUREMENT_EVIDENCE_V1' } },
    ] }, select: { id: true, payload: true, referenceNumber: true, version: true, template: { select: { titleAr: true, code: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    type Option = { id: string; title: string; referenceNumber: string; version: number; hash: string | null; purpose: unknown; kind: unknown; payload: unknown; valid: boolean; reviewReasons: string[] };
    const documents: { suppliers: Option[]; contracts: Option[]; evidence: Option[] } = { suppliers: [], contracts: [], evidence: [] };
    for (const candidate of candidates) {
      const payload = nullable(candidate.payload), purpose = payload?.purpose ?? null;
      const group = purpose === 'F08_PROCUREMENT_CONTRACT_V1' ? 'contracts' : purpose === 'F08_PROCUREMENT_SUPPLIER_V1' || candidate.template.code === 'INV-SUPPLIER-QUALIFICATION' ? 'suppliers' : 'evidence';
      const option: Option = { id: candidate.id, title: candidate.template.titleAr, referenceNumber: candidate.referenceNumber, version: candidate.version, hash: null, purpose, kind: payload?.kind ?? null, payload: candidate.payload, valid: false, reviewReasons: [] };
      try {
        const source = await procurementDocument(this.db, organizationId, candidate.id, { qualification: group === 'suppliers' }); option.hash = source.hash;
        if (group === 'suppliers') await procurementSupplier(this.db, organizationId, candidate.id);
        if (group === 'contracts') await procurementContract(this.db, organizationId, candidate.id);
        option.valid = true;
      } catch (error) { option.reviewReasons.push(errorMessage(error)); }
      documents[group].push(option);
    }
    const financeAccounts = await this.db.financeAccount.findMany({ where: { organizationId, active: true, currency: 'SAR' }, select: { id: true, name: true, currency: true }, orderBy: { name: 'asc' } });
    const orders = await this.db.procurementOrder.findMany({ where: { organizationId }, select: { id: true, purchaseReference: true, status: true, revision: true, amountMinor: true, currency: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    const manager = ['OWNER', 'ADMIN'].includes(scope.actor.memberRole), creator = ['OWNER', 'ADMIN', 'OPERATOR', 'STAFF', 'INSTRUCTOR'].includes(scope.actor.memberRole);
    const latestScope = await procurementScope(this.db, organizationId, accountId);
    if (latestScope.actor.membershipUpdatedAt !== scope.actor.membershipUpdatedAt || latestScope.actor.personId !== scope.actor.personId || latestScope.actor.memberRole !== scope.actor.memberRole) throw new ForbiddenException('Organization access changed while the workspace was being read.');
    return { organization: { id: organizationId, displayName: scope.organization.displayName, ownerAccountId: scope.organization.ownerId }, actor: scope.actor,
      capabilities: { installTemplates: access(manager), createDocuments: access(creator), create: access(documents.contracts.some(document => document.valid && nullable(document.payload)?.makerAccountId === accountId)) },
      participants: members.map(member => ({ accountId: member.accountId, personId: member.account.personId, name: [member.account.person.firstName, member.account.person.lastName].filter(Boolean).join(' '), memberRole: member.role, procurementEligible: member.role !== 'VIEWER' })),
      documents, templates: templates.map(template => ({ id: template.id, code: template.code, title: template.titleAr, version: template.version, department: template.department, fields: template.fields })), financeAccounts, orders };
  }

  async installTemplates(accountId: string, organizationId: string, input: unknown) {
    object(input, []);
    const ids = PROCUREMENT_TEMPLATES.map(() => ({ templateId: randomUUID(), auditId: randomUUID() }));
    return postingTransaction(this.db, async tx => {
      const scope = await procurementScope(tx, id(organizationId), accountId);
      if (!['OWNER', 'ADMIN'].includes(scope.actor.memberRole)) throw new ForbiddenException('An organization owner or administrator installs procurement templates.');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`organization-procurement-templates:${organizationId}`},0))`;
      const templates = [];
      for (const [index, definition] of PROCUREMENT_TEMPLATES.entries()) {
        let template = await tx.documentTemplate.findFirst({ where: { organizationId, code: definition.code, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
        if (!template) {
          const latest = await tx.documentTemplate.findFirst({ where: { organizationId, code: definition.code }, orderBy: { version: 'desc' }, select: { version: true } });
          template = await tx.documentTemplate.create({ data: { id: ids[index].templateId, organizationId, code: definition.code, titleAr: definition.titleAr, titleEn: definition.titleEn,
            department: definition.department, fields: json(definition.fields) as unknown as Prisma.InputJsonValue, version: (latest?.version ?? 0) + 1 } });
          await tx.auditEvent.create({ data: { id: ids[index].auditId, actorId: scope.actor.personId, action: 'ORGANIZATION_PROCUREMENT_TEMPLATE_INSTALLED', resource: 'DocumentTemplate', resourceId: template.id,
            metadata: { organizationId, actorAccountId: accountId, code: definition.code, version: template.version, schemaHash: hash(template.fields) } } });
        }
        templates.push({ id: template.id, code: template.code, title: template.titleAr, version: template.version, department: template.department, fields: template.fields });
      }
      return { templates };
    });
  }

  private eventHash(event: { id: string; organizationId: string; orderId: string; requestId: string; action: string; actorAccountId: string; actorPersonId: string; requestFingerprint: string; beforeRevision: number; afterRevision: number; payload: unknown; result: unknown; createdAt: Date }) {
    return hash({ id: event.id, organizationId: event.organizationId, orderId: event.orderId, requestId: event.requestId, action: event.action, actorAccountId: event.actorAccountId, actorPersonId: event.actorPersonId,
      requestFingerprint: event.requestFingerprint, beforeRevision: event.beforeRevision, afterRevision: event.afterRevision, payload: event.payload, result: event.result, createdAt: event.createdAt });
  }

  private async appendEvent(tx: Prisma.TransactionClient, scope: Scope, order: Order, action: string, requestId: string, fingerprint: string, input: Record<string, unknown>, happened: Occurrence) {
    const entries = await this.ledgers(tx, order), previous = order.events.at(-1);
    const data = { id: happened.eventId, organizationId: order.organizationId, orderId: order.id, requestId, action, actorAccountId: scope.actor.accountId, actorPersonId: scope.actor.personId,
      requestFingerprint: fingerprint, beforeRevision: order.revision - 1, afterRevision: order.revision, payload: json(input) as Prisma.InputJsonValue,
      result: { status: order.status, revision: order.revision, stateHash: hash(this.storedState(order, entries)), previousEvidenceHash: previous?.evidenceHash ?? null }, createdAt: happened.at };
    const evidenceHash = this.eventHash(data);
    await tx.procurementOrderEvent.create({ data: { ...data, evidenceHash } });
    await tx.auditEvent.create({ data: { id: happened.auditId, actorId: scope.actor.personId, action: `ORGANIZATION_PROCUREMENT_${action}`, resource: 'ProcurementOrder', resourceId: order.id,
      metadata: { organizationId: order.organizationId, eventId: data.id, actorAccountId: scope.actor.accountId, requestId, requestFingerprint: fingerprint, beforeRevision: data.beforeRevision, afterRevision: data.afterRevision, evidenceHash } } });
  }

  private async replay(tx: Prisma.TransactionClient, scope: Scope, requestId: string, fingerprint: string, action: string, orderId?: string) {
    const previous = await tx.procurementOrderEvent.findUnique({ where: { organizationId_requestId: { organizationId: scope.organization.id, requestId } } });
    if (!previous) return null;
    if (previous.requestFingerprint !== fingerprint || previous.action !== action || previous.actorAccountId !== scope.actor.accountId || orderId && previous.orderId !== orderId) throw new ConflictException('This organization request identifier was already used for different content.');
    return this.view(tx, scope, await this.load(tx, scope.organization.id, previous.orderId), { eventId: previous.id, requestId, replayed: true });
  }

  async create(accountId: string, organizationId: string, value: unknown) {
    const input = object(value, ['requestId', 'contractDocumentId', 'contractVersion', 'contractHash']);
    const requestId = id(input.requestId, 'Request identifier'), documentId = id(input.contractDocumentId), version = integer(input.contractVersion, 'Contract version', 1), expectedHash = digestValue(input.contractHash);
    const fingerprint = hash({ action: 'CREATE', organizationId, actorAccountId: accountId, input }), happened = occurrence();
    return postingTransaction(this.db, async tx => {
      const scope = await procurementScope(tx, id(organizationId), accountId);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`organization-procurement-request:${organizationId}:${requestId}`},0))`;
      const replay = await this.replay(tx, scope, requestId, fingerprint, 'CREATE'); if (replay) return replay;
      const contract = await procurementContract(tx, organizationId, documentId);
      if (contract.source.version !== version || contract.source.hash !== expectedHash) throw new ConflictException('The signed contract changed. Reload the current source evidence.');
      if (contract.authority.participants.maker.accountId !== accountId) throw new ForbiddenException('Only the maker named in the signed procurement contract creates this order.');
      if (await tx.procurementOrder.findFirst({ where: { OR: [{ contractDocumentId: documentId }, { organizationId, purchaseReference: contract.terms.purchaseReference }] } })) throw new ConflictException('The signed contract or purchase reference already has an order.');
      await tx.procurementOrder.create({ data: { id: happened.orderId, organizationId, purchaseReference: contract.terms.purchaseReference, contractDocumentId: documentId, contractVersion: version, contractHash: expectedHash,
        contractSnapshot: contract.source.snapshot as Prisma.InputJsonValue, supplierDocumentId: contract.supplier.id, supplierVersion: contract.supplier.version, supplierHash: contract.supplier.hash, supplierSnapshot: contract.supplier.snapshot as Prisma.InputJsonValue,
        authoritySnapshot: procurementAuthorityBinding(contract.authority), terms: json(contract.terms) as unknown as Prisma.InputJsonValue, amountMinor: contract.terms.totalMinor, currency: 'SAR', requestedByAccountId: accountId, ownerAccountId: contract.authority.owner.accountId, createdAt: happened.at } });
      await this.appendEvent(tx, scope, await this.load(tx, organizationId, happened.orderId), 'CREATE', requestId, fingerprint, input, happened);
      return this.view(tx, scope, await this.load(tx, organizationId, happened.orderId), { eventId: happened.eventId, requestId, replayed: false });
    });
  }

  async mutate(accountId: string, organizationId: string, orderId: string, action: string, value: unknown) {
    const actionFields: Record<string, string[]> = {
      RECOMMEND: ['decision', 'note'], APPROVE: ['decision', 'note'], INVOICE: ['documentId', 'documentVersion', 'documentHash'], RECEIVE: ['documentId', 'documentVersion', 'documentHash'],
      RECEIPT_ACCEPTANCE: ['documentId', 'documentVersion', 'documentHash'], PREPARE_SETTLEMENT: ['financeAccountId'], APPROVE_SETTLEMENT: ['decision', 'note'], CONFIRM_SETTLEMENT: ['documentId', 'documentVersion', 'documentHash'],
      CANCEL: ['reason'], REVERSE: ['documentId', 'documentVersion', 'documentHash'], PREPARE_RECOVERY: ['financeAccountId'], APPROVE_RECOVERY: ['decision', 'note'], CONFIRM_RECOVERY: ['documentId', 'documentVersion', 'documentHash'], ACCEPTANCE: ['documentId', 'documentVersion', 'documentHash'],
    };
    if (!actionFields[action]) throw new BadRequestException('Unknown procurement operation.');
    const input = object(value, ['requestId', 'expectedRevision', 'expectedDigest', ...actionFields[action]]), requestId = id(input.requestId, 'Request identifier');
    const expectedRevision = integer(input.expectedRevision, 'Expected revision', 1), expectedDigest = digestValue(input.expectedDigest);
    const fingerprint = hash({ action, organizationId, orderId, actorAccountId: accountId, input }), happened = occurrence();
    return postingTransaction(this.db, async tx => {
      const scope = await procurementScope(tx, id(organizationId), accountId);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`organization-procurement-request:${organizationId}:${requestId}`},0))`;
      await tx.$queryRaw`SELECT "id" FROM "ProcurementOrder" WHERE "id"=${id(orderId)} AND "organizationId"=${organizationId} FOR UPDATE`;
      const replay = await this.replay(tx, scope, requestId, fingerprint, action, orderId); if (replay) return replay;
      const order = await this.load(tx, organizationId, orderId), current = await this.view(tx, scope, order);
      if (!current.integrity.valid) throw new ConflictException(current.integrity.reviewReasons[0]);
      if (order.revision !== expectedRevision || current.digest !== expectedDigest) throw new ConflictException('The order or source evidence changed. Reload before acting.');
      const actionKey: Record<string, keyof typeof current.actions> = { RECOMMEND: 'recommend', APPROVE: 'approve', INVOICE: 'invoice', RECEIVE: 'receive', RECEIPT_ACCEPTANCE: 'receiptAcceptance', PREPARE_SETTLEMENT: 'prepareSettlement', APPROVE_SETTLEMENT: 'approveSettlement', CONFIRM_SETTLEMENT: 'confirmSettlement', CANCEL: 'cancel', REVERSE: 'reverse', PREPARE_RECOVERY: 'prepareRecovery', APPROVE_RECOVERY: 'approveRecovery', CONFIRM_RECOVERY: 'confirmRecovery', ACCEPTANCE: 'acceptance' };
      if (!current.actions[actionKey[action]].allowed) throw new ForbiddenException(current.actions[actionKey[action]].reason ?? 'This action is not permitted.');
      await this.execute(tx, scope, order, action, input, happened);
      await tx.procurementOrder.update({ where: { id: order.id }, data: { revision: { increment: 1 } } });
      await this.appendEvent(tx, scope, await this.load(tx, organizationId, order.id), action, requestId, fingerprint, input, happened);
      return this.view(tx, scope, await this.load(tx, organizationId, order.id), { eventId: happened.eventId, requestId, replayed: false });
    });
  }

  private decision(input: Record<string, unknown>) {
    if (!['APPROVE', 'DECLINE'].includes(String(input.decision))) throw new BadRequestException('An explicit APPROVE or DECLINE decision is required.');
    return { decision: input.decision as 'APPROVE' | 'DECLINE', note: text(input.note, 'Decision reason', 2000) };
  }

  private async execute(tx: Prisma.TransactionClient, scope: Scope, order: Order, action: string, input: Record<string, unknown>, happened: Occurrence) {
    const actorId = scope.actor.accountId;
    if (action === 'RECOMMEND' || action === 'APPROVE') {
      const decision = { ...this.decision(input), actorAccountId: actorId, actorPersonId: scope.actor.personId, occurredAt: happened.at.toISOString() };
      if (action === 'RECOMMEND') await tx.procurementOrder.update({ where: { id: order.id }, data: { recommendation: decision, status: 'RECOMMENDED' } });
      else await tx.procurementOrder.update({ where: { id: order.id }, data: { approval: decision, status: decision.decision === 'APPROVE' ? 'APPROVED' : 'DECLINED' } });
      return;
    }
    if (action === 'INVOICE') {
      const source = await this.sourceForCommand(tx, order, input, 'INVOICE', true), invoiceKey = this.invoiceMatches(order, source.payload);
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`organization-procurement-invoice:${invoiceKey}`},0))`;
      if (await tx.procurementOrder.findUnique({ where: { invoiceKey }, select: { id: true } })) throw new ConflictException('This original supplier invoice is already bound to another procurement order.');
      await tx.procurementOrder.update({ where: { id: order.id }, data: { invoiceKey, invoiceSnapshot: this.documentProof(source, actorId, happened.at) as Prisma.InputJsonValue } }); return;
    }
    if (action === 'RECEIVE') {
      const source = await this.sourceForCommand(tx, order, input, 'RECEIPT'), lines = quantities(source.payload.quantities), progress = this.quantities(order);
      if (!lines.length) throw new BadRequestException('At least one received quantity is required.');
      for (const received of lines) { const line = progress.lines.find(candidate => candidate.lineId === received.lineId); if (!line || received.quantity > line.remainingQuantity) throw new ConflictException('Receipt exceeds the remaining approved purchase quantity.'); }
      if (await tx.procurementReceipt.findUnique({ where: { documentId: source.id } })) throw new ConflictException('This receipt source was already consumed.');
      await tx.procurementReceipt.create({ data: { id: happened.receiptId, organizationId: order.organizationId, orderId: order.id, documentId: source.id, documentVersion: source.version, documentHash: source.hash,
        documentSnapshot: source.snapshot as Prisma.InputJsonValue, lines, receivedByAccountId: actorId, receivedByPersonId: scope.actor.personId, createdAt: happened.at } }); return;
    }
    if (action === 'RECEIPT_ACCEPTANCE' || action === 'ACCEPTANCE') {
      const kind = action === 'RECEIPT_ACCEPTANCE' ? 'RECEIPT_ACCEPTANCE' : 'FINAL_ACCEPTANCE', source = await this.sourceForCommand(tx, order, input, kind);
      const expected = action === 'RECEIPT_ACCEPTANCE' ? this.receiptDigest(order) : this.completionDigest(order, await this.ledgers(tx, order));
      if (source.payload.evidenceDigest !== expected) throw new ConflictException('Independent acceptance must bind the complete current evidence digest.');
      await tx.procurementOrder.update({ where: { id: order.id }, data: { [action === 'RECEIPT_ACCEPTANCE' ? 'receiptAcceptanceSnapshot' : 'acceptanceSnapshot']: this.documentProof(source, actorId, happened.at) as Prisma.InputJsonValue } }); return;
    }
    if (action === 'CANCEL') {
      text(input.reason, 'Cancellation reason', 2000);
      await tx.procurementOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }); return;
    }
    if (action === 'REVERSE') { await this.reverse(tx, scope, order, input, happened); return; }
    const kind = action.endsWith('SETTLEMENT') ? 'SETTLEMENT' : 'RECOVERY';
    if (action.startsWith('PREPARE_')) { await this.prepare(tx, scope, order, input, happened, kind); return; }
    if (action.startsWith('APPROVE_')) { await this.approveMoney(tx, scope, order, input, happened, kind); return; }
    if (action.startsWith('CONFIRM_')) { await this.confirmMoney(tx, scope, order, input, happened, kind); return; }
    throw new BadRequestException('Unsupported procurement action.');
  }

  private async prepare(tx: Prisma.TransactionClient, scope: Scope, order: Order, input: Record<string, unknown>, happened: Occurrence, kind: 'SETTLEMENT' | 'RECOVERY') {
    const account = await tx.financeAccount.findUnique({ where: { id: id(input.financeAccountId, 'Finance account') } });
    if (!account || !account.active || account.organizationId !== order.organizationId || account.currency !== 'SAR') throw new ConflictException('Select an active SAR finance account of this organization.');
    await tx.financeEntry.create({ data: { id: happened.entryId, organizationId: order.organizationId, financeAccountId: account.id, type: kind === 'SETTLEMENT' ? 'EXPENSE' : 'REVENUE', status: 'PENDING_APPROVAL', amountMinor: order.amountMinor, currency: 'SAR',
      referenceType: kind === 'SETTLEMENT' ? PROCUREMENT_SETTLEMENT : PROCUREMENT_RECOVERY, referenceId: order.id, description: `${kind}: ${order.purchaseReference}`, requestedByAccountId: scope.actor.accountId, createdAt: happened.at } });
    await tx.financeApproval.create({ data: { id: happened.approvalId, financeEntryId: happened.entryId, requestedByAccountId: scope.actor.accountId, createdAt: happened.at } });
    await tx.procurementMoneyProof.create({ data: { id: happened.proofId, organizationId: order.organizationId, orderId: order.id, kind, financeEntryId: happened.entryId,
      activeKey: `${order.id}:${kind}`, status: 'PREPARED', amountMinor: order.amountMinor, currency: 'SAR', preparedByAccountId: scope.actor.accountId, createdAt: happened.at } });
  }

  private async approveMoney(tx: Prisma.TransactionClient, scope: Scope, order: Order, input: Record<string, unknown>, happened: Occurrence, kind: 'SETTLEMENT' | 'RECOVERY') {
    const proof = activeProof(order, kind); if (!proof || proof.status !== 'PREPARED') throw new ConflictException('No pending procurement finance preparation exists.');
    const decision = this.decision(input), approved = decision.decision === 'APPROVE';
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id: proof.financeEntryId }, include: { approvals: true } });
    const requested = entry.approvals.filter(approval => approval.status === 'REQUESTED' && approval.requestedByAccountId === proof.preparedByAccountId);
    if (entry.status !== 'PENDING_APPROVAL' || requested.length !== 1) throw new ConflictException('The original finance approval request changed.');
    await tx.financeApproval.update({ where: { id: requested[0].id }, data: { status: approved ? 'APPROVED' : 'REJECTED', decidedByAccountId: scope.actor.accountId, decisionNote: decision.note, decidedAt: happened.at } });
    await tx.financeEntry.update({ where: { id: entry.id }, data: { status: approved ? 'APPROVED' : 'REJECTED', approvedByAccountId: approved ? scope.actor.accountId : null, approvedAt: approved ? happened.at : null } });
    await tx.procurementMoneyProof.update({ where: { id: proof.id }, data: { status: approved ? 'APPROVED' : 'REJECTED', approvedByAccountId: approved ? scope.actor.accountId : null, activeKey: approved ? proof.activeKey : null } });
    await tx.auditEvent.create({ data: { id: happened.financeAuditId, actorId: scope.actor.personId, action: approved ? 'FINANCE_ENTRY_APPROVED' : 'FINANCE_ENTRY_REJECTED', resource: 'FinanceEntry', resourceId: entry.id,
      metadata: { organizationId: order.organizationId, procurementOrderId: order.id, procurementProofId: proof.id, referenceType: entry.referenceType, referenceId: order.id } } });
  }

  private async confirmMoney(tx: Prisma.TransactionClient, scope: Scope, order: Order, input: Record<string, unknown>, happened: Occurrence, kind: 'SETTLEMENT' | 'RECOVERY') {
    const proof = activeProof(order, kind); if (!proof || proof.status !== 'APPROVED') throw new ConflictException('An independently approved procurement finance entry is required.');
    const source = await this.sourceForCommand(tx, order, input, kind, true), payload = source.payload;
    const bankName = text(payload.bankName, 'Bank name', 200), bankReference = text(payload.bankReference, 'Bank execution reference', 200), key = bankKey(bankName, bankReference), transferredAt = timestamp(payload.occurredAt);
    if (payload.financeEntryId !== proof.financeEntryId || payload.currency !== 'SAR' || integer(payload.amountMinor, 'Executed amount', 1) !== order.amountMinor) throw new ConflictException('Execution evidence must bind the approved native entry and full contractual amount.');
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id: proof.financeEntryId }, include: { approvals: true, financeAccount: true } });
    if (entry.status !== 'APPROVED' || !entry.approvedAt || transferredAt < entry.approvedAt || transferredAt > happened.at || !entry.approvedByAccountId) throw new ConflictException('The executed transfer must follow its original finance approval.');
    const persons = await tx.account.findMany({ where: { id: { in: [source.createdByAccountId, source.approvedByAccountId, source.signedByAccountId!, proof.preparedByAccountId, entry.approvedByAccountId] } }, select: { personId: true } });
    if (persons.some(person => person.personId === scope.actor.personId)) throw new ForbiddenException('Financial confirmation must be independent from preparation, approval and evidence creation/signature.');
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`center-service-transfer-reference:${key}`},0))`;
    const [oldCenter, oldCommerce, duplicate] = await Promise.all([
      tx.centerServiceTransferReceipt.findFirst({ where: { bankReferenceKey: key }, select: { id: true } }),
      tx.commerceSourceTransferReceipt.findFirst({ where: { bankReferenceKey: key }, select: { id: true } }),
      tx.procurementMoneyProof.findUnique({ where: { bankReferenceKey: key }, select: { id: true } }),
    ]);
    if (oldCenter || oldCommerce || duplicate) throw new ConflictException('This bank execution reference is already bound to a financial movement.');
    if (await tx.procurementMoneyProof.findUnique({ where: { documentId: source.id } })) throw new ConflictException('This signed financial document was already consumed.');
    await tx.financeEntry.update({ where: { id: entry.id }, data: { status: 'POSTED', postedByAccountId: scope.actor.accountId, postedAt: happened.at } });
    await tx.auditEvent.create({ data: { id: happened.financeAuditId, actorId: scope.actor.personId, action: 'FINANCE_ENTRY_POSTED', resource: 'FinanceEntry', resourceId: entry.id,
      metadata: { organizationId: order.organizationId, procurementOrderId: order.id, procurementProofId: proof.id, referenceType: entry.referenceType, referenceId: order.id, documentId: source.id, documentHash: source.hash, bankReferenceKey: key } } });
    await tx.procurementMoneyProof.update({ where: { id: proof.id }, data: { status: 'CONFIRMED', documentId: source.id, documentVersion: source.version, documentHash: source.hash, documentSnapshot: source.snapshot as Prisma.InputJsonValue,
      bankName, bankReference, bankReferenceKey: key, transferredAt, confirmedByAccountId: scope.actor.accountId, confirmedAt: happened.at } });
    await tx.procurementOrder.update({ where: { id: order.id }, data: { status: kind === 'SETTLEMENT' ? 'SETTLED' : 'RECOVERED', acceptanceSnapshot: Prisma.DbNull } });
  }

  private async reverse(tx: Prisma.TransactionClient, scope: Scope, order: Order, input: Record<string, unknown>, happened: Occurrence) {
    const source = await this.sourceForCommand(tx, order, input, 'REVERSAL', true), returned = quantities(source.payload.quantities ?? []), actual = this.quantities(order).lines.filter(line => line.receivedQuantity > 0).map(line => ({ lineId: line.lineId, quantity: line.receivedQuantity }));
    if (hash([...returned].sort((a, b) => a.lineId.localeCompare(b.lineId))) !== hash(actual.sort((a, b) => a.lineId.localeCompare(b.lineId)))) throw new ConflictException('Whole-order reversal must document the return of every actually received quantity.');
    const settlement = activeProof(order, 'SETTLEMENT'), paid = settlement?.status === 'CONFIRMED';
    if (source.payload.currency !== 'SAR' || integer(source.payload.amountMinor, 'Reversal amount') !== (paid ? order.amountMinor : 0)) throw new ConflictException('The reversal amount must equal the actual settled amount, or explicit zero before payment.');
    if (settlement && !paid) {
      await tx.financeEntry.update({ where: { id: settlement.financeEntryId }, data: { status: 'VOIDED' } });
      await tx.procurementMoneyProof.update({ where: { id: settlement.id }, data: { status: 'VOIDED', activeKey: null } });
      await tx.auditEvent.create({ data: { id: happened.financeAuditId, actorId: scope.actor.personId, action: 'FINANCE_ENTRY_VOIDED', resource: 'FinanceEntry', resourceId: settlement.financeEntryId,
        metadata: { organizationId: order.organizationId, procurementOrderId: order.id, procurementProofId: settlement.id, reversalDocumentId: source.id, reversalDocumentHash: source.hash } } });
    }
    await tx.procurementOrder.update({ where: { id: order.id }, data: { status: paid ? 'RECOVERY_REQUIRED' : 'REVERSED', reversalSnapshot: this.documentProof(source, scope.actor.accountId, happened.at) as Prisma.InputJsonValue, acceptanceSnapshot: Prisma.DbNull } });
  }
}
