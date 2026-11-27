const {test}=require('node:test');
const assert=require('node:assert/strict');
const {channelPolicy,recipientAllowed,verificationPolicy,privateDigest,preferenceInput}=require('../dist/notifications/customer-channel.domain.js');
const {CustomerChannelTransport}=require('../dist/integrations/customer-channel.transport.js');
const account='12345678-1234-1234-1234-123456789abc',phone='+15550001001';
function environment(t,overrides={}){
  const values={MFA_ENCRYPTION_KEY:'fixture-notice-hmac-key-long-enough-32',HYDROLAND_CUSTOMER_CHANNEL_POLICY:'BOOKING_INVOICE_V1',
    HYDROLAND_CUSTOMER_CHANNEL_SMS_ENABLED:'true',HYDROLAND_CUSTOMER_CHANNEL_SMS_PROVIDER_VERIFIED:'true',HYDROLAND_CUSTOMER_CHANNEL_SMS_MONTHLY_CAP_HALALAS:'100',HYDROLAND_CUSTOMER_CHANNEL_SMS_MAX_ATTEMPT_HALALAS:'2',
    HYDROLAND_CUSTOMER_CHANNEL_SMS_ALLOWED_ACCOUNT_IDS:account,HYDROLAND_INTEGRATION_SMS_STATUS:'SANDBOX',HYDROLAND_SMS_PROVIDER:'UNIFONIC',UNIFONIC_SMS_APPSID:'fixture',UNIFONIC_SMS_SENDER_ID:'Fixture',
    UNIFONIC_SMS_DLR_ACCOUNT_ID:'fixture-sms',HYDROLAND_WEBHOOK_SMS_SECRET:'fixture-secret',HYDROLAND_CUSTOMER_CHANNEL_SMS_DLR_GATEWAY_VERIFIED:'true',HYDROLAND_CUSTOMER_CHANNEL_SMS_CONTENT_APPROVED:'true',
    HYDROLAND_CUSTOMER_CHANNEL_SMS_TEST_RECIPIENTS:phone,HYDROLAND_CUSTOMER_PHONE_VERIFICATION_ENABLED:'true',
    HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_ENABLED:'true',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_PROVIDER_VERIFIED:'true',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_MONTHLY_CAP_HALALAS:'100',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_MAX_ATTEMPT_HALALAS:'2',
    HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_ALLOWED_ACCOUNT_IDS:account,HYDROLAND_INTEGRATION_WHATSAPP_STATUS:'SANDBOX',HYDROLAND_WHATSAPP_PROVIDER:'UNIFONIC',UNIFONIC_WHATSAPP_PUBLIC_ID:'fixture',UNIFONIC_WHATSAPP_SECRET:'fixture',UNIFONIC_WHATSAPP_APPLICATION_ID:'fixture-app',
    HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_LANGUAGE:'ar',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_BOOKING_TEMPLATE:'booking_notice',HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_INVOICE_TEMPLATE:'invoice_notice',HYDROLAND_WHATSAPP_APPROVED_TEMPLATES:'booking_notice:ar,invoice_notice:ar',
    HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_TEST_RECIPIENTS:phone,EXPO_ACCESS_TOKEN:'fixture',...overrides};
  for(const [key,value]of Object.entries(values)){const old=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;t.after(()=>{if(old===undefined)delete process.env[key];else process.env[key]=old;});}
}
test('unknown/disabled policy, absent approval, unbounded budget and sandbox recipient all fail closed',t=>{
  environment(t);assert(channelPolicy('SMS',account));assert(verificationPolicy(account,phone));
  const required=['HYDROLAND_CUSTOMER_CHANNEL_POLICY','HYDROLAND_CUSTOMER_CHANNEL_SMS_ENABLED','HYDROLAND_CUSTOMER_CHANNEL_SMS_PROVIDER_VERIFIED','HYDROLAND_CUSTOMER_CHANNEL_SMS_DLR_GATEWAY_VERIFIED','HYDROLAND_CUSTOMER_CHANNEL_SMS_CONTENT_APPROVED','HYDROLAND_CUSTOMER_CHANNEL_SMS_ALLOWED_ACCOUNT_IDS','UNIFONIC_SMS_DLR_ACCOUNT_ID','HYDROLAND_WEBHOOK_SMS_SECRET'];
  for(const key of required){const old=process.env[key];delete process.env[key];assert.equal(channelPolicy('SMS',account),null,key);process.env[key]=old;}
  for(const cap of ['0','Infinity','NaN','2147483648','1.5']){process.env.HYDROLAND_CUSTOMER_CHANNEL_SMS_MONTHLY_CAP_HALALAS=cap;assert.equal(channelPolicy('SMS',account),null);}
  process.env.HYDROLAND_CUSTOMER_CHANNEL_SMS_MONTHLY_CAP_HALALAS='100';assert.equal(channelPolicy('SMS','foreign-account'),null);
  assert.equal(verificationPolicy(account,'+15550001999'),null);delete process.env.HYDROLAND_CUSTOMER_CHANNEL_SMS_TEST_RECIPIENTS;assert.equal(verificationPolicy(account,phone),null);
  assert.equal(recipientAllowed('WHATSAPP','+15550001999',channelPolicy('WHATSAPP',account)),false);
});
test('WhatsApp requires the exact approved template/language and preference input cannot select a recipient',t=>{
  environment(t);assert(channelPolicy('WHATSAPP',account,'INVOICE_ISSUED'));process.env.HYDROLAND_CUSTOMER_CHANNEL_WHATSAPP_LANGUAGE='en';assert.equal(channelPolicy('WHATSAPP',account,'INVOICE_ISSUED'),null);
  const input={expectedRevision:0,email:true,sms:false,whatsapp:false,push:false,bookings:true,invoices:true,quietStart:null,quietEnd:null,timeZone:'Asia/Riyadh',confirmed:true};
  assert.equal(preferenceInput(input).email,true);
  for(const extra of [{accountId:'foreign'},{recipient:phone},{confirmed:false},{quietStart:10,quietEnd:10},{timeZone:'bad/timezone'}])assert.throws(()=>preferenceInput({...input,...extra}));
});
test('WhatsApp receipt must match message, application, recipient, channel and exact event reference',async t=>{
  environment(t);const service=new CustomerChannelTransport({}),row={channel:'WHATSAPP',id:account,providerId:'fixture-message',providerScope:'fixture-app',recipientHash:privateDigest('phone',phone)};
  const valid={messageId:'fixture-message',senderApplicationId:'fixture-app',contact:phone,channel:'whatsapp',referenceId:'hydroland-notice/'+account,status:'DELIVERED'};
  let body=[valid];t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(new URL(url).origin,'https://apis.unifonic.com');assert.equal(options.redirect,'error');return Response.json(body);});
  assert.equal((await service.receipt(row)).state,'DELIVERED');body=[{...valid,status:'READ'}];assert.equal((await service.receipt(row)).state,'DELIVERED');
  for(const status of ['QUEUED','SENT','SENT_SUCCESSFULLY_TO_PROVIDER']){body=[{...valid,status}];assert.equal((await service.receipt(row)).state,'PENDING');}
  for(const change of [{messageId:'foreign'},{senderApplicationId:'foreign'},{contact:'+15550001999'},{channel:'sms'},{referenceId:'foreign'},{status:'UNKNOWN'}]){body=[{...valid,...change}];assert.equal((await service.receipt(row)).state,'UNCERTAIN');}
  for(const invalid of [[],[valid,valid],{}]){body=invalid;assert.equal((await service.receipt(row)).state,'UNCERTAIN');}
});
test('Expo ticket is only acceptance, exact receipt means service acceptance, and unregistered is scoped rejection',async t=>{
  environment(t);const row={id:account,channel:'PUSH',providerId:account},policy={scope:account};let body={data:[{status:'ok',id:account}]};
  const service=new CustomerChannelTransport({});t.mock.method(globalThis,'fetch',async(_url,options)=>{assert.equal(options.redirect,'error');return Response.json(body);});
  assert.deepEqual(await service.send(row,'ExpoPushToken[fixture]',policy),{state:'ACCEPTED',providerId:account});
  body={data:{[account]:{status:'ok'}}};assert.equal((await service.receipt(row)).state,'PUSH_CONFIRMED');
  body={data:{foreign:{status:'ok'}}};assert.equal((await service.receipt(row)).state,'UNCERTAIN');
  body={data:{[account]:{status:'error',details:{error:'DeviceNotRegistered'}}}};assert.equal((await service.receipt(row)).state,'UNREGISTERED');
  body={data:{}};assert.equal((await service.receipt(row)).state,'PENDING');
  body={data:[{status:'ok',id:account},{status:'ok',id:account}]};assert.equal((await service.send(row,'ExpoPushToken[fixture]',policy)).state,'UNCERTAIN');
});
test('oversized provider body stays uncertain instead of yielding a delivery claim',async t=>{
  environment(t);const service=new CustomerChannelTransport({});t.mock.method(globalThis,'fetch',async()=>new Response('x'.repeat(32769)));
  await assert.rejects(service.receipt({channel:'PUSH',providerId:account}),/too large/);
});
