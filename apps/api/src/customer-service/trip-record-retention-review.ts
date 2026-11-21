import { Prisma } from '@prisma/client';
import { exportRetentionPolicy } from '../profile/export-retention-policy';

type RequestScope = { kind: string; domain: string; recordRef: string | null };
type ReviewScope = { accountId: string; centerId: string };

const bookingEvidence = {
  safetyIncidents: {
    where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.BookingSelect;

// These observations support a decision about one native record. Missing facts
// never grant permission to erase it or establish a financial retention period.
export async function reviewTripRecordRetention(
  tx: Prisma.TransactionClient,
  request: RequestScope,
  scope: ReviewScope,
) {
  if (request.kind !== 'ERASURE' || (request.domain !== 'BOOKINGS' && request.domain !== 'PAYMENTS')) return;
  const policy = exportRetentionPolicy(request.domain);
  const basis = {
    domain: request.domain,
    policyVersion: policy.version,
    recordClasses: policy.rules.map(rule => rule.recordClass),
    erasureAuthorized: false,
  };
  if (!request.recordRef) return { ...basis, status: 'INDIVIDUAL_REFERENCE_REQUIRED' };

  const ownership = {
    accountId: scope.accountId,
    organizationId: null,
    trip: { organizationId: scope.centerId },
  };
  if (request.domain === 'BOOKINGS') {
    const booking = await tx.booking.findFirst({
      where: { ...ownership, id: request.recordRef },
      select: bookingEvidence,
    });
    if (!booking) return { ...basis, status: 'SOURCE_SCOPE_UNCONFIRMED' };
    return {
      ...basis,
      status: booking.safetyIncidents.length ? 'OPEN_SAFETY_CASE_REQUIRES_REVIEW' : 'BOOKING_RETENTION_REVIEW_REQUIRED',
    };
  }

  const payment = await tx.payment.findFirst({
    where: { id: request.recordRef, accountId: scope.accountId, booking: ownership },
    select: { booking: { select: bookingEvidence }, invoice: { select: { issuedAt: true } } },
  });
  if (!payment) return { ...basis, status: 'SOURCE_SCOPE_UNCONFIRMED' };
  return {
    ...basis,
    status: payment.booking.safetyIncidents.length ? 'OPEN_SAFETY_CASE_REQUIRES_REVIEW' : 'FINANCIAL_CLASSIFICATION_REQUIRED',
    issuedInvoiceOnFile: payment.invoice?.issuedAt != null,
  };
}
