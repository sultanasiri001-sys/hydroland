export function assertUatEnvironment(env = process.env) {
  if (env.HYDROLAND_UAT_ENABLED !== 'true') throw new Error('UAT_MODE_REQUIRED');
  const database = env.HYDROLAND_UAT_DATABASE;
  if (!/^hydroland_center_uat(?:_[a-z0-9]+)?$/.test(database ?? '')) throw new Error('UAT_DATABASE_NAME_REQUIRED');
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { throw new Error('UAT_DATABASE_URL_INVALID'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || decodeURIComponent(url.pathname.slice(1)) !== database || (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) throw new Error('UAT_DATABASE_MISMATCH');
  if (/dpg-dakd8g5g1s2s73bu70bg|dpg-db7v3mks728c739pb05g/.test(url.hostname)) throw new Error('UAT_PRODUCTION_OR_RESTORE_HOST_DENIED');
  if ((env.HYDROLAND_UAT_PASSWORD ?? '').length < 24 || (env.JWT_SECRET ?? '').length < 32) throw new Error('UAT_STRONG_SECRETS_REQUIRED');
  for (const [key, value] of Object.entries(env)) {
    if (!value?.trim()) continue;
    if (/^(MOYASAR_|RESEND_|UNIFONIC_|NAFATH_|CLOUDFLARE_|HYDROLAND_OBJECT_STORAGE_)/.test(key) || /^(GOOGLE_CLIENT_ID|STORMGLASS_API_KEY|MARINETRAFFIC_API_KEY|SAUDI_TOURISM_API_TOKEN|SIGNIT_API_KEY|GOOGLE_CLOUD_TRANSLATION_API_KEY)$/.test(key)) throw new Error('UAT_EXTERNAL_CREDENTIALS_DENIED: ' + key);
    if ((/^HYDROLAND_.*_PROVIDER$/.test(key) && value !== 'UNCONFIGURED') || (/^HYDROLAND_INTEGRATION_.*_STATUS$/.test(key) && value !== 'NOT_CONFIGURED')) throw new Error('UAT_EXTERNAL_PROVIDER_DENIED: ' + key);
  }
  return {database};
}
