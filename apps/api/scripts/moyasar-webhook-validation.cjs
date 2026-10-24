const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MoyasarPaymentProviderService}=require('../dist/payments/moyasar-payment-provider.service');

function verify(status,payload,secret='webhook-test-secret'){
  const previous=process.env.MOYASAR_WEBHOOK_SECRET;
  if(secret===undefined)delete process.env.MOYASAR_WEBHOOK_SECRET;else process.env.MOYASAR_WEBHOOK_SECRET=secret;
  try{return new MoyasarPaymentProviderService({requireOperational:()=>({status})}).verifyWebhook(payload);}
  finally{if(previous===undefined)delete process.env.MOYASAR_WEBHOOK_SECRET;else process.env.MOYASAR_WEBHOOK_SECRET=previous;}
}
const event=(live,secret='webhook-test-secret')=>({id:'evt-validation',type:'payment_paid',secret_token:secret,live,data:{invoice_id:'11111111-1111-4111-8111-111111111111'}});
const unauthorized=error=>error?.getStatus?.()===401;

for(const [status,live] of [['SANDBOX',false],['PRODUCTION_ENABLED',true]]){
  for(const secret of ['webhook-test-secret','سر-اختبار','🔒-test'])test(`${status} accepts a matching boolean mode and UTF-8 secret`,()=>{
    const result=verify(status,event(live,secret),secret);
    assert.equal(result.live,live);assert.equal(result.secret_token,'[verified]');
  });
  for(const [name,value] of [['missing',undefined],['null',null],['false string','false'],['true string','true'],['zero',0],['one',1],['array',[]],['object',{}]])test(`${status} rejects ${name} mode`,()=>{
    const payload=event(value);if(value===undefined)delete payload.live;
    assert.throws(()=>verify(status,payload),unauthorized);
  });
  test(`${status} rejects the opposite boolean mode`,()=>assert.throws(()=>verify(status,event(!live)),unauthorized));
}
test('same character count with different UTF-8 byte lengths returns unauthorized, not RangeError',()=>{
  const expected='webhook-test-secret';
  assert.throws(()=>verify('SANDBOX',event(false,'é'.repeat(expected.length)),expected),unauthorized);
});
test('same byte length with different secret content is rejected',()=>assert.throws(()=>verify('SANDBOX',event(false,'x'.repeat('webhook-test-secret'.length))),unauthorized));
test('missing configured secret fails closed',()=>assert.throws(()=>verify('SANDBOX',event(false),''),unauthorized));
for(const [name,payload] of [['null',null],['array',[]],['missing data',{...event(false),data:null}],['array data',{...event(false),data:[]}],['missing event ID',{...event(false),id:''}],['missing secret',{...event(false),secret_token:null}]])test(`rejects ${name} payload`,()=>assert.throws(()=>verify('SANDBOX',payload),unauthorized));
