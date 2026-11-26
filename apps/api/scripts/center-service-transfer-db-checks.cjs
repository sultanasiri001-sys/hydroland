'use strict';

// Real authorization, entitlement validation and ledger transactions against a
// disposable loopback database. No bank or payment provider is contacted.
const assert = require('node:assert/strict');
const { createHash, randomBytes, randomUUID, scryptSync } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { PDFDocument } = require('pdf-lib');
require('reflect-metadata');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.equal(process.env.CI, 'true');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
const build = process.env.COMMERCE_TRANSFER_MODULE_ROOT || resolve(__dirname, '../dist');
const { DatabaseService } = require(resolve(build, 'database/database.service.js'));
const { FinanceAccessService } = require(resolve(build, 'finance/finance-access.service.js'));
const { FinancePersistenceService } = require(resolve(build, 'finance/finance-persistence.service.js'));
const { CenterServiceEntitlementService } = require(resolve(build, 'commerce/center-service-entitlement.service.js'));
const { CenterServiceTransferService } = require(resolve(build, 'commerce/center-service-transfer.service.js'));
const { captureTripBookingContract } = require(resolve(build, 'commerce/trip-booking-contract.js'));
const { entitlementContractHash } = require(resolve(build, 'commerce/center-service-entitlement.js'));
const db = new DatabaseService();
const access = new FinanceAccessService(db);
const entitlements = new CenterServiceEntitlementService(db, access);
const transfers = new CenterServiceTransferService(db, access, entitlements);
const finance = new FinancePersistenceService(db);
const status = code => error => error.getStatus?.() === code;
const denied = error => error.getStatus?.() === 403 || /FINANCE_.*DENIED/.test(error.message);
const outcomes = [];
const check = async (name, action) => { await action(); outcomes.push(name); console.log('PASS', name); };
const originalFetch = global.fetch;
global.fetch = () => { throw new Error('Provider access is forbidden during external transfer acceptance'); };
const now = Date.now();
let owner, requester, approver, receiver, buyer, collector, poster, foreign, center, unit, otherCenter, otherUnit, buyingOrganization, financeAccount;

async function account(label) {
  const person = await db.person.create({ data: { firstName: label, lastName: 'Synthetic external transfer acceptance' } });
  return db.account.create({ data: { personId: person.id, email: `${label}-${randomUUID()}@example.invalid`, passwordHash: 'not-a-login',
    status: 'ACTIVE', emailVerifiedAt: new Date(now - 60000) } });
}

async function centerScope(label, accountants) {
  const organization = await db.organization.create({ data: { displayName: label, legalName: label, registrationNumber: randomUUID(),
    address: 'Synthetic test address', kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: owner.id } });
  const centerUnit = await db.orgUnit.create({ data: { organizationId: organization.id, type: 'CENTER', code: 'TEST_CENTER', nameAr: label } });
  const position = await db.position.create({ data: { orgUnitId: centerUnit.id, code: 'CENTER_ACCOUNTANT', titleAr: 'Synthetic accountant' } });
  for (const actor of accountants) await db.employment.create({ data: { accountId: actor.id, organizationId: organization.id,
    orgUnitId: centerUnit.id, positionId: position.id, workerClass: 'EMPLOYEE', status: 'ACTIVE' } });
  return { organization, unit: centerUnit };
}

async function document(label) {
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText(`SYNTHETIC TEST ONLY: ${label}`);
  return Buffer.from(await pdf.save());
}

