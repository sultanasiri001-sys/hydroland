import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './training-certification-contract' && context.parentURL?.endsWith('/training-certification-adapter.ts')) {
    return nextResolve(new URL('./training-certification-contract.ts', context.parentURL).href, context);
  }
  return nextResolve(specifier, context);
} });
const contract = await import('../src/governance/training-certification-contract.ts');
const { runTrainingCertificationAdapter } = await import('../src/governance/training-certification-adapter.ts');
const {
  TRAINING_CERTIFICATION_PROTOCOL, MAX_TRAINING_CERTIFICATION_BYTES, TrainingCertificationContractError,
  trainingCertificationRequest, trainingCertificationReceipt, trainingCertificationSource, trainingCertificationDigest,
  trainingCertificationContract, notConnectedExternalCertification,
} = contract;

const actorAccountId = randomUUID();
const clock = () => Date.now();
const clone = value => structuredClone(value);
const sourceOf = request => ({ binding: clone(request.binding), internalResult: clone(request.internalResult) });
function message() {
  return {
    protocol: TRAINING_CERTIFICATION_PROTOCOL, mode: 'TEST', requestId: randomUUID(), requestedAt: new Date(Date.now() - 1000).toISOString(),
    binding: {
      organizationId: randomUUID(), enrollmentId: randomUUID(), trainingRecordId: randomUUID(), participantAccountId: randomUUID(),
      agencyCode: 'SYNTHETIC_AGENCY', programCode: 'SYNTHETIC_PROGRAM', edition: 'SYNTHETIC_EDITION_1',
      profileHash: 'a'.repeat(64), resultDigest: 'b'.repeat(64),
    },
    internalResult: { status: 'APPROVED', certificateId: randomUUID(), certificateNumber: 'HYD-TRN-2026-1234567890ABCDEF' },
  };
}
function receipt(input, changes = {}) {
  const request = trainingCertificationRequest(input);
  return { protocol: TRAINING_CERTIFICATION_PROTOCOL, mode: 'TEST', requestId: request.requestId,
    requestDigest: trainingCertificationDigest(request), binding: clone(request.binding), internalCertificateId: request.internalResult.certificateId,
    outcome: 'CONTRACT_ACCEPTED', checkedAt: new Date().toISOString(), receiptId: randomUUID(), synthetic: true, officialIssuance: false,
    externalCertificateNumber: null, ...changes };
}

/** Explicit ephemeral test double: production requires these operations to be durable and atomic. */
function attemptStore(now = clock) {
  const rows = new Map(); let reservations = 0, finishes = 0, recoveries = 0, exchanges = 0;
  const active = (key, token) => {
    const row = rows.get(key);
    assert.ok(row && row.token === token && !row.result && now() < Date.parse(row.leaseExpiresAt), 'the exact unconsumed live reservation is required');
    return row;
  };
  return {
    rows, get reservations() { return reservations; }, get finishes() { return finishes; },
    get recoveries() { return recoveries; }, get exchanges() { return exchanges; },
    async reserve(key, digest, leaseMs) {
      reservations++;
      const prior = rows.get(key);
      if (prior) return prior.digest !== digest ? { state: 'CONFLICT' } : prior.result ? { state: 'REPLAY', result: clone(prior.result) } : { state: 'IN_FLIGHT' };
      const token = randomUUID(), leaseExpiresAt = new Date(now() + leaseMs).toISOString();
      rows.set(key, { digest, token, leaseExpiresAt, exchangeStarted: false }); return { state: 'RESERVED', token, leaseExpiresAt };
    },
    async beginExchange(key, token) {
      const row = active(key, token); assert.equal(row.exchangeStarted, false);
      exchanges++; rows.set(key, { ...row, exchangeStarted: true });
    },
    async finish(key, token, result) {
      const row = active(key, token);
      finishes++; rows.set(key, { ...row, result: clone(result) });
    },
    async recover(key, digest, fallback, ownerToken) {
      const row = rows.get(key); assert.ok(row, 'recovery never creates a missing reservation');
      if (row.digest !== digest) return { state: 'CONFLICT' };
      if (row.result) return { state: 'REPLAY', result: clone(row.result) };
      if (ownerToken !== undefined) assert.equal(ownerToken, row.token, 'only the failed token owner can recover before lease expiry');
      else if (now() < Date.parse(row.leaseExpiresAt)) return { state: 'IN_FLIGHT' };
      assert.equal(fallback.status, 'UNKNOWN'); assert.equal(fallback.code, 'ATTEMPT_INTERRUPTED');
      const result = { ...clone(fallback), syntheticRequestAttempted: row.exchangeStarted };
      recoveries++; rows.set(key, { ...row, result }); return { state: 'REPLAY', result: clone(result) };
    },
  };
}
function environment(request = message(), driver = { kind: 'SYNTHETIC', exchange: async value => receipt(value) }) {
  const state = { source: sourceOf(request), reads: 0, clock }, store = attemptStore(() => state.clock());
  const dependencies = { actorAccountId, store, driver, now: () => state.clock(), timeoutMs: 1000,
    readCurrentSource: async () => { state.reads++; return state.source ? clone(state.source) : null; } };
  return { request, state, store, dependencies };
}
const rejectsContract = code => error => error instanceof TrainingCertificationContractError && (!code || error.code === code);
function noExternalClaim(result) {
  assert.equal(result.officialIssuance, false);
  assert.deepEqual(result.externalCertification, notConnectedExternalCertification());
  assert.equal(result.externalCertification.certificateNumber, null);
  assert.equal(result.externalCertification.operationalAuthority, false);
}

