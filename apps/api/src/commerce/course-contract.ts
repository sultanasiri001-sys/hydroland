import { ConflictException } from '@nestjs/common';
import type { TrainingEnrollment } from '@prisma/client';
import { COMMERCE_CONTRACT_SNAPSHOT_VERSION } from './commerce-contract-snapshot';
import { createRefundPolicySnapshot } from './commerce-refund-policy';
import { rentalCanonicalJson, rentalCanonicalTime, rentalContractHash, rentalObject } from './rental-contract';

export const COURSE_CONTRACT_VERSION = COMMERCE_CONTRACT_SNAPSHOT_VERSION;
export const COURSE_CHECKOUT_SOURCE = 'TRAINING_ENROLLMENT';
export const courseObject = rentalObject;
export const courseCanonicalJson = rentalCanonicalJson;
export const courseContractHash = rentalContractHash;
export type CourseEnrollment = Pick<TrainingEnrollment, 'id' | 'studentAccountId' | 'centerOrganizationId' | 'storeCourseOfferId' | 'status' | 'metadata' | 'updatedAt'>;

/** Only the original server-recorded enrollment terms authorize collection.
 * Never reconstruct a historical price, issuer or schedule from today's offer.
 */
export function requireCourseContract(enrollment: CourseEnrollment) {
  const fail = (): never => { throw new ConflictException({code: 'COURSE_ORIGINAL_CONTRACT_REQUIRED', status: 'REVIEW_REQUIRED',
    message: 'Review the original course price, supplying center and schedule before payment.'}); };
  const metadata = courseObject(enrollment.metadata), snapshot = courseObject(metadata.contractSnapshot);
  const source = courseObject(snapshot.source), issuer = courseObject(snapshot.issuer), schedule = courseObject(snapshot.originalSchedule);
  const policy = courseObject(snapshot.refundPolicy);
  if (metadata.source !== 'UNIFIED_STORE' || !enrollment.storeCourseOfferId || !enrollment.centerOrganizationId
    || snapshot.version !== COURSE_CONTRACT_VERSION || source.kind !== COURSE_CHECKOUT_SOURCE || source.id !== enrollment.id
    || source.parentId !== null || source.offeringId !== enrollment.storeCourseOfferId || snapshot.kind !== 'COURSE'
    || snapshot.customerAccountId !== enrollment.studentAccountId || issuer.organizationId !== enrollment.centerOrganizationId
    || snapshot.collectionModel !== 'HYDROLAND_ON_BEHALF_OF_PROVIDER' || snapshot.termsAcceptanceStatus !== 'NOT_RECORDED'
    || !Number.isSafeInteger(snapshot.amountMinor) || snapshot.amountMinor < 100 || snapshot.amountMinor > 2_147_483_647
    || snapshot.unitPriceMinor !== snapshot.amountMinor || snapshot.quantity !== 1 || snapshot.currency !== 'SAR'
    || typeof snapshot.title !== 'string' || !snapshot.title.trim()
    || metadata.priceMinor !== snapshot.amountMinor || metadata.currency !== snapshot.currency || metadata.title !== snapshot.title
    || !rentalCanonicalTime(snapshot.recordedAt) || !rentalCanonicalTime(schedule.startsAt) || !rentalCanonicalTime(schedule.endsAt)
    || schedule.startsAt < snapshot.recordedAt || schedule.endsAt <= schedule.startsAt
    || metadata.startsAt !== schedule.startsAt || metadata.endsAt !== schedule.endsAt
    || ['legalName', 'registrationNumber', 'address'].some(key => typeof issuer[key] !== 'string' || !issuer[key].trim())
    || policy.status !== 'RECORDED' || policy.reasonCode !== null) fail();
  const expected = createRefundPolicySnapshot({lineId: enrollment.id, kind: 'COURSE', currency: 'SAR', grossAmountMinor: snapshot.amountMinor,
    contractedAt: snapshot.recordedAt, contractedScheduledAt: schedule.startsAt});
  if (courseCanonicalJson(policy.snapshot) !== courseCanonicalJson(expected)) fail();
  return snapshot;
}

export function requireAcceptedCourseContract(original: unknown, accepted: unknown, observedAt?: Date) {
  const snapshot = courseObject(accepted), source = courseObject(original);
  const {termsAcceptedAt, acceptedQuoteHash, termsAcceptanceStatus, ...base} = snapshot;
  if (termsAcceptanceStatus !== 'ACCEPTED' || !rentalCanonicalTime(termsAcceptedAt)
    || Date.parse(termsAcceptedAt) < Date.parse(source.recordedAt)
    || Date.parse(termsAcceptedAt) >= Date.parse(courseObject(source.originalSchedule).startsAt)
    || (observedAt && Date.parse(termsAcceptedAt) > observedAt.getTime())
    || acceptedQuoteHash !== courseContractHash(source)
    || courseCanonicalJson({...base, termsAcceptanceStatus: 'NOT_RECORDED'}) !== courseCanonicalJson(source)) {
    throw new ConflictException({code: 'COURSE_ACCEPTED_TERMS_REQUIRED', status: 'REVIEW_REQUIRED',
      message: 'Accept the original course quote before collecting payment.'});
  }
  return snapshot;
}

/** This is provider-link lifetime only. It does not cancel a seat, change a
 * course price or create a commercial cancellation fee.
 */
export function courseCheckoutExpiresAt(contract: Record<string, any>, dispatchedAt: Date) {
  return new Date(Math.min(Date.parse(courseObject(contract.originalSchedule).startsAt), dispatchedAt.getTime() + 30 * 60_000));
}