async function fixture({ draftInvoice = false } = {}) {
  const recordedAt = new Date(now - 10 * 86400000), bookingId = randomUUID();
  const trip = await db.trip.create({ data: { organizationId: center.id, title: 'Synthetic organization trip', type: 'SHORE_DIVE', capacity: 2,
    startsAt: new Date(now - 2 * 86400000), endsAt: new Date(now - 86400000), status: 'COMPLETED' } });
  const contract = captureTripBookingContract({ bookingId, accountId: buyer.id, buyerOrganizationId: buyingOrganization.id, seats: 2, createdAt: recordedAt,
    price: { pricePerSeatMinor: 5000, currency: 'SAR', configured: true }, trip: { ...trip, organization: center } });
  const booking = await db.booking.create({ data: { id: bookingId, tripId: trip.id, accountId: buyer.id, organizationId: buyingOrganization.id,
    status: 'CONFIRMED', seats: 2, createdAt: recordedAt, contractSnapshot: contract } });
  const participants = await Promise.all([0, 1].map(index => db.bookingParticipant.create({ data: { bookingId, fullName: `Synthetic participant ${index}`,
    eligibilityStatus: 'ELIGIBLE' } })));
  const accepted = { ...contract, termsAcceptanceStatus: 'ACCEPTED', termsAcceptedAt: new Date(recordedAt.getTime() + 1000).toISOString(),
    organizationPaymentAuthorization: { source: 'ORGANIZATION_BOOKING_PREPAYMENT', buyerOrganizationId: buyingOrganization.id, bookingId,
      delegateAccountId: buyer.id, grantId: randomUUID(), approvalEvidenceReference: randomUUID() } };
  const payment = await db.payment.create({ data: { bookingId, accountId: buyer.id, amountMinor: 10000, currency: 'SAR', status: 'CAPTURED',
    idempotencyKey: randomUUID(), providerReference: randomUUID(), moyasarPaymentId: randomUUID(), contractSnapshot: accepted,
    createdAt: new Date(recordedAt.getTime() + 2000) } });
  const approvedAt = new Date(now - 3 * 86400000), postedAt = new Date(approvedAt.getTime() + 1000);
  const collection = await db.financeEntry.create({ data: { organizationId: center.id, financeAccountId: financeAccount.id, type: 'REVENUE', status: 'POSTED',
    amountMinor: 10000, currency: 'SAR', referenceType: 'TRIP_PAYMENT_COLLECTION', referenceId: payment.id, requestedByAccountId: collector.id,
    approvedByAccountId: approver.id, approvedAt, postedByAccountId: poster.id, postedAt, createdAt: new Date(approvedAt.getTime() - 1000),
    approvals: { create: { requestedByAccountId: collector.id, decidedByAccountId: approver.id, status: 'APPROVED', decidedAt: approvedAt,
      createdAt: new Date(approvedAt.getTime() - 500) } } } });
  const collectionEvidence = await db.commerceCollectionEvidence.create({ data: { sourceType: 'ORGANIZATION_BOOKING_PREPAYMENT', sourceId: bookingId,
    organizationId: center.id, customerAccountId: buyer.id, amountMinor: 10000, currency: 'SAR', provider: 'SYNTHETIC', providerPaymentId: payment.moyasarPaymentId,
    providerInvoiceId: payment.providerReference, providerCapturedMinor: 10000, providerRefundedMinor: 0, providerVerifiedAt: postedAt,
    providerSnapshot: { paymentId: payment.id }, financeEntryId: collection.id, contractSnapshot: accepted } });
  const completion = await db.auditEvent.create({ data: { actorId: owner.personId, action: 'TRIP_COMPLETED', resource: 'Trip', resourceId: trip.id,
    occurredAt: new Date(now - 12 * 3600000), metadata: { status: 'COMPLETED', attendedParticipantIds: participants.map(row => row.id), absentParticipantIds: [] } } });
  const issuedAt = new Date(now - 4 * 86400000), invoicePdf = await document('center final invoice ' + payment.id);
  const invoice = await db.invoice.create({ data: { paymentId: payment.id, number: (draftInvoice ? 'HL-DRAFT-' : 'HL-TEST-') + payment.id,
    status: draftInvoice ? 'DRAFT' : 'PAID', issuedAt: draftInvoice ? null : issuedAt, contractSnapshot: accepted } });
  const invoiceDocument = draftInvoice ? null : await db.accountInvoiceDocument.create({ data: { sourceType: 'TRIP_PAYMENT', sourceId: payment.id, sellerId: center.id,
    buyerOrganizationId: buyingOrganization.id, number: 'TEST-' + payment.id, sha256: createHash('sha256').update(invoicePdf).digest('hex'),
    content: invoicePdf, attachedBy: requester.id } });
  const finalization = draftInvoice ? null : await db.organizationBookingInvoiceFinalization.create({ data: { paymentId: payment.id, invoiceId: invoice.id, sellerId: center.id,
    buyerOrganizationId: buyingOrganization.id, number: invoiceDocument.number, issuedAt, documentSha256: invoiceDocument.sha256,
    collectionEvidenceId: collectionEvidence.id, collectionFinanceEntryId: collection.id, contractHash: entitlementContractHash(accepted),
    snapshot: { issuer: { organizationId: center.id }, buyer: { organizationId: buyingOrganization.id }, amountMinor: 10000, currency: 'SAR' }, finalizedBy: requester.id } });
  const preview = await entitlements.readTrip(requester.id, unit.id, bookingId);
  const allocation = await entitlements.approveTripAllocation(owner.id, center.id, bookingId, { financeAccountId: financeAccount.id,
    commissionAmountMinor: 1000, otherDeductionsMinor: 0, expectedEvidenceHash: preview.allocationEvidenceHash });
  const prepared = await entitlements.prepareTrip(requester.id, unit.id, bookingId, { financeAccountId: financeAccount.id,
    allocationApprovalEventId: allocation.allocationApprovalEventId });
  const settlement = await finance.decideEntry(prepared.settlementFinanceEntryId, approver.id, true, 'Synthetic independent approval');
  assert.equal(settlement.amountMinor, 9000);
  return { booking, contract, payment, accepted, trip, participants, collection, collectionEvidence, completion, invoice, invoiceDocument,
    finalization, allocation, settlement, invoicePdf };
}

