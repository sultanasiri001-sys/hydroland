const {test} = require('node:test');
const assert = require('node:assert/strict');
const {UnifonicMessagingService} = require('../dist/integrations/unifonic-messaging.service.js');
const {approvedWhatsAppTemplates} = require('../dist/integrations/whatsapp-template-policy.js');

test('only configured WhatsApp template and language pairs reach transport', async t => {
  const config = {
    HYDROLAND_WHATSAPP_PROVIDER: 'UNIFONIC',
    UNIFONIC_WHATSAPP_PUBLIC_ID: 'fixture',
    UNIFONIC_WHATSAPP_SECRET: 'fixture',
    HYDROLAND_WHATSAPP_APPROVED_TEMPLATES: '',
  };
  for (const [key, value] of Object.entries(config)) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  const {IntegrationReadinessController} = require('../dist/health/integration-readiness.controller.js');
  const readiness = new IntegrationReadinessController({status: () => ({status:'SANDBOX'})});
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (_url, request) => {
    calls.push(JSON.parse(request.body));
    return Response.json({messageId:'receipt-fixture'});
  });
  const service = new UnifonicMessagingService({requireOperational: channel => assert.equal(channel, 'WHATSAPP')});
  const send = (templateName, languageCode) => service.sendWhatsAppTemplate({
    recipient: '+966500000001', templateName, languageCode, parameters: ['fixture'],
  });
  for (const value of ['', '*', 'booking:ar,invalid']) {
    process.env.HYDROLAND_WHATSAPP_APPROVED_TEMPLATES = value;
    assert.equal(approvedWhatsAppTemplates().size, 0);
    assert.equal(readiness.getWhatsAppReadiness().sandboxReady, false);
    await assert.rejects(send('booking', 'ar'), /not approved/);
  }
  process.env.HYDROLAND_WHATSAPP_APPROVED_TEMPLATES = 'booking:ar, invoice:en_US';
  assert.equal(readiness.getWhatsAppReadiness().sandboxReady, true);
  await assert.rejects(send('invoice', 'ar'), /not approved/);
  await assert.rejects(send('booking', 'en_US'), /not approved/);
  assert.equal(calls.length, 0);
  await send('invoice', 'en_US');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].content.name, 'invoice');
  assert.equal(calls[0].content.language.code, 'en_US');
});
