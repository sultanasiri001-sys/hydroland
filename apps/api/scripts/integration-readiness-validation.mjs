import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/integration.service.ts');
const types=read('src/integrations/integration.types.ts');
const payments=read('src/payments/payments.service.ts');
const storage=read('src/trip-intelligence/offline-payload-storage.service.ts');
const translation=read('src/translation/translation-router.service.ts');

const requiredKeys=['PAYMENT_PSP','OBJECT_STORAGE','TRANSLATION_ENGINE','WEATHER_MARINE','MAPS_GEO','ESIGN','CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'];
for(const key of requiredKeys){
 if(!service.includes(`key:'${key}'`)&&!types.includes(`'${key}'`))throw new Error(`Missing integration registry key: ${key}`);
}
for(const status of ['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED']){
 if(!types.includes(`'${status}'`))throw new Error(`Missing integration status: ${status}`);
}
if(!service.includes("integration.status==='PRODUCTION_ENABLED'"))throw new Error('Production operational gate is missing.');
if(!payments.includes("requireOperational('PAYMENT_PSP')"))throw new Error('Payment PSP fail-closed gate is missing.');
if(!storage.includes("requireOperational('OBJECT_STORAGE')"))throw new Error('Object storage fail-closed gate is missing.');
if(!translation.includes("provider.mode==='ONLINE'")||!translation.includes("requireOperational('TRANSLATION_ENGINE')"))throw new Error('Online translation fail-closed gate is missing.');
if(!translation.includes("CONTROLLED_SAFETY_CONTENT"))throw new Error('Controlled safety translation protection is missing.');
console.log('Integration readiness validation passed.');