async function submission(fixture, bankReference = randomUUID()) {
  return { requestId: randomUUID(), financeEntryId: fixture.settlement.id, bankName: 'Synthetic Bank', bankReference, amountMinor: 9000, currency: 'SAR',
    transferredAt: new Date().toISOString(), documentBase64: (await document('outgoing proof ' + bankReference)).toString('base64') };
}
async function confirmation(label) {
  return { decision: 'CONFIRMED', note: 'Independent center bank statement reviewed', receivedAt: new Date().toISOString(),
    documentBase64: (await document('independent incoming statement ' + label)).toString('base64') };
}
const entry = fixture => db.financeEntry.findUniqueOrThrow({ where: { id: fixture.settlement.id } });

async function verifyHttpCycle() {
  const { Module } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const load = file => require(resolve(build, file));
  const { AuditService } = load('audit/audit.service.js');
  const { AuthService } = load('auth/auth.service.js');
  const { AuthController } = load('auth/auth.controller.js');
  const { MfaService } = load('auth/mfa.service.js');
  const { GoogleIdentityService } = load('auth/google-identity.service.js');
  const { AccessTokenGuard } = load('auth/access-token.guard.js');
  const { AccountInvoicesController } = load('payments/account-invoices.controller.js');
  const { AccountInvoicesService } = load('payments/account-invoices.service.js');
  const { OrganizationBookingInvoiceService } = load('payments/organization-booking-invoice.service.js');
  const { CenterServiceTransferController } = load('finance/center-service-transfer.controller.js');
  process.env.JWT_SECRET = 'SYNTHETIC_B12_external_transfer_HTTP_only_20261126';
  const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
  const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  for (const actor of [owner, requester, receiver, buyer]) await db.account.update({ where: { id: actor.id }, data: { passwordHash } });
  await db.roleAssignment.create({ data: { accountId: buyer.id, role: 'ORGANIZATION', status: 'ACTIVE' } });
  await db.organizationMember.create({ data: { organizationId: buyingOrganization.id, accountId: buyer.id, role: 'OWNER', status: 'ACTIVE' } });
  await db.operationalSetting.create({ data: { key: 'organization-financial-profile:' + center.id,
    value: { currency: 'SAR', taxStatus: 'EXEMPT', registrationStatus: 'REGISTERED', revision: 1 } } });
  const f = await fixture({ draftInvoice: true });
  assert.equal(f.invoice.status, 'DRAFT');
  assert.equal(await db.organizationBookingInvoiceFinalization.count({ where: { paymentId: f.payment.id } }), 0);
  class FixtureModule {}
  Module({ controllers: [AuthController, AccountInvoicesController, CenterServiceTransferController], providers: [
    { provide: DatabaseService, useValue: db }, AuditService, AuthService, MfaService, GoogleIdentityService, AccessTokenGuard,
    AccountInvoicesService, OrganizationBookingInvoiceService, FinanceAccessService, CenterServiceEntitlementService, CenterServiceTransferService,
  ] })(FixtureModule);
  let app;
  const blockedFetch = global.fetch;
  try {
    app = await NestFactory.create(FixtureModule, { logger: false });
    app.useBodyParser('json', { limit: '15mb' });
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl(), base = origin + '/api/v1';
    global.fetch = (input, options) => {
      const requestUrl = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      assert.equal(requestUrl.origin, origin, 'Only this isolated HTTP application may be contacted');
      return originalFetch(input, { ...options, redirect: 'error', signal: options?.signal || AbortSignal.timeout(15000) });
    };
    const call = (actor, path, method = 'GET', data) => fetch(base + path, { method,
      headers: { 'content-type': 'application/json', ...(actor?.token ? { authorization: 'Bearer ' + actor.token } : {}) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const ok = async response => { const body = await response.json(); assert(response.ok, JSON.stringify({ status: response.status, body })); return body; };
    const reject = async (response, expected) => { const body = await response.json(); assert.equal(response.status, expected, JSON.stringify(body)); };
    for (const actor of [owner, requester, receiver, buyer]) {
      const loggedIn = await ok(await call(null, '/auth/login', 'POST', { email: actor.email, password }));
      assert(loggedIn.accessToken); actor.token = loggedIn.accessToken;
      assert.equal(await db.session.count({ where: { accountId: actor.id, revokedAt: null } }), 1);
    }
    const invoicePath = '/account/invoices/TRIP_PAYMENT/' + f.payment.id;
    await reject(await call(null, invoicePath + '/finalization'), 401);
    const form = new FormData(); form.set('number', 'HTTP-B12-' + f.payment.id);
    form.set('document', new Blob([f.invoicePdf], { type: 'application/pdf' }), 'synthetic-center-invoice.pdf');
    await ok(await fetch(base + invoicePath + '/document', { method: 'POST', headers: { authorization: 'Bearer ' + requester.token }, body: form }));
    const preview = await ok(await call(requester, invoicePath + '/finalization'));
    assert.equal(preview.status, 'DRAFT'); assert.equal(preview.canFinalize, true); assert.deepEqual(preview.blockers, []);
    const finalInput = { issuedAt: new Date(now - 4 * 86400000).toISOString(), expectedEvidenceHash: preview.expectedEvidenceHash, originalInvoiceVerified: true };
    await reject(await call(buyer, invoicePath + '/finalization', 'POST', finalInput), 403);
    const finalized = await ok(await call(requester, invoicePath + '/finalization', 'POST', finalInput));
    assert.equal(finalized.status, 'FINALIZED');
    assert.equal((await ok(await call(requester, invoicePath + '/finalization', 'POST', finalInput))).finalizationId, finalized.finalizationId);
    const buyerInvoice = await ok(await call(buyer, invoicePath + '/finalization'));
    assert.equal(buyerInvoice.finalizationId, finalized.finalizationId);
    const invoiceDownload = await call(buyer, invoicePath + '/document');
    assert.equal(invoiceDownload.status, 200); assert.deepEqual(Buffer.from(await invoiceDownload.arrayBuffer()), f.invoicePdf);
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: f.invoice.id } })).status, 'PAID');
    const transferPath = '/finance/centers/' + unit.id + '/service-transfers';
    assert((await ok(await call(owner, '/finance/owner/service-transfer-centers'))).centers.some(row => row.id === unit.id));
    const pendingInput = await submission(f);
    // A valid maximum-size original exercises the deployed 15 MB JSON parser,
    // including base64 expansion beyond the default HTTP body limit.
    const compactPdf = Buffer.from(pendingInput.documentBase64, 'base64');
    const largePdf = Buffer.concat([compactPdf, Buffer.alloc(5 * 1024 * 1024 - compactPdf.length, ' ')]);
    pendingInput.documentBase64 = largePdf.toString('base64');
    assert(Buffer.byteLength(JSON.stringify(pendingInput)) > 6500000);
    await reject(await call(buyer, transferPath, 'POST', pendingInput), 403);
    const pendingReceipt = await ok(await call(owner, transferPath, 'POST', pendingInput));
    assert.equal(pendingReceipt.status, 'PENDING'); assert.equal(pendingReceipt.invoiceFinalizationId, finalized.finalizationId);
    assert.equal((await entry(f)).status, 'APPROVED');
    assert.equal((await ok(await call(owner, transferPath, 'POST', pendingInput))).id, pendingReceipt.id);
    const receivingView = await ok(await call(receiver, transferPath + '?bookingId=' + f.booking.id));
    assert.equal(receivingView.items[0].canConfirm, true);
    const received = await confirmation('HTTP-' + pendingReceipt.id);
    await reject(await call(owner, transferPath + '/' + pendingReceipt.id + '/review', 'POST', received), 403);
    const confirmed = await ok(await call(receiver, transferPath + '/' + pendingReceipt.id + '/review', 'POST', received));
    assert.equal(confirmed.status, 'CONFIRMED'); assert.equal(confirmed.externalTransferConfirmed, true);
    assert.equal(confirmed.bankTransferExecuted, false); assert.equal(confirmed.providerVerified, false);
    assert.equal((await ok(await call(receiver, transferPath + '/' + pendingReceipt.id + '/review', 'POST', received))).id, pendingReceipt.id);
    const proof = await call(receiver, transferPath + '/' + pendingReceipt.id + '/document?kind=transfer');
    assert.equal(proof.status, 200); assert.match(proof.headers.get('cache-control'), /no-store/);
    assert.deepEqual(Buffer.from(await proof.arrayBuffer()), largePdf);
    const settled = await entry(f); assert.equal(settled.status, 'POSTED'); assert.equal(settled.amountMinor, 9000); assert.equal(settled.postedByAccountId, receiver.id);
    assert.equal(await db.auditEvent.count({ where: { action: 'FINANCE_ENTRY_POSTED', resourceId: settled.id } }), 1);
    console.log(JSON.stringify({ suite: 'b12-invoice-external-transfer-http', passed: 1, authentication: 'real-login-and-session-guard',
      invoice: 'DRAFT_TO_PAID_WITH_ORIGINAL', amountMinor: 10000, netSettledMinor: 9000, maximumPdfBytes: largePdf.length,
      externalTransferConfirmed: true, actualMoneyTransfers: 0, externalProviderCalls: 0, productionWrites: 0 }));
  } finally {
    global.fetch = blockedFetch;
    if (app) await app.close();
  }
}

