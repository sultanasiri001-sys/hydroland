import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const legacyService=read('src/credentials/credentials.service.ts');
const evidenceService=read('src/credentials/certification-verification-evidence.service.ts');
const controller=read('src/credentials/credentials.controller.ts');
const integrations=read('src/integrations/integration.service.ts');
const coverage=read('scripts/stage3-integration-coverage-validation.mjs');
const inventory=read('scripts/production-integration-inventory.mjs');
const docs=fs.readFileSync(new URL('../../../docs/STAGE3_INTEGRATION_COVERAGE.md',import.meta.url),'utf8');

for(const marker of [
  'ExternalCertificationVerificationInput',
  "source:'PADI'|'SSI'",
  "method:'ECARD'|'QR'",
  "source==='PADI'&&method!=='ECARD'",
  "source==='SSI'&&method!=='QR'",
  "url.protocol!=='https:'||url.username||url.password",
  "host==='padi.com'||host.endsWith('.padi.com')",
  "host==='divessi.com'||host.endsWith('.divessi.com')",
  'checkedAtDate.getTime()>Date.now()+5*60_000',
  'externalVerificationEvidence:externalVerification',
  "reviewer.personId===credential.personId",
])if(!legacyService.includes(marker))throw new Error(`Legacy manual certification verification invariant missing: ${marker}`);

for(const source of ['SWSDF','PADI','SSI','NAUI','RAID','SDI','TDI','IANTD','GUE','CMAS','BSAC']){
  if(!evidenceService.includes(`source:'${source}'`))throw new Error(`Saudi diving agency verification catalog missing: ${source}`);
}
for(const marker of [
  'https://swsdf.sa/diving/license-validation',
  'https://www.naui.org/services/verify-diver-certification/',
  'https://diveraid.com/find-a-dive-centre/',
  'https://www.tdisdi.com/cert-search/',
  'https://www.iantd.com/',
  'https://www.gue.com/verifycard',
  'https://portal.cmas.org/certifications',
  'https://www.bsac.com/mybsac/mybsac-guide/mybsac-digital-cards/',
  "host===root||host.endsWith('.'+root)",
  "reviewer.personId===credential.personId",
  'CREDENTIAL_EXTERNAL_VERIFICATION_EVIDENCE_RECORDED',
  'decisionRequired:true',
])if(!evidenceService.includes(marker))throw new Error(`Diving agency verification evidence invariant missing: ${marker}`);

for(const marker of [
  "@Get('verification-organizations')",
  "@Post('admin/:id/external-verification-evidence')",
  "source:'SWSDF'|'PADI'|'SSI'|'NAUI'|'RAID'|'SDI'|'TDI'|'IANTD'|'GUE'|'CMAS'|'BSAC'",
  'CertificationVerificationEvidenceService',
])if(!controller.includes(marker))throw new Error(`Credential verification API catalog marker missing: ${marker}`);

if(evidenceService.includes('fetch('))throw new Error('Verification evidence catalog must not call unapproved external APIs.');
for(const secret of ['PADI_API_KEY','SSI_API_KEY','NAUI_API_KEY','RAID_API_KEY','SDI_API_KEY','TDI_API_KEY','IANTD_API_KEY','GUE_API_KEY','CMAS_API_KEY','BSAC_API_KEY']){
  if(evidenceService.includes(secret))throw new Error(`Verification evidence catalog must not invent provider credential: ${secret}`);
}

const row=integrations.match(/\{key:'CERTIFICATION'[^}]+\}/)?.[0]||'';
if(!row.includes("status:'NOT_SELECTED'"))throw new Error('CERTIFICATION must remain NOT_SELECTED until an approved automated provider contract exists.');
for(const marker of [
  "CERTIFICATION:'MANUAL_OFFICIAL_VERIFICATION'",
  "providerSelectionRequired=['CERTIFICATION','DISTRESS_AIS']",
  'CERTIFICATION partial manual-verification evidence missing',
])if(!coverage.includes(marker))throw new Error(`Stage 3 certification partial-coverage marker missing: ${marker}`);
if(!inventory.includes('CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED'))throw new Error('Production inventory must retain the certification automation blocker.');

for(const marker of ['SWSDF','PADI','SSI','NAUI','RAID','SDI / TDI','IANTD','GUE','CMAS','BSAC','does **not** make `CERTIFICATION` code-ready']){
  if(!docs.includes(marker))throw new Error(`Certification boundary documentation missing: ${marker}`);
}

console.log('Saudi diving agency manual verification catalog validation passed.');
