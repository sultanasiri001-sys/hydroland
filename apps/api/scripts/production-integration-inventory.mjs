const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.E2E_ADMIN_PASSWORD;

if (!base?.startsWith('https://')) throw new Error('E2E_BASE_URL must use HTTPS.');
if (!email?.endsWith('@hydroland.test')) throw new Error('E2E_ADMIN_EMAIL must use @hydroland.test.');
if (!password) throw new Error('E2E_ADMIN_PASSWORD is required.');

async function read(path, options = {}) {
  const response = await fetch(`${base}/api/v1${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${path} failed: HTTP ${response.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

const login = await read('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login?.accessToken) throw new Error('Admin login returned no access token.');
const headers = { authorization: `Bearer ${login.accessToken}` };

const catalog = await read('/integrations/catalog', { headers });
if (!Array.isArray(catalog)) throw new Error('Integration catalog response is not an array.');

const safe = catalog.map(item => ({
  key: item.key,
  category: item.category,
  status: item.status,
  requiresHumanApproval: Boolean(item.requiresHumanApproval),
  supportsWebhook: Boolean(item.supportsWebhook),
}));
const counts = safe.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] ?? 0) + 1;
  return acc;
}, {});

const [maps, weather, payment, emailReadiness, sms, whatsapp, objectStorage, translation, esign] = await Promise.all([
  read('/integrations/maps/public-config'),
  read('/integrations/weather/public-config'),
  read('/health/integrations/payment'),
  read('/health/integrations/email'),
  read('/health/integrations/sms'),
  read('/health/integrations/whatsapp'),
  read('/health/integrations/object-storage'),
  read('/health/integrations/translation'),
  read('/health/integrations/esign'),
]);

const safeMaps = {
  engine: maps?.engine ?? null,
  status: maps?.status ?? null,
  provider: maps?.provider ?? null,
  enabled: Boolean(maps?.enabled),
  attributionConfigured: Boolean(maps?.attribution),
  styleConfigured: Boolean(maps?.styleUrl),
};
const safeWeather = {
  status: weather?.status ?? null,
  provider: weather?.provider ?? null,
  configured: Boolean(weather?.configured),
  sandbox: Boolean(weather?.sandbox),
};
const sanitizeReadiness = value => ({
  status: value?.status ?? null,
  provider: value?.provider ?? null,
  locallyConfigured: Boolean(value?.locallyConfigured),
  productionReady: Boolean(value?.productionReady),
  sandboxReady: Boolean(value?.sandboxReady),
  checks: value?.checks ?? {},
});
const safePayment = sanitizeReadiness(payment);
const safeEmail = sanitizeReadiness(emailReadiness);
const safeSms = sanitizeReadiness(sms);
const safeWhatsApp = sanitizeReadiness(whatsapp);
const safeObjectStorage = sanitizeReadiness(objectStorage);
const safeTranslation = sanitizeReadiness(translation);
const safeEsign = sanitizeReadiness(esign);

const validStatuses = ['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED'];
const invalid = safe.filter(item => !validStatuses.includes(item.status));
if (invalid.length) throw new Error(`Unknown integration status values: ${JSON.stringify(invalid)}`);

const blockers = [];
for (const item of safe) {
  if (item.status === 'NOT_SELECTED') blockers.push(`${item.key}:NOT_SELECTED`);
  if (item.status === 'DEGRADED') blockers.push(`${item.key}:DEGRADED`);
  if (item.status === 'DISABLED') blockers.push(`${item.key}:DISABLED`);
}
if (!safeMaps.enabled) blockers.push('MAPS_GEO:RUNTIME_NOT_OPERATIONAL');
if (!safeWeather.configured) blockers.push('WEATHER_MARINE:RUNTIME_NOT_OPERATIONAL');
if (!safePayment.productionReady) blockers.push('PAYMENT_PSP:PRODUCTION_NOT_READY');
if (!safeEmail.productionReady) blockers.push('EMAIL:PRODUCTION_NOT_READY');
if (!safeSms.productionReady) blockers.push('SMS:PRODUCTION_NOT_READY');
if (!safeWhatsApp.productionReady) blockers.push('WHATSAPP:PRODUCTION_NOT_READY');
if (!safeObjectStorage.productionReady) blockers.push('OBJECT_STORAGE:PRODUCTION_NOT_READY');
if (!safeTranslation.productionReady) blockers.push('TRANSLATION_ENGINE:PRODUCTION_NOT_READY');
if (!safeEsign.productionReady) blockers.push('ESIGN:PRODUCTION_NOT_READY');

console.log('STAGE3_INTEGRATION_INVENTORY=' + JSON.stringify({ counts, integrations: safe }));
console.log('STAGE3_MAPS_PUBLIC=' + JSON.stringify(safeMaps));
console.log('STAGE3_WEATHER_PUBLIC=' + JSON.stringify(safeWeather));
console.log('STAGE3_PAYMENT_READINESS=' + JSON.stringify(safePayment));
console.log('STAGE3_EMAIL_READINESS=' + JSON.stringify(safeEmail));
console.log('STAGE3_SMS_READINESS=' + JSON.stringify(safeSms));
console.log('STAGE3_WHATSAPP_READINESS=' + JSON.stringify(safeWhatsApp));
console.log('STAGE3_OBJECT_STORAGE_READINESS=' + JSON.stringify(safeObjectStorage));
console.log('STAGE3_TRANSLATION_READINESS=' + JSON.stringify(safeTranslation));
console.log('STAGE3_ESIGN_READINESS=' + JSON.stringify(safeEsign));
console.log('STAGE3_BLOCKERS=' + JSON.stringify([...new Set(blockers)]));
