import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommerceCheckout, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { COURSE_CHECKOUT_SOURCE, COURSE_CONTRACT_VERSION, CourseEnrollment, courseCanonicalJson, courseCheckoutExpiresAt,
  courseContractHash, courseObject, requireAcceptedCourseContract, requireCourseContract } from '../commerce/course-contract';
import { requireCourseCollection, requirePostedCourseCollection } from '../commerce/course-collection';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { MoyasarCommerceInvoiceInput, MoyasarPayment, MoyasarPaymentProviderService, MoyasarWebhook } from './moyasar-payment-provider.service';

type Acceptance = {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string};
const sourceType = COURSE_CHECKOUT_SOURCE;
const asJson = (value: unknown) => value as Prisma.InputJsonObject;

@Injectable()
export class TrainingCheckoutService {
  private readonly access: FinanceAccessService;
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly provider: MoyasarPaymentProviderService) {
    this.access = new FinanceAccessService(db);
  }

  private async enrollment(tx: Prisma.TransactionClient, id: string, accountId?: string) {
    await tx.$queryRaw`SELECT "id" FROM "TrainingEnrollment" WHERE "id"=${id} FOR UPDATE`;
    const enrollment = await tx.trainingEnrollment.findUnique({where: {id}});
    if (!enrollment || accountId && enrollment.studentAccountId !== accountId) throw new NotFoundException('Course enrollment not found.');
    if (accountId) {
      await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id"::text=${accountId} FOR SHARE`;
      if (!await tx.account.findFirst({where: {id: accountId, status: 'ACTIVE'}, select: {id: true}})) throw new ForbiddenException('An active student account is required.');
    }
    const contract = requireCourseContract(enrollment);
    return {enrollment, contract};
  }

  private requireOpen(enrollment: CourseEnrollment, contract: Record<string, any>) {
    if (enrollment.status !== 'PENDING' || Date.parse(courseObject(contract.originalSchedule).startsAt) <= Date.now()) {
      throw new ConflictException({code: 'COURSE_CHECKOUT_CLOSED', status: 'REVIEW_REQUIRED',
        message: 'Course payment must be reviewed when the original course has started or the enrollment is not pending.'});
    }
  }

  private async activeCenter(tx: Prisma.TransactionClient, organizationId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
    if (!await tx.organization.findFirst({where: {id: organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}})) {
      throw new ConflictException('The original supplying center is no longer active.');
    }
  }

  private providerInput(checkout: CommerceCheckout): MoyasarCommerceInvoiceInput {
    if (!checkout.dispatchedAt) throw new ConflictException('The original checkout dispatch time is missing.');
    return {checkoutId: checkout.id, sourceType, sourceId: checkout.sourceId, organizationId: checkout.organizationId,
      customerAccountId: checkout.customerAccountId, amountMinor: checkout.amountMinor, currency: 'SAR',
      expiresAt: courseCheckoutExpiresAt(courseObject(checkout.contractSnapshot), checkout.dispatchedAt).toISOString()};
  }

  private checkBinding(checkout: CommerceCheckout, enrollment: CourseEnrollment, contract: Record<string, any>) {
    if (checkout.sourceType !== sourceType || checkout.sourceId !== enrollment.id || checkout.customerAccountId !== enrollment.studentAccountId
      || checkout.organizationId !== enrollment.centerOrganizationId || checkout.amountMinor !== contract.amountMinor
      || checkout.currency !== 'SAR' || checkout.provider !== 'MOYASAR') throw new ConflictException('The original course checkout binding requires review.');
    requireAcceptedCourseContract(contract, checkout.contractSnapshot);
  }

  private sameRevision(current: CommerceCheckout, expected: CommerceCheckout) {
    return current.updatedAt.getTime() === expected.updatedAt.getTime() && current.status === expected.status
      && current.providerInvoiceId === expected.providerInvoiceId && current.providerPaymentId === expected.providerPaymentId
      && courseCanonicalJson(current.providerResult) === courseCanonicalJson(expected.providerResult);
  }

  async quote(accountId: string, enrollmentId: string) {
    return this.db.serializable(async tx => {
      const {enrollment, contract} = await this.enrollment(tx, enrollmentId, accountId);
      this.requireOpen(enrollment, contract);
      await this.activeCenter(tx, enrollment.centerOrganizationId!);
      return {enrollmentId, snapshot: contract, quoteHash: courseContractHash(contract), policyVersion: COURSE_CONTRACT_VERSION,
        expiresAt: courseCheckoutExpiresAt(contract, new Date()), financialActionExecuted: false};
    });
  }

  async checkout(accountId: string, enrollmentId: string, input: Acceptance) {
    const key = input?.idempotencyKey;
    if (typeof key !== 'string' || !/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new BadRequestException('A stable checkout request key is required.');
    const reserve = (recoverOnly = false) => this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`course-checkout:${key}`},0))`;
      const {enrollment, contract} = await this.enrollment(tx, enrollmentId, accountId);
      if (input.acceptedPolicyVersion !== COURSE_CONTRACT_VERSION || input.quoteHash !== courseContractHash(contract)) {
        throw new ConflictException({code: 'COURSE_TERMS_CHANGED', message: 'Review and accept the original course quote before payment.'});
      }
      const fingerprint = courseContractHash({sourceType, enrollmentId, accountId, quoteHash: input.quoteHash, version: input.acceptedPolicyVersion});
      const byKey = await tx.commerceCheckout.findUnique({where: {idempotencyKey: key}});
      if (byKey && (byKey.sourceType !== sourceType || byKey.sourceId !== enrollmentId || byKey.customerAccountId !== accountId || byKey.requestFingerprint !== fingerprint)) {
        throw new ConflictException('The checkout request key belongs to another request.');
      }
      const existing = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollmentId}}});
      if (existing) {
        this.checkBinding(existing, enrollment, contract);
        if (existing.idempotencyKey !== key || existing.requestFingerprint !== fingerprint) throw new ConflictException('Continue the original checkout for this enrollment.');
        await this.activeCenter(tx, existing.organizationId);
        return {checkout: existing, enrollment, dispatch: false};
      }
      if (recoverOnly) throw new ConflictException('The concurrent checkout could not be matched. Review its original request.');
      this.requireOpen(enrollment, contract);
      await this.activeCenter(tx, enrollment.centerOrganizationId!);
      const now = new Date();
      const checkout = await tx.commerceCheckout.create({data: {sourceType, sourceId: enrollmentId,
        organizationId: enrollment.centerOrganizationId!, customerAccountId: accountId, amountMinor: contract.amountMinor,
        currency: 'SAR', provider: 'MOYASAR', idempotencyKey: key, requestFingerprint: fingerprint,
        status: 'DISPATCHED', dispatchedAt: now,
        contractSnapshot: asJson({...contract, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: now.toISOString(), acceptedQuoteHash: input.quoteHash})}});
      await this.audit.record({actorId: accountId, action: 'COURSE_CHECKOUT_DISPATCHED', resource: 'CommerceCheckout', resourceId: checkout.id,
        metadata: {enrollmentId, organizationId: checkout.organizationId, amountMinor: checkout.amountMinor, currency: 'SAR',
          quoteHash: input.quoteHash, policyVersion: COURSE_CONTRACT_VERSION, expiresAt: this.providerInput(checkout).expiresAt}}, tx);
      return {checkout, enrollment, dispatch: true};
    });
    let reserved: Awaited<ReturnType<typeof reserve>>;
    try { reserved = await reserve(); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      // A serializable snapshot may predate the winner after waiting on a lock.
      // Only adopt the exact committed request in a fresh transaction; never POST again.
      reserved = await reserve(true);
    }
    if (!reserved.dispatch) return this.summary(reserved.checkout, reserved.enrollment);
    try {
      this.requireOpen(reserved.enrollment, courseObject(reserved.checkout.contractSnapshot));
      const invoice = await this.provider.createCommerceInvoice(this.providerInput(reserved.checkout));
      const saved = await this.db.serializable(async tx => {
        const {enrollment, contract} = await this.enrollment(tx, enrollmentId, accountId);
        const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: reserved.checkout.id}});
        this.checkBinding(current, enrollment, contract);
        if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id) throw new ConflictException('Another provider invoice is already bound.');
        if (current.status !== 'DISPATCHED' && current.providerInvoiceId === invoice.id) return {checkout: current, enrollment};
        const open = enrollment.status === 'PENDING' && Date.parse(courseObject(contract.originalSchedule).startsAt) > Date.now()
          && Date.parse(invoice.expiresAt) > Date.now() && ['initiated', 'on_hold'].includes(invoice.status)
          && !invoice.payments.some(row => ['paid', 'captured', 'refunded'].includes(row.status));
        const checkout = await tx.commerceCheckout.update({where: {id: current.id}, data: {providerInvoiceId: invoice.id,
          status: open ? 'PENDING' : 'RECONCILIATION_REQUIRED', providerResult: asJson({invoice, verifiedAt: new Date().toISOString()})}});
        await this.audit.record({actorId: accountId, action: 'COURSE_CHECKOUT_CREATED', resource: 'CommerceCheckout', resourceId: current.id,
          metadata: {enrollmentId, providerInvoiceId: invoice.id, status: checkout.status}}, tx);
        return {checkout, enrollment};
      });
      return this.summary(saved.checkout, saved.enrollment);
    } catch {
      await this.markReview(reserved.checkout, 'INVOICE_CREATE_OUTCOME_UNCERTAIN');
      throw new ServiceUnavailableException({code: 'COURSE_CHECKOUT_RECONCILIATION_REQUIRED',
        message: 'The provider result is uncertain. Reconcile the original invoice before another payment request.'});
    }
  }

  private async accountant(accountId: string, organizationId: string, tx: Prisma.TransactionClient) {
    try {
      await this.activeCenter(tx, organizationId);
      await this.access.requireCenterOrganizationAccountant(accountId, organizationId, tx);
    } catch { throw new ForbiddenException('An active accountant for the supplying center must verify course collection.'); }
  }

  private async markReview(expected: CommerceCheckout, reasonCode: string, accountantId?: string) {
    await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "TrainingEnrollment" WHERE "id"=${expected.sourceId} FOR UPDATE`;
      const current = await tx.commerceCheckout.findUnique({where: {id: expected.id}});
      if (current && accountantId) await this.accountant(accountantId, current.organizationId, tx);
      if (!current || !this.sameRevision(current, expected)) return;
      await tx.commerceCheckout.update({where: {id: current.id}, data: {status: 'RECONCILIATION_REQUIRED'}});
      await this.audit.record({action: 'COURSE_CHECKOUT_REVIEW_REQUIRED', resource: 'CommerceCheckout', resourceId: current.id, metadata: {reasonCode}}, tx);
    });
  }

  async refresh(accountId: string, enrollmentId: string) {
    const checkout = await this.db.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollmentId}}});
    if (!checkout || checkout.customerAccountId !== accountId) throw new NotFoundException('Course checkout not found.');
    return this.refreshCheckout(checkout.id, undefined, undefined, accountId);
  }

  private async refreshCheckout(checkoutId: string, recoveredInvoiceId?: string, accountantId?: string, studentId?: string) {
    const binding = await this.db.serializable(async tx => {
      const checkout = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      const {enrollment, contract} = await this.enrollment(tx, checkout.sourceId, studentId);
      this.checkBinding(checkout, enrollment, contract);
      if (accountantId) await this.accountant(accountantId, checkout.organizationId, tx);
      if (checkout.providerInvoiceId && recoveredInvoiceId && checkout.providerInvoiceId !== recoveredInvoiceId) throw new ConflictException('Another invoice is already bound.');
      const invoiceId = checkout.providerInvoiceId || recoveredInvoiceId;
      if (!invoiceId || !checkout.dispatchedAt) throw new ConflictException({code: 'COURSE_CHECKOUT_RECONCILIATION_REQUIRED', message: 'Reconcile the original provider invoice first.'});
      return {checkout, enrollment, invoiceId};
    });
    let invoice, payment: MoyasarPayment | null = null;
    try {
      invoice = await this.provider.fetchCommerceInvoice(binding.invoiceId, this.providerInput(binding.checkout));
      const collected = invoice.payments.filter(row => ['paid', 'captured', 'refunded'].includes(row.status));
      if (collected.length > 1 || invoice.status === 'paid' && collected.length !== 1
        || invoice.payments.some(row => ['authorized', 'verified'].includes(row.status))) throw new ConflictException('The invoice requires payment reconciliation.');
      if (collected.length === 1) {
        const candidate = collected[0];
        if (candidate.amount !== binding.checkout.amountMinor || candidate.currency !== 'SAR') throw new ConflictException('Provider payment does not match the original course quote.');
        payment = await this.provider.fetchPayment(candidate.id, {invoiceId: invoice.id, amountMinor: binding.checkout.amountMinor, currency: 'SAR'});
        if (binding.checkout.providerPaymentId && binding.checkout.providerPaymentId !== payment.id) throw new ConflictException('Provider payment reference changed.');
      }
    } catch {
      await this.markReview(binding.checkout, 'PROVIDER_COLLECTION_NOT_VERIFIED', accountantId);
      throw new ServiceUnavailableException({code: 'COURSE_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The original course collection requires reconciliation.'});
    }
    const verifiedAt = new Date();
    const result = await this.db.serializable(async tx => {
      const {enrollment, contract} = await this.enrollment(tx, binding.enrollment.id, studentId);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      this.checkBinding(current, enrollment, contract);
      if (accountantId) await this.accountant(accountantId, current.organizationId, tx);
      if (!this.sameRevision(current, binding.checkout)) return {checkout: current, enrollment};
      if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id || current.providerPaymentId && payment && current.providerPaymentId !== payment.id) {
        throw new ConflictException('Provider references no longer match this enrollment.');
      }
      const originalStart = Date.parse(courseObject(contract.originalSchedule).startsAt);
      const activeCenter = Boolean(await tx.organization.findFirst({where: {id: current.organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}}));
      const pending = activeCenter && enrollment.status === 'PENDING' && originalStart > verifiedAt.getTime();
      const alreadyConfirmed = activeCenter && ['PENDING', 'ACTIVE', 'COMPLETED', 'SUSPENDED'].includes(enrollment.status)
        && Boolean(await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollment.id}}, select: {id: true}}));
      const captured = invoice.status === 'paid' && payment && ['paid', 'captured'].includes(payment.status)
        && payment.capturedMinor === current.amountMinor && payment.refundedMinor === 0 && payment.refundedAt === null
        && Date.parse(payment.updatedAt) <= verifiedAt.getTime() && Date.parse(payment.updatedAt) <= Date.parse(invoice.expiresAt)
        && Date.parse(payment.updatedAt) < originalStart;
      const previous = courseObject(courseObject(current.providerResult).payment);
      const regressed = payment && previous.id === payment.id && (payment.refundedMinor < Number(previous.refundedMinor)
        || payment.capturedMinor < Number(previous.capturedMinor) || Date.parse(payment.updatedAt) < Date.parse(previous.updatedAt));
      const noPendingPayment = invoice.payments.every(row => ['failed', 'voided', 'expired'].includes(row.status));
      let status = 'RECONCILIATION_REQUIRED';
      if (captured && !regressed && (pending || alreadyConfirmed)) status = 'CAPTURED';
      else if (!payment && !current.providerPaymentId && pending && Date.parse(invoice.expiresAt) > verifiedAt.getTime() && ['initiated', 'on_hold'].includes(invoice.status)) status = 'PENDING';
      else if (!payment && !current.providerPaymentId && noPendingPayment && ['canceled', 'expired', 'voided'].includes(invoice.status)) status = 'CANCELLED';
      else if (!payment && !current.providerPaymentId && noPendingPayment && invoice.status === 'failed') status = 'FAILED';
      const checkout = await tx.commerceCheckout.update({where: {id: checkoutId}, data: {status, providerInvoiceId: invoice.id,
        ...(payment ? {providerPaymentId: payment.id} : {}), providerResult: asJson({invoice,
          payment: regressed || !payment && current.providerPaymentId ? previous : payment, verifiedAt: verifiedAt.toISOString(),
          ...(regressed ? {rejectedObservation: {payment, reasonCode: 'PROVIDER_BALANCE_OR_TIMESTAMP_REGRESSED'}} : {})})}});
      await this.audit.record({action: 'COURSE_COLLECTION_OBSERVED', resource: 'CommerceCheckout', resourceId: checkoutId,
        metadata: {enrollmentId: enrollment.id, providerInvoiceId: invoice.id, providerPaymentId: payment?.id ?? null,
          status, capturedMinor: payment?.capturedMinor ?? 0, refundedMinor: payment?.refundedMinor ?? 0, verifiedAt: verifiedAt.toISOString()}}, tx);
      return {checkout, enrollment};
    });
    return this.summary(result.checkout, result.enrollment);
  }

  async reconcileInvoice(accountId: string, enrollmentId: string, invoiceId?: string) {
    if (typeof invoiceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(invoiceId)) throw new BadRequestException('An original provider invoice reference is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollmentId}}});
      if (!row) throw new NotFoundException('Course checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    return this.refreshCheckout(checkout.id, invoiceId, accountId);
  }

  async publishCollection(accountId: string, enrollmentId: string, financeEntryId?: string) {
    if (typeof financeEntryId !== 'string' || !financeEntryId.trim() || financeEntryId.length > 128) throw new BadRequestException('A posted course revenue entry is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollmentId}}});
      if (!row) throw new NotFoundException('Course checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    await this.refreshCheckout(checkout.id, undefined, accountId);
    return this.db.serializable(async tx => {
      const {enrollment, contract} = await this.enrollment(tx, enrollmentId);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkout.id}});
      this.checkBinding(current, enrollment, contract);
      await this.accountant(accountId, current.organizationId, tx);
      const observation = courseObject(current.providerResult), payment = courseObject(observation.payment), invoice = courseObject(observation.invoice);
      const verifiedAt = new Date(observation.verifiedAt);
      if (current.status !== 'CAPTURED' || !current.providerPaymentId || !current.providerInvoiceId
        || payment.id !== current.providerPaymentId || payment.invoiceId !== current.providerInvoiceId || invoice.id !== current.providerInvoiceId
        || !['paid', 'captured'].includes(payment.status) || payment.capturedMinor !== current.amountMinor || payment.refundedMinor !== 0 || payment.refundedAt !== null
        || !Number.isFinite(verifiedAt.getTime()) || verifiedAt.getTime() > Date.now() || Date.now() - verifiedAt.getTime() > 60_000) {
        throw new ConflictException('A fresh, fully captured and unrefunded original course payment is required.');
      }
      requireAcceptedCourseContract(contract, current.contractSnapshot, verifiedAt);
      await requirePostedCourseCollection(tx, {financeEntryId, enrollmentId, organizationId: current.organizationId, amountMinor: current.amountMinor});
      const existing = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollmentId}}});
      if (existing) {
        if (existing.financeEntryId !== financeEntryId) throw new ConflictException('This enrollment already has another collection receipt.');
        await requireCourseCollection(tx, enrollment);
        return {status: 'COLLECTION_VERIFIED', enrollmentId, collectionEvidenceId: existing.id, financialConfirmation: 'VERIFIED', trainingStatus: enrollment.status};
      }
      this.requireOpen(enrollment, contract);
      const proof = await tx.commerceCollectionEvidence.create({data: {sourceType, sourceId: enrollmentId,
        organizationId: current.organizationId, customerAccountId: current.customerAccountId, amountMinor: current.amountMinor, currency: 'SAR',
        provider: 'MOYASAR', providerPaymentId: current.providerPaymentId, providerInvoiceId: current.providerInvoiceId,
        providerCapturedMinor: payment.capturedMinor, providerRefundedMinor: 0, providerVerifiedAt: verifiedAt,
        providerSnapshot: asJson({...payment, invoiceMetadata: invoice.metadata}), financeEntryId, contractSnapshot: asJson(current.contractSnapshot)}});
      const confirmedAt = new Date();
      await tx.trainingEnrollment.update({where: {id: enrollmentId}, data: {metadata: asJson({...courseObject(enrollment.metadata),
        financialConfirmation: {status: 'VERIFIED', collectionEvidenceId: proof.id, financeEntryId, confirmedByAccountId: accountId, confirmedAt: confirmedAt.toISOString()}})}});
      await this.audit.record({actorId: accountId, action: 'COURSE_COLLECTION_VERIFIED', resource: 'TrainingEnrollment', resourceId: enrollmentId,
        metadata: {checkoutId: current.id, collectionEvidenceId: proof.id, financeEntryId, providerPaymentId: current.providerPaymentId,
          providerInvoiceId: current.providerInvoiceId, organizationId: current.organizationId, amountMinor: current.amountMinor, currency: 'SAR'}}, tx);
      return {status: 'COLLECTION_VERIFIED', enrollmentId, collectionEvidenceId: proof.id, financialConfirmation: 'VERIFIED', trainingStatus: enrollment.status};
    });
  }

  async handleVerifiedProviderEvent(event: MoyasarWebhook) {
    const invoiceId = typeof event.data.invoice_id === 'string' ? event.data.invoice_id : '';
    if (!invoiceId) return {handled: false};
    const checkout = await this.db.commerceCheckout.findUnique({where: {providerInvoiceId: invoiceId}});
    if (!checkout || checkout.sourceType !== sourceType) return {handled: false};
    const result = await this.refreshCheckout(checkout.id);
    return {handled: true, status: result.status, enrollmentId: checkout.sourceId};
  }

  private async summary(checkout: CommerceCheckout, enrollment: CourseEnrollment) {
    const evidence = await this.db.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: enrollment.id}}, select: {id: true}});
    const activeCenter = Boolean(await this.db.organization.findFirst({where: {id: checkout.organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}}));
    const invoice = courseObject(courseObject(checkout.providerResult).invoice);
    const expiresAt = checkout.dispatchedAt ? courseCheckoutExpiresAt(courseObject(checkout.contractSnapshot), checkout.dispatchedAt) : null;
    const open = activeCenter && enrollment.status === 'PENDING' && expiresAt && expiresAt.getTime() > Date.now();
    return {checkoutId: checkout.id, enrollmentId: enrollment.id, status: activeCenter ? checkout.status : 'RECONCILIATION_REQUIRED', amountMinor: checkout.amountMinor, currency: checkout.currency,
      checkoutUrl: open && checkout.status === 'PENDING' && typeof invoice.url === 'string' ? invoice.url : null,
      expiresAt, collectionVerified: Boolean(activeCenter && evidence && checkout.status === 'CAPTURED'), trainingStatus: enrollment.status,
      invoiceReadiness: 'REVIEW_REQUIRED'};
  }
}