const handlers = new Map();
let server, port, calls = 0;
before(async () => {
  server = createServer(async (request, response) => {
    calls++;
    try {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/synthetic-certification');
      assert.equal(request.headers.authorization, undefined, 'No provider credentials exist in this fixture');
      assert.equal(request.headers['content-type'], 'application/json');
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; assert.ok(size <= MAX_TRAINING_CERTIFICATION_BYTES); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const parsed = trainingCertificationRequest(input);
      const handler = handlers.get(parsed.requestId);
      if (handler) await handler(parsed, response);
      else { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(receipt(parsed))); }
    } catch {
      if (!response.destroyed) { response.writeHead(400, { 'content-type': 'application/json' }); response.end('{"error":"SYNTHETIC_REQUEST_INVALID"}'); }
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });

/** Actual HTTP on a fixed loopback address; it cannot take a URL, credential or production hostname. */
const loopbackDriver = { kind: 'SYNTHETIC', exchange(input, { signal }) {
  const encoded = Buffer.from(JSON.stringify(input));
  assert.ok(encoded.length <= MAX_TRAINING_CERTIFICATION_BYTES);
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, path: '/synthetic-certification', method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'content-length': encoded.length } }, response => {
      if (response.statusCode !== 200 || !/^application\/json(?:;|$)/i.test(response.headers['content-type'] || '')) {
        response.resume(); reject(new Error('Synthetic HTTP response rejected')); return;
      }
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_TRAINING_CERTIFICATION_BYTES) { response.destroy(); reject(new Error('Synthetic response size exceeded')); }
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Synthetic JSON response invalid')); } });
    });
    request.on('error', reject); request.end(encoded);
  });
} };

