import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/marinetraffic-ais.service.ts');
const transport=read('src/integrations/marine-provider-transport.ts');
const evidence=read('src/integrations/marine-provider-evidence.ts');
const readiness=read('src/integrations/distress-ais-readiness.controller.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const render=read('../../render.yaml');
const inventory=read('scripts/production-integration-inventory.mjs');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');

for(const marker of [
  "requireOperational('DISTRESS_AIS', { allowSandbox: true })",
  'HYDROLAND_DISTRESS_AIS_PROVIDER',
  'MARINETRAFFIC_AIS_ONLY',
  'MARINETRAFFIC_API_KEY',
  '/api/exportvessel/',
  "url.searchParams.set('v', '6')",
  "url.searchParams.set('protocol', 'jsono')",
  "url.searchParams.set('timespan', String(AIS_PROVIDER_WINDOW_MINUTES))",
  'marineProviderJson',
  'speedRaw / 10',
  "source: 'MARINETRAFFIC'",
  'AIS_VESSEL_IDENTITY_MISMATCH',
  'AIS_TIMESTAMP_IN_FUTURE',
  'AIS_RESPONSE_AMBIGUOUS',
])if(!service.includes(marker))throw new Error(`MarineTraffic AIS invariant missing: ${marker}`);
for(const marker of ["method: 'GET'","redirect: 'manual'",'MARINE_REQUEST_TIMEOUT_MS = 8_000','MARINE_RESPONSE_LIMIT_BYTES = 262_144','https://services.marinetraffic.com','D03_MARINE_TEST_CONFIRM'])if(!transport.includes(marker))throw new Error(`Bounded marine transport invariant missing: ${marker}`);
for(const marker of ['OPERATIONAL_FRESHNESS_POLICY_NOT_VERIFIED',"'STALE'", "'UNASSESSED'",'operationalUseAllowed: false'])if(!evidence.includes(marker))throw new Error(`AIS assessment boundary missing: ${marker}`);

for(const prohibited of ["method:'POST'","method:'PUT'","method:'PATCH'","method:'DELETE'",'sendDistress','triggerDistress','acknowledgeDistress','mayday']){
  if((service+transport).replace(/\s+/g,'').includes(prohibited.replace(/\s+/g,'')))throw new Error(`AIS-only adapter contains prohibited distress/write capability: ${prohibited}`);
}

for(const marker of [
  '@UseGuards(AccessTokenGuard,AdminGuard)',
  "@Get('distress-ais')",
  "this.integrations.status('DISTRESS_AIS')",
  "aisProviderConfigured:provider==='MARINETRAFFIC_AIS_ONLY'",
  'aisCredentialsConfigured:/^[0-9a-f]{40}$/i.test',
  'const aisReady=false',
  'aisConfigured',
  "this.integrations.marineReadiness('DISTRESS_AIS',aisConfigured)",
  'distressProviderConfigured:false',
  'distressReady:false',
  'productionReady:false',
  'AIS situational awareness only; distress signaling is not implemented.',
])if(!readiness.includes(marker))throw new Error(`DISTRESS_AIS partial-readiness invariant missing: ${marker}`);
if(/MARINETRAFFIC_API_KEY\s*[:,]/.test(readiness))throw new Error('AIS readiness must not expose the MarineTraffic API key.');

for(const marker of ['AdminModule','AuthModule','MarineTrafficAisService','DistressAisReadinessController'])if(!moduleFile.includes(marker))throw new Error(`Integration module AIS registration missing: ${marker}`);
for(const key of ['HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS','HYDROLAND_DISTRESS_AIS_PROVIDER','MARINETRAFFIC_API_KEY'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing AIS activation input: ${key}`);
for(const marker of [
  "const adminRead = path => read(path, { headers })",
  "adminRead('/health/integrations/distress-ais')",
  'DISTRESS_AIS:DISTRESS_PROVIDER_REQUIRED',
  'STAGE3_DISTRESS_AIS_READINESS=',
])if(!inventory.includes(marker))throw new Error(`Stage 3 AIS inventory marker missing: ${marker}`);

const partialCoverageBlock=coverage.match(/const partialCoverage=\{([^}]+)\};/)?.[1]||'';
if(!partialCoverageBlock.includes("DISTRESS_AIS:'MARINETRAFFIC_AIS_ONLY'"))throw new Error('DISTRESS_AIS partial AIS coverage declaration is missing.');
if(!coverage.includes('DISTRESS_AIS partial AIS evidence missing'))throw new Error('DISTRESS_AIS partial AIS evidence guard is missing.');
const providerSelectionBlock=coverage.match(/const providerSelectionRequired=\[([\s\S]*?)\];/)?.[1]||'';
const contractAccessBlock=coverage.match(/const contractAccessRequired=\[([\s\S]*?)\];/)?.[1]||'';
if(!providerSelectionBlock.includes("'CERTIFICATION'")||!providerSelectionBlock.includes("'DISTRESS_AIS'"))throw new Error('Provider/capability selection classification must retain CERTIFICATION and DISTRESS_AIS.');
if(!contractAccessBlock.includes("'NAFATH'")||!contractAccessBlock.includes("'REGULATORY'"))throw new Error('Contract/access classification must retain NAFATH and REGULATORY.');
if(contractAccessBlock.includes("'DISTRESS_AIS'"))throw new Error('DISTRESS_AIS must remain a provider/capability-selection blocker, not a contract-access-only blocker.');

console.log('MarineTraffic AIS-only Stage 3 validation passed.');
