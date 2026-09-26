import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const integrations=read('src/integrations/integration.service.ts');
const stormglass=read('src/trips/stormglass-weather.service.ts');
const email=read('src/integrations/email-delivery.service.ts');
const unifonic=read('src/integrations/unifonic-messaging.service.ts');
const moyasar=read('src/payments/moyasar-payment-provider.service.ts');
const settlement=read('src/payments/moyasar-settlement-provider.service.ts');
const storage=read('src/trip-intelligence/offline-payload-storage.service.ts');
const translationRouter=read('src/translation/translation-router.service.ts');
const googleTranslation=read('src/translation/google-cloud-translation.provider.ts');
const signit=read('src/integrations/signit-esign.service.ts');
const marineTraffic=read('src/integrations/marinetraffic-ais.service.ts');
const padiEvidence=read('src/integrations/padi-ecard-evidence.service.ts');
const certificationReadiness=read('src/integrations/certification-readiness.controller.ts');
const onboarding=read('src/integrations/official-onboarding-readiness.controller.ts');
const webMap=read('../web/src/hydroland-map.js');

const allKeys=[
  'WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP','BANKING_SETTLEMENT',
  'OBJECT_STORAGE','TRANSLATION_ENGINE','MAPS_GEO','ESIGN','CERTIFICATION',
  'DISTRESS_AIS','NAFATH','REGULATORY',
];
const adapterReady=[
  'WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP','BANKING_SETTLEMENT',
  'OBJECT_STORAGE','TRANSLATION_ENGINE','MAPS_GEO','ESIGN',
];
const providerSelectionRequired=['CERTIFICATION','DISTRESS_AIS'];
const contractAccessRequired=['NAFATH','REGULATORY'];
const partialCoverage={CERTIFICATION:'PADI_ECARD_HUMAN_VERIFICATION',DISTRESS_AIS:'MARINETRAFFIC_AIS_ONLY'};

for(const key of allKeys){
  if(!integrations.includes(`key:'${key}'`))throw new Error(`Stage 3 catalog key missing: ${key}`);
}
const partition=[...adapterReady,...providerSelectionRequired,...contractAccessRequired];
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
  BANKING_SETTLEMENT:[settlement,"requireOperational('BANKING_SETTLEMENT'",'HYDROLAND_SETTLEMENT_PROVIDER','MOYASAR_SECRET_KEY','/settlements','/lines'],
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
for(const marker of [
  "requireOperational('DISTRESS_AIS',{allowSandbox:true})",
  'HYDROLAND_DISTRESS_AIS_PROVIDER',
  'MARINETRAFFIC_AIS_ONLY',
  'MARINETRAFFIC_API_KEY',
  'https://services.marinetraffic.com/api/exportvessel/',
])if(!marineTraffic.includes(marker))throw new Error(`DISTRESS_AIS partial AIS evidence missing: ${marker}`);
for(const marker of [
  "hostname.toLowerCase()!=='livewebservices.padi.com'",
  '/^\\/ecard-webservices\\/v4\\/ecardVerify\\/?$/i',
  "url.searchParams.get('acid')",
  "url.searchParams.get('at')",
  "humanReviewRequired:true",
  "apiVerified:false",
  "createHash('sha256')",
])if(!padiEvidence.includes(marker))throw new Error(`CERTIFICATION partial PADI evidence boundary missing: ${marker}`);
for(const marker of [
  "status('CERTIFICATION')",
  "partialProvider:'PADI_ECARD_HUMAN_VERIFICATION'",
  'padiEvidenceUrlValidationReady:true',
  'automatedApiVerificationReady:false',
  'humanReviewRequired:true',
  'productionReady:false',
  "blocker:'OFFICIAL_CERTIFICATION_API_CONTRACT_REQUIRED'",
])if(!certificationReadiness.includes(marker))throw new Error(`CERTIFICATION partial readiness boundary missing: ${marker}`);
for(const marker of [
  "status('NAFATH')",
  "providerSelected:provider==='NAFATH'",
  'HYDROLAND_NAFATH_ACCESS_APPROVED',
  'NAFATH_OIDC_ISSUER',
  'NAFATH_CLIENT_ID',
  'NAFATH_CLIENT_SECRET',
  "status('REGULATORY')",
  "providerSelected:provider==='SAUDI_MINISTRY_OF_TOURISM'",
  'HYDROLAND_REGULATORY_ACCESS_APPROVED',
  'SAUDI_TOURISM_API_BASE_URL',
  'SAUDI_TOURISM_API_TOKEN',
  'SAUDI_TOURISM_LICENSING_CONTRACT_VERSION',
  'adapterImplemented:false',
  'productionReady:false',
])if(!onboarding.includes(marker))throw new Error(`Official onboarding boundary missing: ${marker}`);
if(!webMap.includes("request('/integrations/maps/public-config')")||!webMap.includes('MapLibre'))throw new Error('MAPS_GEO web runtime evidence is missing.');

for(const key of [...providerSelectionRequired,...contractAccessRequired]){
  const row=integrations.match(new RegExp(`\\{key:'${key}'[^}]+\\}`))?.[0]||'';
  if(!row.includes("status:'NOT_SELECTED'"))throw new Error(`${key} must remain explicitly NOT_SELECTED until its approved production boundary is implemented.`);
}

console.log('STAGE3_CODE_READY='+JSON.stringify(adapterReady));
console.log('STAGE3_PARTIAL_COVERAGE='+JSON.stringify(partialCoverage));
console.log('STAGE3_PROVIDER_SELECTION_REQUIRED='+JSON.stringify(providerSelectionRequired));
console.log('STAGE3_CONTRACT_ACCESS_REQUIRED='+JSON.stringify(contractAccessRequired));
console.log('Stage 3 integration coverage matrix validation passed.');
