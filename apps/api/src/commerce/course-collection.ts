import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { COURSE_CHECKOUT_SOURCE, courseCanonicalJson, courseObject, requireAcceptedCourseContract, requireCourseContract } from './course-contract';
import type { CourseEnrollment } from './course-contract';

const fail = (): never => { throw new ConflictException({code: 'COURSE_COLLECTION_EVIDENCE_REQUIRED', status: 'REVIEW_REQUIRED',
  message: 'Course payment requires its verified provider collection and independently approved posted revenue entry.'}); };

export async function requirePostedCourseCollection(tx: Prisma.TransactionClient, input: {
  financeEntryId: string; enrollmentId: string; organizationId: string; amountMinor: number;
}) {
  await tx.$queryRaw`SELECT "id" FROM "FinanceEntry" WHERE "id"::text=${input.financeEntryId} FOR SHARE`;
  const entry = await tx.financeEntry.findUnique({where: {id: input.financeEntryId}, include: {financeAccount: true, approvals: true}});
  if (!entry || entry.status !== 'POSTED' || entry.type !== 'REVENUE' || entry.organizationId !== input.organizationId
    || entry.amountMinor !== input.amountMinor || entry.currency !== 'SAR' || entry.referenceType !== 'TRAINING_ENROLLMENT_COLLECTION'
    || entry.referenceId !== input.enrollmentId || !entry.financeAccount.active || entry.financeAccount.organizationId !== input.organizationId
    || entry.financeAccount.currency !== 'SAR' || !entry.requestedByAccountId || !entry.approvedByAccountId || !entry.postedByAccountId
    || !entry.approvedAt || !entry.postedAt || entry.postedAt.getTime() < entry.approvedAt.getTime()
    || new Set([entry.requestedByAccountId, entry.approvedByAccountId, entry.postedByAccountId]).size !== 3
    || !entry.approvals.some(approval => approval.status === 'APPROVED' && approval.requestedByAccountId === entry.requestedByAccountId
      && approval.decidedByAccountId === entry.approvedByAccountId && approval.decidedAt?.getTime() === entry.approvedAt!.getTime())) fail();
  return entry!;
}

/** Financial readiness does not replace qualification, attendance or training
 * standard gates. Non-store training retains its existing registration path.
 */
export async function requireCourseCollection(tx: Prisma.TransactionClient, enrollment: CourseEnrollment) {
  if (!enrollment.storeCourseOfferId) return null;
  const contract = requireCourseContract(enrollment, true);
  // An explicitly free original enrollment never creates a payment obligation.
  if (contract.amountMinor === 0) return null;
  const key = {sourceType: COURSE_CHECKOUT_SOURCE, sourceId: enrollment.id};
  const evidence = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: key}});
  const checkout = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: key}});
  if (!evidence || !checkout || checkout.status !== 'CAPTURED' || !checkout.providerPaymentId || !checkout.providerInvoiceId
    || evidence.organizationId !== enrollment.centerOrganizationId || evidence.customerAccountId !== enrollment.studentAccountId
    || checkout.organizationId !== evidence.organizationId || checkout.customerAccountId !== evidence.customerAccountId
    || checkout.amountMinor !== contract.amountMinor || evidence.amountMinor !== contract.amountMinor
    || checkout.currency !== 'SAR' || evidence.currency !== 'SAR' || checkout.provider !== 'MOYASAR' || evidence.provider !== 'MOYASAR'
    || evidence.providerPaymentId !== checkout.providerPaymentId || evidence.providerInvoiceId !== checkout.providerInvoiceId
    || evidence.providerCapturedMinor !== contract.amountMinor || evidence.providerRefundedMinor !== 0
    || courseCanonicalJson(evidence.contractSnapshot) !== courseCanonicalJson(checkout.contractSnapshot)) fail();
  const payment = courseObject(courseObject(checkout!.providerResult).payment);
  if (payment.id !== checkout!.providerPaymentId || payment.invoiceId !== checkout!.providerInvoiceId
    || payment.amountMinor !== contract.amountMinor || payment.currency !== 'SAR' || !['paid', 'captured'].includes(payment.status)
    || payment.capturedMinor !== contract.amountMinor || payment.refundedMinor !== 0 || payment.refundedAt !== null) fail();
  requireAcceptedCourseContract(contract, evidence!.contractSnapshot, evidence!.providerVerifiedAt);
  await requirePostedCourseCollection(tx, {financeEntryId: evidence!.financeEntryId, enrollmentId: enrollment.id,
    organizationId: evidence!.organizationId, amountMinor: evidence!.amountMinor});
  return evidence;
}
