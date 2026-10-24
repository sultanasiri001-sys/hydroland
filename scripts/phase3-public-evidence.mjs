import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

// Observation only: fixed public origins, GET only, no cookies, tokens or data writes.
const API = 'https://hydroland.onrender.com/api/v1';
const WEB = 'https://hydroland-web.onrender.com/';
const expected = process.env.PHASE3_EXPECTED_DEPLOYMENT_SHA || '';
assert.match(expected, /^[a-f0-9]{40}$/, 'An exact approved deployment SHA is required');
const report = {
  observedAt: new Date().toISOString(), expectedDeployment: expected,
  testedSource: process.env.GITHUB_SHA || 'local', scope: 'public-read-only-observation',
  checks: [], externalAcceptance: {}, phase3Closed: false,
  limitations: ['No authenticated owner session', 'No Google account consent or sign-in',
    'No email challenge requested or consumed', 'No private document accessed',
    'No claim of production backup restoration'],
};
const record = (name, passed, detail) => report.checks.push({ name, status: passed ? 'PASS' : 'FAIL', ...detail });
async function get(url) {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'error',
      headers: { accept: url === WEB ? 'text/html' : 'application/json', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    return { status: response.status, body, text };
  } catch { return { status: 0, body: null, text: '' }; }
}
await mkdir('phase3-evidence', { recursive: true });
try {
  let ready;
  for (let attempt = 0; attempt < 6; attempt++) {
    ready = await get(API + '/health/ready');
    if (ready.status === 200 && ready.body?.database === 'ok' && ready.body?.commit === expected) break;
    if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 5000));
  }
  record('deployed_database_readiness', ready.status === 200 && ready.body?.status === 'ready' && ready.body?.database === 'ok', { httpStatus: ready.status });
  const commit = /^[a-f0-9]{40}$/.test(ready.body?.commit || '') ? ready.body.commit : null;
  record('approved_api_commit_is_live', commit === expected, { deployedCommit: commit });
  const health = await get(API + '/health');
  record('api_liveness', health.status === 200 && health.body?.service === 'hydroland-api' && health.body?.status === 'ok', { httpStatus: health.status });
  const google = await get(API + '/auth/google/config');
  const googleReadable = google.status === 200 && typeof google.body?.enabled === 'boolean';
  record('google_public_config_readable', googleReadable, { httpStatus: google.status });
  report.externalAcceptance.google = { enabled: googleReadable ? google.body.enabled : null,
    clientIdPresent: googleReadable ? Boolean(google.body.clientId) : null,
    ownerSignIn: 'NOT_TESTED', status: googleReadable && google.body.enabled ? 'OWNER_ACCEPTANCE_REQUIRED' : 'CONFIGURATION_OR_AVAILABILITY_BLOCKED' };
  const email = await get(API + '/integrations/email/public-config');
  const emailReadable = email.status === 200 && typeof email.body?.enabled === 'boolean';
  record('email_public_config_readable', emailReadable, { httpStatus: email.status });
  record('email_public_config_is_sanitized', emailReadable && Object.keys(email.body).every(key => ['enabled', 'restricted'].includes(key)), {});
  report.externalAcceptance.email = { enabled: emailReadable ? email.body.enabled : null,
    restricted: emailReadable ? email.body.restricted === true : null,
    deliveryAndLinkConsumption: 'NOT_TESTED_BY_THIS_OBSERVER' };
  for (const path of ['/messages/conversations', '/auth/mfa/status', '/health/integrations/email', '/health/integrations/credential-storage']) {
    const response = await get(API + path);
    record('guest_denial:' + path, response.status === 401, { httpStatus: response.status });
  }
  const web = await get(WEB);
  record('public_web_shell', web.status === 200 && /<title>HYDROLAND/i.test(web.text), { httpStatus: web.status,
    htmlSha256: web.status === 200 ? createHash('sha256').update(web.text).digest('hex') : null });
} finally {
  report.publicChecksPassed = report.checks.every(check => check.status === 'PASS');
  await writeFile('phase3-evidence/public-observation.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (!report.publicChecksPassed) process.exitCode = 1;
