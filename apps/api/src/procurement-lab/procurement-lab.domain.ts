import { BadRequestException, ConflictException } from '@nestjs/common';
import { contractTerms, hash, integer, json, object, ProcurementLine, ProcurementTerms, purchaseLines, quantities, text } from '../organizations/procurement.domain';

export const LAB_SCENARIO = 'STANDARD_V1' as const;
export const LAB_LIMITS = { maxSessions: 40, maxEvents: 160, maxPayloadBytes: 65_536, maxStateBytes: 262_144 } as const;
export const LAB_ROLES = [
  { id: 'MAKER', labelAr: 'منشئ الطلب — محاكاة', labelEn: 'Maker — simulation' },
  { id: 'RECOMMENDER', labelAr: 'الموصي — محاكاة', labelEn: 'Recommender — simulation' },
  { id: 'OWNER', labelAr: 'المعتمد — محاكاة', labelEn: 'Approver — simulation' },
  { id: 'ACCOUNTANT', labelAr: 'المحاسب — محاكاة', labelEn: 'Accountant — simulation' },
  { id: 'RECEIVER', labelAr: 'المستلم — محاكاة', labelEn: 'Receiver — simulation' },
  { id: 'TREASURER', labelAr: 'مؤكد الحركة — محاكاة', labelEn: 'Movement confirmer — simulation' },
  { id: 'ACCEPTOR', labelAr: 'القابل المستقل — محاكاة', labelEn: 'Independent acceptor — simulation' },
] as const;
export type LabRole = typeof LAB_ROLES[number]['id'];
export const LAB_ACTION_ROLES = {
  RECOMMEND: 'RECOMMENDER', APPROVE: 'OWNER', INVOICE: 'ACCOUNTANT', RECEIVE: 'RECEIVER',
  RECEIPT_ACCEPTANCE: 'ACCEPTOR', PREPARE_SETTLEMENT: 'ACCOUNTANT', APPROVE_SETTLEMENT: 'OWNER', CONFIRM_SETTLEMENT: 'TREASURER',
  CANCEL: 'OWNER', REVERSE: 'OWNER', PREPARE_RECOVERY: 'ACCOUNTANT', APPROVE_RECOVERY: 'OWNER', CONFIRM_RECOVERY: 'TREASURER', ACCEPTANCE: 'ACCEPTOR',
} as const;
export type LabAction = keyof typeof LAB_ACTION_ROLES;
export type LabStatus = 'REQUESTED' | 'RECOMMENDED' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'SETTLED' | 'REVERSED' | 'RECOVERY_REQUIRED' | 'RECOVERED';
type Simulated = { simulated: true; role: LabRole; recordedAt: string };
type Decision = Simulated & { decision: 'APPROVE' | 'DECLINE'; note: string };
type Acceptance = Simulated & { evidenceDigest: string; note: string };
export type LabReceipt = Simulated & { id: string; reference: string; quantities: { lineId: string; quantity: number }[] };
export type LabMovement = {
  id: string; simulated: true; kind: 'SETTLEMENT' | 'RECOVERY'; status: 'PREPARED' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'VOIDED';
  amountMinor: number; currency: 'SAR'; preparedAt: string; preparedByRole: 'ACCOUNTANT';
  approval?: Decision; reference?: string; confirmedAt?: string; confirmedByRole?: 'TREASURER'; voidedAt?: string;
};
export type LabState = {
  schemaVersion: 1; scenario: typeof LAB_SCENARIO; synthetic: true; status: LabStatus; currency: 'SAR';
  terms: ProcurementTerms; lines: ProcurementLine[]; amountMinor: number;
  recommendation: Decision | null; approval: Decision | null;
  invoice: (Simulated & { reference: string; amountMinor: number; currency: 'SAR'; lines: ProcurementLine[] }) | null;
  receipts: LabReceipt[]; receiptAcceptance: Acceptance | null; settlements: LabMovement[];
  cancellation: (Simulated & { reason: string }) | null;
  reversal: (Simulated & { reference: string; amountMinor: number; quantities: { lineId: string; quantity: number }[]; reason: string }) | null;
  recoveries: LabMovement[]; acceptance: Acceptance | null;
};

