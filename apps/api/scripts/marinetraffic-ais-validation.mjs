import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/marinetraffic-ais.service.ts');
const readiness=read('src/integrations/distress-ais-readiness.controller.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const render=read('../../render.yaml');
const inventory=read('scripts/production-integration-inventory.mjs');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');

for(const marker of [
  "requireOperational('DISTRESS_AIS',{allowSandbox:true})",
  'HYDROLAND_DISTRESS_AIS_PROVIDER',
  'MARINETRAFFIC_AIS_ONLY',
  'MARINETRAFFIC_API_KEY',
  'https://services.marinetraffic.com/api/exportvessel/',
  "url.searchParams.set('v','6')",
  "url.searchParams.set('protocol','jsono')",
  "method:'GET'",
  'AbortSignal.timeout(8_000)',
  'speedRaw/10',
  "source:'MARINETRAFFIC'",
])if(!service.includes(marker))throw new Error(`MarineTraffic AIS invariant missing: ${marker}`);

for(const prohibited of ["method:'POST'","method:'PUT'","method:'PATCH'","method:'DELETE'",'sendDistress','triggerDistress','acknowledgeDistress','mayday']){
  if(service.includes(prohibited))throw new Error(`AIS-only adapter contains prohibited distress/write capability: ${prohibited}`);
}

for(const marker of [
  "@Get('distress-ais')",
  "this.integrations.status('DISTRESS_AIS')",
  "aisProviderConfigured:provider==='MARINETRAFFIC_AIS_ONLY'",
  'aisCredentialsConfigured:Boolean(process.env.MARINETRAFFIC_API_KEY?.trim())',
  'distressProviderConfigured:false',
  'distressReady:false',
  'productionReady:false',
  'AIS situational awareness only; distress signaling is not implemented.',
])if(!readiness.includes(marker))throw new Error(`DISTRESS_AIS partial-readiness invariant missing: ${marker}`);
if(/MARINETRAFFIC_API_KEY\s*[:,]/.test(readiness))throw new Error('AIS readiness must not expose the MarineTraffic API key.');

for(const marker of ['MarineTrafficAisService','DistressAisReadinessController'])if(!moduleFile.includes(marker))throw new Error(`Integration module AIS registration missing: ${marker}`);
for(const key of ['HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS','HYDROLAND_DISTRESS_AIS_PROVIDER','MARINETRAFFIC_API_KEY'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing AIS activation input: ${key}`);
for(const marker of [
  "read('/health/integrations/distress-ais')",
  'DISTRESS_AIS:DISTRESS_PROVIDER_REQUIRED',
  'STAGE3_DISTRESS_AIS_READINESS=',
])if(!inventory.includes(marker))throw new Error(`Stage 3 AIS inventory marker missing: ${marker}`);
for(const marker of [
  "partialCoverage={DISTRESS_AIS:'MARINETRAFFIC_AIS_ONLY'}",
  "'CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'",
  'DISTRESS_AIS partial AIS evidence missing',
])if(!coverage.includes(marker))throw new Error(`Stage 3 AIS partial-coverage marker missing: ${marker}`);

console.log('MarineTraffic AIS-only Stage 3 validation passed.');
