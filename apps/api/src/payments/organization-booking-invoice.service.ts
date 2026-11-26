import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { entitlementContractHash } from '../commerce/center-service-entitlement';
import { requirePostedCommerceCollection } from '../commerce/rental-collection-ledger';
import { FinanceAccessService } from '../finance/finance-access.service';
import { invoiceRegister, InvoiceRow } from './account-invoice-register';

const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const sourceType = 'TRIP_PAYMENT';
const collectionType = 'ORGANIZATION_BOOKING_PREPAYMENT';
function invoiceIssuedAt(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  const offset = value.endsWith('Z') ? null : value.slice(-6);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
    || hour > 23 || minute > 59 || second > 59 || offset && (Number(offset.slice(1, 3)) > 14 || Number(offset.slice(4)) > 59
      || Number(offset.slice(1, 3)) === 14 && Number(offset.slice(4)) !== 0)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now() ? date : null;
}
const party = (organization: {id: string; legalName: string | null; displayName: string; registrationNumber: string | null; address: string | null}) => ({
  id: organization.id, name: organization.legalName?.trim() || organization.displayName,
  registrationNumber: organization.registrationNumber, address: organization.address,
});

/** Finalizes a seller-issued original. It neither generates nor certifies a tax invoice. */
@Injectable()
export class OrganizationBookingInvoiceService {
  constructor(private readonly db: DatabaseService) {}

  private async load(tx: Prisma.TransactionClient, accountId: string, paymentId: string) {
    const [access] = await tx.$queryRaw<InvoiceRow[]>(invoiceRegister(accountId, {sourceType, sourceId: paymentId}));
    const actor = await tx.account.findFirst({where: {id: accountId, status: 'ACTIVE'}, select: {id: true, personId: true}});
    if (!access || !actor || !access.buyerOrganizationId) throw new NotFoundException('فاتورة الجهة غير متاحة.');
    const payment = await tx.payment.findUnique({where: {id: paymentId}, include: {invoice: true, booking: {include: {trip: true}}}});
    if (!payment?.invoice || !payment.booking.organizationId || !payment.booking.trip.organizationId
      || access.buyerOrganizationId !== payment.booking.organizationId || access.sellerId !== payment.booking.trip.organizationId) {
      throw new NotFoundException('فاتورة الجهة غير متاحة.');
    }
    const finalization = await tx.organizationBookingInvoiceFinalization.findUnique({where: {paymentId}});
    let accountant = false;
    if (access.canAttach) {
      try {
        await new FinanceAccessService(this.db).requireCenterOrganizationAccountant(accountId, access.sellerId!, tx);
        accountant = true;
      } catch { /* A buyer or center manager can read, but only its accountant can finalize. */ }
    }
    return {access, actor, payment, finalization, accountant};
  }