export const LAB_DEFAULT_LINES: readonly ProcurementLine[] = [
  { lineId: 'LINE-TAXABLE', description: 'معدات اصطناعية للتجربة', quantity: 3, unitPriceMinor: 1000, taxMinor: 450, taxTreatment: 'TAXABLE', taxReason: 'ضريبة صريحة لسيناريو اختبار اصطناعي؛ ليست فاتورة حقيقية.' },
  { lineId: 'LINE-EXEMPT', description: 'مستلزمات اصطناعية للتجربة', quantity: 2, unitPriceMinor: 500, taxMinor: 0, taxTreatment: 'EXEMPT', taxReason: 'إعفاء في سيناريو اختبار اصطناعي فقط.' },
];

export function boundedLabObject(value: unknown, allowed?: readonly string[], maximum: number = LAB_LIMITS.maxPayloadBytes) {
  const row = object(value, allowed);
  // Indented JSON is a conservative upper bound for PostgreSQL jsonb::text.
  if (Buffer.byteLength(JSON.stringify(row, null, 1), 'utf8') > maximum) throw new BadRequestException('The simulation payload exceeds its bounded size.');
  return row;
}

export function createLabState(sessionId: string, occurredAt: string, suppliedLines?: unknown): LabState {
  const lines = purchaseLines(suppliedLines ?? json(LAB_DEFAULT_LINES));
  const amountMinor = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinor + line.taxMinor, 0);
  integer(amountMinor, 'Simulation total', 1);
  const terms = contractTerms({
    purpose: 'F08_PROCUREMENT_CONTRACT_V1', purchaseReference: `SIM-${sessionId}`, supplierDocumentId: 'SIMULATED-SUPPLIER',
    supplierDocumentHash: hash({ simulated: true, scenario: LAB_SCENARIO }), currency: 'SAR', totalMinor: amountMinor,
    procurementMethod: 'Synthetic complete-order scenario', procurementSystem: 'Isolated HYDROLAND procurement lab', integrationMode: 'MANUAL_EVIDENCE',
    validFrom: occurredAt.slice(0, 10), validUntil: new Date(Date.parse(occurredAt) + 365 * 86_400_000).toISOString().slice(0, 10),
    makerAccountId: 'SIMULATED-MAKER', recommenderAccountId: 'SIMULATED-RECOMMENDER', receiverAccountId: 'SIMULATED-RECEIVER',
    accountantAccountId: 'SIMULATED-ACCOUNTANT', treasurerAccountId: 'SIMULATED-TREASURER', acceptorAccountId: 'SIMULATED-ACCEPTOR', lines,
    settlementPolicy: 'FULL_ORDER_AFTER_RECEIPT_ACCEPTANCE', cancellationPolicy: 'BEFORE_ANY_EFFECT',
    cancellationTerms: 'Synthetic scenario: cancellation is allowed before any invoice, receipt or financial preparation.',
    reversalPolicy: 'FULL_ORDER_RETURN_AND_RECOVERY', reversalTerms: 'Synthetic scenario: return every received quantity and recover the complete simulated outgoing amount.',
    acceptanceMethod: 'Simulated role selection checks the current evidence digest. It is not a real signature, representative acceptance or business approval.',
  });
  return { schemaVersion: 1, scenario: LAB_SCENARIO, synthetic: true, status: 'REQUESTED', currency: 'SAR', terms, lines, amountMinor,
    recommendation: null, approval: null, invoice: null, receipts: [], receiptAcceptance: null, settlements: [], cancellation: null, reversal: null, recoveries: [], acceptance: null };
}

const last = <T>(items: T[]): T | null => items.length ? items[items.length - 1] : null;
const normalizedReference = (value: string) => value.normalize('NFKC').trim().toUpperCase().replace(/\s+/gu, ' ');
const sortedLines = (lines: ProcurementLine[]) => [...lines].sort((a, b) => a.lineId.localeCompare(b.lineId));
const sortedQuantities = (lines: { lineId: string; quantity: number }[]) => [...lines].sort((a, b) => a.lineId.localeCompare(b.lineId));

