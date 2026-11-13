const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Load the compiled adapter with isolated configuration and transport. No real
// environment, provider, credentials, DNS or network request is used.
function fixture() {
  const file = path.resolve(__dirname, '../dist/credentials/credential-object-storage.service.js');
  const realRequire = createRequire(file), mod = { exports: {} }, calls = [], timeouts = [], providerSignals = [];
  let mode = 'success', status = 200, operational = true;
  const cfg = { url: new URL('https://storage.example.invalid'), bucket: 'fixture', region: 'us-east-1', accessKeyId: 'fixture-access', secretAccessKey: 'fixture-secret' };
  const context = {
    module: mod, exports: mod.exports, URL, URLSearchParams, Buffer, Date, Uint8Array,
    require: name => name === './credential-object-storage.config' ? { inspectCredentialObjectStorage: () => ({ config: cfg }) } : realRequire(name),
    AbortSignal: { timeout: ms => {
      timeouts.push(ms);
      const controller = new AbortController();
      // Exercise actual abort delivery without waiting eight seconds per case.
      if (mode === 'timeout') setImmediate(() => controller.abort(new DOMException('Fixture timed out', 'TimeoutError')));
      return controller.signal;
    } },
    fetch: async (url, options) => {
      calls.push({ method: options.method, redirect: options.redirect, signal: options.signal });
      assert.equal(new URL(url).hostname, 'storage.example.invalid');
      if (mode === 'timeout') return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
      if (mode === 'network') throw new TypeError('Fixture connection refused');
      return { ok: status >= 200 && status < 300, status };
    },
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  const service = new mod.exports.CredentialObjectStorageService({ requireOperational: () => { if (!operational) throw new Error('Fixture integration disabled'); }, recordProviderSignal: async (...signal) => providerSignals.push(signal) });
  return { service, calls, timeouts, providerSignals, set: (nextMode, nextStatus = 200) => { mode = nextMode; status = nextStatus; }, disable: () => operational = false };
}

for (const action of ['put', 'exists', 'delete']) {
  test(`${action} has a bounded abort and does not follow signed-request redirects`, { timeout: 2000 }, async () => {
    const f = fixture(); f.set('timeout');
    const run = () => action === 'put' ? f.service.put('credentials/test/evidence.pdf', Buffer.from('%PDF fixture'), 'application/pdf') : f.service[action]('credentials/test/evidence.pdf');
    if (action === 'delete') await run();
    else await assert.rejects(run, error => error.name === 'TimeoutError');
    assert.deepEqual(f.timeouts, [8000]);
    assert.equal(f.calls.length, 1, 'Uncertain requests must not be automatically replayed');
    assert.equal(f.calls[0].redirect, 'error');
    assert.equal(f.calls[0].signal.aborted, true);
    f.set('success');
    const result = await run();
    if (action === 'exists') assert.equal(result, true);
    assert.equal(f.calls.length, 2, 'A later caller can recover without replaying the failed attempt');
    assert.deepEqual(f.providerSignals.map(([, state]) => state), ['PROVIDER_FAILURE', 'SUCCESS']);
  });
}

test('storage outage and denied access are not reported as missing bytes', async () => {
  const f = fixture();
  for (const status of [301, 302, 403, 429, 500, 503]) {
    f.set('success', status);
    await assert.rejects(() => f.service.exists('credentials/test/evidence.pdf'), error => error.getStatus?.() === 502);
  }
  f.set('network'); await assert.rejects(() => f.service.exists('credentials/test/evidence.pdf'), TypeError);
  f.set('success', 404); assert.equal(await f.service.exists('credentials/test/evidence.pdf'), false);
  f.set('success'); assert.equal(await f.service.exists('credentials/test/evidence.pdf'), true);
  assert.deepEqual(f.providerSignals.map(([, state]) => state), ['PROVIDER_FAILURE','PROVIDER_FAILURE','PROVIDER_FAILURE','PROVIDER_FAILURE','PROVIDER_FAILURE','PROVIDER_FAILURE','PROVIDER_FAILURE','SUCCESS','SUCCESS']);
});

test('failed upload never acknowledges success and recovery preserves caller control', async () => {
  const f = fixture(); f.set('success', 503);
  await assert.rejects(() => f.service.put('credentials/test/evidence.pdf', Buffer.from('fixture'), 'application/pdf'), error => error.getStatus?.() === 502);
  assert.equal(f.calls.length, 1);
  f.set('success'); await f.service.put('credentials/test/evidence.pdf', Buffer.from('fixture'), 'application/pdf');
  assert.equal(f.calls.length, 2);
  f.disable();
  await assert.rejects(() => f.service.exists('credentials/test/evidence.pdf'), /integration disabled/);
  assert.equal(f.calls.length, 2, 'Recovery must not bypass a disabled integration');
  assert.deepEqual(f.providerSignals.map(([, state]) => state), ['PROVIDER_FAILURE', 'SUCCESS']);
});
