import fs from 'node:fs';

const readiness = fs.readFileSync(new URL('../src/health/integration-readiness.controller.ts', import.meta.url), 'utf8');
const inventory = fs.readFileSync(new URL('./production-integration-inventory.mjs', import.meta.url), 'utf8');

const readinessMarkers = [
  "@UseGuards(AccessTokenGuard,AdminGuard)",
  "@Get('email')",
  "this.integrations.status('EMAIL')",
  "providerConfigured: provider === 'RESEND'",
  "credentialsConfigured: Boolean(process.env.RESEND_API_KEY?.trim())",
  "senderConfigured: Boolean(process.env.HYDROLAND_EMAIL_FROM?.trim())",
  "@Get('sms')",
  "this.integrations.status('SMS')",
  "providerConfigured:provider==='UNIFONIC'",
  "credentialsConfigured:Boolean(process.env.UNIFONIC_SMS_APPSID?.trim())",
  "senderConfigured:Boolean(process.env.UNIFONIC_SMS_SENDER_ID?.trim())",
  "@Get('whatsapp')",
  "this.integrations.status('WHATSAPP')",
  "publicIdConfigured:Boolean(process.env.UNIFONIC_WHATSAPP_PUBLIC_ID?.trim())",
  "secretConfigured:Boolean(process.env.UNIFONIC_WHATSAPP_SECRET?.trim())",
  'productionReady:',
  'sandboxReady:',
];
for (const marker of readinessMarkers) {
  if (!readiness.includes(marker)) throw new Error(`Messaging readiness marker missing: ${marker}`);
}

for (const secret of ['RESEND_API_KEY','UNIFONIC_SMS_APPSID','UNIFONIC_WHATSAPP_SECRET']) {
  const directExposure = new RegExp(`${secret}\\s*[:,]`);
  if (directExposure.test(readiness)) throw new Error(`Readiness response may expose secret value: ${secret}`);
}

const inventoryMarkers = [
  "read('/health/integrations/email')",
  "read('/health/integrations/sms')",
  "read('/health/integrations/whatsapp')",
  "EMAIL:PRODUCTION_NOT_READY",
  "SMS:PRODUCTION_NOT_READY",
  "WHATSAPP:PRODUCTION_NOT_READY",
  "STAGE3_EMAIL_READINESS=",
  "STAGE3_SMS_READINESS=",
  "STAGE3_WHATSAPP_READINESS=",
];
for (const marker of inventoryMarkers) {
  if (!inventory.includes(marker)) throw new Error(`Stage 3 inventory marker missing: ${marker}`);
}

console.log('Stage 3 messaging readiness validation passed.');
