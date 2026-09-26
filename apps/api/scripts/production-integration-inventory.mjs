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

const maps = await read('/integrations/maps/public-config');
const weather = await read('/integrations/weather/public-config');

console.log('STAGE3_INTEGRATION_INVENTORY=' + JSON.stringify({ counts, integrations: safe }));
console.log('STAGE3_MAPS_PUBLIC=' + JSON.stringify({
  engine: maps?.engine ?? null,
  status: maps?.status ?? null,
  provider: maps?.provider ?? null,
  enabled: Boolean(maps?.enabled),
  attributionConfigured: Boolean(maps?.attribution),
  styleConfigured: Boolean(maps?.styleUrl),
}));
console.log('STAGE3_WEATHER_PUBLIC=' + JSON.stringify({
  status: weather?.status ?? null,
  provider: weather?.provider ?? null,
  configured: Boolean(weather?.configured),
  sandbox: Boolean(weather?.sandbox),
}));

const invalid = safe.filter(item => !['NOT_SELECTED','SANDBOX','CONFIGURED','VERIFIED','PRODUCTION_ENABLED','DEGRADED','DISABLED'].includes(item.status));
if (invalid.length) throw new Error(`Unknown integration status values: ${JSON.stringify(invalid)}`);

if (weather?.configured !== true) throw new Error('Marine weather integration is not operational in production.');
if (maps?.enabled !== true) throw new Error('Maps/geospatial integration is not operational in production.');
