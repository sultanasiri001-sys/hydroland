import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/padi-ecard-evidence.service.ts');
const readiness=read('src/integrations/certification-readiness.controller.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const inventory=read('scripts/production-integration-inventory.mjs');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');

for(const marker of [
  "hostname.toLowerCase()!=='livewebservices.padi.com'",
  'ecard-webservices',
  'ecardVerify',
  "url.searchParams.get('acid')",
  "url.searchParams.get('at')",
  "createHash('sha256')",
  "provider:'PADI'",
  "evidenceType:'ECARD_VERIFICATION_LINK'",
  "humanReviewRequired:true",
  "apiVerified:false",
])if(!service.includes(marker))throw new Error(`PADI eCard evidence invariant missing: ${marker}`);

for(const prohibited of ['fetch(','axios','console.log','console.error','apiVerified:true','humanReviewRequired:false']){
  if(service.includes(prohibited))throw new Error(`PADI evidence boundary contains prohibited automated-verification behavior: ${prohibited}`);
}
if(/return\{[\s\S]*?(canonical|raw|acid|\bat\b)[,:]/.test(service))throw new Error('PADI evidence descriptor must not return the raw verification URL or query-token values.');

for(const marker of [
  "@Get('certification')",
  "this.integrations.status('CERTIFICATION')",
  "partialProvider:'PADI_ECARD_HUMAN_VERIFICATION'",
  'padiEvidenceUrlValidationReady:true',
  'automatedApiVerificationReady:false',
  'humanReviewRequired:true',
  'productionReady:false',
  "blocker:'OFFICIAL_CERTIFICATION_API_CONTRACT_REQUIRED'",
])if(!readiness.includes(marker))throw new Error(`CERTIFICATION partial readiness invariant missing: ${marker}`);

const controllersBlock=moduleFile.match(/controllers:\[([^\]]+)\]/)?.[1]||'';
const providersBlock=moduleFile.match(/providers:\[([^\]]+)\]/)?.[1]||'';
const exportsBlock=moduleFile.match(/exports:\[([^\]]+)\]/)?.[1]||'';
if(!controllersBlock.includes('CertificationReadinessController'))throw new Error('CertificationReadinessController is not registered.');
if(!providersBlock.includes('PadiEcardEvidenceService')||!exportsBlock.includes('PadiEcardEvidenceService'))throw new Error('PadiEcardEvidenceService is not registered/exported.');

for(const marker of [
  "read('/health/integrations/certification')",
  'CERTIFICATION:OFFICIAL_API_CONTRACT_REQUIRED',
  'STAGE3_CERTIFICATION_READINESS=',
])if(!inventory.includes(marker))throw new Error(`Stage 3 certification inventory marker missing: ${marker}`);

const partialCoverageBlock=coverage.match(/const partialCoverage=\{([^}]+)\}/)?.[1]||'';
const providerSelectionBlock=coverage.match(/const providerSelectionRequired=\[([\s\S]*?)\];/)?.[1]||'';
if(!partialCoverageBlock.includes("CERTIFICATION:'PADI_ECARD_HUMAN_VERIFICATION'"))throw new Error('PADI eCard partial certification coverage is missing.');
if(!providerSelectionBlock.includes("'CERTIFICATION'"))throw new Error('CERTIFICATION must remain provider-selection-required until an official API contract is implemented.');
if(!coverage.includes('CERTIFICATION partial PADI evidence boundary missing'))throw new Error('Stage 3 coverage does not validate the PADI evidence boundary.');

console.log('PADI eCard evidence Stage 3 validation passed.');
