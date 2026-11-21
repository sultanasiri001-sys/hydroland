import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { createCommerceContractSnapshot, COMMERCE_CONTRACT_SNAPSHOT_VERSION } from './commerce-contract-snapshot';
import { CommerceRefundEvidence, CommerceRefundPolicySnapshot, evaluateCommerceRefund } from './commerce-refund-policy';
import { tripBookingPaymentRequirement } from './trip-booking-contract';

const object = (value: unknown): Record<string, any> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
export const contractHash = (snapshot: unknown) => createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

@Injectable()
export class PaymentContractService {
  constructor(private readonly db: DatabaseService) {}

  buildTrip(booking: any, pricePerSeatMinor: number, currency: string) {
    const saved = object(booking?.contractSnapshot);
    if (!saved) throw new ConflictException({ code: 'ORIGINAL_BOOKING_TERMS_REQUIRED', message: 'This older booking needs a review of its original terms.' });
    if (tripBookingPaymentRequirement(booking).source !== 'SNAPSHOT') throw new ConflictException('Original booking price and policy evidence require review.');
    if (saved.source?.kind !== 'TRIP_BOOKING' || saved.source?.id !== booking.id || saved.source?.offeringId !== booking.tripId
      || saved.customerAccountId !== booking.accountId || saved.quantity !== booking.seats || saved.unitPriceMinor !== pricePerSeatMinor || saved.currency !== currency) {
      throw new ConflictException('Booking contract binding is invalid.');
    }
    return saved as ReturnType<typeof createCommerceContractSnapshot>;
  }

