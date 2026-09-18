const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!base?.startsWith('https://') || !email || !password) {
  throw new Error('E2E_BASE_URL (https), E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required.');
}

async function request(path, options = {}) {
  const response = await fetch(`${base}/api/v1${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

const health = await request('/health');
if (health.response.status !== 200 || health.body?.status !== 'ok') {
  throw new Error(`Health failed: HTTP ${health.response.status}`);
}

const ready = await request('/health/ready');
if (ready.response.status !== 200 || ready.body?.status !== 'ready' || ready.body?.database !== 'ok') {
  throw new Error(`Readiness failed: HTTP ${ready.response.status}`);
}

const unauthenticated = await request('/admin/accounts');
if (unauthenticated.response.status !== 401) {
  throw new Error(`Protected-route boundary failed: expected 401, got ${unauthenticated.response.status}`);
}

const login = await request('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (login.response.status !== 200 || !login.body?.accessToken) {
  throw new Error(`Admin login failed: HTTP ${login.response.status}`);
}

console.log('Production smoke passed: health, DB readiness, auth boundary and admin login.');
