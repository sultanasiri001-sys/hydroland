const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {once} = require('node:events');
const {join} = require('node:path');
const {test} = require('node:test');
const dist = process.env.MOYASAR_REFUND_TEST_DIST || join(__dirname, '..', 'dist');
const {MoyasarPaymentProviderService} = require(join(dist, 'payments/moyasar-payment-provider.service'));

// Every request in this test targets a newly opened loopback server. No merchant
// credential, database, payment endpoint, or customer data is used.
const providerPaymentId = '11111111-1111-4111-8111-111111111111';
const invoiceId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const binding = {invoiceId, amountMinor: 10000, currency: 'SAR'};
const input = {providerPaymentId, ...binding, refundAmountMinor: 2500, expectedRefundedMinor: 0};
const instant = '2026-11-21T01:00:00.000Z';
const later = '2026-11-21T01:01:00.000Z';
const payment = (patch = {}) => ({id:providerPaymentId, invoice_id:invoiceId,
  status:'paid', amount:10000, currency:'SAR', captured:0, refunded:0,
  refunded_at:null, updated_at:instant, ...patch});
const refunded = (patch = {}) => payment({status:'refunded', refunded:2500,
  refunded_at:later, updated_at:later, ...patch});
const code = (expectedStatus, expectedCode) => error => {
  assert.equal(error.getStatus(), expectedStatus);
  if (expectedCode) assert.equal(error.getResponse().code, expectedCode);
  assert.doesNotMatch(JSON.stringify(error.getResponse()), /fixture-secret|card-token|cardholder|raw-provider-secret/);
  return true;
};

async function withProvider(options, exercise) {
  const calls = [], signals = [];
  let gateCalls = 0;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    calls.push({method:request.method, url:request.url, body:raw ? JSON.parse(raw) : null});
    assert.equal(request.headers.authorization, 'Basic ' + Buffer.from('fixture-secret:').toString('base64'));
    const isRefund = request.method === 'POST' && request.url === `/v1/payments/${providerPaymentId}/refund`;
    assert.ok(isRefund || (request.method === 'GET' && request.url === `/v1/payments/${providerPaymentId}`));
    if (isRefund && options.disconnect) { request.socket.destroy(); return; }
    if (isRefund && options.redirect) { response.writeHead(307, {location:options.redirect}); response.end(); return; }
    const body = isRefund ? (options.after ?? refunded()) : (options.before ?? payment());
    response.writeHead(isRefund ? (options.postStatus ?? 200) : (options.getStatus ?? 200), {'Content-Type':'application/json'});
    response.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const settings = {NODE_ENV:'test', HYDROLAND_PAYMENT_PROVIDER:'MOYASAR',
    MOYASAR_SECRET_KEY:'fixture-secret', MOYASAR_API_BASE_URL:`http://127.0.0.1:${server.address().port}/v1/`};
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const integrations = {
    requireOperational(key, options) {
      gateCalls++;
      assert.equal(key, 'PAYMENT_PSP');
      assert.deepEqual(options, {allowSandbox:true});
      if (options && integrations.blocked) throw new Error('Fixture integration disabled');
      return {status:'SANDBOX'};
    },
    async recordProviderSignal(key, category) { signals.push({key, category}); },
  };
  try { await exercise({service:new MoyasarPaymentProviderService(integrations), calls, signals, integrations, gateCalls:() => gateCalls}); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise(resolve => server.close(resolve));
  }
}

