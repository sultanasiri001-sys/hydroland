import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { COMMERCE_REFUND_POLICY_VERSION, createRefundPolicySnapshot } from './commerce-refund-policy';

export const RENTAL_CONTRACT_VERSION = COMMERCE_REFUND_POLICY_VERSION;
export type RentalContractRecord = {
  id: string; renterAccountId: string; invoiceNumber: string; totalHalala: bigint;
  reservedAt: Date; dueAt: Date | null; scheduledHandoverAt: Date | null; contractSnapshot: unknown;
};
export type RentalContractLine = {
  id: string; resourceId: string; unitPriceHalala: bigint; organizationId: string | null;
  assetCodeSnapshot?: string; equipmentNameSnapshot?: string;
};
export const rentalObject = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
export const rentalCanonicalTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

// PostgreSQL JSONB reorders object keys. Hash logical content, including every
// field, rather than depending on its serialization order after persistence.
export function rentalCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(rentalCanonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value)
    .sort(([a], [b]) => a<b?-1:a>b?1:0).map(([key, item]) => JSON.stringify(key) + ':' + rentalCanonicalJson(item)).join(',') + '}';
  return JSON.stringify(value);
}
export const rentalContractHash = (value: unknown) => createHash('sha256').update(rentalCanonicalJson(value)).digest('hex');

export function createRentalContract(input: {
  rental: Omit<RentalContractRecord, 'contractSnapshot'>;
  issuer: {id: string; legalName: string | null; registrationNumber: string | null; address: string | null};
  lines: RentalContractLine[];
}) {
  const {rental, issuer, lines} = input;
  const snapshot = {
    version: RENTAL_CONTRACT_VERSION, sourceType: 'EQUIPMENT_RENTAL', sourceId: rental.id,
    organizationId: issuer.id, customerAccountId: rental.renterAccountId, invoiceNumber: rental.invoiceNumber,
    amountMinor: Number(rental.totalHalala), currency: 'SAR', contractedAt: rental.reservedAt.toISOString(),
    scheduledHandoverAt: rental.scheduledHandoverAt?.toISOString() ?? null,
    originalDueAt: rental.dueAt?.toISOString() ?? null,
    issuer: {organizationId: issuer.id, legalName: issuer.legalName, registrationNumber: issuer.registrationNumber, address: issuer.address},
    policySnapshot: {...createRefundPolicySnapshot({lineId: rental.id, kind: 'RENTAL', currency: 'SAR',
      grossAmountMinor: Number(rental.totalHalala), contractedAt: rental.reservedAt.toISOString(),
      contractedScheduledAt: rental.scheduledHandoverAt?.toISOString() ?? null})},
    damagePolicy: {version: 'RENTAL_DAMAGE_1', upfrontDepositMinor: 0, renterLiability: 'NEW_DAMAGE_AT_RETURN_ONLY'},
    invoiceReadiness: 'COMMERCIAL_RECORD_ONLY',
    lines: lines.map(line => ({id: line.id, resourceId: line.resourceId, amountMinor: Number(line.unitPriceHalala),
      assetCode: line.assetCodeSnapshot ?? null, equipmentName: line.equipmentNameSnapshot ?? null})),
  };
  requireRentalContract({...rental, contractSnapshot: snapshot}, lines);
  return snapshot;
}

/** No legacy backfill and no use of a return deadline as a handover date. */
export function requireRentalContract(rental: RentalContractRecord, lines: RentalContractLine[]) {
  const fail = (): never => {throw new ConflictException({code: 'RENTAL_ORIGINAL_CONTRACT_REQUIRED',
    message: 'The original rental issuer, prices and scheduled handover require review.'});};
  const snapshot = rentalObject(rental.contractSnapshot), issuer = rentalObject(snapshot.issuer);
  const total = Number(rental.totalHalala);
  if (!Number.isSafeInteger(total) || total <= 0 || total > 2_147_483_647 || !rental.reservedAt || !rental.dueAt || !rental.scheduledHandoverAt
    || snapshot.version !== RENTAL_CONTRACT_VERSION || snapshot.sourceType !== 'EQUIPMENT_RENTAL' || snapshot.sourceId !== rental.id
    || snapshot.customerAccountId !== rental.renterAccountId || snapshot.invoiceNumber !== rental.invoiceNumber
    || snapshot.amountMinor !== total || snapshot.currency !== 'SAR' || snapshot.contractedAt !== rental.reservedAt.toISOString()
    || !rentalCanonicalTime(snapshot.scheduledHandoverAt) || snapshot.scheduledHandoverAt !== rental.scheduledHandoverAt.toISOString()
    || !rentalCanonicalTime(snapshot.originalDueAt) || Date.parse(snapshot.originalDueAt) > rental.dueAt.getTime()
    || rental.scheduledHandoverAt.getTime() <= rental.reservedAt.getTime()
    || rental.scheduledHandoverAt.getTime() >= Date.parse(snapshot.originalDueAt)
    || typeof snapshot.organizationId !== 'string' || !snapshot.organizationId || issuer.organizationId !== snapshot.organizationId
    || ['legalName', 'registrationNumber', 'address'].some(key => typeof issuer[key] !== 'string' || !issuer[key].trim())) fail();
  if (!lines.length || new Set(lines.map(line => line.resourceId)).size !== lines.length
    || lines.some(line => line.organizationId !== snapshot.organizationId || !Number.isSafeInteger(Number(line.unitPriceHalala)) || line.unitPriceHalala < 0n)
    || lines.reduce((sum, line) => sum + Number(line.unitPriceHalala), 0) !== total) fail();
  const savedLines = Array.isArray(snapshot.lines) ? snapshot.lines.map(rentalObject) : [];
  if (savedLines.length !== lines.length || new Set(savedLines.map(line => line.id)).size !== lines.length
    || lines.some(line => !savedLines.some(saved => saved.id === line.id && saved.resourceId === line.resourceId && saved.amountMinor === Number(line.unitPriceHalala)))) fail();
  const policy = rentalObject(snapshot.policySnapshot);
  const expected = createRefundPolicySnapshot({lineId: rental.id, kind: 'RENTAL', currency: 'SAR', grossAmountMinor: total,
    contractedAt: rental.reservedAt.toISOString(), contractedScheduledAt: rental.scheduledHandoverAt!.toISOString()});
  if (Object.entries(expected).some(([key, value]) => policy[key] !== value)) fail();
  return snapshot;
}

export function requireAcceptedRentalContract(original: unknown, accepted: unknown, verifiedAt?: Date) {
  const snapshot = rentalObject(accepted);
  const {termsAcceptedAt, acceptedQuoteHash, ...base} = snapshot;
  if (!rentalCanonicalTime(termsAcceptedAt) || Date.parse(termsAcceptedAt) < Date.parse(rentalObject(original).contractedAt)
    || (verifiedAt && Date.parse(termsAcceptedAt) > verifiedAt.getTime())
    || acceptedQuoteHash !== rentalContractHash(original) || rentalCanonicalJson(base) !== rentalCanonicalJson(original)) {
    throw new ConflictException({code: 'RENTAL_ACCEPTED_TERMS_REQUIRED', message: 'The customer must accept the original rental quote before collection.'});
  }
  return snapshot;
}