async function main() {
  await db.$connect();
  const [index] = await db.$queryRaw`SELECT to_regclass('"FinanceEntry_center_service_entitlement_unique"')::text AS id`;
  if (!index.id) await db.$executeRawUnsafe(readFileSync(resolve(__dirname, '../prisma/migrations/20261121045000_center_entitlement_reference/migration.sql'), 'utf8'));
  [owner, requester, approver, receiver, buyer, collector, poster, foreign] = await Promise.all(
    ['platform-owner', 'requester', 'approver', 'receiver', 'buyer', 'collector', 'poster', 'foreign'].map(account));
  process.env.D12_OWNER_EMAIL = owner.email;
  await db.roleAssignment.create({ data: { accountId: owner.id, role: 'ADMIN', status: 'ACTIVE' } });
  const platform = await db.organization.create({ data: { displayName: 'Synthetic internal platform', kind: 'HYDROLAND_INTERNAL_PLATFORM', status: 'ACTIVE', ownerId: owner.id } });
  await db.operationalSetting.upsert({ where: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1' }, create: { key: 'PLATFORM_STAFFING_ORGANIZATION:v1', value: { organizationId: platform.id } }, update: { value: { organizationId: platform.id } } });
  ({ organization: center, unit } = await centerScope('Synthetic supplier', [requester, approver, receiver, owner]));
  ({ organization: otherCenter, unit: otherUnit } = await centerScope('Synthetic other supplier', [foreign]));
  buyingOrganization = await db.organization.create({ data: { displayName: 'Synthetic buyer organization', kind: 'COMPANY', status: 'ACTIVE', ownerId: buyer.id } });
  financeAccount = await db.financeAccount.create({ data: { organizationId: center.id, name: 'Synthetic SAR ledger', currency: 'SAR' } });
  const f = await fixture(), input = await submission(f);

  await check('only the verified platform owner can submit; reads stay in the selected center', async () => {
    await assert.rejects(transfers.submit(requester.id, unit.id, input), status(403));
    await assert.rejects(transfers.submit(buyer.id, unit.id, input), status(403));
    await assert.rejects(transfers.list(foreign.id, unit.id), denied);
    await assert.rejects(transfers.ownerCenters(requester.id), status(403));
    const centers = await transfers.ownerCenters(owner.id);
    assert(centers.centers.some(row => row.id === unit.id));
    const list = await transfers.list(owner.id, unit.id, f.booking.id);
    assert.equal(list.canSubmit, true); assert.equal(list.candidates[0].financeEntryId, f.settlement.id);
  });

  await check('invalid amounts, currency, dates and corrupt PDFs never create a transfer', async () => {
    for (const change of [{ amountMinor: 0 }, { amountMinor: 9001 }, { currency: 'USD' }, { transferredAt: '2026-02-30T00:00:00Z' },
      { transferredAt: '2026-11-20' }, { documentBase64: Buffer.from('%PDF-not-a-real-pdf').toString('base64') },
      { documentBase64: 'A'.repeat(7 * 1024 * 1024) }]) await assert.rejects(transfers.submit(owner.id, unit.id, { ...input, ...change }));
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { financeEntryId: f.settlement.id } }), 0);
    assert.equal((await entry(f)).status, 'APPROVED');
  });

  await check('draft invoice or different final invoice evidence blocks transfer recording', async () => {
    await db.invoice.update({ where: { id: f.invoice.id }, data: { status: 'DRAFT' } });
    try { await assert.rejects(transfers.submit(owner.id, unit.id, input), status(409)); }
    finally { await db.invoice.update({ where: { id: f.invoice.id }, data: { status: 'PAID' } }); }
    await db.organizationBookingInvoiceFinalization.update({ where: { id: f.finalization.id }, data: { buyerOrganizationId: otherCenter.id } });
    try { await assert.rejects(transfers.submit(owner.id, unit.id, input), status(409)); }
    finally { await db.organizationBookingInvoiceFinalization.update({ where: { id: f.finalization.id }, data: { buyerOrganizationId: buyingOrganization.id } }); }
  });

  let submitted;
  await check('F08 procurement bank claims cannot be reused by the B12 booking transfer path', async () => {
    const { withProcurementReference } = require('./procurement-reference-sentinel.cjs');
    const bankReferenceKey = entitlementContractHash([
      input.bankName.normalize('NFKC').toUpperCase().replace(/\s+/g, ' '),
      input.bankReference.normalize('NFKC').toUpperCase().replace(/\s+/g, ''),
    ]);
    await withProcurementReference(db, { organizationId: center.id, actorId: owner.id, amountMinor: input.amountMinor, bankReferenceKey },
      () => assert.rejects(transfers.submit(owner.id, unit.id, input), status(409)));
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { financeEntryId: f.settlement.id } }), 0);
    assert.equal((await entry(f)).status, 'APPROVED');
  });
  await check('concurrent submission replays one pending receipt and never posts the ledger', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => transfers.submit(owner.id, unit.id, input)));
    submitted = results[0];
    assert(results.every(row => row.id === submitted.id && row.status === 'PENDING' && row.bankTransferExecuted === false && row.providerVerified === false));
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { financeEntryId: f.settlement.id } }), 1);
    assert.equal(await db.auditEvent.count({ where: { action: 'CENTER_SERVICE_EXTERNAL_TRANSFER_SUBMITTED', resourceId: submitted.id } }), 1);
    assert.equal((await entry(f)).status, 'APPROVED');
    await assert.rejects(transfers.submit(owner.id, unit.id, { ...input, requestId: randomUUID() }), status(409));
    await assert.rejects(transfers.submit(owner.id, unit.id, { ...input, bankReference: 'different' }), status(409));
  });

  await check('original transfer document is exact and visible only to its scoped financial parties', async () => {
    assert.deepEqual(await transfers.download(owner.id, unit.id, submitted.id, 'transfer'), Buffer.from(input.documentBase64, 'base64'));
    assert.deepEqual(await transfers.download(receiver.id, unit.id, submitted.id, 'transfer'), Buffer.from(input.documentBase64, 'base64'));
    await assert.rejects(transfers.download(buyer.id, unit.id, submitted.id, 'transfer'), denied);
    await assert.rejects(transfers.download(foreign.id, otherUnit.id, submitted.id, 'transfer'), status(404));
    await assert.rejects(transfers.download(receiver.id, unit.id, submitted.id, 'receipt'), status(404));
    const list = await transfers.list(receiver.id, unit.id, f.booking.id);
    assert.equal(list.items[0].canConfirm, true); assert.equal(list.canSubmit, false);
    assert.equal(JSON.stringify(list).includes(input.documentBase64), false);
  });

  const review = await confirmation(submitted.id);
  await check('requester, approver and submitter cannot confirm their own financial chain', async () => {
    for (const actor of [requester, approver, owner]) await assert.rejects(transfers.review(actor.id, unit.id, submitted.id, review), status(403));
    assert.equal((await entry(f)).status, 'APPROVED');
  });

  await check('a missing, identical or pre-transfer receipt PDF cannot confirm arrival', async () => {
    await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, { ...review, documentBase64: undefined }), status(400));
    await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, { ...review, documentBase64: input.documentBase64 }), status(409));
    await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, { ...review, receivedAt: new Date(now - 86400000).toISOString() }), status(409));
  });

  await check('changed collection, completion, refunds and invoice snapshot block confirmation without a ledger write', async () => {
    const probes = [
      [() => db.financeEntry.update({ where: { id: f.collection.id }, data: { status: 'APPROVED' } }), () => db.financeEntry.update({ where: { id: f.collection.id }, data: { status: 'POSTED' } })],
      [() => db.trip.update({ where: { id: f.trip.id }, data: { status: 'OPEN' } }), () => db.trip.update({ where: { id: f.trip.id }, data: { status: 'COMPLETED' } })],
      [() => db.payment.update({ where: { id: f.payment.id }, data: { refundedAmountMinor: 1 } }), () => db.payment.update({ where: { id: f.payment.id }, data: { refundedAmountMinor: 0 } })],
      [() => db.organizationBookingInvoiceFinalization.update({ where: { id: f.finalization.id }, data: { snapshot: { changed: true } } }),
        () => db.organizationBookingInvoiceFinalization.update({ where: { id: f.finalization.id }, data: { snapshot: f.finalization.snapshot } })],
    ];
    for (const [change, restore] of probes) {
      await change();
      try { await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, review), status(409)); }
      finally { await restore(); }
      assert.equal((await entry(f)).status, 'APPROVED');
      assert.equal((await db.centerServiceTransferReceipt.findUniqueOrThrow({ where: { id: submitted.id } })).status, 'PENDING');
    }
    const refundEntry = await db.financeEntry.create({ data: { organizationId: center.id, financeAccountId: financeAccount.id, type: 'REFUND',
      status: 'APPROVED', amountMinor: 100, currency: 'SAR', referenceType: 'PAYMENT_REFUND', referenceId: f.payment.id, requestedByAccountId: collector.id } });
    const reserved = await db.commerceRefundOperation.create({ data: { paymentId: f.payment.id, financeEntryId: refundEntry.id,
      requestAuditEventId: randomUUID(), idempotencyKey: randomUUID(), requestFingerprint: 'synthetic-reserved-refund', organizationId: center.id,
      requestedByAccountId: buyer.id, approvedByAccountId: approver.id, executedByAccountId: poster.id, amountMinor: 100, currency: 'SAR',
      baselineRefundedMinor: 0, status: 'RESERVED', providerPaymentId: f.payment.moyasarPaymentId, providerInvoiceId: f.payment.providerReference, policyDecision: {} } });
    try { await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, review), status(409)); }
    finally { await db.commerceRefundOperation.update({ where: { id: reserved.id }, data: { status: 'FAILED' } }); }
    assert.equal((await entry(f)).status, 'APPROVED');
  });

  await check('a failure after the posting update rolls back both the ledger and receipt', async () => {
    const rollbackDb = { serializable: work => db.serializable(tx => work(new Proxy(tx, { get(target, key) {
      if (key !== 'auditEvent') return target[key];
      return new Proxy(target.auditEvent, { get(model, operation) {
        if (operation !== 'create') return model[operation];
        return async args => { if (args.data.action === 'CENTER_SERVICE_EXTERNAL_TRANSFER_CONFIRMED') throw new Error('Synthetic confirmation storage failure'); return model.create(args); };
      } });
    } }))) };
    const rollbackService = new CenterServiceTransferService(rollbackDb, access, entitlements);
    await assert.rejects(rollbackService.review(receiver.id, unit.id, submitted.id, review), /Synthetic confirmation storage failure/);
    assert.equal((await entry(f)).status, 'APPROVED');
    assert.equal((await db.centerServiceTransferReceipt.findUniqueOrThrow({ where: { id: submitted.id } })).status, 'PENDING');
    assert.equal(await db.auditEvent.count({ where: { action: 'FINANCE_ENTRY_POSTED', resourceId: f.settlement.id } }), 0);
  });

  await check('independent receipt confirmation posts exactly once under concurrent replay', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => transfers.review(receiver.id, unit.id, submitted.id, review)));
    assert(results.every(row => row.status === 'CONFIRMED' && row.externalTransferConfirmed === true && row.bankTransferExecuted === false && row.providerVerified === false));
    const posted = await entry(f);
    assert.equal(posted.status, 'POSTED'); assert.equal(posted.amountMinor, 9000); assert.equal(posted.postedByAccountId, receiver.id);
    assert.equal(await db.auditEvent.count({ where: { action: 'FINANCE_ENTRY_POSTED', resourceId: posted.id } }), 1);
    assert.equal(await db.auditEvent.count({ where: { action: 'CENTER_SERVICE_EXTERNAL_TRANSFER_CONFIRMED', resourceId: submitted.id } }), 1);
    assert.deepEqual(await transfers.download(owner.id, unit.id, submitted.id, 'receipt'), Buffer.from(review.documentBase64, 'base64'));
    assert.deepEqual(await transfers.download(receiver.id, unit.id, submitted.id, 'transfer'), Buffer.from(input.documentBase64, 'base64'));
    assert.equal((await transfers.submit(owner.id, unit.id, input)).status, 'CONFIRMED');
    await assert.rejects(transfers.review(receiver.id, unit.id, submitted.id, { ...review, note: 'Different later confirmation' }), status(409));
    assert.equal(entitlementContractHash((await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).contractSnapshot), entitlementContractHash(f.accepted));
  });

  const rejectedFixture = await fixture(), rejectedInput = await submission(rejectedFixture), rejectedRow = await transfers.submit(owner.id, unit.id, rejectedInput);
  await check('allocation revocation prevents posting but still permits rejection and preserves the original', async () => {
    const decision = await entitlements.revokeTripAllocation(owner.id, center.id, rejectedFixture.booking.id,
      { allocationApprovalEventId: rejectedFixture.allocation.allocationApprovalEventId, reason: 'Synthetic allocation revoked after submission' });
    await assert.rejects(transfers.review(receiver.id, unit.id, rejectedRow.id, await confirmation(rejectedRow.id)), status(409));
    const rejection = { decision: 'REJECTED', note: 'Transfer source needs independent reconciliation' };
    assert.equal((await transfers.review(receiver.id, unit.id, rejectedRow.id, rejection)).status, 'REJECTED');
    assert.equal((await transfers.review(receiver.id, unit.id, rejectedRow.id, rejection)).status, 'REJECTED');
    assert.equal((await entry(rejectedFixture)).status, 'APPROVED');
    assert.deepEqual(await transfers.download(receiver.id, unit.id, rejectedRow.id, 'transfer'), Buffer.from(rejectedInput.documentBase64, 'base64'));
    // Restore the fixture's decision without altering the rejected transfer evidence.
    await db.auditEvent.delete({ where: { id: decision.revocationEventId } });
  });

  await check('corrected evidence for the same rejected transfer creates a new immutable attempt, not a new payment', async () => {
    const corrected = { ...rejectedInput, requestId: randomUUID(), documentBase64: (await document('corrected original bank evidence')).toString('base64') };
    const saved = await transfers.submit(owner.id, unit.id, corrected);
    assert.notEqual(saved.id, rejectedRow.id);
    assert.equal((await db.centerServiceTransferReceipt.findUniqueOrThrow({ where: { id: rejectedRow.id } })).status, 'REJECTED');
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { financeEntryId: rejectedFixture.settlement.id } }), 2);
    await transfers.review(receiver.id, unit.id, saved.id, await confirmation(saved.id));
    assert.equal((await entry(rejectedFixture)).status, 'POSTED');
  });

  const collisionFixture = await fixture();
  await check('one bank reference cannot settle a different booking and competing submissions reserve one settlement', async () => {
    const reused = await submission(collisionFixture, input.bankReference);
    await assert.rejects(transfers.submit(owner.id, unit.id, reused), status(409));
    const inputs = await Promise.all([submission(collisionFixture), submission(collisionFixture)]);
    const results = await Promise.allSettled(inputs.map(row => transfers.submit(owner.id, unit.id, row)));
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(results.filter(row => row.status === 'rejected' && row.reason.getStatus?.() === 409).length, 1);
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { financeEntryId: collisionFixture.settlement.id } }), 1);
    assert.equal((await entry(collisionFixture)).status, 'APPROVED');
  });

  await check('concurrent bookings cannot reserve the same bank reference even before either receipt is committed', async () => {
    const first = await fixture(), second = await fixture(), sharedReference = randomUUID();
    const inputs = await Promise.all([submission(first, sharedReference), submission(second, sharedReference)]);
    const results = await Promise.allSettled(inputs.map(row => transfers.submit(owner.id, unit.id, row)));
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(results.filter(row => row.status === 'rejected' && row.reason.getStatus?.() === 409).length, 1);
    assert.equal(await db.centerServiceTransferReceipt.count({ where: { bankReference: sharedReference } }), 1);
  });

  await check('real authenticated HTTP completes original invoice finalization and independent external-transfer confirmation', verifyHttpCycle);

  console.log(JSON.stringify({ suite: 'center-service-external-transfer-postgresql', passed: outcomes.length, failed: 0,
    cases: outcomes, actualMoneyTransfers: 0, externalProviderCalls: 0, productionWrites: 0 }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { global.fetch = originalFetch; await db.$disconnect(); });
