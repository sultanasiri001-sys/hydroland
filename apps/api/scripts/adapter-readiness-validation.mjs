import fs from 'node:fs';

const health = fs.readFileSync(new URL('../src/health/health.controller.ts', import.meta.url), 'utf8');
const inventory = fs.readFileSync(new URL('./production-integration-inventory.mjs', import.meta.url), 'utf8');

const healthMarkers = [
  "@Get('integrations/object-storage')",
  "this.integrations.status('OBJECT_STORAGE')",
  "providerConfigured: provider === 'CLOUDFLARE_R2'",
  "accountConfigured: Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim())",
  "bucketConfigured: Boolean(process.env.CLOUDFLARE_R2_BUCKET?.trim())",
  "accessKeyConfigured: Boolean(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim())",
  "secretConfigured: Boolean(process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim())",
  "@Get('integrations/translation')",
  "this.integrations.status('TRANSLATION_ENGINE')",
  "providerConfigured: provider === 'GOOGLE_CLOUD'",
  "credentialsConfigured: Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim())",
  "@Get('integrations/esign')",
  "this.integrations.status('ESIGN')",
  "providerConfigured: provider === 'SIGNIT'",
  "credentialsConfigured: Boolean(process.env.SIGNIT_API_KEY?.trim())",
  "documentHostsConfigured: Boolean(process.env.HYDROLAND_ESIGN_DOCUMENT_HOSTS?.trim())",
];
for (const marker of healthMarkers) {
  if (!health.includes(marker)) throw new Error(`Adapter readiness marker missing: ${marker}`);
}

for (const secret of ['CLOUDFLARE_R2_SECRET_ACCESS_KEY','GOOGLE_CLOUD_TRANSLATION_API_KEY','SIGNIT_API_KEY']) {
  const directExposure = new RegExp(`${secret}\\s*[:,]`);
  if (directExposure.test(health)) throw new Error(`Health response may expose secret value: ${secret}`);
}

const inventoryMarkers = [
  "read('/health/integrations/object-storage')",
  "read('/health/integrations/translation')",
  "read('/health/integrations/esign')",
  "OBJECT_STORAGE:PRODUCTION_NOT_READY",
  "TRANSLATION_ENGINE:PRODUCTION_NOT_READY",
  "ESIGN:PRODUCTION_NOT_READY",
  "STAGE3_OBJECT_STORAGE_READINESS=",
  "STAGE3_TRANSLATION_READINESS=",
  "STAGE3_ESIGN_READINESS=",
];
for (const marker of inventoryMarkers) {
  if (!inventory.includes(marker)) throw new Error(`Stage 3 inventory marker missing: ${marker}`);
}

console.log('Stage 3 adapter readiness validation passed.');
