import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const integrations=read('src/integrations/integration.service.ts');
const stormglass=read('src/trips/stormglass-weather.service.ts');
const email=read('src/integrations/email-delivery.service.ts');
const unifonic=read('src/integrations/unifonic-messaging.service.ts');
const moyasar=read('src/payments/moyasar-payment-provider.service.ts');
const storage=read('src/trip-intelligence/offline-payload-storage.service.ts');
const translationRouter=read('src/translation/translation-router.service.ts');
const googleTranslation=read('src/translation/google-cloud-translation.provider.ts');
const signit=read('src/integrations/signit-esign.service.ts');
const webMap=read('../web/src/hydroland-map.js');

const allKeys=[
  'WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP','BANKING_SETTLEMENT',
  'OBJECT_STORAGE','TRANSLATION_ENGINE','MAPS_GEO','ESIGN','CERTIFICATION',
  'DISTRESS_AIS','NAFATH','REGULATORY',
];
const adapterReady=[
  'WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP',
  'OBJECT_STORAGE','TRANSLATION_ENGINE','MAPS_GEO','ESIGN',
];
const providerSelectionRequired=[
  'BANKING_SETTLEMENT','CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY',
];

for(const key of allKeys){
  if(!integrations.includes(`key:'${key}'`))throw new Error(`Stage 3 catalog key missing: ${key}`);
}
const partition=[...adapterReady,...providerSelectionRequired];
if(partition.length!==allKeys.length||new Set(partition).size!==allKeys.length)throw new Error('Stage 3 coverage partition is incomplete or duplicated.');
for(const key of allKeys){
  if(!partition.includes(key))throw new Error(`Stage 3 coverage classification missing: ${key}`);
}

const evidence={
  WEATHER_MARINE:[stormglass,"requireOperational('WEATHER_MARINE', { allowSandbox: true })",'STORMGLASS_API_KEY'],
  EMAIL:[email,"requireOperational('EMAIL',{allowSandbox:true})",'RESEND_API_KEY'],
  SMS:[unifonic,"requireOperational('SMS'",'UNIFONIC_SMS_APPSID'],
  WHATSAPP:[unifonic,"requireOperational('WHATSAPP'",'UNIFONIC_WHATSAPP_PUBLIC_ID'],
  PAYMENT_PSP:[moyasar,"requireOperational('PAYMENT_PSP'",'MOYASAR_SECRET_KEY'],
  OBJECT_STORAGE:[storage,"requireOperational('OBJECT_STORAGE'",'CLOUDFLARE_R2_ACCOUNT_ID'],
  TRANSLATION_ENGINE:[translationRouter+'\n'+googleTranslation,"requireOperational('TRANSLATION_ENGINE')",'GOOGLE_CLOUD_TRANSLATION_API_KEY','https://translation.googleapis.com/language/translate/v2'],
  MAPS_GEO:[integrations,'publicMapConfig()','HYDROLAND_MAP_STYLE_URL'],
  ESIGN:[signit,"requireOperational('ESIGN'",'SIGNIT_API_KEY'],
};
for(const [key,[source,...markers]] of Object.entries(evidence)){
  for(const marker of markers){
    if(!source.includes(marker))throw new Error(`Stage 3 adapter evidence missing for ${key}: ${marker}`);
  }
}
if(!webMap.includes("request('/integrations/maps/public-config')")||!webMap.includes('MapLibre'))throw new Error('MAPS_GEO web runtime evidence is missing.');

for(const key of providerSelectionRequired){
  const row=integrations.match(new RegExp(`\\{key:'${key}'[^}]+\\}`))?.[0]||'';
  if(!row.includes("status:'NOT_SELECTED'"))throw new Error(`${key} must remain explicitly NOT_SELECTED until a provider contract is approved.`);
}

console.log('STAGE3_CODE_READY='+JSON.stringify(adapterReady));
console.log('STAGE3_PROVIDER_SELECTION_REQUIRED='+JSON.stringify(providerSelectionRequired));
console.log('Stage 3 integration coverage matrix validation passed.');