export function labQuantities(state: LabState) {
  const received = new Map<string, number>();
  for (const receipt of state.receipts) for (const line of receipt.quantities) received.set(line.lineId, (received.get(line.lineId) ?? 0) + line.quantity);
  const returned = new Map((state.reversal?.quantities ?? []).map(line => [line.lineId, line.quantity]));
  const lines = state.lines.map(line => ({ ...line, receivedQuantity: received.get(line.lineId) ?? 0,
    remainingQuantity: line.quantity - (received.get(line.lineId) ?? 0), returnedQuantity: returned.get(line.lineId) ?? 0 }));
  return { lines, full: lines.every(line => line.remainingQuantity === 0), any: lines.some(line => line.receivedQuantity > 0) };
}

export function labTotals(state: LabState) {
  const settledMinor = state.settlements.filter(movement => movement.status === 'CONFIRMED').reduce((sum, movement) => sum + movement.amountMinor, 0);
  const recoveredMinor = state.recoveries.filter(movement => movement.status === 'CONFIRMED').reduce((sum, movement) => sum + movement.amountMinor, 0);
  return { amountMinor: state.amountMinor, settledMinor, recoveredMinor, netPaidMinor: settledMinor - recoveredMinor,
    remainingMinor: ['DECLINED', 'CANCELLED', 'REVERSED', 'RECOVERY_REQUIRED', 'RECOVERED'].includes(state.status) ? 0 : state.amountMinor - settledMinor,
    recoveryRequiredMinor: state.status === 'RECOVERY_REQUIRED' ? settledMinor - recoveredMinor : 0 };
}

export const labReceiptDigest = (state: LabState) => hash({ scope: 'SYNTHETIC_RECEIPTS', lines: state.lines, receipts: state.receipts });
export const labCompletionDigest = (state: LabState) => {
  const { acceptance: _acceptance, ...evidence } = state;
  return hash({ scope: 'SYNTHETIC_COMPLETION', evidence });
};
export const labAcceptanceValid = (state: LabState) => Boolean(state.acceptance && state.acceptance.evidenceDigest === labCompletionDigest(state));

export function labActions(state: LabState, exhausted = false) {
  const receipt = labQuantities(state), settlement = last(state.settlements), recovery = last(state.recoveries), totals = labTotals(state);
  const activeSettlement = settlement && !['REJECTED', 'VOIDED'].includes(settlement.status) ? settlement : null;
  const activeRecovery = recovery && !['REJECTED', 'VOIDED'].includes(recovery.status) ? recovery : null;
  const receiptAccepted = state.receiptAcceptance?.evidenceDigest === labReceiptDigest(state);
  const available: Record<LabAction, boolean> = {
    RECOMMEND: state.status === 'REQUESTED', APPROVE: state.status === 'RECOMMENDED',
    INVOICE: state.status === 'APPROVED' && !state.invoice && !activeSettlement,
    RECEIVE: state.status === 'APPROVED' && !receipt.full && !activeSettlement,
    RECEIPT_ACCEPTANCE: state.status === 'APPROVED' && receipt.full && !state.receiptAcceptance && !activeSettlement,
    PREPARE_SETTLEMENT: state.status === 'APPROVED' && Boolean(state.invoice) && receipt.full && receiptAccepted && !activeSettlement,
    APPROVE_SETTLEMENT: state.status === 'APPROVED' && activeSettlement?.status === 'PREPARED',
    CONFIRM_SETTLEMENT: state.status === 'APPROVED' && activeSettlement?.status === 'APPROVED' && Boolean(state.invoice) && receipt.full && receiptAccepted,
    CANCEL: ['REQUESTED', 'RECOMMENDED', 'APPROVED'].includes(state.status) && !state.invoice && !receipt.any && state.settlements.length === 0,
    REVERSE: ['APPROVED', 'SETTLED'].includes(state.status) && !state.reversal && (Boolean(state.invoice) || receipt.any || Boolean(activeSettlement)),
    PREPARE_RECOVERY: state.status === 'RECOVERY_REQUIRED' && totals.recoveryRequiredMinor > 0 && !activeRecovery,
    APPROVE_RECOVERY: state.status === 'RECOVERY_REQUIRED' && activeRecovery?.status === 'PREPARED',
    CONFIRM_RECOVERY: state.status === 'RECOVERY_REQUIRED' && activeRecovery?.status === 'APPROVED',
    ACCEPTANCE: ['SETTLED', 'REVERSED', 'RECOVERED'].includes(state.status) && !labAcceptanceValid(state),
  };
  return Object.fromEntries(Object.entries(LAB_ACTION_ROLES).map(([action, role]) => [action, {
    allowed: !exhausted && available[action as LabAction], role,
    reason: exhausted ? 'This simulation reached its event limit. Start a new session.' : available[action as LabAction] ? null : 'Complete the preceding simulation requirements before this action.',
  }])) as Record<LabAction, { allowed: boolean; role: LabRole; reason: string | null }>;
}

