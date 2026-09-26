import fs from 'node:fs';
const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/unifonic-messaging.service.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const render=read('../../render.yaml');
for(const marker of [
  "requireOperational('SMS',{allowSandbox:true})",
  "HYDROLAND_SMS_PROVIDER",
  "UNIFONIC_SMS_APPSID",
  "UNIFONIC_SMS_SENDER_ID",
  "https://el.cloud.unifonic.com/rest/SMS/messages",
  "'Content-Type':'application/x-www-form-urlencoded'",
  "requireOperational('WHATSAPP',{allowSandbox:true})",
  "HYDROLAND_WHATSAPP_PROVIDER",
  "UNIFONIC_WHATSAPP_PUBLIC_ID",
  "UNIFONIC_WHATSAPP_SECRET",
  "https://apis.unifonic.com/v1/messages",
  "channel:'whatsapp'",
  "type:'template'",
  'AbortSignal.timeout(8_000)',
])if(!service.includes(marker))throw new Error(`Unifonic messaging invariant missing: ${marker}`);
if(!moduleFile.includes('UnifonicMessagingService')||!moduleFile.includes('exports:[IntegrationService,EmailDeliveryService,UnifonicMessagingService]'))throw new Error('Unifonic messaging service is not exported by IntegrationModule.');
for(const key of ['HYDROLAND_INTEGRATION_SMS_STATUS','HYDROLAND_SMS_PROVIDER','UNIFONIC_SMS_APPSID','UNIFONIC_SMS_SENDER_ID','HYDROLAND_INTEGRATION_WHATSAPP_STATUS','HYDROLAND_WHATSAPP_PROVIDER','UNIFONIC_WHATSAPP_PUBLIC_ID','UNIFONIC_WHATSAPP_SECRET'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing messaging activation input: ${key}`);
if(service.includes('console.log')||service.includes('console.error'))throw new Error('Messaging adapter must not log provider credentials or payloads.');
console.log('Unifonic messaging validation passed.');