  private async evidence(tx: Prisma.TransactionClient, state: Awaited<ReturnType<OrganizationBookingInvoiceService['load']>>) {
    const {payment, access} = state, invoice = payment.invoice!;
    const seller = await tx.organization.findUniqueOrThrow({where: {id: payment.booking.trip.organizationId!}});
    const buyer = await tx.organization.findUniqueOrThrow({where: {id: payment.booking.organizationId!}});
    const profile = record((await tx.operationalSetting.findUnique({where: {key: 'organization-financial-profile:' + seller.id}}))?.value);
    const document = await tx.accountInvoiceDocument.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: payment.id}}});
    const collection = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType: collectionType, sourceId: payment.bookingId}}});
    const contract = record(payment.contractSnapshot), authorization = record(contract.organizationPaymentAuthorization);
    const contractHash = entitlementContractHash(payment.contractSnapshot);
    const blockers: string[] = [];
    if (!state.accountant) blockers.push('يتطلب اعتماد الأصل محاسب المركز المورّد المخوّل.');
    if (seller.kind !== 'DIVE_CENTER' || seller.status !== 'ACTIVE' || buyer.status !== 'ACTIVE') blockers.push('يجب أن يكون المركز والجهة المشتريّة نشطين.');
    if (!seller.legalName?.trim() || !seller.address?.trim()) blockers.push('أكمل الاسم القانوني للمركز وعنوانه قبل اعتماد الفاتورة.');
    if (profile.currency !== 'SAR' || !['EXEMPT', 'TAXABLE'].includes(profile.taxStatus)
      || !['REGISTERED', 'IN_PROGRESS', 'NOT_REGISTERED', 'EXPIRED'].includes(profile.registrationStatus)
      || !Number.isSafeInteger(profile.revision) || profile.revision < 1
      || profile.registrationStatus === 'REGISTERED' && !seller.registrationNumber?.trim()) {
      blockers.push('أكمل إقرار بيانات المركز المالية وبيانات تسجيله؛ لا تُستنتج الضريبة تلقائيًا.');
    }
    if (invoice.status !== 'DRAFT') blockers.push('حالة الفاتورة الحالية تتطلب مراجعة أصلها قبل اعتماد جديد.');
    if (payment.status !== 'CAPTURED' || payment.currency !== 'SAR' || payment.refundedAmountMinor !== 0
      || !payment.providerReference || !payment.moyasarPaymentId) blockers.push('يلزم تحصيل مكتمل مطابق دون استرداد غير محسوم.');
    if (await tx.commerceRefundOperation.findFirst({where: {paymentId: payment.id, status: {in: ['RESERVED', 'DISPATCHED', 'RECONCILIATION_REQUIRED']}}, select: {id: true}})) {
      blockers.push('أكمل مراجعة الاسترداد الجاري قبل اعتماد الفاتورة.');
    }
    if (contract.kind !== 'TRIP' || contract.source?.kind !== 'TRIP_BOOKING' || contract.source?.id !== payment.bookingId
      || contract.source?.offeringId !== payment.booking.tripId || contract.issuer?.organizationId !== seller.id
      || contract.buyerOrganizationId !== buyer.id || contract.amountMinor !== payment.amountMinor || contract.currency !== payment.currency
      || contract.quantity !== payment.booking.seats || contract.termsAcceptanceStatus !== 'ACCEPTED'
      || authorization.source !== collectionType || authorization.buyerOrganizationId !== buyer.id
      || authorization.bookingId !== payment.bookingId || authorization.delegateAccountId !== payment.accountId
      || entitlementContractHash(invoice.contractSnapshot) !== contractHash) {
      blockers.push('العقد الأصلي والفاتورة والدفعة لا تتطابق؛ يلزم تصحيح المطابقة دون تغيير الشروط الأصلية.');
    }
    const documentValid = document && document.sellerId === seller.id && document.buyerOrganizationId === buyer.id
      && document.number === access.number && createHash('sha256').update(document.content).digest('hex') === document.sha256;
    if (!documentValid) blockers.push('أرفق أصل فاتورة المركز الصحيح قبل الاعتماد.');
    const collectionValid = collection && collection.organizationId === seller.id && collection.customerAccountId === payment.accountId
      && collection.currency === payment.currency && collection.amountMinor === payment.amountMinor
      && collection.providerCapturedMinor === payment.amountMinor && collection.providerRefundedMinor === 0
      && collection.providerPaymentId === payment.moyasarPaymentId && collection.providerInvoiceId === payment.providerReference
      && record(collection.providerSnapshot).paymentId === payment.id
      && entitlementContractHash(collection.contractSnapshot) === contractHash;
    if (!collectionValid) blockers.push('طابق تحصيل الجهة مع المزوّد والقيد المالي قبل اعتماد الفاتورة.');
    else {
      try {
        await requirePostedCommerceCollection(tx, {financeEntryId: collection.financeEntryId, sourceId: payment.id,
          organizationId: seller.id, amountMinor: payment.amountMinor, referenceType: 'TRIP_PAYMENT_COLLECTION'});
      } catch { blockers.push('قيد التحصيل لا يستوفي المطابقة والاعتماد المالي المستقل.'); }
    }
    const snapshot = {
      version: 'ORGANIZATION_INVOICE_FINALIZATION_V1', sourceType, sourceId: payment.id, invoiceId: invoice.id,
      seller: party(seller), buyer: party(buyer), sellerFinancialProfile: profile,
      number: document?.number ?? null, documentSha256: document?.sha256 ?? null,
      amountMinor: payment.amountMinor, currency: payment.currency, bookingId: payment.bookingId,
      paymentId: payment.id, provider: collection?.provider ?? null, providerInvoiceId: payment.providerReference,
      providerPaymentId: payment.moyasarPaymentId, collectionEvidenceId: collection?.id ?? null,
      collectionFinanceEntryId: collection?.financeEntryId ?? null, contractHash,
      originalContract: payment.contractSnapshot,
      verificationMethod: 'SELLER_ACCOUNTANT_ORIGINAL_DOCUMENT_REVIEW', taxAuthorityVerified: false,
    };
    return {snapshot, expectedEvidenceHash: entitlementContractHash(snapshot), blockers, document, collection};
  }

  async preview(accountId: string, paymentId: string) {
    return this.db.serializable(async tx => {
      const state = await this.load(tx, accountId, paymentId);
      if (state.finalization) {
        const snapshot = record(state.finalization.snapshot);
        return {status: 'FINALIZED', canFinalize: false, blockers: [], finalizationId: state.finalization.id,
          number: state.finalization.number, issuedAt: state.finalization.issuedAt.toISOString(), amountMinor: snapshot.amountMinor,
          currency: snapshot.currency, seller: snapshot.seller, buyer: snapshot.buyer,
          collectionFinanceEntryId: state.finalization.collectionFinanceEntryId, documentSha256: state.finalization.documentSha256,
          expectedEvidenceHash: snapshot.expectedEvidenceHash};
      }
      const evidence = await this.evidence(tx, state), snapshot = evidence.snapshot;
      return {status: 'DRAFT', canFinalize: state.accountant && !evidence.blockers.length, blockers: evidence.blockers,
        finalizationId: null, number: snapshot.number, issuedAt: null, amountMinor: snapshot.amountMinor,
        currency: snapshot.currency, seller: snapshot.seller, buyer: snapshot.buyer,
        collectionFinanceEntryId: snapshot.collectionFinanceEntryId, documentSha256: snapshot.documentSha256,
        expectedEvidenceHash: evidence.expectedEvidenceHash};
    });
  }

  async finalize(accountId: string, paymentId: string, input: Record<string, unknown>) {
    const issuedAt = invoiceIssuedAt(input?.issuedAt);
    if (!input || Object.keys(input).some(key => !['issuedAt', 'expectedEvidenceHash', 'originalInvoiceVerified'].includes(key))
      || input.originalInvoiceVerified !== true || typeof input.expectedEvidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedEvidenceHash)
      || !issuedAt) throw new BadRequestException('أدخل تاريخ إصدار الأصل وأكد مطابقته للبيانات المعروضة.');
    try {
      return await this.db.serializable(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"::text=${paymentId} FOR UPDATE`;
        const state = await this.load(tx, accountId, paymentId);
        if (!state.accountant) throw new ForbiddenException('يتطلب اعتماد الأصل محاسب المركز المورّد المخوّل.');
        if (state.finalization) {
          const prior = state.finalization;
          if (prior.issuedAt.getTime() !== issuedAt.getTime() || record(prior.snapshot).expectedEvidenceHash !== input.expectedEvidenceHash) {
            throw new ConflictException('سبق اعتماد أصل مختلف؛ لا يمكن استبدال الفاتورة النهائية.');
          }
          return {status: 'FINALIZED', finalizationId: prior.id, number: prior.number, issuedAt: prior.issuedAt.toISOString(), alreadyFinalized: true};
        }
        const evidence = await this.evidence(tx, state);
        if (evidence.blockers.length) throw new ConflictException({message: evidence.blockers[0], blockers: evidence.blockers});
        if (evidence.expectedEvidenceHash !== input.expectedEvidenceHash) throw new ConflictException('تغيرت بيانات الفاتورة؛ افتح المراجعة مجددًا قبل اعتماد الأصل.');
        const document = evidence.document!, collection = evidence.collection!, invoice = state.payment.invoice!;
        const finalization = await tx.organizationBookingInvoiceFinalization.create({data: {
          paymentId, invoiceId: invoice.id, sellerId: document.sellerId, buyerOrganizationId: state.payment.booking.organizationId!,
          number: document.number, issuedAt, documentSha256: document.sha256, collectionEvidenceId: collection.id,
          collectionFinanceEntryId: collection.financeEntryId, contractHash: evidence.snapshot.contractHash,
          snapshot: {...evidence.snapshot, issuedAt: issuedAt.toISOString(), expectedEvidenceHash: evidence.expectedEvidenceHash,
            originalInvoiceVerified: true} as Prisma.InputJsonObject, finalizedBy: accountId,
        }});
        // The seller's own number stays in its original and finalization snapshot.
        // Invoice.number remains platform-unique even if two centers use INV-001.
        const changed = await tx.invoice.updateMany({where: {id: invoice.id, status: 'DRAFT'},
          data: {status: 'PAID', issuedAt, number: `HL-ORG-${invoice.id}`}});
        if (changed.count !== 1) throw new ConflictException('تغيرت حالة الفاتورة أثناء الاعتماد.');
        await tx.auditEvent.create({data: {actorId: state.actor.personId, action: 'ORGANIZATION_INVOICE_FINALIZED', resource: 'Invoice',
          resourceId: invoice.id, metadata: {finalizationId: finalization.id, paymentId, bookingId: state.payment.bookingId,
            sellerId: finalization.sellerId, buyerOrganizationId: finalization.buyerOrganizationId, number: document.number,
            documentSha256: document.sha256, collectionFinanceEntryId: collection.financeEntryId,
            contractHash: finalization.contractHash, finalizedBy: accountId, taxAuthorityVerified: false}}});
        return {status: 'FINALIZED', finalizationId: finalization.id, number: finalization.number,
          issuedAt: issuedAt.toISOString(), alreadyFinalized: false};
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('رقم أصل الفاتورة مستخدم لدى المركز؛ راجع الفاتورة المحفوظة.');
      }
      throw error;
    }
  }
}
