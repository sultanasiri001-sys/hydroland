import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/credentials/credentials.service.ts');
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
])if(!service.includes(marker))throw new Error(`Manual certification verification invariant missing: ${marker}`);

for(const marker of [
  "source:'PADI'|'SSI'",
  "method:'ECARD'|'QR'",
  'externalVerification?:',
])if(!controller.includes(marker))throw new Error(`Credential decision API evidence contract missing: ${marker}`);

if(service.includes('fetch('))throw new Error('Manual certification verification must not call an unapproved external API.');
if(service.includes('PADI_API_KEY')||service.includes('SSI_API_KEY'))throw new Error('Manual certification verification must not introduce invented provider credentials.');

const row=integrations.match(/\{key:'CERTIFICATION'[^}]+\}/)?.[0]||'';
if(!row.includes("status:'NOT_SELECTED'"))throw new Error('CERTIFICATION must remain NOT_SELECTED until an approved automated provider contract exists.');

for(const marker of [
  "CERTIFICATION:'MANUAL_OFFICIAL_VERIFICATION'",
  "providerSelectionRequired=['CERTIFICATION','DISTRESS_AIS']",
  'CERTIFICATION partial manual-verification evidence missing',
])if(!coverage.includes(marker))throw new Error(`Stage 3 certification partial-coverage marker missing: ${marker}`);

if(!inventory.includes('CERTIFICATION:AUTOMATED_PROVIDER_REQUIRED'))throw new Error('Production inventory must retain the certification automation blocker.');
for(const marker of ['PADI — eCard verification evidence only.','SSI — QR verification evidence only.','does **not** make `CERTIFICATION` code-ready'])if(!docs.includes(marker))throw new Error(`Certification boundary documentation missing: ${marker}`);

console.log('Manual official certification verification validation passed.');