export function applyLabAction(original: LabState, action: LabAction, role: LabRole, supplied: unknown, context: { eventId: string; occurredAt: string }): LabState {
  if (!Object.prototype.hasOwnProperty.call(LAB_ACTION_ROLES, action) || LAB_ACTION_ROLES[action] !== role) throw new BadRequestException('Select the simulation role required by this action.');
  if (!labActions(original)[action].allowed) throw new ConflictException('The simulation action is unavailable at its current stage.');
  const state = json(original), payload = boundedLabObject(supplied ?? {}), at = context.occurredAt;
  const stamp: Simulated = { simulated: true, role, recordedAt: at };
  const decision = (): Decision => {
    object(payload, ['decision', 'note']);
    if (typeof payload.decision !== 'string' || !['APPROVE', 'DECLINE'].includes(payload.decision)) throw new BadRequestException('Select APPROVE or DECLINE for the simulated decision.');
    return { ...stamp, decision: payload.decision as Decision['decision'], note: text(payload.note, 'Simulation decision note', 1000) };
  };
  if (action === 'RECOMMEND' || action === 'APPROVE') {
    const proof = decision();
    if (action === 'RECOMMEND') state.recommendation = proof; else state.approval = proof;
    // A negative recommendation still goes to the owner for the final decision,
    // matching the native F08 workflow rather than inventing an approval rule.
    state.status = action === 'RECOMMEND' ? 'RECOMMENDED' : proof.decision === 'DECLINE' ? 'DECLINED' : 'APPROVED';
  } else if (action === 'INVOICE') {
    object(payload, ['reference', 'lines', 'amountMinor']);
    const lines = purchaseLines(payload.lines), amountMinor = integer(payload.amountMinor, 'Simulated invoice amount', 1);
    if (amountMinor !== state.amountMinor || hash(sortedLines(lines)) !== hash(sortedLines(state.lines))) throw new ConflictException('The simulated invoice must match every approved line, explicit tax and amount.');
    state.invoice = { ...stamp, reference: text(payload.reference, 'Simulation invoice reference', 200), currency: 'SAR', amountMinor, lines };
  } else if (action === 'RECEIVE') {
    object(payload, ['reference', 'quantities']);
    const reference = text(payload.reference, 'Simulation receipt reference', 200), received = quantities(payload.quantities), current = labQuantities(state);
    if (!received.length) throw new BadRequestException('Select at least one simulated receipt quantity.');
    if (state.receipts.some(receipt => normalizedReference(receipt.reference) === normalizedReference(reference))) throw new ConflictException('The simulated receipt reference has already been recorded.');
    for (const line of received) {
      const approved = current.lines.find(item => item.lineId === line.lineId);
      if (!approved || line.quantity > approved.remainingQuantity) throw new ConflictException('Simulated receipt quantities cannot exceed the remaining approved lines.');
    }
    state.receipts.push({ ...stamp, id: `SIM-RECEIPT-${context.eventId}`, reference, quantities: received });
  } else if (action === 'RECEIPT_ACCEPTANCE' || action === 'ACCEPTANCE') {
    object(payload, ['evidenceDigest', 'note']);
    const digest = action === 'RECEIPT_ACCEPTANCE' ? labReceiptDigest(state) : labCompletionDigest(state);
    if (payload.evidenceDigest !== digest) throw new ConflictException('The simulation acceptance must bind the current evidence digest.');
    const proof = { ...stamp, evidenceDigest: digest, note: text(payload.note, 'Simulation acceptance note', 1000) };
    if (action === 'RECEIPT_ACCEPTANCE') state.receiptAcceptance = proof; else state.acceptance = proof;
  } else if (action === 'PREPARE_SETTLEMENT' || action === 'PREPARE_RECOVERY') {
    object(payload, []);
    const kind = action === 'PREPARE_SETTLEMENT' ? 'SETTLEMENT' : 'RECOVERY';
    const movement: LabMovement = { id: `SIM-${kind}-${context.eventId}`, simulated: true, kind, status: 'PREPARED',
      amountMinor: kind === 'SETTLEMENT' ? state.amountMinor : labTotals(state).recoveryRequiredMinor, currency: 'SAR', preparedAt: at, preparedByRole: 'ACCOUNTANT' };
    (kind === 'SETTLEMENT' ? state.settlements : state.recoveries).push(movement);
  } else if (action === 'APPROVE_SETTLEMENT' || action === 'APPROVE_RECOVERY') {
    const movement = last(action === 'APPROVE_SETTLEMENT' ? state.settlements : state.recoveries)!;
    movement.approval = decision(); movement.status = movement.approval.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  } else if (action === 'CONFIRM_SETTLEMENT' || action === 'CONFIRM_RECOVERY') {
    object(payload, ['reference', 'amountMinor']);
    const movement = last(action === 'CONFIRM_SETTLEMENT' ? state.settlements : state.recoveries)!;
    const amountMinor = integer(payload.amountMinor, 'Simulated movement amount', 1), reference = text(payload.reference, 'Simulation movement reference', 200);
    if (amountMinor !== movement.amountMinor) throw new ConflictException('The simulated confirmation amount must match the approved movement exactly.');
    if ([...state.settlements, ...state.recoveries].some(item => item.status === 'CONFIRMED' && normalizedReference(item.reference!) === normalizedReference(reference))) throw new ConflictException('The simulation movement reference has already been consumed.');
    movement.status = 'CONFIRMED'; movement.reference = reference; movement.confirmedAt = at; movement.confirmedByRole = 'TREASURER';
    state.status = action === 'CONFIRM_SETTLEMENT' ? 'SETTLED' : 'RECOVERED';
  } else if (action === 'CANCEL') {
    object(payload, ['reason']); state.cancellation = { ...stamp, reason: text(payload.reason, 'Simulation cancellation reason', 1000) }; state.status = 'CANCELLED';
  } else if (action === 'REVERSE') {
    object(payload, ['reference', 'quantities', 'amountMinor', 'reason']);
    const returned = quantities(payload.quantities), expected = labQuantities(state).lines.filter(line => line.receivedQuantity > 0).map(line => ({ lineId: line.lineId, quantity: line.receivedQuantity }));
    const amountMinor = integer(payload.amountMinor, 'Simulated reversal amount');
    if (hash(sortedQuantities(returned)) !== hash(sortedQuantities(expected)) || amountMinor !== labTotals(state).settledMinor) throw new ConflictException('Full reversal must return every simulated received quantity and match the confirmed outgoing amount.');
    state.reversal = { ...stamp, reference: text(payload.reference, 'Simulation reversal reference', 200), quantities: returned, amountMinor, reason: text(payload.reason, 'Simulation reversal reason', 1000) };
    for (const movement of state.settlements) if (['PREPARED', 'APPROVED'].includes(movement.status)) { movement.status = 'VOIDED'; movement.voidedAt = at; }
    state.status = amountMinor > 0 ? 'RECOVERY_REQUIRED' : 'REVERSED';
  }
  if (Buffer.byteLength(JSON.stringify(state, null, 1), 'utf8') > LAB_LIMITS.maxStateBytes) throw new ConflictException('The simulation reached its retained evidence size limit. Start a new session.');
  return state;
}

export function labProjection(state: LabState) {
  const settlement = last(state.settlements), recovery = last(state.recoveries);
  return { status: state.status, currency: state.currency, terms: state.terms, lines: labQuantities(state).lines, totals: labTotals(state),
    recommendation: state.recommendation, approval: state.approval, invoice: state.invoice, receipts: state.receipts, receiptAcceptance: state.receiptAcceptance,
    settlement, reversal: state.reversal, recovery, cancellation: state.cancellation,
    simulatedLedger: [...state.settlements, ...state.recoveries],
    acceptance: { document: state.acceptance, valid: labAcceptanceValid(state), scope: 'SIMULATION_ONLY', globalClosureGranted: false, realRepresentativeAcceptance: false },
    receiptDigest: labReceiptDigest(state), completionDigest: labCompletionDigest(state) };
}
