import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const readRoot=(path)=>fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8');

const integrations=read('src/integrations/integration.service.ts');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');
const inventory=read('scripts/production-integration-inventory.mjs');
const certification=read('scripts/certification-manual-verification-validation.mjs');
const marineTraffic=read('src/integrations/marinetraffic-ais.service.ts');
const distressReadiness=read('src/integrations/distress-ais-readiness.controller.ts');
const onboarding=read('src/integrations/official-onboarding-readiness.controller.ts');
const mainIntegrity=readRoot('.github/workflows/stage3-main-integrity.yml');

const codeReady=[
  'WEATHER_MARINE','EMAIL','SMS','WHATSAPP','PAYMENT_PSP','BANKING_SETTLEMENT',
  'OBJECT_STORAGE','TRANSLATION_ENGINE','MAPS_GEO','ESIGN',
];
const partial=[
  ['CERTIFICATION','MANUAL_OFFICIAL_VERIFICATION'],
  ['DISTRESS_AIS','MARINETRAFFIC_AIS_ONLY'],
];
const externalContractRequired=['NAFATH','REGULATORY'];
const all=[...codeReady,...partial.map(([key])=>key),...externalContractRequired];

for(const key of all){
  if(!integrations.includes(`key:'${key}'`))throw new Error(`Stage 3 catalog key missing: ${key}`);
}
if(all.length!==14||new Set(all).size!==14)throw new Error('Stage 3 technical closure partition must contain exactly 14 unique integrations.');

for(const key of codeReady){
  if(!coverage.includes(`'${key}'`))throw new Error(`Code-ready integration missing from Stage 3 coverage: ${key}`);
}
for(const [key,mode] of partial){
  if(!coverage.includes(`${key}:'${mode}'`))throw new Error(`Partial coverage contract missing: ${key} -> ${mode}`);
}
for(const key of externalContractRequired){
  if(!coverage.includes(`'${key}'`))throw new Error(`External contract dependency missing from Stage 3 coverage: ${key}`);
}

for(const marker of [
  "CERTIFICATION:'MANUAL_OFFICIAL_VERIFICATION'",
  "providerSelectionRequired=['CERTIFICATION','DISTRESS_AIS']",
  "contractAccessRequired=['NAFATH','REGULATORY']",
  "partialCoverage={CERTIFICATION:'MANUAL_OFFICIAL_VERIFICATION',DISTRESS_AIS:'MARINETRAFFIC_AIS_ONLY'}",
])if(!coverage.includes(marker))throw new Error(`Stage 3 closure classification marker missing: ${marker}`);

for(const marker of [
  "if(!row.includes(\"status:'NOT_SELECTED'\"))throw new Error('CERTIFICATION must remain NOT_SELECTED until an approved automated provider contract exists.')",
  'CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED',
]){
  if(!(certification.includes(marker)||inventory.includes(marker)))throw new Error(`Certification external boundary marker missing: ${marker}`);
}

for(const marker of [
  "requireOperational('DISTRESS_AIS',{allowSandbox:true})",
  'MARINETRAFFIC_AIS_ONLY',
  'MARINETRAFFIC_API_KEY',
])if(!marineTraffic.includes(marker))throw new Error(`MarineTraffic AIS boundary marker missing: ${marker}`);
for(const marker of [
  'distressProviderConfigured:false',
  'distressReady:false',
  'productionReady:false',
  'AIS situational awareness only; distress signaling is not implemented.',
])if(!distressReadiness.includes(marker))throw new Error(`DISTRESS_AIS safety boundary missing: ${marker}`);

for(const marker of [
  "providerSelected:provider==='NAFATH'",
  'HYDROLAND_NAFATH_ACCESS_APPROVED',
  'NAFATH_OIDC_ISSUER',
  'NAFATH_CLIENT_ID',
  'NAFATH_CLIENT_SECRET',
  'adapterImplemented:false',
  'APPROVED_NAFATH_CONTRACT_AND_ADAPTER_REQUIRED',
  "providerSelected:provider==='SAUDI_MINISTRY_OF_TOURISM'",
  'HYDROLAND_REGULATORY_ACCESS_APPROVED',
  'SAUDI_TOURISM_API_BASE_URL',
  'SAUDI_TOURISM_API_TOKEN',
  'SAUDI_TOURISM_LICENSING_CONTRACT_VERSION',
  'LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED',
])if(!onboarding.includes(marker))throw new Error(`Official onboarding boundary missing: ${marker}`);

for(const marker of [
  'Validate MarineTraffic AIS boundary',
  'Validate internal distress workflow',
  'Validate certification manual verification',
  'Validate official onboarding boundaries',
])if(!mainIntegrity.includes(marker))throw new Error(`Stage 3 Main Integrity Gate missing closure validation: ${marker}`);

for(const blocker of [
  'CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED',
  'DISTRESS_AIS:FULL_DISTRESS_PROVIDER_REQUIRED',
  'NAFATH:APPROVED_CONTRACT_AND_ADAPTER_REQUIRED',
  'REGULATORY:LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED',
])if(!inventory.includes(blocker))throw new Error(`Production inventory blocker missing: ${blocker}`);

const result={
  stage:3,
  technicalReady:true,
  productionReady:false,
  integrations:{
    total:14,
    codeReady,
    partial:Object.fromEntries(partial),
    externalContractRequired,
  },
  productionBlockers:[
    'CERTIFICATION_AUTOMATED_PROVIDER_CONTRACT',
    'DISTRESS_EXTERNAL_PROVIDER_AND_CONTRACT',
    'NAFATH_APPROVED_ACCESS_AND_ADAPTER',
    'SAUDI_TOURISM_LICENSING_API_CONTRACT_AND_ADAPTER',
  ],
};

console.log('STAGE3_TECHNICAL_CLOSURE='+JSON.stringify(result));
console.log('Stage 3 technical closure validation passed.');
