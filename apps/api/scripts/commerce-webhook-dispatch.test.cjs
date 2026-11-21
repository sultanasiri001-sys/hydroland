const {test} = require('node:test');
const assert = require('node:assert/strict');
const {PaymentsService} = require('../dist/payments/payments.service');
const {MoyasarPaymentProviderService} = require('../dist/payments/moyasar-payment-provider.service');

process.env.MOYASAR_WEBHOOK_SECRET = 'synthetic-commerce-dispatch-test';
const event = () => ({id: 'commerce-event', type: 'payment_paid', live: false,
  secret_token: process.env.MOYASAR_WEBHOOK_SECRET, data: {invoice_id: '11111111-1111-4111-8111-111111111111'}});

function fixture(sourceIndex = 0, fail = false) {
  const observations = [], audit = [], reads = [];
  const db = {auditEvent: {
    findFirst: async ({where}) => {reads.push('audit'); return audit.find(row => row.resourceId === where.resourceId) ?? null;},
    create: async ({data}) => {audit.push(data); return data;},
  }, payment: {findUnique: async () => {reads.push('payment'); return null;}},
  $queryRaw: async () => [], serializable: async callback => callback(db)};
  const handlers = [0, 1, 2].map(index => ({handleVerifiedProviderEvent: async verified => {
    observations.push({index, verified});
    if (index !== sourceIndex) return {handled: false};
    if (fail) throw new Error('Provider read was unavailable');
    return {handled: true, status: 'CAPTURED'};
  }}));
  const provider = new MoyasarPaymentProviderService({requireOperational: () => ({status: 'SANDBOX'})});
  const service = new PaymentsService(db, {}, {}, {}, provider, {}, ...handlers);
  return {service, observations, audit, reads};
}

test('unverified commerce events cannot read state or invoke a source handler', async () => {
  for (const invalid of [{...event(), secret_token: 'incorrect'}, {...event(), live: true}]) {
    const f = fixture();
    await assert.rejects(f.service.handleMoyasarWebhook(invalid), error => error.getStatus() === 401);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.observations, []); assert.deepEqual(f.audit, []);
  }
});

for (const [index, sourceType] of ['EQUIPMENT_RENTAL', 'STORE_ORDER', 'TRAINING_ENROLLMENT'].entries()) {
  test(`${sourceType} uses the verified source handler and durably ignores a repeated event`, async () => {
    const f = fixture(index), payload = event();
    payload.data.amount = 1; // Notification amounts are not collection evidence.
    const result = await f.service.handleMoyasarWebhook(payload);
    assert.equal(result.sourceType, sourceType); assert.equal(result.matched, true);
    assert.equal(f.observations.length, index + 1);
    assert.equal(f.observations.at(-1).verified.secret_token, '[verified]');
    assert.equal(f.audit.length, 1); assert.equal(f.audit[0].metadata.sourceType, sourceType);
    assert.equal(f.audit[0].metadata.providerVerified, true);
    assert.deepEqual(await f.service.handleMoyasarWebhook(payload), {accepted: true, duplicate: true});
    assert.equal(f.observations.length, index + 1); assert.equal(f.audit.length, 1);
  });
}

test('a failed provider observation leaves the webhook retryable without a success receipt', async () => {
  const f = fixture(1, true);
  await assert.rejects(f.service.handleMoyasarWebhook(event()), /Provider read was unavailable/);
  assert.deepEqual(f.audit, []);
});

test('an unknown invoice remains unmatched and creates no collection claim', async () => {
  const f = fixture(-1), result = await f.service.handleMoyasarWebhook(event());
  assert.deepEqual(result, {accepted: true, matched: false});
  assert.equal(f.audit[0].action, 'PAYMENT_PROVIDER_WEBHOOK_UNMATCHED');
  assert.equal(f.audit[0].metadata.providerVerified, undefined);
});
