import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const url=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname==='/commerce_notice_test');
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {IntegrationService}=require('../dist/integrations/integration.service.js');
const {AuditService}=require('../dist/audit/audit.service.js');
const {UnifonicMessagingService}=require('../dist/integrations/unifonic-messaging.service.js');
const {smsBinding}=require('../dist/integrations/unifonic-dlr.js');
const db=new DatabaseService(), integration=new IntegrationService(new AuditService(db));
const sms=new UnifonicMessagingService(integration), secret=randomUUID();
Object.assign(process.env,{UNIFONIC_SMS_DLR_ACCOUNT_ID:randomUUID(),HYDROLAND_WEBHOOK_SMS_SECRET:secret,
  HYDROLAND_INTEGRATION_SMS_STATUS:'SANDBOX',HYDROLAND_SMS_PROVIDER:'UNIFONIC',UNIFONIC_SMS_APPSID:'fixture',UNIFONIC_SMS_SENDER_ID:'fixture'});
const recipient='966500000001', reference=randomUUID(), id=String(Date.now());
const body={messageId:id,correlationId:reference,destinationAddress:recipient,submitUnitCount:'2',deliveredUnitCount:'2',finalStatus:'DELIVRD'};
const payload={body,accountId:process.env.UNIFONIC_SMS_DLR_ACCOUNT_ID,productName:'sms',eventName:'dlr'};
const binding=smsBinding(id,reference,recipient);
const where={resource:'unifonic.sms',resourceId:binding.message};
const count=action=>db.auditEvent.count({where:{...where,action}});
async function receive(data,eventId=randomUUID()){
  const stamp=String(Date.now()),raw=Buffer.from(JSON.stringify(data));
  const signature=createHmac('sha256',secret).update(stamp+'.').update(raw).digest('hex');
  return integration.verifyWebhook('SMS',{'x-hydroland-timestamp':stamp,'x-hydroland-signature':'sha256='+signature,
    'x-hydroland-event-id':eventId,'x-hydroland-event-type':'dlr'},raw,data);
}
let sends=0;
const saved=globalThis.fetch;
globalThis.fetch=async(_url,{body:form})=>{
  sends++;
  return Response.json({success:true,data:{MessageID:id,CorrelationID:form.get('CorrelationID'),Recipient:form.get('Recipient'),Status:'Queued'}});
};
try {
  await receive({...payload,accountId:randomUUID()});
  for(const change of [{finalStatus:'Sent'},{finalStatus:['DELIVRD']},{deliveredUnitCount:'1'},{submitUnitCount:0,deliveredUnitCount:0}]) await receive({...payload,body:{...body,...change}});
  assert.equal(await count('dlr'),0);
  await receive({...payload,body:{...body,correlationId:randomUUID()}});
  await receive({...payload,body:{...body,destinationAddress:'966500000002'}});
  await sms.sendSms({recipient,correlationId:reference,body:'fixture'});
  assert.equal(await count('delivered'),0);
  await Promise.all([receive(payload),receive(payload),receive(payload)]);
  assert.equal(await count('delivered'),1);
  const metadata=JSON.stringify(await db.auditEvent.findMany({where,select:{metadata:true}}));
  assert(!metadata.includes(recipient) && !metadata.includes(reference));
  // A delivery report can precede completion of the transport call.
  const early={...body,messageId:id+'1',correlationId:randomUUID()};
  await receive({...payload,body:early});
  await integration.recordSmsSubmission(early.messageId,early.correlationId,recipient);
  const key=smsBinding(early.messageId,early.correlationId,recipient).message;
  assert.equal(await db.auditEvent.count({where:{resource:'unifonic.sms',resourceId:key,action:'delivered'}}),1);
  assert.equal(sends,1);
  console.log('PASS SMS DLR: matched original, positive complete multipart receipt, concurrent repeats, early arrival, recipient isolation and redacted evidence.');
} finally { globalThis.fetch=saved; await db.$disconnect(); }