  async quote(accountId: string, bookingId: string) {
    const booking = await this.db.booking.findFirst({ where: { id: bookingId, accountId, organizationId: null }, include: { trip: { include: { organization: true } } } });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.status === 'CANCELLED') throw new ConflictException('Booking was cancelled.');
    const saved = object(booking.contractSnapshot);
    if (!saved) throw new ConflictException('Original booking terms require review.');
    const snapshot = this.buildTrip(booking, saved.unitPriceMinor, saved.currency);
    return { snapshot, quoteHash: contractHash(snapshot), policyVersion: COMMERCE_CONTRACT_SNAPSHOT_VERSION, financialActionExecuted: false };
  }

  accepted(snapshot: ReturnType<typeof createCommerceContractSnapshot>, acceptance?: { version?: string; quoteHash?: string }) {
    if (!acceptance) return snapshot;
    if (acceptance.version !== COMMERCE_CONTRACT_SNAPSHOT_VERSION || acceptance.quoteHash !== contractHash(snapshot)) {
      throw new ConflictException({ code: 'PAYMENT_TERMS_CHANGED', message: 'Checkout conditions changed. Review the current quote.' });
    }
    return { ...snapshot, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: new Date().toISOString(), acceptedQuoteHash: acceptance.quoteHash };
  }

  // Legacy paid contracts are never silently assigned today's fees.
  async refundDecision(payment: Payment, requestedAt: Date, tx: Prisma.TransactionClient = this.db) {
    const contract = object(payment.contractSnapshot);
    const policy = object(contract?.refundPolicy);
    const snapshot = object(policy?.snapshot) as CommerceRefundPolicySnapshot | null;
    const review = (reasonCode: string) => ({ status: 'REVIEW_REQUIRED', reasonCode, refundAmountMinor: null, financialActionExecuted: false, serviceCompletionImplied: false });
    if (!contract || policy?.status !== 'RECORDED' || !snapshot) return review('ORIGINAL_CONTRACT_SNAPSHOT_REQUIRED');
    if (contract.source?.kind !== 'TRIP_BOOKING' || contract.source?.id !== payment.bookingId || contract.customerAccountId !== payment.accountId
      || contract.amountMinor !== payment.amountMinor || contract.currency !== payment.currency || snapshot.lineId !== payment.bookingId
      || contract.kind !== 'TRIP' || snapshot.kind !== 'TRIP' || snapshot.currency !== payment.currency || snapshot.grossAmountMinor !== payment.amountMinor
      || snapshot.contractedAt !== contract.recordedAt || snapshot.contractedScheduledAt !== contract.originalSchedule?.startsAt || snapshot.version !== contract.version) return review('CONTRACT_PAYMENT_BINDING_MISMATCH');
    const booking = await tx.booking.findUnique({ where: { id: payment.bookingId }, include: { participants: { select: { id: true } }, trip: true } });
    if (!booking || booking.trip.organizationId !== contract.issuer?.organizationId) return review('CONTRACT_ISSUER_BINDING_MISMATCH');
    const completion = await tx.auditEvent.findFirst({ where: { resource: 'Trip', resourceId: booking.tripId, action: 'TRIP_COMPLETED', occurredAt: { lte: requestedAt } }, orderBy: { occurredAt: 'desc' } });
    const closed = await tx.auditEvent.findFirst({ where: { resource: 'Trip', resourceId: booking.tripId, action: 'TRIP_STATUS_CHANGED', occurredAt: { lte: requestedAt }, metadata: { path: ['status'], equals: 'CLOSED' } }, orderBy: { occurredAt: 'desc' } });
    const completed = object(completion?.metadata);
    const attended = Array.isArray(completed?.attendedParticipantIds) ? completed.attendedParticipantIds : [];
    const absent = Array.isArray(completed?.absentParticipantIds) ? completed.absentParticipantIds : [];
    const participants = booking.participants.map(row => row.id);
    if (attended.some((id: unknown) => absent.includes(id))) return review('CONTRADICTORY_ATTENDANCE_EVIDENCE');
    const hasAttendance = participants.some(id => attended.includes(id));
    const allAbsent = participants.length === booking.seats && participants.every(id => absent.includes(id));
    const beforeStart = requestedAt.getTime() < Date.parse(snapshot.contractedScheduledAt || '');
    const evidence: CommerceRefundEvidence = {
      lineId: snapshot.lineId, consumption: hasAttendance ? 'CONSUMED' : beforeStart ? 'NONE' : 'UNKNOWN',
      statutoryClassification: 'UNKNOWN',
      ...(closed ? { tripClosedAt: closed.occurredAt.toISOString() } : {}),
      ...(completion && allAbsent ? { noShowAt: completion.occurredAt.toISOString() } : {}),
    };
    // Classification is a separately reviewed legal fact, not a guess from TRIP.
    const classification = object((await tx.operationalSetting.findUnique({ where: { key: `commerce-legal-classification:TRIP:${booking.tripId}` } }))?.value);
    if (classification?.sourceId === booking.tripId && classification?.sourceType === 'TRIP' && typeof classification?.evidenceReference === 'string'
      && ['ELIGIBLE', 'EXEMPT'].includes(classification.classification)) {
      evidence.statutoryClassification = classification.classification;
      evidence.legalEvidenceReference = classification.evidenceReference;
      if (classification.exception) evidence.statutoryException = classification.exception;
    }
    const pending = await tx.commerceRefundOperation.aggregate({ where: { paymentId: payment.id, status: { in: ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED'] } }, _sum: { amountMinor: true } });
    const decision = evaluateCommerceRefund({ snapshot, requestedAt: requestedAt.toISOString(), evidenceAsOf: new Date().toISOString(),
      cause: completion && allAbsent ? 'NO_SHOW' : 'CUSTOMER_CANCELLATION',
      collectedAmountMinor: ['CAPTURED', 'REFUNDED'].includes(payment.status) ? payment.amountMinor : 0,
      refundedAmountMinor: payment.refundedAmountMinor, reservedRefundAmountMinor: pending._sum.amountMinor || 0, evidence });
    if (decision.basis === 'COMMERCIAL' && decision.refundBasisPoints !== 10000 && contract.termsAcceptanceStatus !== 'ACCEPTED') return review('CUSTOMER_ACCEPTED_TERMS_REQUIRED');
    return decision;
  }

  async recordInvoiceSnapshot(payment: Payment, tx: Prisma.TransactionClient) {
    const contract = object(payment.contractSnapshot);
    if (!contract || !['CAPTURED', 'REFUNDED'].includes(payment.status)) return;
    const invoice = await tx.invoice.findUnique({ where: { paymentId: payment.id } });
    // Existing issued invoices have their own provenance; never overwrite one.
    if (invoice) return;
    await tx.invoice.create({ data: { paymentId: payment.id, number: `HL-DRAFT-${payment.id}`, status: 'DRAFT', contractSnapshot: contract as Prisma.InputJsonObject } });
  }
}