test('Moyasar refund adapter uses verified financial evidence and one mutation attempt', async t => {
  await t.test('fetch is bound and strips customer/card/source metadata', async () => {
    await withProvider({before:payment({source:{token:'card-token',name:'cardholder'}, metadata:{secret:'raw-provider-secret'}})}, async ({service, calls}) => {
      const result = await service.fetchPayment(providerPaymentId, binding);
      assert.deepEqual(result, {id:providerPaymentId, invoiceId, status:'paid', amountMinor:10000,
        currency:'SAR', capturedMinor:10000, refundedMinor:0, updatedAt:instant, refundedAt:null});
      assert.equal(calls.length, 1);
    });
  });

  await t.test('partial refund sends explicit amount and verifies exact cumulative delta', async () => {
    await withProvider({}, async ({service, calls, signals}) => {
      const result = await service.refundPayment(input);
      assert.equal(result.refundedMinor, 2500);
      assert.equal(result.refundedAt, later);
      assert.deepEqual(calls.map(call => call.method), ['GET','POST']);
      assert.deepEqual(calls[1].body, {amount:2500});
      assert.deepEqual(signals.map(signal => signal.category), ['SUCCESS','SUCCESS']);
    });
  });

  await t.test('full purchase refund is explicit and cannot depend on omitted amount semantics', async () => {
    await withProvider({after:refunded({refunded:10000})}, async ({service, calls}) => {
      const result = await service.refundPayment({...input, refundAmountMinor:10000});
      assert.equal(result.refundedMinor, 10000);
      assert.deepEqual(calls[1].body, {amount:10000});
    });
  });

  await t.test('partial manual capture sets its own lower refund ceiling', async () => {
    await withProvider({before:payment({status:'captured', captured:7000}), after:refunded({captured:7000,refunded:7000})}, async ({service}) => {
      assert.equal((await service.refundPayment({...input, refundAmountMinor:7000})).capturedMinor, 7000);
    });
    await withProvider({before:payment({status:'captured', captured:7000})}, async ({service, calls}) => {
      await assert.rejects(service.refundPayment({...input, refundAmountMinor:7001}), code(409, 'PAYMENT_REFUND_CAPTURE_LIMIT'));
      assert.equal(calls.filter(call => call.method === 'POST').length, 0);
    });
  });

  await t.test('existing cumulative refund is included in new verified balance', async () => {
    await withProvider({before:payment({refunded:1000,refunded_at:instant}), after:refunded({refunded:3500})}, async ({service}) => {
      const result = await service.refundPayment({...input, expectedRefundedMinor:1000});
      assert.equal(result.refundedMinor, 3500);
    });
  });

  await t.test('stale cumulative balance blocks mutation', async () => {
    await withProvider({before:payment({refunded:1000,refunded_at:instant})}, async ({service, calls}) => {
      await assert.rejects(service.refundPayment(input), code(409, 'PAYMENT_REFUND_BALANCE_CHANGED'));
      assert.equal(calls.length, 1);
    });
  });

  await t.test('input validation runs before operational/provider access', async () => {
    await withProvider({}, async ({service, calls, gateCalls}) => {
      for (const patch of [{providerPaymentId:'../../payments'}, {providerPaymentId:42}, {invoiceId:otherId + '/refund'},
        {amountMinor:NaN}, {amountMinor:0}, {amountMinor:2147483648}, {currency:'sar'},
        {refundAmountMinor:0}, {refundAmountMinor:1.5}, {refundAmountMinor:10001},
        {refundAmountMinor:9000,expectedRefundedMinor:1001}, {expectedRefundedMinor:-1}, {expectedRefundedMinor:'0'}]) {
        await assert.rejects(service.refundPayment({...input,...patch}), code(400));
      }
      await assert.rejects(service.refundPayment(undefined), code(400));
      assert.equal(calls.length, 0);
      assert.equal(gateCalls(), 0);
    });
  });

  for (const [name, patch] of Object.entries({
    wrongPayment:{id:otherId}, wrongInvoice:{invoice_id:otherId}, wrongAmount:{amount:10001}, wrongCurrency:{currency:'USD'},
    nonnumericRefund:{refunded:'0'}, negativeRefund:{refunded:-1}, excessRefund:{refunded:10001},
    excessCapture:{captured:10001}, fractionalCapture:{captured:10.5}, missingCapture:{captured:null},
    unknownStatus:{status:'complete'}, missingTimestamp:{updated_at:null}, invalidTimestamp:{updated_at:'tomorrow'},
  })) {
    await t.test(`preflight ${name} is rejected without POST`, async () => {
      await withProvider({before:payment(patch)}, async ({service, calls, signals}) => {
        await assert.rejects(service.refundPayment(input), code(503));
        assert.deepEqual(calls.map(call => call.method), ['GET']);
        assert.equal(signals.at(-1).category, 'PROVIDER_FAILURE');
      });
    });
  }

  for (const status of ['initiated','authorized','failed','refunded','voided','verified','expired']) {
    await t.test(`${status} cannot cause an undocumented new refund POST`, async () => {
      await withProvider({before:payment({status})}, async ({service, calls}) => {
        await assert.rejects(service.refundPayment(input), code(409, 'PAYMENT_REFUND_PROVIDER_REVIEW_REQUIRED'));
        assert.equal(calls.length, 1);
      });
    });
  }

  for (const [name, after] of Object.entries({
    shortDelta:refunded({refunded:2499}), excessiveDelta:refunded({refunded:2501}), staleBalance:refunded({refunded:0}),
    changedInvoice:refunded({invoice_id:otherId}), changedPayment:refunded({id:otherId}), changedCurrency:refunded({currency:'USD'}),
    changedCapture:refunded({captured:7500}), unknownStatus:refunded({status:'failed'}),
    missingRefundTime:refunded({refunded_at:null}), olderSnapshot:refunded({updated_at:'2026-11-20T00:00:00.000Z'}),
    invalidJSON:'raw-provider-secret', missingFields:{},
  })) {
    await t.test(`POST ${name} requires reconciliation and is not retried`, async () => {
      await withProvider({after}, async ({service, calls}) => {
        await assert.rejects(service.refundPayment(input), code(503, 'PAYMENT_REFUND_RECONCILIATION_REQUIRED'));
        assert.deepEqual(calls.map(call => call.method), ['GET','POST']);
      });
    });
  }

  for (const postStatus of [400,401,403,404,429,500,503]) {
    await t.test(`POST HTTP${postStatus} cannot be replayed automatically`, async () => {
      await withProvider({postStatus,after:{message:'raw-provider-secret'}}, async ({service, calls}) => {
        await assert.rejects(service.refundPayment(input), code(503, 'PAYMENT_REFUND_RECONCILIATION_REQUIRED'));
        assert.equal(calls.filter(call => call.method === 'POST').length, 1);
      });
    });
  }

  await t.test('connection lost after POST does not trigger another mutation', async () => {
    await withProvider({disconnect:true}, async ({service, calls}) => {
      await assert.rejects(service.refundPayment(input), code(503, 'PAYMENT_REFUND_RECONCILIATION_REQUIRED'));
      assert.deepEqual(calls.map(call => call.method), ['GET','POST']);
    });
  });

  await t.test('redirect cannot forward the POST or credentials', async () => {
    await withProvider({redirect:'http://127.0.0.1:1/must-not-follow'}, async ({service, calls}) => {
      await assert.rejects(service.refundPayment(input), code(503, 'PAYMENT_REFUND_RECONCILIATION_REQUIRED'));
      assert.equal(calls.filter(call => call.method === 'POST').length, 1);
    });
  });

  await t.test('integration gate remains in force before provider access', async () => {
    await withProvider({}, async ({service, calls, integrations}) => {
      integrations.blocked = true;
      await assert.rejects(service.refundPayment(input), /Fixture integration disabled/);
      assert.equal(calls.length, 0);
    });
  });
});
