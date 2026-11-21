// Real Nest HTTP routes + real PostgreSQL + the real Moyasar HTTP adapter.
// All identities, credentials and provider responses are synthetic and loopback-only.
// Run against a fresh disposable database; this script intentionally retains its
// fixture rows until the caller destroys that database so failed cases are inspectable.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { PrismaClient } from '@prisma/client';

const base = process.env.COMMERCE_CHECKOUT_E2E_BASE_URL;
const providerBase = process.env.MOYASAR_API_BASE_URL;
const providerSecret = process.env.MOYASAR_SECRET_KEY;
const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
assert.equal(process.env.CI, 'true', 'CI=true is required');
assert.equal(process.env.NODE_ENV, 'test', 'NODE_ENV=test is required');
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.equal(process.env.HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS, 'SANDBOX');
assert.equal(process.env.HYDROLAND_PAYMENT_PROVIDER, 'MOYASAR');
assert.ok(providerSecret?.startsWith('sk_test_SYNTHETIC_'), 'Use the synthetic local provider credential');
assert.ok(webhookSecret?.startsWith('whsec_SYNTHETIC_'), 'Use the synthetic local webhook credential');
const urls = {};
for (const [name, raw] of Object.entries({ DATABASE_URL: process.env.DATABASE_URL,
  COMMERCE_CHECKOUT_E2E_BASE_URL: base, MOYASAR_API_BASE_URL: providerBase })) {
  assert.ok(raw, name + ' is required');
  const url = urls[name] = new URL(raw);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), name + ' must be loopback-only');
  if (name === 'DATABASE_URL') assert.match(url.pathname, /^\/commerce_test_[a-z0-9_]+$/);
  else assert.equal(url.protocol, 'http:', name + ' must use the local HTTP fixture');
}
assert.ok(urls.MOYASAR_API_BASE_URL.port, 'The provider fixture needs an explicit port');
assert.equal(urls.MOYASAR_API_BASE_URL.pathname, '/v1/');
assert.notEqual(urls.MOYASAR_API_BASE_URL.origin, urls.COMMERCE_CHECKOUT_E2E_BASE_URL.origin);

