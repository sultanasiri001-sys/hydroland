import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const types=read('src/integrations/integration.types.ts');
const service=read('src/integrations/integration.service.ts');
const health=read('src/health/health.controller.ts');
const settlement=read('src/payments/settlement-readiness.controller.ts');
const distress=read('src/integrations/distress-ais-readiness.controller.ts');
const onboarding=read('src/integrations/official-onboarding-readiness.controller.ts');
const inventory=read('scripts/production-integration-inventory.mjs');

for(const marker of [
  'interface IntegrationReadinessPayload',
  'locallyConfigured:boolean',
  'productionReady:boolean',
  'sandboxReady:boolean',
  'checks:Record<string,boolean>',
  'interface DistressAisReadinessPayload',
  'aisReady:boolean',
  'distressReady:boolean',
  'interface OfficialOnboardingReadinessPayload',
  'contractAccessReady:boolean',
  'blocker:string',
  'interface MapsPublicConfigPayload',
  'enabled:boolean',
  'styleUrl:string|null',
  'interface WeatherPublicConfigPayload',
  'configured:boolean',
  'sandbox:boolean',
])if(!types.includes(marker))throw new Error(`Readiness payload type contract missing: ${marker}`);

for(const marker of [
  'publicMapConfig():MapsPublicConfigPayload',
  'publicWeatherConfig():WeatherPublicConfigPayload',
])if(!service.includes(marker))throw new Error(`Public integration config is not bound to its payload contract: ${marker}`);

for(const method of [
  'getPaymentReadiness','getEmailReadiness','getSmsReadiness','getWhatsAppReadiness',
  'getObjectStorageReadiness','getTranslationReadiness','getEsignReadiness',
]){
  if(!health.includes(`${method}():IntegrationReadinessPayload`))throw new Error(`${method} is not bound to IntegrationReadinessPayload.`);
}
if(!settlement.includes('getSettlementReadiness():IntegrationReadinessPayload'))throw new Error('Settlement readiness is not bound to IntegrationReadinessPayload.');
if(!distress.includes('getDistressAisReadiness():DistressAisReadinessPayload'))throw new Error('DISTRESS_AIS readiness is not bound to DistressAisReadinessPayload.');
for(const method of ['getNafathReadiness','getRegulatoryReadiness']){
  if(!onboarding.includes(`${method}():OfficialOnboardingReadinessPayload`))throw new Error(`${method} is not bound to OfficialOnboardingReadinessPayload.`);
}

const inventoryExpectations=[
  'item.key','item.category','item.status','item.requiresHumanApproval','item.supportsWebhook',
  'maps?.engine','maps?.status','maps?.provider','maps?.enabled','maps?.attribution','maps?.styleUrl',
  'weather?.status','weather?.provider','weather?.configured','weather?.sandbox',
  'value?.status','value?.provider','value?.locallyConfigured','value?.productionReady','value?.sandboxReady','value?.checks',
  'distressAis?.aisReady','distressAis?.distressReady','distressAis?.productionReady',
  'value?.contractAccessReady','value?.blocker',
];
for(const marker of inventoryExpectations){
  if(!inventory.includes(marker))throw new Error(`Production inventory payload expectation changed without contract review: ${marker}`);
}

console.log('STAGE3_READINESS_PAYLOAD_CONTRACTS=typed');
console.log('Stage 3 readiness payload contract validation passed.');
