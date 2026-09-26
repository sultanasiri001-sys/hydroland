import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/integration.service.ts');
const types=read('src/integrations/integration.types.ts');
const payments=read('src/payments/payments.service.ts');
const paymentProvider=read('src/payments/moyasar-payment-provider.service.ts');
const paymentWebhook=read('src/payments/payments-webhook.controller.ts');
const storage=read('src/trip-intelligence/offline-payload-storage.service.ts');
const translation=read('src/translation/translation-router.service.ts');
const stormglass=read('src/trips/stormglass-weather.service.ts');
const weatherGate=read('src/trips/weather-gate.service.ts');
const tripAdmin=read('src/trips/trip-admin.service.ts');
const emailDelivery=read('src/integrations/email-delivery.service.ts');
const emailWorker=read('src/auth/auth-email-outbox.worker.ts');
const auth=read('src/auth/auth.service.ts');
const webAuth=read('../web/src/hydroland-auth.js');
const render=read('../../render.yaml');

const requiredKeys=['PAYMENT_PSP','OBJECT_STORAGE','TRANSLATION_ENGINE','WEATHER_MARINE','EMAIL','MAPS_GEO','ESIGN','CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'];
for(const key of requiredKeys){
 if(!service.includes(`key:'${key}'`)&&!types.includes(`'${key}'`))throw new Error(`Missing integration registry key: ${key}`);
}
for(const status of ['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED']){
 if(!types.includes(`'${status}'`))throw new Error(`Missing integration status: ${status}`);
}
if(!service.includes("integration.status==='PRODUCTION_ENABLED'"))throw new Error('Production operational gate is missing.');
if(!service.includes('HYDROLAND_INTEGRATION_${key}_STATUS'))throw new Error('Environment-based integration lifecycle configuration is missing.');
if(!service.includes("statuses.has(status)"))throw new Error('Integration lifecycle status allowlist is missing.');
if(!payments.includes("requireOperational('PAYMENT_PSP',{allowSandbox:true})"))throw new Error('Payment PSP fail-closed gate is missing.');
if(!storage.includes("requireOperational('OBJECT_STORAGE')"))throw new Error('Object storage fail-closed gate is missing.');
if(!translation.includes("provider.mode==='ONLINE'")||!translation.includes("requireOperational('TRANSLATION_ENGINE')"))throw new Error('Online translation fail-closed gate is missing.');
if(!translation.includes("CONTROLLED_SAFETY_CONTENT"))throw new Error('Controlled safety translation protection is missing.');
for(const marker of [
  "requireOperational('WEATHER_MARINE', { allowSandbox: true })",
  'process.env.STORMGLASS_API_KEY',
  "url.searchParams.set('source','sg')",
  'windSpeed,gust,windDirection',
  'currentSpeed,currentDirection',
  "value(hour, 'gust')",
  "currentSpeedMps:value(hour,'currentSpeed')",
  "currentDirectionDeg:value(hour,'currentDirection')",
  "decision: 'REVIEW_REQUIRED'",
])if(!stormglass.includes(marker))throw new Error(`Stormglass marine contract missing: ${marker}`);
for(const marker of ['currentSpeedMps?: number','currentDirectionDeg?: number','swellPeriodS?: number'])if(!weatherGate.includes(marker))throw new Error(`Weather snapshot marine field missing: ${marker}`);
if(!tripAdmin.includes('weatherReviews.refresh(reviewerAccountId,tripId)')||!tripAdmin.includes("rows[0]?.status!=='APPROVED'"))throw new Error('Booking confirmation does not revalidate and require human approval of the fresh weather snapshot.');
if(!render.includes('key: STORMGLASS_API_KEY')||!render.includes('key: HYDROLAND_INTEGRATION_WEATHER_MARINE_STATUS'))throw new Error('Render blueprint does not declare Stormglass activation inputs.');

