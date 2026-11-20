const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {AuditService} = require('../dist/audit/audit.service');
const {IntegrationService} = require('../dist/integrations/integration.service');
const {CredentialObjectStorageService} = require('../dist/credentials/credential-object-storage.service');
const {StormglassWeatherService} = require('../dist/trips/stormglass-weather.service');
const {EmailDeliveryService} = require('../dist/integrations/email-delivery.service');
const {MoyasarPaymentProviderService} = require('../dist/payments/moyasar-payment-provider.service');
const {AgentModelProviderService} = require('../dist/agents/agent-model-provider.service');

// Called only with the fresh loopback test schema. No request is forwarded to the network.
exports.runProviderDrill = async function (db) {
  const audit = new AuditService(db), integration = new IntegrationService(audit);
  const invoiceId = randomUUID(), date = new Date();
  const ids = ['OBJECT_STORAGE','WEATHER_MARINE','EMAIL','PAYMENT_PSP','AI_MODEL'];
  const settings = {
    NODE_ENV:'test', HYDROLAND_PUBLIC_WEB_ORIGIN:'http://127.0.0.1',
    HYDROLAND_OBJECT_STORAGE_ENDPOINT:'http://127.0.0.1', HYDROLAND_OBJECT_STORAGE_BUCKET:'fixture',
    HYDROLAND_OBJECT_STORAGE_ACCESS_KEY_ID:'fixture', HYDROLAND_OBJECT_STORAGE_SECRET_ACCESS_KEY:'fixture',
    STORMGLASS_API_KEY:'fixture', HYDROLAND_EMAIL_PROVIDER:'RESEND', RESEND_API_KEY:'fixture',
    HYDROLAND_EMAIL_FROM:'sender@example.invalid', HYDROLAND_PAYMENT_PROVIDER:'MOYASAR', MOYASAR_SECRET_KEY:'fixture',
    HYDROLAND_AI_PROVIDER:'OPENAI', HYDROLAND_AI_MODEL:'fixture-model', OPENAI_API_KEY:'fixture',
    HYDROLAND_AI_INPUT_MICRO_USD_PER_MILLION:'10', HYDROLAND_AI_OUTPUT_MICRO_USD_PER_MILLION:'10',
    HYDROLAND_AI_DAILY_BUDGET_MICRO_USD:'100000',
  };
  for (const id of ids) settings['HYDROLAND_INTEGRATION_' + id + '_STATUS'] = 'SANDBOX';
  const prior = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const originalFetch = global.fetch;
  const pay = new MoyasarPaymentProviderService(integration);
  const actions = [
    () => new CredentialObjectStorageService(integration).exists('credentials/test/item.pdf'),
    () => new StormglassWeatherService(integration).snapshot(16,42,date),
    () => new EmailDeliveryService(integration,audit).sendAuthChallenge({
      notificationId:randomUUID(), to:'fixture@example.invalid', purpose:'VERIFY_EMAIL',
      token:'a'.repeat(64), expiresAt:date.toISOString(),
    }),
    () => pay.fetchInvoice(invoiceId),
    async () => {
      const check = await new AgentModelProviderService(integration).checkConnection();
      if (!check.connected) throw new Error(check.reason);
      return check.connected;
    },
  ];
  const successBodies = [null, {hours:[{time:date.toISOString(),windSpeed:{sg:2}}]}, {id:'fixture-message'},
    {id:invoiceId,status:'initiated',amount:100,currency:'SAR',url:'https://checkout.example.invalid'}, {id:'fixture-model',object:'model'}];
  try {
    for (const [index,id] of ids.entries()) {
      let calls = 0;
      global.fetch = async () => {calls++;return new Response(null,{status:503});};
      await assert.rejects(actions[index]());
      const health = async () => (await audit.providerHealth()).find(p => p.provider === id);
      assert.equal((await health()).state, 'DEGRADED', id);
      assert.equal(calls, 1, id);
      if (id === 'PAYMENT_PSP') {
        global.fetch = async () => Response.json({});
        await assert.rejects(actions[index]());
        assert.equal((await health()).state,'DEGRADED');
        global.fetch = async () => Response.json({...successBodies[index],id:randomUUID()});
        await assert.rejects(actions[index]());
        assert.equal((await health()).state,'DEGRADED');
        global.fetch = async () => Response.json({id:invoiceId,status:'initiated'});
        assert.equal(await pay.cancelInvoice(invoiceId),false);
        assert.equal((await health()).state,'DEGRADED');
      }
      global.fetch = async () => {calls++;return successBodies[index] === null ? new Response(null) : Response.json(successBodies[index]);};
      await actions[index]();
      const recovered = await health();
      assert.equal(recovered.state, 'AVAILABLE', id);
      assert.equal(calls, 2, id);
      const events = await db.auditEvent.findMany({where:{resource:'integration.provider.health',resourceId:'a06.provider.'+id},orderBy:{occurredAt:'asc'}});
      assert.deepEqual(events.map(e => e.metadata.category),['PROVIDER_FAILURE','SUCCESS'],id);
      console.log(id + ' PASS: native adapter refused failed operation, then recovered after a successful test response.');
    }
  } finally {
    global.fetch = originalFetch;
    for (const [key,value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]; else process.env[key]=value;
    }
  }
};
