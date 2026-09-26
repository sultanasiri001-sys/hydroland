import fs from 'node:fs';
const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/integrations/signit-esign.service.ts');
const moduleFile=read('src/integrations/integration.module.ts');
const render=read('../../render.yaml');
for(const marker of [
  "requireOperational('ESIGN',{allowSandbox:true})",
  "HYDROLAND_ESIGN_PROVIDER",
  "SIGNIT_API_KEY",
  "https://api.signit.sa",
  "Authorization:`Bearer ${apiKey}`",
  "method:'POST'",
  "document_url:documentUrl",
  "role:'signer'",
  "/documents/${encodeURIComponent(id)}/status",
  "HYDROLAND_ESIGN_DOCUMENT_HOSTS",
  "url.protocol!=='https:'",
  "!allowed.length||!allowed.includes(url.hostname.toLowerCase())",
  'AbortSignal.timeout(10_000)',
  'AbortSignal.timeout(8_000)',
])if(!service.includes(marker))throw new Error(`Signit e-sign invariant missing: ${marker}`);
if(!moduleFile.includes('SignitEsignService')||!moduleFile.includes('exports:[IntegrationService,EmailDeliveryService,UnifonicMessagingService,SignitEsignService]'))throw new Error('Signit e-sign service is not exported by IntegrationModule.');
for(const key of ['HYDROLAND_INTEGRATION_ESIGN_STATUS','HYDROLAND_ESIGN_PROVIDER','SIGNIT_API_KEY','HYDROLAND_ESIGN_DOCUMENT_HOSTS'])if(!render.includes(`key: ${key}`))throw new Error(`Render blueprint missing e-sign activation input: ${key}`);
if(service.includes('console.log')||service.includes('console.error'))throw new Error('E-sign adapter must not log provider credentials or document payloads.');
console.log('Signit e-sign validation passed.');