for(const marker of [
  "requireOperational('EMAIL',{allowSandbox:true})",
  "provider!=='RESEND'",
  'process.env.RESEND_API_KEY',
  'process.env.HYDROLAND_EMAIL_FROM',
  'process.env.HYDROLAND_PUBLIC_WEB_ORIGIN',
  "purpose==='VERIFY_EMAIL'?'verify_email':'reset_token'",
  "'Idempotency-Key':`hydroland-auth/${input.notificationId}`",
  "AbortSignal.timeout(8_000)",
])if(!emailDelivery.includes(marker))throw new Error(`Transactional email delivery invariant missing: ${marker}`);
for(const marker of [
  "status!=='PRODUCTION_ENABLED'&&status!=='SANDBOX'",
  "type:{in:[...TYPES]},status:'PENDING'",
  "meta.deliveryStatus==='SENT'",
  "status:'FAILED'",
  'nextDeliveryAttemptAt',
  'Math.min(15*60_000,30_000*(2**Math.min(attempts,5)))',
  'this.auth.materializePendingChallenge(row.id)',
])if(!emailWorker.includes(marker))throw new Error(`Auth email outbox invariant missing: ${marker}`);
if(!auth.includes("payload:{purpose,expiresAt:expiresAt.toISOString(),delivery:'EMAIL',version:1}"))throw new Error('Auth challenge outbox payload boundary is missing.');
if(!webAuth.includes("params.get('reset_token')")||!webAuth.includes("searchParams.get('verify_email')"))throw new Error('Web auth challenge link parameters are not wired.');
for(const key of ['HYDROLAND_INTEGRATION_EMAIL_STATUS','HYDROLAND_EMAIL_PROVIDER','RESEND_API_KEY','HYDROLAND_EMAIL_FROM','HYDROLAND_PUBLIC_WEB_ORIGIN'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing email activation input: ${key}`);

for(const marker of [
  "process.env.HYDROLAND_PAYMENT_PROVIDER",
  "process.env.MOYASAR_SECRET_KEY",
  "process.env.MOYASAR_WEBHOOK_SECRET",
  "https://api.moyasar.com/v1/",
  "Buffer.from(`${secret}:`).toString('base64')",
  "successUrl.searchParams.set('payment','success')",
  "backUrl.searchParams.set('payment','cancelled')",
  "expired_at:new Date(Date.now()+30*60_000).toISOString()",
  "AbortSignal.timeout(8_000)",
  "timingSafeEqual(Buffer.from(secret),Buffer.from(expected))",
  "integration.status==='PRODUCTION_ENABLED'&&!live",
  "integration.status==='SANDBOX'&&live",
])if(!paymentProvider.includes(marker))throw new Error(`Moyasar provider invariant missing: ${marker}`);
for(const marker of [
  "checkoutUrl:providerInvoice.url",
  "providerReference:providerInvoice.id",
  "this.moyasar.cancelInvoice(providerInvoice.id)",
  "PAYMENT_PROVIDER_WEBHOOK_PROCESSED",
  "resource:'PaymentProviderWebhook'",
  "amount!==payment.amountMinor",
  "currency!==payment.currency",
  "payment_paid'||type==='payment_captured'",
  "payment_refunded",
])if(!payments.includes(marker))throw new Error(`Payment lifecycle invariant missing: ${marker}`);
if(!paymentWebhook.includes("@Controller('payments/provider')")||!paymentWebhook.includes("@Post('moyasar/webhook')")||paymentWebhook.includes('UseGuards'))throw new Error('Moyasar public webhook boundary is missing or incorrectly guarded.');
for(const key of ['HYDROLAND_INTEGRATION_PAYMENT_PSP_STATUS','HYDROLAND_PAYMENT_PROVIDER','MOYASAR_SECRET_KEY','MOYASAR_WEBHOOK_SECRET'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing payment activation input: ${key}`);
console.log('Integration readiness validation passed.');