const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.origin, urls.COMMERCE_CHECKOUT_E2E_BASE_URL.origin, 'The test client cannot make external requests');
  return nativeFetch(input, { redirect: 'error', ...options, signal: AbortSignal.timeout(15_000) });
};
const db = new PrismaClient();
const suffix = randomUUID();
const password = randomBytes(24).toString('hex');
const salt = randomBytes(16).toString('hex');
const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
const providerInvoices = new Map();
const providerRequests = [];
const providerErrors = [];
const passed = [];
let creationStatus = 'initiated';
let providerServer;
const call = (account, path, method = 'GET', body) => fetch(base + path, {
  method, headers: { 'content-type': 'application/json', ...(account ? { authorization: 'Bearer ' + account.accessToken } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const json = async response => ({ status: response.status, body: await response.json() });
const ok = async response => {
  const result = await json(response);
  assert.ok(result.status >= 200 && result.status < 300, 'Unexpected HTTP response: ' + JSON.stringify(result));
  return result.body;
};
const reject = async (response, status, code) => {
  const result = await json(response);
  assert.equal(result.status, status, JSON.stringify(result));
  if (code) assert.equal(result.body.code, code, JSON.stringify(result));
  return result.body;
};
const check = async (name, work) => {
  await work();
  assert.deepEqual(providerErrors, [], 'The synthetic provider rejected a request');
  passed.push(name);
  console.log('PASS ' + passed.length + ': ' + name);
};
const creates = () => providerRequests.filter(row => row.method === 'POST' && row.path === '/v1/invoices').length;
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const accept = quote => ({ version: quote.policyVersion, quoteHash: quote.quoteHash });
const paid = payment => {
  const invoice = providerInvoices.get(payment.providerReference);
  assert.ok(invoice, 'The payment must be bound to this synthetic provider');
  invoice.status = 'paid';
  invoice.payments = [{ id: invoice.syntheticPaymentId, status: 'paid', amount: invoice.amount, currency: invoice.currency }];
  return invoice;
};
const webhook = (invoice, eventId, extra = {}) => call(null, '/payments/provider/moyasar/webhook', 'POST', {
  id: eventId, type: 'payment_paid', secret_token: webhookSecret, live: false,
  // Deliberately wrong notification amounts must not override the authenticated provider GET.
  data: { invoice_id: invoice.id, amount: 1, currency: 'USD' }, ...extra,
});
const createAccount = async label => {
  const person = await db.person.create({ data: { firstName: label, lastName: 'SyntheticCheckout' } });
  const account = await db.account.create({ data: { personId: person.id, email: `${label}-${suffix}@example.invalid`,
    passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date() } });
  const session = await ok(await call(null, '/auth/login', 'POST', { email: account.email, password }));
  assert.ok(session.accessToken, 'Actual login must issue the test session');
  return { ...account, accessToken: session.accessToken };
};

let customer, foreign, operator, issuer, buyerOrganization;
let trip, booking, quote, payment, invoiceSnapshot, acceptedSnapshot, confirmationPreview;
const createTrip = async (label, pricePerSeatMinor = 12_345, startsInHours = 120) => {
  const startsAt = new Date(Date.now() + startsInHours * 3_600_000);
  const row = await db.trip.create({ data: { organizationId: issuer.id, title: `Synthetic checkout ${label} ${suffix}`,
    type: 'SHORE_DIVE', capacity: 12, status: 'OPEN', startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000) } });
  await db.operationalSetting.create({ data: { key: 'trip-price:' + row.id, value: { pricePerSeatMinor, currency: 'SAR' } } });
  return row;
};
const book = async (row, seats = 1) => ok(await call(customer, `/trips/${row.id}/bookings`, 'POST', {
  seats, amountMinor: 1, accountId: foreign.id,
  contractSnapshot: { kind: 'TRIP', amountMinor: 1, termsAcceptanceStatus: 'ACCEPTED' },
}));
const currentBooking = row => db.booking.findUniqueOrThrow({ where: { id: row.id } });
const currentPayment = row => db.payment.findUniqueOrThrow({ where: { id: row.id } });
const checkout = async (row, q, fields = {}) => ok(await call(customer, '/payments', 'POST', {
  bookingId: row.id, idempotencyKey: 'checkout-' + randomUUID(), policyAcceptance: accept(q), ...fields,
}));
const quoteFor = row => call(customer, `/payments/bookings/${row.id}/quote`).then(ok);
const centerPreview = row => call(operator, `/center/me/bookings/${row.id}`).then(ok);
const confirm = (row, preview) => call(operator, `/center/me/bookings/${row.id}/actions`, 'POST', {
  action: 'CONFIRM', requestId: randomUUID(), expectedState: preview.stateToken,
  reason: 'Synthetic acceptance confirms the reviewed captured booking',
  financialAcknowledged: true, policyReviewAcknowledged: true,
});

try {
  providerServer = createServer(async (request, response) => {
    const send = (status, body) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(body)); };
    try {
      const path = new URL(request.url, providerBase).pathname;
      providerRequests.push({ method: request.method, path });
      assert.equal(request.headers.authorization, 'Basic ' + Buffer.from(providerSecret + ':').toString('base64'));
      if (request.method === 'POST' && path === '/v1/invoices') {
        let raw = '';
        for await (const chunk of request) { raw += chunk; assert.ok(raw.length < 100_000); }
        const input = JSON.parse(raw);
        assert.ok(Number.isSafeInteger(input.amount) && input.amount >= 100);
        assert.equal(input.currency, 'SAR');
        assert.ok(input.metadata.hydroland_payment_id && input.metadata.hydroland_booking_id);
        const id = randomUUID(), syntheticPaymentId = randomUUID();
        const invoice = { id, status: creationStatus, amount: input.amount, currency: input.currency,
          url: `https://checkout.example.invalid/invoices/${id}`, metadata: input.metadata, syntheticPaymentId,
          payments: creationStatus === 'paid' ? [{ id: syntheticPaymentId, status: 'paid', amount: input.amount, currency: input.currency }] : [] };
        providerInvoices.set(id, invoice);
        send(201, invoice);
      } else if (request.method === 'GET' && /^\/v1\/invoices\/[0-9a-f-]+$/.test(path)) {
        const invoice = providerInvoices.get(path.split('/').at(-1));
        assert.ok(invoice, 'Unknown provider invoice');
        send(200, invoice);
      } else {
        throw new Error('Unexpected provider operation: ' + request.method + ' ' + path);
      }
    } catch (error) { providerErrors.push(error.message); send(500, { message: 'Synthetic provider assertion failed' }); }
  });
  await new Promise((resolve, reject) => { providerServer.once('error', reject); providerServer.listen(Number(urls.MOYASAR_API_BASE_URL.port), '127.0.0.1', resolve); });
  customer = await createAccount('customer');
  foreign = await createAccount('foreign');
  operator = await createAccount('operator');
  for (const role of ['ADMIN', 'DIVE_CENTER']) await db.roleAssignment.create({ data: { accountId: operator.id, role, status: 'ACTIVE' } });
  issuer = await db.organization.create({ data: { kind: 'DIVE_CENTER', status: 'ACTIVE', ownerId: operator.id,
    displayName: 'Synthetic supplying center', legalName: 'Synthetic original legal issuer', registrationNumber: 'SYNTHETIC-NOT-A-REAL-REGISTRATION', address: 'Synthetic original issuer address' } });
  await db.organizationMember.create({ data: { organizationId: issuer.id, accountId: operator.id, role: 'OWNER', status: 'ACTIVE' } });
  buyerOrganization = await db.organization.create({ data: { kind: 'COMPANY', status: 'ACTIVE', ownerId: customer.id, displayName: 'Synthetic purchasing organization' } });
  await db.organizationMember.create({ data: { organizationId: buyerOrganization.id, accountId: customer.id, role: 'OWNER', status: 'ACTIVE' } });
  for (const [category, ruleKey, state] of [
    ['BOOKING', 'SAFETY_APPROVAL', 'DISABLED'], ['WEATHER', 'WEATHER_GATE', 'DISABLED'],
    ['BOOKING', 'CAPACITY_LIMIT', 'ENABLED'], ['BOOKING', 'PARTICIPANT_ELIGIBILITY', 'ENABLED'],
    ['PAYMENT', 'PAYMENT_REQUIRED', 'ENABLED'], ['PAYMENT', 'REFUND_REVIEW', 'ENABLED'],
  ]) await db.policyControl.upsert({ where: { category_ruleKey: { category, ruleKey } },
    create: { category, ruleKey, state, labelAr: 'Synthetic isolated checkout prerequisite' }, update: { state } });

  await check('actual booking HTTP freezes original price, schedule, issuer and source before checkout', async () => {
    trip = await createTrip('original');
    booking = await book(trip, 2);
    assert.equal(booking.accountId, customer.id);
    assert.equal(booking.organizationId, null);
    assert.equal(booking.status, 'PENDING');
    const saved = await currentBooking(booking);
    assert.deepEqual(saved.contractSnapshot, booking.contractSnapshot);
    const contract = saved.contractSnapshot;
    assert.equal(contract.source.kind, 'TRIP_BOOKING');
    assert.equal(contract.source.id, booking.id);
    assert.equal(contract.source.offeringId, trip.id);
    assert.equal(contract.customerAccountId, customer.id);
    assert.equal(contract.buyerOrganizationId, null);
    assert.equal(contract.amountMinor, 24_690);
    assert.equal(contract.unitPriceMinor, 12_345);
    assert.equal(contract.quantity, 2);
    assert.deepEqual(contract.originalSchedule, { startsAt: trip.startsAt.toISOString(), endsAt: trip.endsAt.toISOString() });
    assert.equal(contract.recordedAt, saved.createdAt.toISOString());
    assert.equal(contract.issuer.organizationId, issuer.id);
    assert.equal(contract.issuer.legalName, issuer.legalName);
    assert.equal(contract.issuer.taxRegistrationNumber, null);
    assert.equal(contract.issuer.invoiceReadiness, 'REVIEW_REQUIRED');
    assert.equal(contract.refundPolicy.snapshot.lineId, booking.id);
    assert.equal(contract.refundPolicy.snapshot.grossAmountMinor, 24_690);
    assert.equal(contract.refundPolicy.snapshot.contractedScheduledAt, trip.startsAt.toISOString());
    assert.equal(contract.termsAcceptanceStatus, 'NOT_RECORDED');
    assert.equal(contract.financialActionExecuted, false);
    assert.equal(await db.payment.count({ where: { bookingId: booking.id } }), 0);
    assert.equal(providerRequests.length, 0);
  });

  await check('quote enforces personal ownership and separates the organization buyer from the supplying center', async () => {
    await reject(await call(null, `/payments/bookings/${booking.id}/quote`), 401);
    await reject(await call(foreign, `/payments/bookings/${booking.id}/quote`), 404);
    quote = await quoteFor(booking);
    assert.deepEqual(quote.snapshot, booking.contractSnapshot);
    assert.equal(quote.quoteHash, sha256(quote.snapshot));
    assert.equal(quote.policyVersion, quote.snapshot.version);
    const organizationBooking = await ok(await call(customer, `/organizations/${buyerOrganization.id}/bookings`, 'POST', {
      tripId: trip.id, seats: 1, requestKey: 'org-' + randomUUID(), participantNames: ['Synthetic organization participant'],
    }));
    assert.equal(organizationBooking.contractSnapshot.buyerOrganizationId, buyerOrganization.id);
    assert.equal(organizationBooking.contractSnapshot.issuer.organizationId, issuer.id);
    await reject(await call(customer, `/payments/bookings/${organizationBooking.id}/quote`), 404);
    await reject(await call(customer, '/payments', 'POST', { bookingId: organizationBooking.id, idempotencyKey: randomUUID(), policyAcceptance: accept(quote) }), 404);
    assert.equal(await db.payment.count({ where: { bookingId: organizationBooking.id } }), 0);
    assert.equal(providerRequests.length, 0);
  });

  await check('catalog price, departure and issuer edits cannot change an already recorded quote', async () => {
    const rescheduled = new Date(Date.now() + 6 * 3_600_000);
    await db.trip.update({ where: { id: trip.id }, data: { title: 'Synthetic changed catalog title', startsAt: rescheduled, endsAt: new Date(rescheduled.getTime() + 3_600_000) } });
    await db.operationalSetting.update({ where: { key: 'trip-price:' + trip.id }, data: { value: { pricePerSeatMinor: 20_000, currency: 'SAR' } } });
    await db.organization.update({ where: { id: issuer.id }, data: { legalName: 'Synthetic later legal name', address: 'Synthetic later address' } });
    assert.deepEqual(await quoteFor(booking), quote);
    assert.deepEqual((await currentBooking(booking)).contractSnapshot, booking.contractSnapshot);
    assert.equal(providerRequests.length, 0);
  });

  await check('missing, malformed and mismatched consent fails before payment persistence or provider calls', async () => {
    for (const policyAcceptance of [undefined, null, {}, [], 'accepted',
      { version: 'outdated', quoteHash: quote.quoteHash }, { version: quote.policyVersion, quoteHash: '0'.repeat(64) }]) {
      const code = policyAcceptance == null ? 'PAYMENT_TERMS_ACCEPTANCE_REQUIRED' : 'PAYMENT_TERMS_CHANGED';
      await reject(await call(customer, '/payments', 'POST', { bookingId: booking.id, idempotencyKey: randomUUID(), policyAcceptance }), 409, code);
    }
    assert.equal(await db.payment.count({ where: { bookingId: booking.id } }), 0);
    assert.equal(providerRequests.length, 0);
  });

  await check('accepted checkout ignores client price, account and snapshot injection and replays one bound invoice', async () => {
    const idempotencyKey = 'accepted-' + randomUUID();
    payment = await checkout(booking, quote, { idempotencyKey, amountMinor: 1, currency: 'USD', accountId: foreign.id,
      contractSnapshot: { amountMinor: 1, issuer: { organizationId: buyerOrganization.id } }, termsAcceptedAt: '1900-01-01T00:00:00Z' });
    assert.equal(payment.amountMinor, 24_690);
    assert.equal(payment.currency, 'SAR');
    assert.equal(payment.accountId, customer.id);
    assert.equal(payment.status, 'PENDING');
    assert.equal(creates(), 1);
    const persisted = await currentPayment(payment);
    acceptedSnapshot = persisted.contractSnapshot;
    const { termsAcceptanceStatus, termsAcceptedAt, acceptedQuoteHash, ...original } = acceptedSnapshot;
    assert.equal(termsAcceptanceStatus, 'ACCEPTED');
    assert.equal(acceptedQuoteHash, quote.quoteHash);
    assert.ok(Date.parse(termsAcceptedAt) >= Date.parse(booking.createdAt));
    const { termsAcceptanceStatus: previousStatus, ...originalQuote } = quote.snapshot;
    assert.equal(previousStatus, 'NOT_RECORDED');
    assert.deepEqual(original, originalQuote);
    const providerInvoice = providerInvoices.get(payment.providerReference);
    assert.deepEqual(providerInvoice.metadata, { hydroland_payment_id: payment.id, hydroland_booking_id: booking.id });
    const replay = await ok(await call(customer, '/payments', 'POST', { bookingId: booking.id, idempotencyKey, amountMinor: 1 }));
    assert.equal(replay.id, payment.id);
    assert.equal(creates(), 1);
    assert.deepEqual((await currentPayment(payment)).contractSnapshot, acceptedSnapshot);
    await reject(await call(foreign, '/payments', 'POST', { bookingId: booking.id, idempotencyKey, policyAcceptance: accept(quote) }), 404);
    assert.equal((await currentBooking(booking)).status, 'PENDING');
    assert.equal(await db.invoice.count({ where: { paymentId: payment.id } }), 0);
  });

  await check('webhook capture requires provider GET and creates one immutable DRAFT invoice without confirming service', async () => {
    const invoice = providerInvoices.get(payment.providerReference);
    const beforeInvalid = providerRequests.length;
    await reject(await webhook(invoice, 'bad-' + suffix, { secret_token: 'incorrect' }), 401);
    assert.equal(providerRequests.length, beforeInvalid);
    assert.equal((await ok(await webhook(invoice, 'pending-' + suffix))).status, 'PENDING');
    assert.equal(await db.invoice.count({ where: { paymentId: payment.id } }), 0);
    paid(payment);
    const eventId = 'paid-' + suffix;
    assert.equal((await ok(await webhook(invoice, eventId))).status, 'CAPTURED');
    const captured = await currentPayment(payment);
    assert.equal(captured.moyasarPaymentId, invoice.syntheticPaymentId);
    assert.equal(captured.refundedAmountMinor, 0);
    invoiceSnapshot = await db.invoice.findUniqueOrThrow({ where: { paymentId: payment.id } });
    assert.equal(invoiceSnapshot.status, 'DRAFT');
    assert.equal(invoiceSnapshot.issuedAt, null);
    assert.deepEqual(invoiceSnapshot.contractSnapshot, acceptedSnapshot);
    assert.equal(invoiceSnapshot.contractSnapshot.issuer.invoiceReadiness, 'REVIEW_REQUIRED');
    assert.equal((await ok(await webhook(invoice, eventId))).duplicate, true);
    assert.equal(await db.invoice.count({ where: { paymentId: payment.id } }), 1);
    assert.equal((await currentBooking(booking)).status, 'PENDING');
    assert.equal(await db.auditEvent.count({ where: { resourceId: booking.id, action: 'BOOKING_CONFIRMED' } }), 0);
    assert.equal(await db.notification.count({ where: { type: 'BOOKING_CONFIRMED', payload: { path: ['bookingId'], equals: booking.id } } }), 0);
  });

  await check('refresh and customer history expose the original invoice after catalog edits without rewriting it', async () => {
    await db.organization.update({ where: { id: issuer.id }, data: { displayName: 'Synthetic catalog name after capture' } });
    await db.operationalSetting.update({ where: { key: 'trip-price:' + trip.id }, data: { value: { pricePerSeatMinor: 99_999, currency: 'SAR' } } });
    assert.equal((await ok(await call(customer, `/payments/${payment.id}/refresh`, 'POST'))).status, 'CAPTURED');
    const mine = await ok(await call(customer, '/payments/mine'));
    const shown = mine.find(row => row.id === payment.id);
    assert.deepEqual(shown.contractSnapshot, acceptedSnapshot);
    assert.deepEqual(shown.invoice.contractSnapshot, acceptedSnapshot);
    assert.equal(shown.invoice.status, 'DRAFT');
    assert.deepEqual(await db.invoice.findUniqueOrThrow({ where: { paymentId: payment.id } }), invoiceSnapshot);
    assert.deepEqual(await quoteFor(booking), quote);
    assert.equal((await ok(await call(foreign, '/payments/mine'))).some(row => row.id === payment.id), false);
  });

  await check('refund review uses original five-day departure and collection, with no provider refund or financial execution', async () => {
    const before = await currentPayment(payment), calls = providerRequests.length;
    const result = await ok(await call(customer, `/payments/${payment.id}/refund-request`, 'POST', {
      reason: 'Synthetic customer requests review against the original departure', amountMinor: 24_690, currency: 'SAR',
    }));
    assert.equal(result.financialActionExecuted, false);
    assert.equal(result.policyDecision.status, 'ELIGIBLE');
    assert.equal(result.policyDecision.reasonCode, 'TRIP_AT_LEAST_48_HOURS');
    assert.equal(result.policyDecision.lineId, booking.id);
    assert.equal(result.policyDecision.policyVersion, quote.policyVersion);
    assert.equal(result.policyDecision.refundAmountMinor, 24_690);
    assert.equal(result.policyDecision.refundBasisPoints, 10_000);
    assert.equal(result.policyDecision.serviceCompletionImplied, false);
    const audit = await db.auditEvent.findUniqueOrThrow({ where: { id: result.auditEventId } });
    assert.deepEqual(audit.metadata.policyDecision, result.policyDecision);
    assert.equal(audit.metadata.financialActionExecuted, false);
    assert.deepEqual(await currentPayment(payment), before);
    assert.equal(providerRequests.length, calls);
    assert.equal(await db.commerceRefundOperation.count({ where: { paymentId: payment.id } }), 0);
    await reject(await call(foreign, `/payments/${payment.id}/refund-request`, 'POST', { reason: 'Synthetic unauthorized refund review' }), 404);
  });

  await check('fully refunded provider state invalidates the reviewed confirmation and blocks admin and center routes', async () => {
    await db.bookingParticipant.updateMany({ where: { bookingId: booking.id }, data: { eligibilityStatus: 'ELIGIBLE' } });
    confirmationPreview = await centerPreview(booking);
    assert.equal(confirmationPreview.requiredAmountMinor, 24_690);
    assert.equal(confirmationPreview.paymentContractReview.source, 'SNAPSHOT');
    assert.equal(confirmationPreview.paymentSatisfied, true);
    assert.ok(confirmationPreview.actions.includes('CONFIRM'));
    const originalBooking = await currentBooking(booking);
    const providerInvoice = providerInvoices.get(payment.providerReference);
    providerInvoice.status = 'refunded'; providerInvoice.payments = [];
    assert.equal((await ok(await call(customer, `/payments/${payment.id}/refresh`, 'POST'))).status, 'REFUNDED');
    assert.equal((await currentPayment(payment)).refundedAmountMinor, 0, 'A provider invoice status does not attribute a refund amount');
    paid(payment);
    assert.equal((await ok(await call(customer, `/payments/${payment.id}/refresh`, 'POST'))).status, 'REFUNDED',
      'A later stale paid GET must not revive a provider-observed refund');
    assert.equal((await ok(await webhook(providerInvoice, 'stale-paid-after-refund-' + suffix))).status, 'REFUNDED',
      'A later paid webhook must retain the terminal refund state');
    await reject(await confirm(booking, confirmationPreview), 409);
    const after = await centerPreview(booking);
    assert.notEqual(after.stateToken, confirmationPreview.stateToken);
    assert.equal(after.paymentSatisfied, false);
    assert.ok(after.blockers.includes('PAYMENT_REQUIRED'));
    assert.ok(!after.actions.includes('CONFIRM'));
    await reject(await confirm(booking, after), 409);
    await reject(await call(operator, `/trips/admin/${trip.id}/bookings/${booking.id}/confirm`, 'PATCH'), 409);
    assert.deepEqual(await currentBooking(booking), originalBooking);
    assert.equal(await db.auditEvent.count({ where: { resourceId: booking.id, action: 'BOOKING_CONFIRMED' } }), 0);
    assert.equal(await db.notification.count({ where: { type: 'BOOKING_CONFIRMED', payload: { path: ['bookingId'], equals: booking.id } } }), 0);
    assert.deepEqual(await db.invoice.findUniqueOrThrow({ where: { paymentId: payment.id } }), invoiceSnapshot);
  });

  await check('immediately paid provider creation records a DRAFT invoice before returning checkout', async () => {
    const row = await createTrip('immediate-paid', 7_500);
    const booked = await book(row), quoted = await quoteFor(booked);
    creationStatus = 'paid';
    const created = await checkout(booked, quoted);
    creationStatus = 'initiated';
    assert.equal(created.status, 'CAPTURED');
    const persisted = await currentPayment(created);
    assert.ok(persisted.moyasarPaymentId);
    assert.equal(created.moyasarPaymentId, persisted.moyasarPaymentId, 'The response must include the freshly stored provider payment reference');
    const draft = await db.invoice.findUnique({ where: { paymentId: created.id } });
    assert.ok(draft, 'Immediate CAPTURED checkout must not require a later webhook to record its invoice');
    assert.equal(draft.status, 'DRAFT');
    assert.deepEqual(draft.contractSnapshot, persisted.contractSnapshot);
    assert.equal((await currentBooking(booked)).status, 'PENDING');
    // Simulate an already recorded partial refund from the independent financial
    // execution suite. This fixture mutation is not represented as a provider POST.
    await db.bookingParticipant.updateMany({ where: { bookingId: booked.id }, data: { eligibilityStatus: 'ELIGIBLE' } });
    const before = await centerPreview(booked);
    assert.equal(before.paymentSatisfied, true);
    await db.payment.update({ where: { id: created.id }, data: { refundedAmountMinor: 1_000 } });
    await reject(await confirm(booked, before), 409);
    const after = await centerPreview(booked);
    assert.equal(after.paymentSatisfied, false);
    assert.equal(after.requiredAmountMinor, 7_500);
    await reject(await call(operator, `/trips/admin/${row.id}/bookings/${booked.id}/confirm`, 'PATCH'), 409);
    assert.equal((await currentBooking(booked)).status, 'PENDING');
  });

  await check('authenticated refresh captures the frozen amount and permits explicit operator confirmation', async () => {
    const row = await createTrip('refresh-paid', 6_000), booked = await book(row), quoted = await quoteFor(booked);
    const created = await checkout(booked, quoted);
    paid(created);
    assert.equal((await ok(await call(customer, `/payments/${created.id}/refresh`, 'POST'))).status, 'CAPTURED');
    assert.equal((await currentBooking(booked)).status, 'PENDING');
    const draft = await db.invoice.findUniqueOrThrow({ where: { paymentId: created.id } });
    assert.deepEqual(draft.contractSnapshot, (await currentPayment(created)).contractSnapshot);
    await db.operationalSetting.update({ where: { key: 'trip-price:' + row.id }, data: { value: { pricePerSeatMinor: 100_000, currency: 'SAR' } } });
    await db.bookingParticipant.updateMany({ where: { bookingId: booked.id }, data: { eligibilityStatus: 'ELIGIBLE' } });
    const preview = await centerPreview(booked);
    assert.equal(preview.requiredAmountMinor, 6_000);
    assert.equal(preview.paymentSatisfied, true);
    assert.ok(preview.actions.includes('CONFIRM'));
    const confirmed = await ok(await confirm(booked, preview));
    assert.equal(confirmed.status, 'CONFIRMED');
    assert.equal(confirmed.financialActionExecuted, false);
    assert.equal((await currentBooking(booked)).status, 'CONFIRMED');
    assert.equal(await db.auditEvent.count({ where: { resourceId: booked.id, action: 'BOOKING_CONFIRMED' } }), 1);
    assert.equal(await db.notification.count({ where: { type: 'BOOKING_CONFIRMED', payload: { path: ['bookingId'], equals: booked.id } } }), 1);
  });

  await check('legacy null snapshots remain null and require review without inventing retrospective refund fees', async () => {
    const row = await createTrip('legacy', 8_000, 12);
    const legacy = await db.booking.create({ data: { tripId: row.id, accountId: customer.id, seats: 1, status: 'PENDING' } });
    const previous = await db.payment.create({ data: { bookingId: legacy.id, accountId: customer.id, amountMinor: 8_000,
      currency: 'SAR', status: 'CAPTURED', idempotencyKey: 'legacy-' + randomUUID() } });
    const calls = providerRequests.length;
    await reject(await call(customer, `/payments/bookings/${legacy.id}/quote`), 409);
    const result = await ok(await call(customer, `/payments/${previous.id}/refund-request`, 'POST', {
      reason: 'Synthetic historical booking requires original contract review',
    }));
    assert.equal(result.policyDecision.status, 'REVIEW_REQUIRED');
    assert.equal(result.policyDecision.reasonCode, 'ORIGINAL_CONTRACT_SNAPSHOT_REQUIRED');
    assert.equal(result.policyDecision.refundAmountMinor, null);
    assert.equal(result.financialActionExecuted, false);
    assert.equal((await currentBooking(legacy)).contractSnapshot, null);
    assert.deepEqual(await currentPayment(previous), previous);
    assert.equal(await db.invoice.count({ where: { paymentId: previous.id } }), 0);
    assert.equal(providerRequests.length, calls);
  });

  await check('unpriced or cross-bound original snapshots cannot acquire today\'s terms through checkout', async () => {
    const unpricedTrip = await createTrip('unpriced', 9_000);
    await db.operationalSetting.delete({ where: { key: 'trip-price:' + unpricedTrip.id } });
    const unpriced = await book(unpricedTrip);
    assert.equal(unpriced.contractSnapshot.amountMinor, null);
    await db.operationalSetting.create({ data: { key: 'trip-price:' + unpricedTrip.id, value: { pricePerSeatMinor: 9_000, currency: 'SAR' } } });
    const calls = providerRequests.length;
    await reject(await call(customer, `/payments/bookings/${unpriced.id}/quote`), 409);
    await reject(await call(customer, '/payments', 'POST', { bookingId: unpriced.id, idempotencyKey: randomUUID(), policyAcceptance: accept(quote) }), 409);
    assert.equal(await db.payment.count({ where: { bookingId: unpriced.id } }), 0);
    await db.operationalSetting.update({ where: { key: 'trip-price:' + unpricedTrip.id }, data: { value: { pricePerSeatMinor: 0, currency: 'SAR' } } });
    await reject(await call(customer, '/payments', 'POST', { bookingId: unpriced.id, idempotencyKey: randomUUID(), policyAcceptance: accept(quote) }), 409);
    assert.equal(await db.payment.count({ where: { bookingId: unpriced.id } }), 0, 'A later zero price must not bypass review of an unpriced original contract');
    const mismatched = await db.booking.create({ data: { tripId: unpricedTrip.id, accountId: foreign.id, seats: 2,
      status: 'PENDING', contractSnapshot: booking.contractSnapshot } });
    await reject(await call(foreign, `/payments/bookings/${mismatched.id}/quote`), 409);
    await reject(await call(foreign, '/payments', 'POST', { bookingId: mismatched.id, idempotencyKey: randomUUID(), policyAcceptance: accept(quote) }), 409);
    assert.equal(await db.payment.count({ where: { bookingId: mismatched.id } }), 0);
    await db.booking.update({ where: { id: mismatched.id }, data: { contractSnapshot: [] } });
    await reject(await call(foreign, `/payments/bookings/${mismatched.id}/quote`), 409);
    await reject(await call(foreign, '/payments', 'POST', { bookingId: mismatched.id, idempotencyKey: randomUUID() }), 409);
    assert.equal(await db.payment.count({ where: { bookingId: mismatched.id } }), 0, 'Malformed present terms must not fall through to a free-trip bypass');
    const freeTrip = await createTrip('originally-free', 0), freeBooking = await book(freeTrip);
    const freePayment = await ok(await call(customer, '/payments', 'POST', { bookingId: freeBooking.id, idempotencyKey: randomUUID() }));
    assert.equal(freePayment.provider, 'FREE_TRIP');
    assert.equal(freePayment.status, 'BYPASSED');
    assert.equal(await db.payment.count({ where: { bookingId: freeBooking.id } }), 0);
    assert.equal(providerRequests.length, calls);
  });

  assert.equal(creates(), 3);
  assert.equal(providerRequests.some(row => row.path.endsWith('/refund')), false);
  console.log(JSON.stringify({ suite: 'commerce-checkout-http-e2e', passed: passed.length,
    syntheticProviderInvoiceCreates: creates(), syntheticProviderReads: providerRequests.length - creates(),
    actualMoneyMovedMinor: 0, externalProviderCalls: 0, productionWrites: 0,
    invoiceStatus: 'DRAFT; fiscal evidence remains unverified', scenarios: passed }, null, 2));
} finally {
  if (providerServer) {
    await new Promise((resolve, reject) => { providerServer.close(error => error ? reject(error) : resolve()); providerServer.closeAllConnections(); });
  }
  await db.$disconnect();
  globalThis.fetch = nativeFetch;
}
