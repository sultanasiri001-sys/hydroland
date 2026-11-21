import { tripCalendarReservation } from '../trips/trip-calendar-reservation';
import { FinanceAccessService } from '../finance/finance-access.service';
import { requirePostedCommerceCollection } from '../commerce/rental-collection-ledger';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PaymentContractService, contractHash } from '../commerce/payment-contract.service';
import { COMMERCE_CONTRACT_SNAPSHOT_VERSION } from '../commerce/commerce-contract-snapshot';
import { tripBookingPaymentRequirement } from '../commerce/trip-booking-contract';
import { DatabaseService } from '../database/database.service';
import { requireBookingPrepaymentMandate } from '../finance/finance-operation-mandate';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';
import { record } from '../hr/staffing-catalog';
import { IntegrationService } from '../integrations/integration.service';
import { MoyasarInvoice, MoyasarPaymentProviderService } from './moyasar-payment-provider.service';

const source = 'ORGANIZATION_BOOKING_PREPAYMENT';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asJson = (value: unknown) => value as Prisma.InputJsonObject;
const pending = () => new ConflictException({ code: 'ORGANIZATION_PREPAYMENT_RECONCILIATION_REQUIRED',
  message: 'تجري مطابقة طلب الدفع الأول. لن يرسل طلب تحصيل آخر لهذا الحجز.' });
export const organizationPayer = (snapshot: unknown) => record(record(snapshot).organizationPaymentAuthorization);

@Injectable()
export class OrganizationBookingCheckoutService {
  constructor(private readonly db: DatabaseService, private readonly contracts: PaymentContractService,
    private readonly integrations: IntegrationService, private readonly provider: MoyasarPaymentProviderService) {}

