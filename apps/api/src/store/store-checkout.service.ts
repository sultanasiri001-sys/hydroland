import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommerceCheckout, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { FinanceAccessService } from '../finance/finance-access.service';
import { MoyasarCommerceInvoiceInput, MoyasarPayment, MoyasarPaymentProviderService, MoyasarWebhook } from '../payments/moyasar-payment-provider.service';
import { requireAcceptedStoreContract, requirePostedStoreCollection, requireStoreCheckoutBinding, requireStoreCheckoutContract,
  STORE_CHECKOUT_SOURCE, STORE_CHECKOUT_VERSION, StoreCheckoutOrder, storeCanonicalJson, storeContractHash, storeObject } from './store-checkout-contract';

type Acceptance = {quoteHash?: string; acceptedPolicyVersion?: string; idempotencyKey?: string};
const asJson = (value: unknown) => value as Prisma.InputJsonObject;
const sourceType = STORE_CHECKOUT_SOURCE;

@Injectable()
export class StoreCheckoutService {
  private readonly access: FinanceAccessService;
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService, private readonly provider: MoyasarPaymentProviderService) {
    this.access = new FinanceAccessService(db);
  }

  private async order(tx: Prisma.TransactionClient, id: string, accountId?: string) {
    if (typeof id !== 'string' || !id || id.length > 128) throw new BadRequestException('A valid store order is required.');
    await tx.$queryRaw`SELECT "id" FROM "StoreOrder" WHERE "id"=${id} FOR UPDATE`;
    const order = await tx.storeOrder.findUnique({where: {id}, include: {items: true, payment: true}});
    if (!order || accountId && order.accountId !== accountId) throw new NotFoundException('Store order not found.');
    return {order, contract: requireStoreCheckoutContract(order)};
  }

  private requireOpen(order: StoreCheckoutOrder) {
    if (!['CREATED', 'CONFIRMED'].includes(order.status)) throw new ConflictException({code: 'STORE_CHECKOUT_CLOSED', message: 'The order is no longer eligible for checkout.'});
  }

  private async center(tx: Prisma.TransactionClient, organizationId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"::text=${organizationId} FOR SHARE`;
    const center = await tx.organization.findFirst({where: {id: organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}});
    if (!center) throw new ConflictException({code: 'STORE_CHECKOUT_REVIEW_REQUIRED', status: 'REVIEW_REQUIRED', message: 'The original supplying center is not active.'});
  }

  private providerInput(checkout: CommerceCheckout): MoyasarCommerceInvoiceInput {
    return {checkoutId: checkout.id, sourceType, sourceId: checkout.sourceId, organizationId: checkout.organizationId,
      customerAccountId: checkout.customerAccountId, amountMinor: checkout.amountMinor, currency: 'SAR',
      expiresAt: storeObject(checkout.contractSnapshot).checkoutExpiresAt};
  }

  private sameRevision(current: CommerceCheckout, expected: CommerceCheckout) {
    return current.updatedAt.getTime() === expected.updatedAt.getTime() && current.status === expected.status
      && current.providerInvoiceId === expected.providerInvoiceId && current.providerPaymentId === expected.providerPaymentId
      && storeCanonicalJson(current.providerResult) === storeCanonicalJson(expected.providerResult);
  }

  async quote(accountId: string, orderId: string) {
    return this.db.serializable(async tx => {
      const {order, contract} = await this.order(tx, orderId, accountId);
      this.requireOpen(order);
      await this.center(tx, contract.organizationId);
      return {snapshot: contract, quoteHash: storeContractHash(contract), policyVersion: STORE_CHECKOUT_VERSION,
        invoiceReadiness: 'REVIEW_REQUIRED', financialActionExecuted: false};
    });
  }

  private async replay(tx: Prisma.TransactionClient, accountId: string, orderId: string, input: Acceptance, fingerprint: string) {
    const {order, contract} = await this.order(tx, orderId, accountId);
    await this.center(tx, contract.organizationId);
    const checkout = await tx.commerceCheckout.findUnique({where: {idempotencyKey: input.idempotencyKey!}});
    if (!checkout || checkout.sourceType !== sourceType || checkout.sourceId !== orderId || checkout.customerAccountId !== accountId
      || checkout.requestFingerprint !== fingerprint) throw new ConflictException('The checkout request is already bound to different details.');
    requireStoreCheckoutBinding(checkout, order, contract);
    return {checkout, order, dispatch: false};
  }

  async checkout(accountId: string, orderId: string, input: Acceptance) {
    if (!input || typeof input.idempotencyKey !== 'string' || !/^[A-Za-z0-9:_-]{8,160}$/.test(input.idempotencyKey)) {
      throw new BadRequestException('A stable checkout request key is required.');
    }
    const key = input.idempotencyKey;
    const fingerprint = storeContractHash({sourceType, orderId, accountId, quoteHash: input.quoteHash, version: input.acceptedPolicyVersion});
    const reserved = await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`store-checkout:${key}`},0))`;
      const {order, contract} = await this.order(tx, orderId, accountId);
      if (input.acceptedPolicyVersion !== STORE_CHECKOUT_VERSION || input.quoteHash !== storeContractHash(contract)) {
        throw new ConflictException({code: 'STORE_TERMS_CHANGED', message: 'Review and accept the original order quote before paying.'});
      }
      await this.center(tx, contract.organizationId);
      const byKey = await tx.commerceCheckout.findUnique({where: {idempotencyKey: key}});
      if (byKey && (byKey.sourceType !== sourceType || byKey.sourceId !== orderId || byKey.customerAccountId !== accountId || byKey.requestFingerprint !== fingerprint)) {
        throw new ConflictException('The checkout request key belongs to another request.');
      }
      const existing = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: orderId}}});
      if (existing) {
        requireStoreCheckoutBinding(existing, order, contract);
        if (existing.idempotencyKey !== key || existing.requestFingerprint !== fingerprint) throw new ConflictException('A checkout already exists. Continue its original payment request.');
        return {checkout: existing, order, dispatch: false};
      }
      this.requireOpen(order);
      if (order.payment && (order.payment.status !== 'CREATED' || order.payment.providerReference
        || order.payment.accountId !== accountId || order.payment.amountMinor !== order.totalMinor || order.payment.currency !== order.currency)) {
        throw new ConflictException({code: 'STORE_CHECKOUT_REVIEW_REQUIRED', message: 'The prior store payment requires reconciliation.'});
      }
      const payment = order.payment ?? await tx.storePayment.create({data: {orderId, accountId, amountMinor: order.totalMinor,
        currency: order.currency, idempotencyKey: 'hosted-store:' + orderId, status: 'CREATED'}});
      const now = new Date();
      // This is the hosted link's technical lifetime, not an order cancellation
      // fee or inventory-release policy. A new invoice is never auto-created.
      const checkout = await tx.commerceCheckout.create({data: {sourceType, sourceId: orderId, organizationId: contract.organizationId,
        customerAccountId: accountId, amountMinor: order.totalMinor, currency: 'SAR', provider: 'MOYASAR', idempotencyKey: key,
        requestFingerprint: fingerprint, status: 'DISPATCHED', dispatchedAt: now,
        contractSnapshot: asJson({...contract, termsAcceptedAt: now.toISOString(), acceptedQuoteHash: input.quoteHash,
          checkoutExpiresAt: new Date(now.getTime() + 30 * 60_000).toISOString()})}});
      await this.audit.record({actorId: accountId, action: 'STORE_CHECKOUT_DISPATCHED', resource: 'CommerceCheckout', resourceId: checkout.id,
        metadata: {orderId, paymentId: payment.id, organizationId: contract.organizationId, amountMinor: order.totalMinor, currency: 'SAR',
          policyVersion: STORE_CHECKOUT_VERSION, quoteHash: input.quoteHash}}, tx);
      return {checkout, order: {...order, payment}, dispatch: true};
    }).catch(async (error: unknown) => {
      const details = storeObject(error), meta = storeObject(details.meta);
      if (details.code !== 'P2002' || !['CommerceCheckout', 'StorePayment'].includes(meta.modelName)) throw error;
      // A Serializable snapshot can precede a lock wait. Recover only the exact
      // already-committed request in a fresh transaction, never repeat its POST.
      return this.db.serializable(tx => this.replay(tx, accountId, orderId, input, fingerprint));
    });
    if (!reserved.dispatch) return this.summary(reserved.checkout, reserved.order);

    try {
      const invoice = await this.provider.createCommerceInvoice(this.providerInput(reserved.checkout));
      const saved = await this.db.serializable(async tx => {
        const {order, contract} = await this.order(tx, orderId, accountId);
        const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: reserved.checkout.id}});
        requireStoreCheckoutBinding(current, order, contract);
        if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id) throw new ConflictException('A different invoice is already bound to this checkout.');
        if (!this.sameRevision(current, reserved.checkout)) return {checkout: current, order};
        const open = ['CREATED', 'CONFIRMED'].includes(order.status) && Date.parse(invoice.expiresAt) > Date.now()
          && ['initiated', 'on_hold'].includes(invoice.status) && !invoice.payments.some(payment => ['paid', 'captured', 'refunded'].includes(payment.status));
        const checkout = await tx.commerceCheckout.update({where: {id: current.id}, data: {providerInvoiceId: invoice.id,
          status: open ? 'PENDING' : 'RECONCILIATION_REQUIRED', providerResult: asJson({invoice, verifiedAt: new Date().toISOString()})}});
        const payment = await tx.storePayment.update({where: {orderId}, data: {providerReference: invoice.id, status: 'PENDING'}});
        await this.audit.record({actorId: accountId, action: 'STORE_CHECKOUT_CREATED', resource: 'CommerceCheckout', resourceId: checkout.id,
          metadata: {orderId, providerInvoiceId: invoice.id, status: checkout.status}}, tx);
        return {checkout, order: {...order, payment}};
      });
      return this.summary(saved.checkout, saved.order);
    } catch {
      await this.markReview(reserved.checkout, 'INVOICE_CREATE_OUTCOME_UNCERTAIN');
      throw new ServiceUnavailableException({code: 'STORE_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The original checkout result requires reconciliation. Do not make another payment request.'});
    }
  }

  private async accountant(accountId: string, organizationId: string, tx: Prisma.TransactionClient) {
    try {await this.center(tx, organizationId); await this.access.requireCenterOrganizationAccountant(accountId, organizationId, tx);}
    catch {throw new ForbiddenException('An active accountant for the original supplying center must reconcile this collection.');}
  }

  private async markReview(expected: CommerceCheckout, reasonCode: string, actorId?: string) {
    await this.db.serializable(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "StoreOrder" WHERE "id"=${expected.sourceId} FOR UPDATE`;
      const current = await tx.commerceCheckout.findUnique({where: {id: expected.id}});
      if (current && actorId) await this.accountant(actorId, current.organizationId, tx);
      if (!current || !this.sameRevision(current, expected)) return;
      await tx.commerceCheckout.update({where: {id: current.id}, data: {status: 'RECONCILIATION_REQUIRED'}});
      await this.audit.record({action: 'STORE_CHECKOUT_REVIEW_REQUIRED', resource: 'CommerceCheckout', resourceId: current.id,
        metadata: {orderId: current.sourceId, reasonCode}}, tx);
    });
  }

  async refresh(accountId: string, orderId: string) {
    const row = await this.db.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: orderId}}});
    if (!row || row.customerAccountId !== accountId) throw new NotFoundException('Store checkout not found.');
    return this.refreshCheckout(row.id);
  }

  private async refreshCheckout(checkoutId: string, recoveredInvoiceId?: string, accountantId?: string) {
    const binding = await this.db.serializable(async tx => {
      const checkout = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      const {order, contract} = await this.order(tx, checkout.sourceId);
      requireStoreCheckoutBinding(checkout, order, contract);
      if (accountantId) await this.accountant(accountantId, checkout.organizationId, tx);
      if (checkout.providerInvoiceId && recoveredInvoiceId && checkout.providerInvoiceId !== recoveredInvoiceId) throw new ConflictException('The checkout already has another provider invoice.');
      const invoiceId = checkout.providerInvoiceId || recoveredInvoiceId;
      if (!invoiceId || !checkout.dispatchedAt) throw new ConflictException({code: 'STORE_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The original provider invoice must be reconciled before proceeding.'});
      return {checkout, order, invoiceId};
    });
    let invoice, payment: MoyasarPayment | null = null;
    try {
      invoice = await this.provider.fetchCommerceInvoice(binding.invoiceId, this.providerInput(binding.checkout));
      const collected = invoice.payments.filter(row => ['paid', 'captured', 'refunded'].includes(row.status));
      if (collected.length > 1 || invoice.status === 'paid' && collected.length !== 1
        || invoice.payments.some(row => ['authorized', 'verified'].includes(row.status))) throw new ConflictException('The provider invoice needs payment reconciliation.');
      if (collected.length === 1) {
        if (collected[0].amount !== binding.checkout.amountMinor || collected[0].currency !== 'SAR') throw new ConflictException('The provider payment amount does not match the order.');
        payment = await this.provider.fetchPayment(collected[0].id, {invoiceId: invoice.id, amountMinor: binding.checkout.amountMinor, currency: 'SAR'});
        if (binding.checkout.providerPaymentId && binding.checkout.providerPaymentId !== payment.id) throw new ConflictException('The original provider payment reference changed.');
      }
    } catch {
      await this.markReview(binding.checkout, 'PROVIDER_COLLECTION_NOT_VERIFIED', accountantId);
      throw new ServiceUnavailableException({code: 'STORE_CHECKOUT_RECONCILIATION_REQUIRED', message: 'The provider collection must be reconciled before fulfillment.'});
    }
    const verifiedAt = new Date();
    const saved = await this.db.serializable(async tx => {
      const {order, contract} = await this.order(tx, binding.order.id);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkoutId}});
      requireStoreCheckoutBinding(current, order, contract);
      if (accountantId) await this.accountant(accountantId, current.organizationId, tx);
      if (!this.sameRevision(current, binding.checkout)) return {checkout: current, order};
      if (current.providerInvoiceId && current.providerInvoiceId !== invoice.id || current.providerPaymentId && payment && current.providerPaymentId !== payment.id) {
        throw new ConflictException('Provider references no longer match this store checkout.');
      }
      const previous = storeObject(storeObject(current.providerResult).payment);
      const regressed = payment && previous.id === payment.id && (payment.refundedMinor < Number(previous.refundedMinor)
        || payment.capturedMinor < Number(previous.capturedMinor) || Date.parse(payment.updatedAt) < Date.parse(previous.updatedAt));
      const open = ['CREATED', 'CONFIRMED'].includes(order.status);
      const captured = invoice.status === 'paid' && payment && ['paid', 'captured'].includes(payment.status)
        && payment.capturedMinor === current.amountMinor && payment.refundedMinor === 0 && payment.refundedAt === null
        && Date.parse(payment.updatedAt) <= verifiedAt.getTime();
      let status = 'RECONCILIATION_REQUIRED';
      const noPendingPayment = invoice.payments.every(row => ['failed', 'voided', 'expired'].includes(row.status));
      if (captured && !regressed && (open || order.status === 'FULFILLED')) status = 'CAPTURED';
      else if (!payment && !current.providerPaymentId && open && Date.parse(invoice.expiresAt) > verifiedAt.getTime() && ['initiated', 'on_hold'].includes(invoice.status)) status = 'PENDING';
      else if (!payment && !current.providerPaymentId && noPendingPayment && ['canceled', 'expired', 'voided'].includes(invoice.status)) status = 'CANCELLED';
      else if (!payment && !current.providerPaymentId && noPendingPayment && invoice.status === 'failed') status = 'FAILED';
      const checkout = await tx.commerceCheckout.update({where: {id: current.id}, data: {status, providerInvoiceId: invoice.id,
        ...(payment ? {providerPaymentId: payment.id} : {}), providerResult: asJson({invoice,
          payment: regressed || !payment && current.providerPaymentId ? previous : payment, verifiedAt: verifiedAt.toISOString(),
          ...(regressed ? {rejectedObservation: {payment, reasonCode: 'PROVIDER_BALANCE_OR_TIMESTAMP_REGRESSED'}} : {})})}});
      const registered = await tx.storePayment.update({where: {orderId: order.id}, data: {providerReference: invoice.id,
        ...(['CAPTURED', 'PENDING', 'CANCELLED', 'FAILED'].includes(status) ? {status: status as 'CAPTURED' | 'PENDING' | 'CANCELLED' | 'FAILED'} : {})}});
      await this.audit.record({action: 'STORE_COLLECTION_OBSERVED', resource: 'CommerceCheckout', resourceId: checkout.id,
        metadata: {orderId: order.id, status, providerInvoiceId: invoice.id, providerPaymentId: payment?.id ?? null,
          capturedMinor: payment?.capturedMinor ?? 0, refundedMinor: payment?.refundedMinor ?? 0, verifiedAt: verifiedAt.toISOString()}}, tx);
      return {checkout, order: {...order, payment: registered}};
    });
    return this.summary(saved.checkout, saved.order);
  }

  async reconcileInvoice(accountId: string, orderId: string, invoiceId?: string) {
    if (typeof invoiceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(invoiceId)) throw new BadRequestException('An original provider invoice reference is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: orderId}}});
      if (!row) throw new NotFoundException('Store checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    return this.refreshCheckout(checkout.id, invoiceId, accountId);
  }

  async publishCollection(accountId: string, orderId: string, financeEntryId?: string) {
    if (typeof financeEntryId !== 'string' || !financeEntryId.trim() || financeEntryId.length > 128) throw new BadRequestException('A matching posted store revenue entry is required.');
    const checkout = await this.db.serializable(async tx => {
      const row = await tx.commerceCheckout.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: orderId}}});
      if (!row) throw new NotFoundException('Store checkout not found.');
      await this.accountant(accountId, row.organizationId, tx);
      return row;
    });
    await this.refreshCheckout(checkout.id, undefined, accountId);
    return this.db.serializable(async tx => {
      const {order, contract} = await this.order(tx, orderId);
      const current = await tx.commerceCheckout.findUniqueOrThrow({where: {id: checkout.id}});
      requireStoreCheckoutBinding(current, order, contract);
      await this.accountant(accountId, current.organizationId, tx);
      const observation = storeObject(current.providerResult), payment = storeObject(observation.payment), invoice = storeObject(observation.invoice);
      const verifiedAt = new Date(observation.verifiedAt);
      if (current.status !== 'CAPTURED' || order.payment?.status !== 'CAPTURED' || !['CREATED', 'CONFIRMED', 'FULFILLED'].includes(order.status)
        || !current.providerPaymentId || !current.providerInvoiceId || payment.id !== current.providerPaymentId || payment.invoiceId !== current.providerInvoiceId
        || invoice.id !== current.providerInvoiceId || !['paid', 'captured'].includes(payment.status) || payment.capturedMinor !== current.amountMinor
        || payment.refundedMinor !== 0 || payment.refundedAt !== null || !Number.isFinite(verifiedAt.getTime())
        || verifiedAt.getTime() > Date.now() || Date.now() - verifiedAt.getTime() > 60_000) {
        throw new ConflictException('A fresh, fully captured and unrefunded provider payment is required.');
      }
      requireAcceptedStoreContract(contract, current.contractSnapshot, verifiedAt);
      await requirePostedStoreCollection(tx, {financeEntryId, orderId, organizationId: current.organizationId, amountMinor: current.amountMinor});
      const existing = await tx.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: orderId}}});
      if (existing) {
        if (existing.financeEntryId !== financeEntryId || existing.providerPaymentId !== current.providerPaymentId || existing.providerInvoiceId !== current.providerInvoiceId
          || existing.customerAccountId !== current.customerAccountId || existing.organizationId !== current.organizationId
          || existing.amountMinor !== current.amountMinor || existing.currency !== 'SAR' || existing.provider !== 'MOYASAR'
          || existing.providerCapturedMinor !== current.amountMinor || existing.providerRefundedMinor !== 0
          || storeCanonicalJson(existing.contractSnapshot) !== storeCanonicalJson(current.contractSnapshot)) throw new ConflictException('The store order already has another collection receipt.');
        return {status: 'COLLECTION_VERIFIED', orderId, collectionEvidenceId: existing.id, invoiceReadiness: 'REVIEW_REQUIRED', financialActionExecuted: false};
      }
      const proof = await tx.commerceCollectionEvidence.create({data: {sourceType, sourceId: orderId, organizationId: current.organizationId,
        customerAccountId: current.customerAccountId, amountMinor: current.amountMinor, currency: 'SAR', provider: 'MOYASAR',
        providerPaymentId: current.providerPaymentId, providerInvoiceId: current.providerInvoiceId, providerCapturedMinor: current.amountMinor,
        providerRefundedMinor: 0, providerVerifiedAt: verifiedAt, providerSnapshot: asJson({...payment, invoiceMetadata: invoice.metadata}),
        financeEntryId, contractSnapshot: asJson(current.contractSnapshot)}});
      await this.audit.record({actorId: accountId, action: 'STORE_COLLECTION_VERIFIED', resource: 'StoreOrder', resourceId: orderId,
        metadata: {checkoutId: current.id, collectionEvidenceId: proof.id, financeEntryId, providerPaymentId: current.providerPaymentId,
          providerInvoiceId: current.providerInvoiceId, organizationId: current.organizationId, amountMinor: current.amountMinor, currency: 'SAR'}}, tx);
      return {status: 'COLLECTION_VERIFIED', orderId, collectionEvidenceId: proof.id, invoiceReadiness: 'REVIEW_REQUIRED', financialActionExecuted: false};
    });
  }

  /** Only the existing authenticated webhook dispatcher may call this method. */
  async handleVerifiedProviderEvent(event: MoyasarWebhook) {
    const invoiceId = typeof event.data.invoice_id === 'string' ? event.data.invoice_id.trim() : '';
    if (!invoiceId) return {handled: false};
    const checkout = await this.db.commerceCheckout.findUnique({where: {providerInvoiceId: invoiceId}});
    if (!checkout || checkout.sourceType !== sourceType) return {handled: false};
    const result = await this.refreshCheckout(checkout.id);
    return {handled: true, status: result.status, orderId: checkout.sourceId};
  }

  private async summary(checkout: CommerceCheckout, order: StoreCheckoutOrder) {
    const evidence = await this.db.commerceCollectionEvidence.findUnique({where: {sourceType_sourceId: {sourceType, sourceId: order.id}}, select: {id: true}});
    const snapshot = storeObject(checkout.contractSnapshot), invoice = storeObject(storeObject(checkout.providerResult).invoice);
    const activeCenter = await this.db.organization.findFirst({where: {id: checkout.organizationId, kind: 'DIVE_CENTER', status: 'ACTIVE'}, select: {id: true}});
    const open = Boolean(activeCenter) && ['CREATED', 'CONFIRMED'].includes(order.status) && Date.parse(snapshot.checkoutExpiresAt) > Date.now();
    const uncertain = ['DISPATCHED', 'RECONCILIATION_REQUIRED'].includes(checkout.status);
    return {checkoutId: checkout.id, orderId: order.id, status: checkout.status, amountMinor: checkout.amountMinor, currency: checkout.currency,
      checkoutUrl: open && checkout.status === 'PENDING' && typeof invoice.url === 'string' ? invoice.url : null,
      expiresAt: snapshot.checkoutExpiresAt, sourceReadiness: activeCenter ? 'ACTIVE' : 'REVIEW_REQUIRED',
      collectionVerified: Boolean(evidence && checkout.status === 'CAPTURED'), paymentStatus: order.payment?.status ?? null,
      invoiceReadiness: 'REVIEW_REQUIRED', financialOutcome: checkout.status === 'CAPTURED' ? 'CONFIRMED' : uncertain ? 'UNKNOWN' : 'NOT_COLLECTED',
      financialActionExecuted: checkout.status === 'CAPTURED' ? true : uncertain ? null : false};
  }
}
