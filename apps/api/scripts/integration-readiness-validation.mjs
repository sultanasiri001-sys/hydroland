import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/integration.service.ts');
const types=read('src/integrations/integration.types.ts');
const payments=read('src/payments/payments.service.ts');
const storage=read('src/trip-intelligence/offline-payload-storage.service.ts');
const translation=read('src/translation/translation-router.service.ts');
const stormglass=read('src/trips/stormglass-weather.service.ts');
const weatherGate=read('src/trips/weather-gate.service.ts');
const tripAdmin=read('src/trips/trip-admin.service.ts');
const render=read('../../render.yaml');

const requiredKeys=['PAYMENT_PSP','OBJECT_STORAGE','TRANSLATION_ENGINE','WEATHER_MARINE','MAPS_GEO','ESIGN','CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'];
for(const key of requiredKeys){
 if(!service.includes(`key:'${key}'`)&&!types.includes(`'${key}'`))throw new Error(`Missing integration registry key: ${key}`);
}
for(const status of ['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED']){
 if(!types.includes(`'${status}'`))throw new Error(`Missing integration status: ${status}`);
}
if(!service.includes("integration.status==='PRODUCTION_ENABLED'"))throw new Error('Production operational gate is missing.');
if(!service.includes('HYDROLAND_INTEGRATION_${key}_STATUS'))throw new Error('Environment-based integration lifecycle configuration is missing.');
if(!service.includes("statuses.has(status)"))throw new Error('Integration lifecycle status allowlist is missing.');
if(!payments.includes("requireOperational('PAYMENT_PSP')"))throw new Error('Payment PSP fail-closed gate is missing.');
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
console.log('Integration readiness validation passed.');
