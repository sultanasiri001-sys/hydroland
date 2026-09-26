import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const controller=read('src/integrations/official-onboarding-readiness.controller.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const render=read('../../render.yaml');
const inventory=read('scripts/production-integration-inventory.mjs');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');

for(const marker of [
  '@UseGuards(AccessTokenGuard,AdminGuard)',
  "@Get('nafath')",
  "this.integrations.status('NAFATH')",
  "providerSelected:provider==='NAFATH'",
  'HYDROLAND_NAFATH_ACCESS_APPROVED',
  'NAFATH_OIDC_ISSUER',
  'NAFATH_CLIENT_ID',
  'NAFATH_CLIENT_SECRET',
  'adapterImplemented:false',
  'productionReady:false',
  "blocker:'APPROVED_NAFATH_CONTRACT_AND_ADAPTER_REQUIRED'",
  "@Get('regulatory')",
  "this.integrations.status('REGULATORY')",
  "providerSelected:provider==='SAUDI_MINISTRY_OF_TOURISM'",
  'HYDROLAND_REGULATORY_ACCESS_APPROVED',
  'SAUDI_TOURISM_API_BASE_URL',
  'SAUDI_TOURISM_API_TOKEN',
  'SAUDI_TOURISM_LICENSING_CONTRACT_VERSION',
  "blocker:'LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED'",
])if(!controller.includes(marker))throw new Error(`Official onboarding readiness invariant missing: ${marker}`);

for(const secret of ['NAFATH_CLIENT_SECRET','SAUDI_TOURISM_API_TOKEN']){
  const directExposure=new RegExp(`${secret}\\s*[:,]`);
  if(directExposure.test(controller))throw new Error(`Official onboarding readiness may expose secret value: ${secret}`);
}

const controllersBlock=moduleFile.match(/controllers:\[([^\]]+)\]/)?.[1]||'';
if(!moduleFile.includes('AdminModule')||!moduleFile.includes('AuthModule')||!moduleFile.includes('OfficialOnboardingReadinessController')||!controllersBlock.includes('OfficialOnboardingReadinessController'))throw new Error('Official onboarding readiness authorization/registration is incomplete.');

for(const key of [
  'HYDROLAND_INTEGRATION_NAFATH_STATUS','HYDROLAND_NAFATH_PROVIDER','HYDROLAND_NAFATH_ACCESS_APPROVED',
  'NAFATH_OIDC_ISSUER','NAFATH_CLIENT_ID','NAFATH_CLIENT_SECRET',
  'HYDROLAND_INTEGRATION_REGULATORY_STATUS','HYDROLAND_REGULATORY_PROVIDER','HYDROLAND_REGULATORY_ACCESS_APPROVED',
  'SAUDI_TOURISM_API_BASE_URL','SAUDI_TOURISM_API_TOKEN','SAUDI_TOURISM_LICENSING_CONTRACT_VERSION',
])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing official onboarding input: ${key}`);

for(const marker of [
  "const adminRead = path => read(path, { headers })",
  "adminRead('/health/integrations/nafath')",
  "adminRead('/health/integrations/regulatory')",
  'NAFATH:APPROVED_CONTRACT_AND_ADAPTER_REQUIRED',
  'REGULATORY:LICENSING_API_CONTRACT_AND_ADAPTER_REQUIRED',
  'STAGE3_NAFATH_ONBOARDING=',
  'STAGE3_REGULATORY_ONBOARDING=',
])if(!inventory.includes(marker))throw new Error(`Stage 3 official onboarding inventory marker missing: ${marker}`);

for(const marker of [
  "const providerSelectionRequired=['CERTIFICATION','DISTRESS_AIS']",
  "const contractAccessRequired=['NAFATH','REGULATORY']",
  '...providerSelectionRequired,...contractAccessRequired',
  'STAGE3_CONTRACT_ACCESS_REQUIRED=',
])if(!coverage.includes(marker))throw new Error(`Stage 3 official onboarding coverage marker missing: ${marker}`);

console.log('Official Stage 3 onboarding readiness validation passed.');