  private async booking(tx: Prisma.TransactionClient, organizationId: string, bookingId: string) {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, organizationId }, include: { trip: true } });
    if (!booking) throw new NotFoundException('لم يعثر على الحجز في هذه الجهة.');
    const req = tripBookingPaymentRequirement(booking);
    const contract = record(booking.contractSnapshot), supplier = record(contract.issuer);
    if (req.source !== 'SNAPSHOT' || req.requiredAmountMinor === null || req.requiredAmountMinor < 100
      || typeof supplier.organizationId !== 'string' || supplier.organizationId !== booking.trip.organizationId) {
      throw new ConflictException('يتطلب التحصيل عقد الحجز الأصلي، ومبلغًا صالحًا، ومركزًا مصدرًا محددًا.');
    }
    return { booking, snapshot: this.contracts.buildTrip(booking, Number(contract.unitPriceMinor), 'SAR'), amount: req.requiredAmountMinor };
  }

  private async eligible(tx: Prisma.TransactionClient, accountId: string, organizationId: string, bookingId: string) {
    const member = await tx.organizationMember.findFirst({ where: { accountId, organizationId, status: 'ACTIVE',
      organization: { status: 'ACTIVE' }, account: { status: 'ACTIVE' } }, select: { id: true } });
    if (!member) throw new NotFoundException('الحجز غير متاح.');
    const data = await this.booking(tx, organizationId, bookingId);
    const seller = await tx.organization.findFirst({ where: { id: data.booking.trip.organizationId!, kind: 'DIVE_CENTER', status: 'ACTIVE' }, select: { id: true } });
    if (!seller) throw new ConflictException('المركز المورّد غير متاح للتحصيل.');
    const grant = await requireBookingPrepaymentMandate(tx, accountId, organizationId, data.amount);
    return { ...data, grant };
  }

  async quote(accountId: string, organizationId: string, bookingId: string) {
    return this.db.serializable(async tx => {
      const { booking, snapshot } = await this.eligible(tx, accountId, organizationId, bookingId);
      if (booking.status !== 'PENDING' || booking.trip.startsAt <= new Date()) throw new ConflictException('فترة دفع الحجز منتهية.');
      return { snapshot, quoteHash: contractHash(snapshot), policyVersion: COMMERCE_CONTRACT_SNAPSHOT_VERSION };
    });
  }

  async checkout(accountId: string, organizationId: string, bookingId: string, input: Record<string, unknown>) {
    if (!input || Object.keys(input).some(k => !['requestId', 'quoteHash', 'policyVersion'].includes(k))
      || typeof input.requestId !== 'string' || !uuid.test(input.requestId) || typeof input.quoteHash !== 'string'
      || input.policyVersion !== COMMERCE_CONTRACT_SNAPSHOT_VERSION) throw new BadRequestException('راجع عقد الحجز وأرسل قبول شروطه مع معرّف الطلب.');
    const key = 'org-prepay:' + createHash('sha256').update(JSON.stringify([organizationId, input.requestId])).digest('hex');
    const reserve = () => this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id"::text=${bookingId} AND "organizationId"::text=${organizationId} FOR UPDATE`;
      const { booking, snapshot, amount, grant } = await this.eligible(tx, accountId, organizationId, bookingId);
      if (booking.status !== 'PENDING' || booking.trip.startsAt <= new Date()) throw new ConflictException('فترة دفع الحجز منتهية.');
      const accepted = this.contracts.accepted(snapshot, { version: COMMERCE_CONTRACT_SNAPSHOT_VERSION, quoteHash: input.quoteHash as string });
      const prior = await tx.payment.findMany({ where: { OR: [{ bookingId }, { idempotencyKey: key }] }, take: 2 });
      if (prior.length) {
        const old = prior[0], proof = organizationPayer(old.contractSnapshot);
        if (prior.length !== 1 || old.bookingId !== bookingId || old.accountId !== accountId || old.amountMinor !== amount || old.currency !== 'SAR'
          || proof.source !== source || proof.buyerOrganizationId !== organizationId || record(old.contractSnapshot).acceptedQuoteHash !== input.quoteHash) {
          throw new ConflictException('يوجد طلب مالي سابق يتطلب المطابقة قبل الدفع.');
        }
        return { payment: old, dispatch: false };
      }
      const { calendarReservation } = await tripCalendarReservation(tx, booking.trip, true);
      if (calendarReservation.issues.length) throw new ConflictException({ code: 'ORGANIZATION_BOOKING_CALENDAR_REVIEW', issues: calendarReservation.issues });
      this.integrations.requireOperational('PAYMENT_PSP', { allowSandbox: true });
      const payment = await tx.payment.create({ data: { accountId, bookingId, idempotencyKey: key, amountMinor: amount, currency: 'SAR',
        contractSnapshot: asJson({ ...accepted, organizationPaymentAuthorization: { source, buyerOrganizationId: organizationId,
          bookingId, delegateAccountId: accountId, grantId: grant.grantId, approvalEvidenceReference: grant.approvalEvidenceReference } }) } });
      await tx.auditEvent.create({ data: { actorId: grant.account.personId, action: 'ORGANIZATION_PREPAYMENT_DISPATCH_CLAIMED',
        resource: 'Payment', resourceId: payment.id, metadata: { organizationId, bookingId, grantId: grant.grantId, amountMinor: amount, currency: 'SAR' } } });
      return { payment, dispatch: true };
    });
    let result: Awaited<ReturnType<typeof reserve>>;
    try { result = await reserve(); } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') throw e;
      result = await reserve();
    }
    const payment = result.payment;
    if (!result.dispatch && !payment.providerReference) throw pending();
    let invoice: MoyasarInvoice;
    if (result.dispatch) {
      try { invoice = await this.provider.createInvoice({ paymentId: payment.id, bookingId, amountMinor: payment.amountMinor, currency: 'SAR',
        organizationPayment: { buyerOrganizationId: organizationId, delegateAccountId: accountId } }); }
      catch { throw pending(); }
    } else invoice = await this.provider.fetchInvoice(payment.providerReference!);
    return (await this.observe(payment, invoice, true, accountId)).summary;
  }

  async refresh(accountId: string, organizationId: string, bookingId: string) {
    const payment = await this.db.serializable(async tx => {
      await this.eligible(tx, accountId, organizationId, bookingId);
      const row = await tx.payment.findFirst({ where: { bookingId, accountId } });
      if (!row || organizationPayer(row.contractSnapshot).buyerOrganizationId !== organizationId) throw new NotFoundException('لم يعثر على طلب الدفع.');
      return row;
    });
    if (!payment.providerReference) throw pending();
    return (await this.observe(payment, await this.provider.fetchInvoice(payment.providerReference), true, accountId)).summary;
  }

  async recover(actorId: string, organizationId: string, bookingId: string, invoiceId: unknown) {
    if (typeof invoiceId !== 'string' || !uuid.test(invoiceId)) throw new BadRequestException('أدخل مرجع الفاتورة لدى مزود الدفع.');
    const payment = await this.db.serializable(async tx => {
      await requirePlatformFinanceApprover(tx, actorId);
      const row = await tx.payment.findFirst({ where: { bookingId, booking: { organizationId } } });
      if (!row || organizationPayer(row.contractSnapshot).buyerOrganizationId !== organizationId) throw new NotFoundException('طلب الدفع غير متاح.');
      return row;
    });
    return (await this.observe(payment, await this.provider.fetchInvoice(invoiceId), false)).summary;
  }

  async matchLedger(accountId: string, organizationId: string, bookingId: string, financeEntryId: unknown) {
    if (typeof financeEntryId !== 'string' || !uuid.test(financeEntryId)) throw new BadRequestException('أدخل مرجع القيد المالي المرحّل.');
    const accountant = new FinanceAccessService(this.db);
    const read = async (tx: Prisma.TransactionClient) => {
      const { booking, amount } = await this.booking(tx, organizationId, bookingId);
      const seller = booking.trip.organizationId!;
      try { await accountant.requireCenterOrganizationAccountant(accountId, seller, tx); }
      catch { throw new ForbiddenException('يتطلب الإجراء محاسب المركز المورّد.'); }
      const payment = await tx.payment.findFirst({ where: { bookingId, contractSnapshot: { path: ['organizationPaymentAuthorization', 'buyerOrganizationId'], equals: organizationId } } });
      if (!payment?.providerReference) throw pending();
      return { payment, seller, amount };
    };
    const before = await this.db.serializable(read);
    const invoice = await this.provider.fetchInvoice(before.payment.providerReference!);
    const observed = await this.observe(before.payment, invoice, false);
    return this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${before.payment.id} FOR UPDATE`;
      const { payment, seller, amount } = await read(tx);
      if (!observed.verified || observed.verified.id !== payment.moyasarPaymentId || observed.verified.refundedMinor !== 0
        || observed.verified.capturedMinor !== amount || Date.now() - observed.verifiedAt.getTime() > 60000) throw pending();
      if (payment.status !== 'CAPTURED' || !payment.moyasarPaymentId || !payment.providerReference || payment.refundedAmountMinor !== 0) throw pending();
      if (await tx.commerceRefundOperation.findFirst({where:{paymentId:payment.id,status:{in:['RESERVED','DISPATCHED','RECONCILIATION_REQUIRED']}},select:{id:true}})) throw pending();
      await requirePostedCommerceCollection(tx, { financeEntryId, sourceId: payment.id, referenceType: 'TRIP_PAYMENT_COLLECTION', organizationId: seller, amountMinor: amount });
      const existing = await tx.commerceCollectionEvidence.findUnique({ where: { sourceType_sourceId: { sourceType: source, sourceId: bookingId } } });
      if (existing) {
        if (existing.organizationId !== seller || existing.financeEntryId !== financeEntryId || existing.providerPaymentId !== payment.moyasarPaymentId
          || existing.providerInvoiceId !== payment.providerReference || existing.amountMinor !== amount || existing.customerAccountId !== payment.accountId) throw pending();
        return { evidenceId: existing.id, alreadyApplied: true };
      }
      const receipt = await tx.commerceCollectionEvidence.create({ data: { sourceType: source, sourceId: bookingId, organizationId: seller,
        customerAccountId: payment.accountId, amountMinor: amount, currency: 'SAR', provider: 'MOYASAR', providerPaymentId: payment.moyasarPaymentId,
        providerInvoiceId: payment.providerReference, providerCapturedMinor: amount, providerRefundedMinor: 0, providerVerifiedAt: observed.verifiedAt,
        providerSnapshot: asJson({ ...observed.verified, paymentId: payment.id, invoiceMetadata: invoice.metadata }),
        financeEntryId, contractSnapshot: asJson(payment.contractSnapshot) } });
      return { evidenceId: receipt.id, alreadyApplied: false };
    });
  }

  async providerEvent(payment: Payment, invoiceId: string) {
    return (await this.observe(payment, await this.provider.fetchInvoice(invoiceId), false)).summary;
  }

  private async observe(snapshot: Payment, invoice: MoyasarInvoice, showLink: boolean, requester?: string) {
    if (!uuid.test(invoice.id) || invoice.metadata.hydroland_payment_id !== snapshot.id || invoice.metadata.hydroland_booking_id !== snapshot.bookingId
      || invoice.metadata.hydroland_buyer_organization_id !== organizationPayer(snapshot.contractSnapshot).buyerOrganizationId
      || invoice.metadata.hydroland_delegate_account_id !== snapshot.accountId
      || invoice.currency !== snapshot.currency || invoice.amount !== snapshot.amountMinor || snapshot.providerReference && snapshot.providerReference !== invoice.id) {
      throw new ConflictException('فاتورة المزود لا تطابق الحجز والمبلغ وطلب الجهة.');
    }
    const paid = invoice.payments.filter(p => ['paid', 'captured', 'refunded'].includes(p.status));
    if (paid.length > 1 || ['paid', 'refunded'].includes(invoice.status) && paid.length !== 1) throw pending();
    if (paid.length && (paid[0].amount !== snapshot.amountMinor || paid[0].currency !== 'SAR')) throw pending();
    const verified = paid.length ? await this.provider.fetchPayment(paid[0].id, { invoiceId: invoice.id, currency: 'SAR', amountMinor: snapshot.amountMinor }) : null;
    let status: PaymentStatus;
    if (verified) {
      if (!['paid', 'refunded'].includes(invoice.status) || !['captured', 'paid', 'refunded'].includes(verified.status)
        || verified.capturedMinor !== snapshot.amountMinor || verified.refundedMinor === 0 && verified.refundedAt !== null || Date.parse(verified.updatedAt) > Date.now()) throw pending();
      status = verified.refundedMinor === snapshot.amountMinor ? 'REFUNDED' : 'CAPTURED';
    } else if (['initiated', 'on_hold'].includes(invoice.status)) status = 'PENDING';
    else if (['canceled', 'expired', 'voided'].includes(invoice.status)) status = 'CANCELLED';
    else if (invoice.status === 'failed') status = 'FAILED';
    else throw pending();
    const verifiedAt = new Date();
    const org = organizationPayer(snapshot.contractSnapshot).buyerOrganizationId;
    if (typeof org !== 'string') throw pending();
    const result = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${snapshot.id} FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({ where: { id: snapshot.id } });
      const { booking, snapshot: original, amount } = await this.booking(tx, org, snapshot.bookingId);
      const binding = organizationPayer(current.contractSnapshot);
      if (current.bookingId !== snapshot.bookingId || current.accountId !== binding.delegateAccountId || binding.bookingId !== booking.id
        || binding.source !== source || binding.buyerOrganizationId !== org || current.currency !== 'SAR' || amount !== current.amountMinor
        || record(current.contractSnapshot).acceptedQuoteHash !== contractHash(original)
        || current.providerReference && current.providerReference !== invoice.id
        || current.moyasarPaymentId && current.moyasarPaymentId !== verified?.id
        || verified && verified.refundedMinor < current.refundedAmountMinor) throw pending();
      if ((!verified && ['CAPTURED', 'REFUNDED'].includes(current.status)) ||
        (current.updatedAt.getTime() !== snapshot.updatedAt.getTime() && current.status !== status)) throw pending();
      const changed = current.status !== status || current.providerReference !== invoice.id
        || current.moyasarPaymentId !== (verified?.id ?? null) || current.refundedAmountMinor !== (verified?.refundedMinor ?? 0);
      const updated = changed ? await tx.payment.update({ where: { id: current.id }, data: { status, providerReference: invoice.id,
        moyasarPaymentId: verified?.id ?? null, refundedAmountMinor: verified?.refundedMinor ?? 0 } }) : current;
      await this.contracts.recordInvoiceSnapshot(updated, tx);
      if (changed) await tx.auditEvent.create({ data: { action: 'ORGANIZATION_PREPAYMENT_OBSERVED', resource: 'Payment', resourceId: updated.id,
        metadata: { organizationId: org, bookingId: booking.id, status, providerInvoiceId: invoice.id, providerPaymentId: verified?.id ?? null,
          capturedMinor: verified?.capturedMinor ?? 0, refundedMinor: updated.refundedAmountMinor } } });
      const open = showLink && status === 'PENDING' && booking.status === 'PENDING' && booking.trip.startsAt > new Date()
        && !(await tripCalendarReservation(tx, booking.trip, true)).calendarReservation.issues.length;
      return { paymentId: updated.id, bookingId: booking.id, status, amountMinor: amount, currency: 'SAR',
        refundedAmountMinor: updated.refundedAmountMinor, checkoutUrl: showLink && open && status === 'PENDING' ? invoice.url : null };
    });
    if (showLink && requester) await this.db.serializable(tx => requireBookingPrepaymentMandate(tx, requester, org, result.amountMinor));
    return { summary: result, verified, verifiedAt };
  }
}
