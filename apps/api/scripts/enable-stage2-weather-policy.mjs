const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!base?.startsWith('https://')) throw new Error('E2E_BASE_URL must use HTTPS.');
if (!email?.endsWith('@hydroland.test')) throw new Error('E2E_ADMIN_EMAIL must use @hydroland.test.');
if (!password) throw new Error('E2E_ADMIN_PASSWORD is required.');

const login = await fetch(`${base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`Admin login failed: HTTP ${login.status}`);
const { accessToken } = await login.json();
if (!accessToken) throw new Error('Admin login returned no access token.');
const headers = { authorization: `Bearer ${accessToken}` };

const gateResponse = await fetch(`${base}/api/v1/trips/admin/weather-gate`, { headers });
if (!gateResponse.ok) throw new Error(`Read weather gate failed: HTTP ${gateResponse.status}`);
const gate = await gateResponse.json();
console.log(`Weather gate before: enabled=${gate.enabled}, mode=${gate.mode}, provider=${gate.provider}`);
if (gate.enabled !== true || gate.mode !== 'ENFORCE') {
  const configure = await fetch(`${base}/api/v1/trips/admin/weather-gate`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: true, mode: 'ENFORCE' }),
  });
  if (!configure.ok) throw new Error(`Enable weather enforcement failed: HTTP ${configure.status}`);
  const updated = await configure.json();
  if (updated.enabled !== true || updated.mode !== 'ENFORCE') throw new Error('Weather enforcement did not persist.');
  console.log(`Weather gate enabled: enabled=${updated.enabled}, mode=${updated.mode}, provider=${updated.provider}`);
}

const policiesResponse = await fetch(`${base}/api/v1/admin/policies?category=WEATHER`, { headers });
if (!policiesResponse.ok) throw new Error(`Read weather policy failed: HTTP ${policiesResponse.status}`);
const policies = await policiesResponse.json();
const policy = Array.isArray(policies) ? policies.find(rule => rule.ruleKey === 'WEATHER_GATE') : null;
if (!policy) throw new Error('WEATHER_GATE policy rule is missing.');
console.log(`Weather policy before: state=${policy.state}`);
if (policy.state !== 'ENABLED') {
  const update = await fetch(`${base}/api/v1/admin/policies/WEATHER/WEATHER_GATE/state`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      state: 'ENABLED',
      reason: 'Stage 2 production closure requires an approved marine-weather review before booking.',
    }),
  });
  if (!update.ok) throw new Error(`Enable WEATHER_GATE policy failed: HTTP ${update.status}`);
  const updatedPolicy = await update.json();
  if (updatedPolicy.state !== 'ENABLED') throw new Error('WEATHER_GATE policy enforcement did not persist.');
  console.log(`Weather policy enabled: state=${updatedPolicy.state}`);
}