test('contract descriptor and helper state no agency compatibility, external issuance or operational authority', () => {
  const value = trainingCertificationContract();
  assert.equal(value.protocol, TRAINING_CERTIFICATION_PROTOCOL); assert.equal(value.mode, 'TEST');
  assert.equal(value.integration, 'CERTIFICATION'); assert.equal(value.agencyApiCompatibilityEstablished, false); assert.equal(value.officialIssuance, false);
  const first = notConnectedExternalCertification(); first.status = 'MUTATED';
  assert.equal(notConnectedExternalCertification().status, 'NOT_CONNECTED');
});
test('valid source/request round-trip has stable order-independent digest and distinct source hash', () => {
  const input = message(), parsed = trainingCertificationRequest(input);
  assert.deepEqual(parsed, input); assert.deepEqual(trainingCertificationSource(sourceOf(parsed)), sourceOf(parsed));
  const reordered = Object.fromEntries(Object.entries(parsed).reverse());
  reordered.binding = Object.fromEntries(Object.entries(parsed.binding).reverse());
  assert.equal(trainingCertificationDigest(parsed), trainingCertificationDigest(trainingCertificationRequest(reordered)));
  assert.notEqual(trainingCertificationDigest(parsed), trainingCertificationDigest(sourceOf(parsed)));
});
for (const [name, change] of [
  ['unknown top-level property', row => { row.approvedByProvider = true; }],
  ['unknown binding property', row => { row.binding.medical = 'PRIVATE'; }],
  ['unknown internal certificate property', row => { row.internalResult.externalNumber = 'FAKE'; }],
  ['missing required binding', row => { delete row.binding.resultDigest; }],
  ['LIVE mode', row => { row.mode = 'LIVE'; }],
  ['mode array coercion', row => { row.mode = ['TEST']; }],
  ['protocol array coercion', row => { row.protocol = [TRAINING_CERTIFICATION_PROTOCOL]; }],
  ['numeric programme', row => { row.binding.programCode = 23; }],
  ['null participant', row => { row.binding.participantAccountId = null; }],
  ['invalid UUID', row => { row.requestId = '1'; }],
  ['uppercase digest', row => { row.binding.profileHash = 'A'.repeat(64); }],
  ['partial digest', row => { row.binding.resultDigest = 'a'.repeat(63); }],
  ['empty edition', row => { row.binding.edition = ''; }],
  ['whitespace agency', row => { row.binding.agencyCode = ' SYNTHETIC '; }],
  ['control character', row => { row.binding.programCode = 'TEST\nPROGRAM'; }],
  ['overlong binding', row => { row.binding.edition = 'x'.repeat(161); }],
  ['COMPLETED is not internal approval', row => { row.internalResult.status = 'COMPLETED'; }],
  ['approval array coercion', row => { row.internalResult.status = ['APPROVED']; }],
  ['external-looking internal number', row => { row.internalResult.certificateNumber = 'AGENCY-123'; }],
  ['future request', row => { row.requestedAt = new Date(Date.now() + 60_000).toISOString(); }],
  ['expired request', row => { row.requestedAt = new Date(Date.now() - 16 * 60_000).toISOString(); }],
  ['nonexistent calendar day', row => { row.requestedAt = '2026-02-30T00:00:00.000Z'; }],
  ['timezone-free timestamp', row => { row.requestedAt = row.requestedAt.slice(0, -1); }],
]) test(`request refuses ${name}`, () => { const row = message(); change(row); assert.throws(() => trainingCertificationRequest(row), rejectsContract()); });
test('accessor and symbol properties are rejected without evaluating an accessor', () => {
  const row = message(); let invoked = false;
  Object.defineProperty(row, 'mode', { get() { invoked = true; return 'TEST'; }, enumerable: true });
  assert.throws(() => trainingCertificationRequest(row), rejectsContract()); assert.equal(invoked, false);
  const symbolic = message(); symbolic[Symbol('unexpected')] = true;
  assert.throws(() => trainingCertificationRequest(symbolic), rejectsContract());
});

for (const [name, change] of [
  ['different organization', value => { value.binding.organizationId = randomUUID(); }],
  ['different participant', value => { value.binding.participantAccountId = randomUUID(); }],
  ['different programme edition', value => { value.binding.edition = 'OTHER'; }],
  ['changed result digest', value => { value.binding.resultDigest = 'c'.repeat(64); }],
  ['changed profile digest', value => { value.binding.profileHash = 'd'.repeat(64); }],
  ['different request', value => { value.requestId = randomUUID(); }],
  ['different request digest', value => { value.requestDigest = 'c'.repeat(64); }],
  ['different internal certificate', value => { value.internalCertificateId = randomUUID(); }],
  ['unrecognized outcome', value => { value.outcome = 'ISSUED'; }],
  ['outcome array coercion', value => { value.outcome = ['CONTRACT_ACCEPTED']; }],
  ['official issuance assertion', value => { value.officialIssuance = true; }],
  ['external certificate number', value => { value.externalCertificateNumber = 'FAKE'; }],
  ['non-synthetic receipt', value => { value.synthetic = false; }],
  ['extra secret property', value => { value.secret = 'DO_NOT_RETURN_SECRET'; }],
  ['old receipt time', value => { value.checkedAt = '2000-01-01T00:00:00.000Z'; }],
  ['future receipt time', value => { value.checkedAt = new Date(Date.now() + 60_000).toISOString(); }],
]) test(`receipt refuses ${name}`, () => { const request = message(), value = receipt(request); change(value); assert.throws(() => trainingCertificationReceipt(value, request), rejectsContract()); });

