const { test } = require('node:test');
const assert = require('node:assert/strict');
const { smsSubmissionReceipt } = require('../dist/integrations/unifonic-sms-receipt.js');

const reference = 'booking-fixture-1';
const recipient = '966500000001';
const data = { MessageID: 1234, CorrelationID: reference, Recipient: recipient, Status: 'Queued' };
const parse = payload => smsSubmissionReceipt(payload, reference, recipient);

test('a valid provider receipt retains the queued state and exact provider reference', () => {
  assert.deepEqual(parse({ success: true, data }), {
    provider: 'UNIFONIC', submission: 'PROVIDER_RECEIPT', providerMessageId: '1234', status: 'Queued',
  });
  assert.equal(parse({ success: 'true', data: { MessageID: '9007199254740993' } }).providerMessageId, '9007199254740993');
});

test('a missing receipt or mismatched booking cannot acknowledge this submission', () => {
  const unconfirmed = { provider: 'UNIFONIC', submission: 'UNCONFIRMED', providerMessageId: null, status: null };
  for (const payload of [null, {}, { success: false, data }, { success: 'false', data }, { success: true },
    ...[undefined, '', {}, false, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(MessageID => ({ success: true, data: { ...data, MessageID } })),
    { success: true, data: { ...data, CorrelationID: 'another-booking' } },
    { success: true, data: { ...data, Recipient: '966500000002' } },
  ]) assert.deepEqual(parse(payload), unconfirmed);
});

test('SMS adapter sends once and leaves an incomplete provider reply unresolved', async t => {
  const { UnifonicMessagingService } = require('../dist/integrations/unifonic-messaging.service.js');
  const config = {
    HYDROLAND_SMS_PROVIDER: 'UNIFONIC', UNIFONIC_SMS_SENDER_ID: 'Fixture', UNIFONIC_SMS_APPSID: 'local-fixture',
  };
  for (const [key, value] of Object.entries(config)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const replies = [Response.json({ success: true, data }), new Response('', { status: 200 }), Response.json({ success: false })];
  const transport = t.mock.method(globalThis, 'fetch', async (_url, request) => {
    assert.equal(request.body.get('CorrelationID'), reference);
    assert.equal(request.body.get('Recipient'), recipient);
    return replies.shift();
  });
  const service = new UnifonicMessagingService({ requireOperational: channel => assert.equal(channel, 'SMS') });
  const message = { recipient, body: 'Synthetic booking notice', correlationId: reference };
  assert.equal((await service.sendSms(message)).submission, 'PROVIDER_RECEIPT');
  assert.equal((await service.sendSms(message)).submission, 'UNCONFIRMED');
  assert.equal(transport.mock.callCount(), 2);
  await assert.rejects(service.sendSms(message), /SMS provider rejected/);
  assert.equal(transport.mock.callCount(), 3);
});
