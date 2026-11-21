import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommerceCheckout, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RENTAL_CONTRACT_VERSION, RentalContractLine, RentalContractRecord, rentalCanonicalJson, rentalContractHash, rentalObject, requireAcceptedRentalContract, requireRentalContract } from '../commerce/rental-contract';
import { requirePostedRentalCollection } from '../commerce/rental-collection-ledger';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { assertRentalFitsCalendar } from '../trips/equipment-rental-calendar';
import { assertNoRentalClaim } from '../trips/equipment-rental-hold';
import { EquipmentInspectionService } from '../trips/equipment-inspection.service';
import { MoyasarCommerceInvoiceInput, MoyasarPayment, MoyasarPaymentProviderService, MoyasarWebhook } from './moyasar-payment-provider.service';

type Rental = RentalContractRecord & {status: string; paymentStatus: string; holdExpiresAt: Date | null};
type CheckoutAcceptance = {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string};
const sourceType = 'EQUIPMENT_RENTAL';
const asJson = (value: unknown) => value as Prisma.InputJsonObject;

@Injectable()
export class RentalCheckoutService {
  private readonly access: FinanceAccessService;
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly provider: MoyasarPaymentProviderService,
    private readonly inspections: EquipmentInspectionService) {
    this.access = new FinanceAccessService(db);
  }

  private async rental(tx: Prisma.TransactionClient, id: string, accountId?: string) {
    const [rental] = await tx.$queryRaw<Rental[]>`SELECT * FROM "EquipmentRental" WHERE "id"=${id} FOR UPDATE`;
    if (!rental || accountId && rental.renterAccountId !== accountId) throw new NotFoundException('Rental not found.');
    const lines = await tx.$queryRaw<RentalContractLine[]>`
      SELECT i."id",i."resourceId",i."unitPriceHalala",b."organizationId"::text AS "organizationId",
        i."assetCodeSnapshot",i."equipmentNameSnapshot"
      FROM "EquipmentRentalItem" i JOIN "EquipmentBarcode" b ON b."resourceId"=i."resourceId"
      WHERE i."rentalId"=${id} ORDER BY i."resourceId" FOR UPDATE OF b`;
    const contract = requireRentalContract(rental, lines);
    return {rental, lines, contract};
  }

  private requireOpen(rental: Rental) {
    if (rental.status !== 'RESERVED' || rental.paymentStatus !== 'PENDING' || !rental.holdExpiresAt
      || rental.holdExpiresAt.getTime() <= Date.now() || !rental.scheduledHandoverAt || rental.scheduledHandoverAt.getTime() <= Date.now()) {
      throw new ConflictException({code: 'RENTAL_PAYMENT_HOLD_CLOSED', message: 'The original rental payment hold is no longer open. The collection requires review.'});
    }
  }

  private providerInput(checkout: CommerceCheckout, rental: Rental): MoyasarCommerceInvoiceInput {
    if (!rental.holdExpiresAt) throw new ConflictException('The original rental payment hold is missing.');
    return {checkoutId: checkout.id, sourceType, sourceId: rental.id, organizationId: checkout.organizationId,
      customerAccountId: checkout.customerAccountId, amountMinor: checkout.amountMinor, currency: 'SAR', expiresAt: rental.holdExpiresAt.toISOString()};
  }

  private checkBinding(checkout: CommerceCheckout, rental: Rental, contract: Record<string, any>) {
    if (checkout.sourceType !== sourceType || checkout.sourceId !== rental.id || checkout.customerAccountId !== rental.renterAccountId
      || checkout.organizationId !== contract.organizationId || checkout.amountMinor !== Number(rental.totalHalala)
      || checkout.currency !== 'SAR' || checkout.provider !== 'MOYASAR') throw new ConflictException('Rental checkout binding requires review.');
    requireAcceptedRentalContract(contract, checkout.contractSnapshot);
  }

  private sameRevision(current:CommerceCheckout,expected:CommerceCheckout){
    return current.updatedAt.getTime()===expected.updatedAt.getTime()&&current.status===expected.status
      &&current.providerInvoiceId===expected.providerInvoiceId&&current.providerPaymentId===expected.providerPaymentId
      &&rentalCanonicalJson(current.providerResult)===rentalCanonicalJson(expected.providerResult);
  }

  async quote(accountId: string, rentalId: string) {
    return this.db.serializable(async tx => {
      const {rental, contract} = await this.rental(tx, rentalId, accountId);
      this.requireOpen(rental);
      const issuer=await tx.organization.findFirst({where:{id:contract.organizationId,kind:'DIVE_CENTER',status:'ACTIVE'},select:{id:true}});
      if(!issuer)throw new ConflictException('The original rental center is no longer active.');
      return {snapshot: contract, quoteHash: rentalContractHash(contract), policyVersion: RENTAL_CONTRACT_VERSION,
        holdExpiresAt: rental.holdExpiresAt, financialActionExecuted: false};
    });
  }

  async checkout(accountId: string, rentalId: string, input: CheckoutAcceptance) {
    const key = input?.idempotencyKey;
    if (typeof key !== 'string' || !/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new BadRequestException('A stable checkout request key is required.');
    const reserved = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`rental-checkout:${key}`},0))`;
      const {rental, contract, lines} = await this.rental(tx, rentalId, accountId);
      if (input.acceptedPolicyVersion !== RENTAL_CONTRACT_VERSION || input.quoteHash !== rentalContractHash(contract)) {
        throw new ConflictException({code: 'RENTAL_TERMS_CHANGED', message: 'Review and accept the original rental quote before paying.'});
      }
      const fingerprint = rentalContractHash({sourceType, rentalId, accountId, quoteHash: input.quoteHash, version: input.acceptedPolicyVersion});
      const byKey = await tx.commerceCheckout.findUnique({where: {idempotencyKey: key}});
      if (byKey && (byKey.sourceType !== sourceType || byKey.sourceId !== rentalId || byKey.customerAccountId !== accountId || byKey.requestFingerprint !== fingerprint)) {
        throw new ConflictException('The checkout request key belongs to another request.');
      }
      const existing = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rentalId}}});
      if (existing) {
        this.checkBinding(existing, rental, contract);
        if (existing.idempotencyKey !== key || existing.requestFingerprint !== fingerprint) throw new ConflictException('A checkout already exists for this rental. Continue its original payment request.');
        return {checkout: existing, rental, dispatch: false};
      }
      this.requireOpen(rental);
      await assertNoRentalClaim(tx, lines.map(line => line.resourceId), rentalId);
      await assertRentalFitsCalendar(tx, lines.map(line => line.resourceId), rental.dueAt);
      const unavailable = await tx.$queryRaw<Array<{resourceId: string}>>`SELECT "resourceId" FROM "EquipmentBarcode"
        WHERE "resourceId"=ANY(${lines.map(line => line.resourceId)}::text[]) AND "stockStatus"<>'AVAILABLE'`;
      if (unavailable.length) throw new ConflictException('The reserved equipment is no longer available.');
      const readiness=await this.inspections.evaluate(lines.map(line=>line.resourceId),tx);
      if(readiness.blocked)throw new ConflictException('Equipment inspection or service policy blocks rental checkout.');
      const now = new Date();
      const checkout = await tx.commerceCheckout.create({data: {sourceType, sourceId: rentalId, organizationId: contract.organizationId,
        customerAccountId: accountId, amountMinor: Number(rental.totalHalala), currency: 'SAR', provider: 'MOYASAR',
        idempotencyKey: key, requestFingerprint: fingerprint, status: 'DISPATCHED', dispatchedAt: now,
        contractSnapshot: asJson({...contract, termsAcceptedAt: now.toISOString(), acceptedQuoteHash: input.quoteHash})}});
      await this.audit.record({actorId: accountId, action: 'RENTAL_CHECKOUT_DISPATCHED', resource: 'CommerceCheckout', resourceId: checkout.id,
        metadata: {rentalId, organizationId: checkout.organizationId, amountMinor: checkout.amountMinor, currency: checkout.currency,
          policyVersion: RENTAL_CONTRACT_VERSION, quoteHash: input.quoteHash, holdExpiresAt: rental.holdExpiresAt!.toISOString()}}, tx);
      return {checkout, rental, dispatch: true};
    });
    if (!reserved.dispatch) return this.summary(reserved.checkout, reserved.rental);

    // External work is outside serializable retries. A durable dispatch claim
    // survives a process crash or a lost response and suppresses any POST replay.
    try {
      this.requireOpen(reserved.rental);
      const invoice = await this.provider.createCommerceInvoice(this.providerInput(reserved.checkout, reserved.rental));
      const saved = await this.db.serializable(async tx => {
        const {rental, contract} = await this.rental(tx, rentalId, accountId);
        const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: reserved.checkout.id}});
        this.checkBinding(current, rental, contract);
        if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id) throw new ConflictException('A different invoice is already bound to this checkout.');
        if (current.status !== 'DISPATCHED' && current.providerInvoiceId === invoice.id) return current;
        const open = rental.status === 'RESERVED' && rental.paymentStatus === 'PENDING' && rental.holdExpiresAt && rental.holdExpiresAt.getTime() > Date.now()
          &&['initiated','on_hold'].includes(invoice.status)&&!invoice.payments.some(row=>['paid','captured','refunded'].includes(row.status));
        const updated = await tx.commerceCheckout.update({where: {id: current.id}, data: {providerInvoiceId: invoice.id,
          status: open ? 'PENDING' : 'RECONCILIATION_REQUIRED', providerResult: asJson({invoice, verifiedAt: new Date().toISOString()})}});
        await this.audit.record({actorId: accountId, action: 'RENTAL_CHECKOUT_CREATED', resource: 'CommerceCheckout', resourceId: current.id,
          metadata: {rentalId, providerInvoiceId: invoice.id, status: updated.status}}, tx);
        return updated;
      });
      return this.summary(saved, reserved.rental);
    } catch {
      await this.markReview(reserved.checkout, 'INVOICE_CREATE_OUTCOME_UNCERTAIN');
      throw new ServiceUnavailableException({code: 'RENTAL_CHECKOUT_RECONCILIATION_REQUIRED',
        message: 'The checkout result requires reconciliation. Do not make another payment request.'});
    }
  }

  private async markReview(expected: CommerceCheckout, reasonCode: string,reconciliationActorId?:string) {
    await this.db.serializable(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "EquipmentRental" WHERE "id"=${expected.sourceId} FOR UPDATE`;
      const current=await tx.commerceCheckout.findUnique({where:{id:expected.id}});
      if(current&&reconciliationActorId)await this.accountant(reconciliationActorId,current.organizationId,tx);
      if(!current||!this.sameRevision(current,expected))return;
      await tx.commerceCheckout.update({where:{id:expected.id},data:{status:'RECONCILIATION_REQUIRED'}});
      await this.audit.record({action:'RENTAL_CHECKOUT_REVIEW_REQUIRED',resource:'CommerceCheckout',resourceId:expected.id,metadata:{reasonCode}},tx);
    });
  }

  async refresh(accountId: string, rentalId: string) {
    const checkout = await this.db.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rentalId}}});
    if (!checkout || checkout.customerAccountId !== accountId) throw new NotFoundException('Rental checkout not found.');
    return this.refreshCheckout(checkout.id);
  }

  private async refreshCheckout(checkoutId: string, recoveredInvoiceId?: string,reconciliationActorId?:string) {
    const binding = await this.db.serializable(async tx => {
      const checkout = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      const {rental, contract} = await this.rental(tx, checkout.sourceId);
      this.checkBinding(checkout, rental, contract);
      if (checkout.providerInvoiceId && recoveredInvoiceId && checkout.providerInvoiceId !== recoveredInvoiceId) throw new ConflictException('This checkout already has another invoice.');
      const invoiceId = checkout.providerInvoiceId || recoveredInvoiceId;
      if (!invoiceId || !checkout.dispatchedAt) throw new ConflictException({code: 'RENTAL_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The original provider invoice must be reconciled before proceeding.'});
      return {checkout, rental, invoiceId};
    });
    let invoice, payment: MoyasarPayment | null = null;
    try {
      invoice = await this.provider.fetchCommerceInvoice(binding.invoiceId, this.providerInput(binding.checkout, binding.rental));
      const collected = invoice.payments.filter(row => ['paid', 'captured', 'refunded'].includes(row.status));
      if (collected.length > 1 || invoice.status === 'paid' && collected.length !== 1) throw new ConflictException('The provider invoice requires payment reconciliation.');
      if (collected.length === 1) {
        const candidate = collected[0];
        if (candidate.amount !== binding.checkout.amountMinor || candidate.currency !== 'SAR') throw new ConflictException('Provider payment amount does not match the rental.');
        payment = await this.provider.fetchPayment(candidate.id, {invoiceId: invoice.id, amountMinor: binding.checkout.amountMinor, currency: 'SAR'});
        if (binding.checkout.providerPaymentId && binding.checkout.providerPaymentId !== payment.id) throw new ConflictException('Provider payment reference changed.');
      }
    } catch {
      await this.markReview(binding.checkout, 'PROVIDER_COLLECTION_NOT_VERIFIED',reconciliationActorId);
      throw new ServiceUnavailableException({code: 'RENTAL_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The provider collection must be reconciled before handover.'});
    }
    const verifiedAt = new Date();
    const result = await this.db.serializable(async tx => {
      const {rental, contract} = await this.rental(tx, binding.rental.id);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      this.checkBinding(current, rental, contract);
      if(reconciliationActorId)await this.accountant(reconciliationActorId,current.organizationId,tx);
      // Provider I/O may finish out of order. An old response cannot overwrite a
      // newer verified refund/capture, even if timestamps share a millisecond.
      if(!this.sameRevision(current,binding.checkout))return {checkout:current,rental};
      if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id || current.providerPaymentId && payment && current.providerPaymentId !== payment.id) {
        throw new ConflictException('Provider references no longer match this rental checkout.');
      }
      const open = rental.status === 'RESERVED' && rental.paymentStatus === 'PENDING' && rental.holdExpiresAt && rental.holdExpiresAt.getTime() > verifiedAt.getTime();
      const alreadyConfirmed = rental.paymentStatus === 'PAID' && ['RESERVED', 'ACTIVE', 'RETURNED'].includes(rental.status);
      const captured = invoice.status === 'paid' && payment && ['paid', 'captured'].includes(payment.status)
        && payment.capturedMinor === current.amountMinor && payment.refundedMinor === 0 && payment.refundedAt === null
        && Date.parse(payment.updatedAt) <= verifiedAt.getTime();
      const previous=rentalObject(rentalObject(current.providerResult).payment);
      const regressed=payment&&previous.id===payment.id&&(payment.refundedMinor<Number(previous.refundedMinor)
        ||payment.capturedMinor<Number(previous.capturedMinor)||Date.parse(payment.updatedAt)<Date.parse(previous.updatedAt));
      let status = 'RECONCILIATION_REQUIRED';
      if (captured && !regressed && (open || alreadyConfirmed)) status = 'CAPTURED';
      else if (!payment && !current.providerPaymentId && open && ['initiated', 'on_hold'].includes(invoice.status)) status = 'PENDING';
      else if (!payment && !current.providerPaymentId && ['canceled', 'expired', 'voided'].includes(invoice.status)) status = 'CANCELLED';
      else if (!payment && !current.providerPaymentId && invoice.status === 'failed') status = 'FAILED';
      const updated = await tx.commerceCheckout.update({where: {id: checkoutId}, data: {status, providerInvoiceId: invoice.id,
        ...(payment ? {providerPaymentId: payment.id} : {}), providerResult: asJson({invoice,
          payment:regressed||!payment&&current.providerPaymentId?previous:payment,verifiedAt:verifiedAt.toISOString(),
          ...(regressed?{rejectedObservation:{payment,reasonCode:'PROVIDER_BALANCE_OR_TIMESTAMP_REGRESSED'}}:{})})}});
      await this.audit.record({action: 'RENTAL_COLLECTION_OBSERVED', resource: 'CommerceCheckout', resourceId: checkoutId,
        metadata: {rentalId: rental.id, providerInvoiceId: invoice.id, providerPaymentId: payment?.id ?? null,
          status, capturedMinor: payment?.capturedMinor ?? 0, refundedMinor: payment?.refundedMinor ?? 0, verifiedAt: verifiedAt.toISOString()}}, tx);
      return {checkout: updated, rental};
    });
    return this.summary(result.checkout, result.rental);
  }

  private async accountant(accountId: string, organizationId: string, tx: Prisma.TransactionClient) {
    try {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
      const issuer=await tx.organization.findFirst({where:{id:organizationId,kind:'DIVE_CENTER',status:'ACTIVE'},select:{id:true}});
      if(!issuer)throw new Error('INACTIVE_RENTAL_CENTER');
      await this.access.requireCenterOrganizationAccountant(accountId, organizationId, tx);
    }
    catch {throw new ForbiddenException('An active accountant for the rental center must verify this collection.');}
  }

  async reconcileInvoice(accountId: string, rentalId: string, invoiceId?: string) {
    if (typeof invoiceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(invoiceId)) throw new BadRequestException('An original provider invoice reference is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rentalId}}});
      if (!row) throw new NotFoundException('Rental checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    return this.refreshCheckout(checkout.id, invoiceId,accountId);
  }

  async publishCollection(accountId: string, rentalId: string, financeEntryId?: string) {
    if (typeof financeEntryId !== 'string' || !financeEntryId.trim() || financeEntryId.length > 128) throw new BadRequestException('A posted rental revenue entry is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rentalId}}});
      if (!row) throw new NotFoundException('Rental checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    await this.refreshCheckout(checkout.id);
    return this.db.serializable(async tx => {
      const {rental, contract} = await this.rental(tx, rentalId);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkout.id}});
      this.checkBinding(current, rental, contract);
      await this.accountant(accountId, current.organizationId, tx);
      const observation = rentalObject(current.providerResult), payment = rentalObject(observation.payment), invoice = rentalObject(observation.invoice);
      const verifiedAt = new Date(observation.verifiedAt);
      if (current.status !== 'CAPTURED' || !current.providerPaymentId || !current.providerInvoiceId
        || payment.id !== current.providerPaymentId || payment.invoiceId !== current.providerInvoiceId || invoice.id !== current.providerInvoiceId
        || !['paid', 'captured'].includes(payment.status) || payment.capturedMinor !== current.amountMinor || payment.refundedMinor !== 0
        || !Number.isFinite(verifiedAt.getTime()) || verifiedAt.getTime() > Date.now() || Date.now() - verifiedAt.getTime() > 60_000) {
        throw new ConflictException('A fresh, fully captured and unrefunded provider payment is required.');
      }
      requireAcceptedRentalContract(contract, current.contractSnapshot, verifiedAt);
      await requirePostedRentalCollection(tx, {financeEntryId, rentalId, organizationId: current.organizationId, amountMinor: current.amountMinor});
      const existing = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rentalId}}});
      if (existing) {
        if (existing.financeEntryId !== financeEntryId || existing.providerPaymentId !== current.providerPaymentId
          ||existing.providerInvoiceId!==current.providerInvoiceId||existing.customerAccountId!==current.customerAccountId
          ||existing.organizationId!==current.organizationId||existing.amountMinor!==current.amountMinor||existing.currency!==current.currency
          ||existing.provider!=='MOYASAR'||existing.providerCapturedMinor!==current.amountMinor||existing.providerRefundedMinor!==0
          ||rentalCanonicalJson(existing.contractSnapshot)!==rentalCanonicalJson(current.contractSnapshot)) throw new ConflictException('This rental already has another collection receipt.');
        return {status: 'COLLECTION_VERIFIED', rentalId, collectionEvidenceId: existing.id, paymentConfirmationRequired: rental.paymentStatus !== 'PAID'};
      }
      this.requireOpen(rental);
      const proof = await tx.commerceCollectionEvidence.create({data: {sourceType, sourceId: rentalId,
        organizationId: current.organizationId, customerAccountId: current.customerAccountId, amountMinor: current.amountMinor, currency: 'SAR',
        provider: 'MOYASAR', providerPaymentId: current.providerPaymentId, providerInvoiceId: current.providerInvoiceId,
        providerCapturedMinor: payment.capturedMinor, providerRefundedMinor: 0, providerVerifiedAt: verifiedAt,
        providerSnapshot: asJson({...payment, invoiceMetadata: invoice.metadata}), financeEntryId,
        contractSnapshot: asJson(current.contractSnapshot)}});
      await this.audit.record({actorId: accountId, action: 'RENTAL_COLLECTION_VERIFIED', resource: 'EquipmentRental', resourceId: rentalId,
        metadata: {checkoutId: current.id, collectionEvidenceId: proof.id, financeEntryId, providerPaymentId: current.providerPaymentId,
          providerInvoiceId: current.providerInvoiceId, organizationId: current.organizationId, amountMinor: current.amountMinor, currency: 'SAR'}}, tx);
      return {status: 'COLLECTION_VERIFIED', rentalId, collectionEvidenceId: proof.id, paymentConfirmationRequired: true};
    });
  }

  // Only call after the existing webhook adapter verified its token and mode.
  // A callback signals a GET refresh; callback values never prove collection.
  async handleVerifiedProviderEvent(event: MoyasarWebhook) {
    const invoiceId = typeof event.data.invoice_id === 'string' ? event.data.invoice_id : '';
    if (!invoiceId) return {handled: false};
    const checkout = await this.db.commerceCheckout.findUnique({where: {providerInvoiceId: invoiceId}});
    if (!checkout || checkout.sourceType !== sourceType) return {handled: false};
    const result = await this.refreshCheckout(checkout.id);
    return {handled: true, status: result.status, rentalId: checkout.sourceId};
  }

  private async summary(checkout: CommerceCheckout, rental: Rental) {
    const evidence = await this.db.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: rental.id}}, select: {id: true}});
    const invoice = rentalObject(rentalObject(checkout.providerResult).invoice);
    const open = rental.status === 'RESERVED' && rental.paymentStatus === 'PENDING' && rental.holdExpiresAt && rental.holdExpiresAt.getTime() > Date.now();
    return {checkoutId: checkout.id, rentalId: rental.id, status: checkout.status, amountMinor: checkout.amountMinor, currency: checkout.currency,
      checkoutUrl: open && checkout.status === 'PENDING' && typeof invoice.url === 'string' ? invoice.url : null,
      holdExpiresAt: rental.holdExpiresAt, collectionVerified: Boolean(evidence && checkout.status === 'CAPTURED'),
      paymentConfirmationRequired: Boolean(evidence && checkout.status === 'CAPTURED' && rental.paymentStatus !== 'PAID'),
      paymentStatus: rental.paymentStatus, invoiceReadiness: 'COMMERCIAL_RECORD_ONLY'};
  }
}