test('actual loopback contract accepts once, replays once, and preserves all source fields', async () => {
  const f = environment(message(), loopbackDriver), beforeSource = clone(f.state.source), beforeCalls = calls;
  const accepted = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(accepted.status, 'CONTRACT_ACCEPTED'); assert.equal(accepted.code, 'SYNTHETIC_CONTRACT_ACCEPTED'); noExternalClaim(accepted);
  const replay = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(replay.replayed, true); assert.equal(replay.checkedAt, accepted.checkedAt); noExternalClaim(replay);
  assert.equal(calls - beforeCalls, 1); assert.equal(f.store.finishes, 1); assert.deepEqual(f.state.source, beforeSource);
  assert.ok(f.state.reads >= 5); assert.doesNotMatch(JSON.stringify(accepted), /participantAccountId|agencyCode|profileHash|HYD-TRN/);
});
test('no driver stays disconnected without reserving or dispatching, regardless of generic integration state', async () => {
  const f = environment(); delete f.dependencies.driver;
  const prior = process.env.HYDROLAND_INTEGRATION_CERTIFICATION_STATUS;
  process.env.HYDROLAND_INTEGRATION_CERTIFICATION_STATUS = 'PRODUCTION_ENABLED';
  try {
    const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
    assert.equal(result.status, 'NOT_CONNECTED'); assert.equal(result.syntheticRequestAttempted, false); assert.equal(f.store.reservations, 0); noExternalClaim(result);
  } finally { if (prior === undefined) delete process.env.HYDROLAND_INTEGRATION_CERTIFICATION_STATUS; else process.env.HYDROLAND_INTEGRATION_CERTIFICATION_STATUS = prior; }
});
test('revoked or changed source is refused before any reservation', async () => {
  for (const missing of [false, true]) {
    const f = environment(); if (missing) f.state.source = null; else f.state.source.binding.resultDigest = 'e'.repeat(64);
    const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
    assert.equal(result.code, 'SOURCE_CHANGED'); assert.equal(result.syntheticRequestAttempted, false); assert.equal(f.store.reservations, 0); noExternalClaim(result);
  }
});
test('source drift during reservation prevents dispatch and stores the bounded failure', async () => {
  let dispatched = 0;
  const f = environment(message(), { kind: 'SYNTHETIC', exchange: async row => { dispatched++; return receipt(row); } });
  const reserve = f.store.reserve.bind(f.store);
  f.store.reserve = async (...args) => { const value = await reserve(...args); f.state.source.binding.resultDigest = 'c'.repeat(64); return value; };
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'SOURCE_CHANGED'); assert.equal(dispatched, 0); assert.equal(f.store.finishes, 1);
});
test('source change after dispatch invalidates a valid receipt and a saved replay', async () => {
  const f = environment(); f.dependencies.driver.exchange = async row => { f.state.source.binding.resultDigest = 'c'.repeat(64); return receipt(row); };
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'SOURCE_CHANGED'); assert.equal(result.status, 'UNKNOWN'); noExternalClaim(result);
  const replay = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(replay.code, 'SOURCE_CHANGED'); assert.equal(replay.replayed, false);
});
test('same request ID with different source/request content cannot reuse an attempt', async () => {
  const f = environment(); await runTrainingCertificationAdapter(f.request, f.dependencies);
  f.request.binding.resultDigest = 'c'.repeat(64); f.state.source = sourceOf(f.request);
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'IDEMPOTENCY_CONFLICT'); assert.equal(f.store.finishes, 1); noExternalClaim(result);
});
test('concurrent identical requests create one actual HTTP exchange and one stored completion', async () => {
  const f = environment(message(), loopbackDriver), beforeCalls = calls;
  let entered, release;
  const seen = new Promise(resolve => { entered = resolve; }), blocked = new Promise(resolve => { release = resolve; });
  handlers.set(f.request.requestId, async (row, response) => { entered(); await blocked; response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(receipt(row))); });
  const first = runTrainingCertificationAdapter(f.request, f.dependencies); await seen;
  const second = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(second.code, 'REQUEST_IN_FLIGHT'); release();
  assert.equal((await first).status, 'CONTRACT_ACCEPTED'); assert.equal(calls - beforeCalls, 1); assert.equal(f.store.finishes, 1);
});
test('trusted actor and organization scope prevent reuse of another principal reservation', async () => {
  const f = environment(); await runTrainingCertificationAdapter(f.request, f.dependencies);
  const other = await runTrainingCertificationAdapter(f.request, { ...f.dependencies, actorAccountId: randomUUID() });
  assert.equal(other.replayed, false); assert.equal(f.store.rows.size, 2);
  f.request.binding.organizationId = randomUUID(); f.state.source = sourceOf(f.request);
  assert.equal((await runTrainingCertificationAdapter(f.request, f.dependencies)).replayed, false); assert.equal(f.store.rows.size, 3);
});
test('UNKNOWN receipt is not treated as successful contract acceptance', async () => {
  const f = environment(message(), { kind: 'SYNTHETIC', exchange: async row => receipt(row, { outcome: 'UNKNOWN' }) });
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.status, 'UNKNOWN'); assert.equal(result.code, 'SYNTHETIC_RESULT_UNKNOWN'); noExternalClaim(result);
});
test('driver failure is sanitized and idempotent rather than retried', async () => {
  let dispatches = 0;
  const f = environment(message(), { kind: 'SYNTHETIC', exchange: async () => { dispatches++; throw new Error('Authorization: secret-DO_NOT_RETURN https://private.invalid/credential'); } });
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'ADAPTER_FAILURE'); assert.doesNotMatch(JSON.stringify(result), /DO_NOT_RETURN|private\.invalid|Authorization/); noExternalClaim(result);
  assert.equal((await runTrainingCertificationAdapter(f.request, f.dependencies)).replayed, true); assert.equal(dispatches, 1);
});
test('timeout aborts actual HTTP and a late success cannot overwrite the stored UNKNOWN result', async () => {
  const f = environment(message(), loopbackDriver); f.dependencies.timeoutMs = 25;
  let lateFinished;
  const finished = new Promise(resolve => { lateFinished = resolve; });
  handlers.set(f.request.requestId, async (row, response) => {
    await new Promise(resolve => setTimeout(resolve, 70));
    if (!response.destroyed) { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(receipt(row))); }
    lateFinished();
  });
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.status, 'UNKNOWN'); assert.equal(result.code, 'ADAPTER_TIMEOUT'); noExternalClaim(result);
  await finished;
  const replay = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(replay.code, 'ADAPTER_TIMEOUT'); assert.equal(replay.replayed, true); assert.equal(f.store.finishes, 1);
});
for (const [name, handler] of [
  ['redirect', async (_row, response) => { response.writeHead(302, { location: 'https://DO_NOT_FOLLOW.invalid' }); response.end(); }],
  ['authentication failure', async (_row, response) => { response.writeHead(401, { 'content-type': 'application/json' }); response.end('{"secret":"DO_NOT_RETURN"}'); }],
  ['non-JSON', async (_row, response) => { response.writeHead(200, { 'content-type': 'text/plain' }); response.end('DO_NOT_RETURN'); }],
  ['malformed JSON', async (_row, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end('{broken DO_NOT_RETURN'); }],
  ['oversized response', async (_row, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(' '.repeat(MAX_TRAINING_CERTIFICATION_BYTES + 1)); }],
]) test(`actual loopback ${name} remains UNKNOWN without leaking provider content`, async () => {
  const f = environment(message(), loopbackDriver); handlers.set(f.request.requestId, handler);
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.status, 'UNKNOWN'); assert.equal(result.code, 'ADAPTER_FAILURE'); noExternalClaim(result);
  assert.doesNotMatch(JSON.stringify(result), /DO_NOT_RETURN|DO_NOT_FOLLOW/);
});
test('mismatched and invalid driver receipts are sanitized into bounded UNKNOWN outcomes', async () => {
  for (const mismatch of [true, false]) {
    const f = environment(message(), { kind: 'SYNTHETIC', exchange: async row => mismatch ? receipt(row, { binding: { ...row.binding, resultDigest: 'c'.repeat(64) } }) : { secret: 'DO_NOT_RETURN' } });
    const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
    assert.equal(result.code, mismatch ? 'CONTRACT_SOURCE_MISMATCH' : 'ADAPTER_RESPONSE_INVALID'); assert.equal(result.status, 'UNKNOWN'); noExternalClaim(result);
    assert.doesNotMatch(JSON.stringify(result), /DO_NOT_RETURN/);
  }
});
test('live drivers, invalid actor IDs and invalid timeout configuration are rejected', async () => {
  for (const change of [dependencies => { dependencies.driver.kind = 'LIVE'; }, dependencies => { dependencies.actorAccountId = 'other'; },
    ...[0, 8001, '100', NaN, Infinity, 1.5].map(value => dependencies => { dependencies.timeoutMs = value; })]) {
    const f = environment(); change(f.dependencies);
    await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), rejectsContract()); assert.equal(f.store.reservations, 0);
  }
});
test('authorization/database/store failures cannot be returned as successful acceptance', async () => {
  const f = environment(); f.dependencies.readCurrentSource = async () => { throw new Error('Synthetic authorization denied'); };
  await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), /Synthetic authorization denied/); assert.equal(f.store.reservations, 0);
  const g = environment(); g.store.finish = async () => { throw new Error('Synthetic audit or persistence failure'); };
  await assert.rejects(runTrainingCertificationAdapter(g.request, g.dependencies), /Synthetic audit or persistence failure/); assert.equal(g.store.finishes, 0);
  assert.equal(g.store.recoveries, 1); assert.equal([...g.store.rows.values()][0].result.code, 'ATTEMPT_INTERRUPTED');
});
test('a corrupted cached outcome cannot leak arbitrary text or promote an unknown result', async () => {
  for (const change of [row => { row.code = 'DO_NOT_RETURN_SECRET'; }, row => { row.code = 'ADAPTER_TIMEOUT'; },
    row => { row.checkedAt = 'bad time'; }, row => { row.checkedAt = new Date(Date.now() + 60_000).toISOString(); },
    row => { row.syntheticRequestAttempted = 'DO_NOT_RETURN_SECRET'; }, row => { row.syntheticRequestAttempted = false; },
    row => { row.replayed = 'DO_NOT_RETURN_SECRET'; }, row => { row.officialIssuance = true; }]) {
    const f = environment(); await runTrainingCertificationAdapter(f.request, f.dependencies);
    const cached = [...f.store.rows.values()][0]; change(cached.result);
    await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), rejectsContract('ADAPTER_STORE_RESULT_INVALID'));
  }
});
for (const readFailure of [2, 3]) test(`source failure at read ${readFailure} recovers UNKNOWN and retry never dispatches again`, async () => {
  const f = environment(); let reads = 0, dispatches = 0;
  f.dependencies.driver.exchange = async row => { dispatches++; return receipt(row); };
  f.dependencies.readCurrentSource = async () => { if (++reads === readFailure) throw new Error('Synthetic source read unavailable'); return clone(f.state.source); };
  await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), /Synthetic source read unavailable/);
  assert.equal(f.store.finishes, 0); assert.equal(f.store.recoveries, 1);
  assert.equal([...f.store.rows.values()][0].result.code, 'ATTEMPT_INTERRUPTED');
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'ATTEMPT_INTERRUPTED'); assert.equal(result.status, 'UNKNOWN'); assert.equal(result.replayed, true);
  assert.equal(result.syntheticRequestAttempted, readFailure === 3); assert.equal(dispatches, readFailure === 3 ? 1 : 0); noExternalClaim(result);
});
for (const committed of [false, true]) test(`ambiguous finish ${committed ? 'after' : 'before'} commit retains a bounded result and never dispatches twice`, async () => {
  const f = environment(); let dispatches = 0;
  f.dependencies.driver.exchange = async row => { dispatches++; return receipt(row); };
  const finish = f.store.finish.bind(f.store);
  f.store.finish = async (...args) => { if (committed) await finish(...args); throw new Error('Synthetic commit acknowledgment unavailable'); };
  await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), /Synthetic commit acknowledgment unavailable/);
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, committed ? 'SYNTHETIC_CONTRACT_ACCEPTED' : 'ATTEMPT_INTERRUPTED');
  assert.equal(result.replayed, true); assert.equal(dispatches, 1); noExternalClaim(result);
});
test('failed completion and failed recovery propagate both errors; expiry reconciles without another exchange', async () => {
  const f = environment(); let dispatches = 0;
  f.dependencies.driver.exchange = async row => { dispatches++; return receipt(row); };
  const recover = f.store.recover.bind(f.store);
  f.store.finish = async () => { throw new Error('Synthetic original persistence failure'); };
  f.store.recover = async () => { throw new Error('Synthetic recovery persistence failure'); };
  await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), error => {
    assert.ok(error instanceof AggregateError); assert.equal(error.message, 'ADAPTER_RECOVERY_FAILED');
    assert.match(error.cause.message, /original persistence failure/);
    assert.equal(error.errors.length, 2); assert.match(error.errors[1].message, /recovery persistence failure/); return true;
  });
  f.store.recover = recover;
  assert.equal((await runTrainingCertificationAdapter(f.request, f.dependencies)).code, 'REQUEST_IN_FLIGHT');
  const row = [...f.store.rows.values()][0]; f.state.clock = () => Date.parse(row.leaseExpiresAt) + 1;
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'ATTEMPT_INTERRUPTED'); assert.equal(result.replayed, true); assert.equal(result.syntheticRequestAttempted, true);
  assert.equal(dispatches, 1); assert.equal(f.store.recoveries, 1); noExternalClaim(result);
});
test('lost reservation acknowledgment recovers after its lease without pretending a dispatch happened', async () => {
  const f = environment(); const reserve = f.store.reserve.bind(f.store); let dispatches = 0;
  f.dependencies.driver.exchange = async row => { dispatches++; return receipt(row); };
  f.store.reserve = async (...args) => { await reserve(...args); throw new Error('Synthetic reserve acknowledgment lost'); };
  await assert.rejects(runTrainingCertificationAdapter(f.request, f.dependencies), /reserve acknowledgment lost/);
  f.store.reserve = reserve;
  assert.equal((await runTrainingCertificationAdapter(f.request, f.dependencies)).code, 'REQUEST_IN_FLIGHT');
  const row = [...f.store.rows.values()][0]; f.state.clock = () => Date.parse(row.leaseExpiresAt) + 1;
  const result = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(result.code, 'ATTEMPT_INTERRUPTED'); assert.equal(result.syntheticRequestAttempted, false); assert.equal(dispatches, 0);
});
for (const pauseAt of [2, 3]) test(`an expired worker paused at source read ${pauseAt} is fenced from dispatch or completion`, async () => {
  const f = environment(); let reads = 0, dispatches = 0, entered, release;
  const seen = new Promise(resolve => { entered = resolve; }), blocked = new Promise(resolve => { release = resolve; });
  f.dependencies.driver.exchange = async row => { dispatches++; return receipt(row); };
  f.dependencies.readCurrentSource = async () => { if (++reads === pauseAt) { entered(); await blocked; } return clone(f.state.source); };
  const first = runTrainingCertificationAdapter(f.request, f.dependencies); await seen;
  const row = [...f.store.rows.values()][0]; f.state.clock = () => Date.parse(row.leaseExpiresAt) + 1;
  const reconciled = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(reconciled.code, 'ATTEMPT_INTERRUPTED'); assert.equal(reconciled.syntheticRequestAttempted, pauseAt === 3);
  release(); await assert.rejects(first, /exact unconsumed live reservation/);
  assert.equal(dispatches, pauseAt === 3 ? 1 : 0); assert.equal(f.store.finishes, 0); assert.equal(f.store.recoveries, 1);
  const replay = await runTrainingCertificationAdapter(f.request, f.dependencies);
  assert.equal(replay.code, 'ATTEMPT_INTERRUPTED'); assert.equal(replay.replayed, true); noExternalClaim(replay);
});
