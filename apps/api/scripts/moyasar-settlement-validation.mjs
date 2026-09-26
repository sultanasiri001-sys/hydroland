import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/payments/moyasar-settlement-provider.service.ts');
const controller=read('src/payments/settlement-readiness.controller.ts');
const moduleFile=read('src/payments/payments.module.ts');
const render=read('../../render.yaml');
const inventory=read('scripts/production-integration-inventory.mjs');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');

for(const marker of [
  "requireOperational('BANKING_SETTLEMENT',{allowSandbox:true})",
  "HYDROLAND_SETTLEMENT_PROVIDER",
  "'MOYASAR'",
  'MOYASAR_SECRET_KEY',
  "https://api.moyasar.com/v1/",
  "method:'GET'",
  "Buffer.from(`${secret}:`).toString('base64')",
  'AbortSignal.timeout(8_000)',
  '/settlements?page=',
  '/lines?page=',
  'encodeURIComponent(id)',
])if(!service.includes(marker))throw new Error(`Moyasar settlement invariant missing: ${marker}`);

for(const prohibited of ["method:'POST'","method:'PUT'","method:'PATCH'","method:'DELETE'",'/payouts','createPayout','sendPayout']){
  if(service.includes(prohibited))throw new Error(`Settlement adapter contains prohibited money-movement capability: ${prohibited}`);
}

for(const marker of [
  "@Get('settlement')",
  "this.integrations.status('BANKING_SETTLEMENT')",
  "providerConfigured:provider==='MOYASAR'",
  'credentialsConfigured:Boolean(process.env.MOYASAR_SECRET_KEY?.trim())',
  'productionReady:',
  'sandboxReady:',
])if(!controller.includes(marker))throw new Error(`Settlement readiness invariant missing: ${marker}`);
if(/MOYASAR_SECRET_KEY\s*[:,]/.test(controller))throw new Error('Settlement readiness must not expose the Moyasar secret key.');

for(const marker of ['MoyasarSettlementProviderService','SettlementReadinessController'])if(!moduleFile.includes(marker))throw new Error(`Payments module settlement registration missing: ${marker}`);
for(const key of ['HYDROLAND_INTEGRATION_BANKING_SETTLEMENT_STATUS','HYDROLAND_SETTLEMENT_PROVIDER'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing settlement activation input: ${key}`);
for(const marker of [
  "read('/health/integrations/settlement')",
  'BANKING_SETTLEMENT:PRODUCTION_NOT_READY',
  'STAGE3_SETTLEMENT_READINESS=',
])if(!inventory.includes(marker))throw new Error(`Stage 3 settlement inventory marker missing: ${marker}`);
for(const marker of ["'BANKING_SETTLEMENT'","BANKING_SETTLEMENT:[settlement","'CERTIFICATION','DISTRESS_AIS','NAFATH','REGULATORY'"])if(!coverage.includes(marker))throw new Error(`Stage 3 settlement coverage marker missing: ${marker}`);

console.log('Moyasar read-only settlement reconciliation validation passed.');
