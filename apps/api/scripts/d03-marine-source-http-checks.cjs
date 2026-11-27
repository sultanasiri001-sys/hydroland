// Native HTTP/PostgreSQL and real loopback transport; never a live marine provider.
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const { writeFile } = require('node:fs/promises');
const { participationFixture } = require('./d01-participation-fixture.cjs');

async function main() {
  assert.equal(process.env.D03_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  assert.equal(process.env.D03_MARINE_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
  const nativeFetch = global.fetch, f = await participationFixture(), { db, call, ok, denied } = f;
  const checks = [], requests = [], externalAttempts = [], sockets = new Set();
  const check = async (name, work) => { await work(); checks.push(name); console.log('PASS D03', name); };
  let mode = 'VALID', onRequest = null, weatherTarget = new Date(Date.now() + 86400000).toISOString(), waveHeight = 0;
  let aisPatch = {}, payloadOverride, origin;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, origin);
    requests.push({ path: url.pathname.startsWith('/api/exportvessel/') ? 'AIS' : url.pathname, query: Object.fromEntries(url.searchParams), method: req.method });
    try {
      assert.equal(req.method, 'GET');
      if (onRequest) { const work = onRequest; onRequest = null; await work(); }
      if (mode === 'REDIRECT') { res.writeHead(302, { location: origin + '/redirect-followed' }); res.end(); return; }
      if (mode === 'TIMEOUT') { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{'); return; }
      if (/^STATUS_\d+$/.test(mode)) { res.writeHead(Number(mode.slice(7)), { 'content-type': 'application/json' }); res.end('{"error":"synthetic provider failure"}'); return; }
      if (mode === 'DECLARED_OVERSIZE') { res.writeHead(200, { 'content-type': 'application/json', 'content-length': '1048576' }); res.end('{}'); return; }
      if (mode === 'CHUNK_OVERSIZE') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(' '.repeat(262145)); return; }
      if (mode === 'BAD_UTF8') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(Buffer.from([0xff, 0xfe])); return; }
      if (mode === 'BAD_CONTENT_TYPE') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('{}'); return; }
      if (mode === 'BAD_JSON') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{invalid'); return; }
      let payload;
      if (url.pathname === '/v2/weather/point') {
        assert.equal(url.searchParams.get('source'), 'sg');
        assert.equal(req.headers.authorization, 'SYNTHETIC_D03_WEATHER_KEY');
        payload = { hours: [{ time: weatherTarget, windSpeed: { sg: 0, noaa: 99 }, gust: { sg: 2 }, waveHeight: { sg: waveHeight } }] };
        if (mode === 'NOAA_ONLY' || mode === 'METEO_ONLY') payload = { hours: [{ time: weatherTarget, windSpeed: { [mode === 'NOAA_ONLY' ? 'noaa' : 'meteo']: 9 } }] };
      } else {
        assert.ok(url.pathname.startsWith('/api/exportvessel/'));
        assert.equal(url.searchParams.get('v'), '6'); assert.equal(url.searchParams.get('protocol'), 'jsono'); assert.equal(url.searchParams.get('timespan'), '5');
        const row = { MMSI: '123456789', IMO: '1234567', LAT: '0', LON: '0', SPEED: '12', HEADING: '511', COURSE: '0',
          TIMESTAMP: new Date(Date.now() - 1000).toISOString(), ...aisPatch };
        payload = { DATA: mode === 'AMBIGUOUS' ? [row, { ...row }] : [row] };
      }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(payloadOverride === undefined ? payload : payloadOverride));
    } catch (error) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ fixtureError: String(error.message) })); }
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  const settings = {
    HYDROLAND_INTEGRATION_WEATHER_MARINE_STATUS: 'SANDBOX', STORMGLASS_API_KEY: 'SYNTHETIC_D03_WEATHER_KEY', STORMGLASS_API_BASE_URL: origin,
    HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS: 'SANDBOX', HYDROLAND_DISTRESS_AIS_PROVIDER: 'MARINETRAFFIC_AIS_ONLY', MARINETRAFFIC_API_KEY: 'd'.repeat(40), MARINETRAFFIC_API_BASE_URL: origin,
    HYDROLAND_INTEGRATION_MAPS_GEO_STATUS: 'SANDBOX', HYDROLAND_MAP_PROVIDER: 'SYNTHETIC_D03_MAPS', HYDROLAND_MAP_STYLE_URL: 'https://maps.example.invalid/style.json', HYDROLAND_MAP_ATTRIBUTION: 'Synthetic informational map attribution',
  };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]])); Object.assign(process.env, settings);
  global.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (![new URL(f.base).origin, origin].includes(url.origin)) { externalAttempts.push(url.origin); throw new Error('D03 fixture refuses external HTTP'); }
    return nativeFetch(input, { ...options, signal: options?.signal || AbortSignal.timeout(30000) });
  };
  const reset = () => { mode = 'VALID'; aisPatch = {}; payloadOverride = undefined; onRequest = null; };
  const weather = () => call(f.reviewer, '/trips/admin/weather-gate/snapshot?latitude=0&longitude=0&at=' + encodeURIComponent(weatherTarget));
  const distress = (extra = {}, actor = f.participant) => call(actor, '/safety/incidents/distress', 'POST', {
    description: 'Synthetic internal D03 report; no real emergency or external transmission.', latitude: 18.2, longitude: 42.5, mmsi: '123456789', ...extra,
  });
  const weatherRows = () => db.$queryRaw`SELECT "id"::text,"status","snapshotHash","updatedAt"::text FROM "TripWeatherReview" ORDER BY "id"`;
  const unknownEvidence = value => {
    assert.equal(value.license.status, 'NOT_VERIFIED'); assert.equal(value.license.reference, null);
    assert.equal(value.usagePlan.status, 'NOT_VERIFIED'); assert.equal(value.usagePlan.unitCost, null); assert.equal(value.usagePlan.budgetLimit, null);
    assert.equal(value.providerAcceptance.status, 'NOT_VERIFIED'); assert.equal(value.operationalAcceptance, false); assert.equal(value.navigationGranted, false);
    assert.equal(value.providerObservation.scope, 'CURRENT_PROCESS');
    assert.ok(!JSON.stringify(value).includes(settings.STORMGLASS_API_KEY)); assert.ok(!JSON.stringify(value).includes(settings.MARINETRAFFIC_API_KEY));
  };
  const internalOnly = value => {
    assert.equal(value.distress.externalDistressSent, false); assert.equal(value.distress.externalTransmission, 'NOT_IMPLEMENTED');
    assert.equal(value.distress.humanEmergencyEscalationRequired, true); assert.equal(value.distress.aisUsedForEffectivePosition, false);
    assert.equal(value.distress.navigationGranted, false); assert.equal(value.distress.operationalAcceptance, false); assert.equal(value.incident.severity, 'CRITICAL');
  };
  try {
    const trip = await db.trip.create({ data: { title: 'Synthetic D03 native source trip', type: 'SHORE_DIVE', status: 'OPEN', capacity: 1,
      organizationId: f.center.id, startsAt: weatherTarget, endsAt: new Date(Date.parse(weatherTarget) + 3600000) } });
    const reviewPath = '/trips/admin/weather-gate/trips/' + trip.id;
    const settingsBefore = JSON.stringify(await db.operationalSetting.findMany({ where: { key: 'WEATHER_GATE' } }));
    const policyBefore = JSON.stringify(await db.policyControl.findMany({ where: { category: 'WEATHER' } }));
    const transport = f.load('integrations/marine-provider-transport.js');

    await check('public configuration distinguishes setup, current-process observation and unverified external acceptance', async () => {
      const count = requests.length, audits = await db.auditEvent.count();
      const map = ok(await call(null, '/integrations/maps/public-config')), weatherConfig = ok(await call(null, '/integrations/weather/public-config'));
      [map, weatherConfig].forEach(unknownEvidence); assert.equal(map.enabled, true); assert.equal(weatherConfig.configured, true);
      assert.equal(map.dataFreshness.status, 'NOT_ASSESSED'); assert.equal(weatherConfig.dataFreshness.status, 'TRIP_REVIEW_REQUIRED');
      assert.equal(weatherConfig.providerObservation.status, 'NOT_OBSERVED');
      const ais = ok(await call(f.reviewer, '/health/integrations/distress-ais')); unknownEvidence(ais);
      assert.equal(ais.aisConfigured, true); assert.equal(ais.aisReady, false); assert.equal(ais.distressReady, false); assert.equal(ais.productionReady, false);
      denied(await call(null, '/health/integrations/distress-ais'), 401); denied(await call(f.participant, '/health/integrations/distress-ais'), 403);
      assert.equal(requests.length, count); assert.equal(await db.auditEvent.count(), audits);
    });
    await check('production origins stay allowlisted and loopback requires all explicit disposable-test conditions', async () => {
      const count = requests.length, before = process.env.STORMGLASS_API_BASE_URL;
      for (const value of ['http://api.stormglass.io', 'https://api.stormglass.io.evil.invalid', 'https://user:password@api.stormglass.io', 'https://api.stormglass.io/path', 'http://169.254.169.254', 'http://localhost:9999', 'https://api.stormglass.io:444', 'https://provider.invalid']) {
        process.env.STORMGLASS_API_BASE_URL = value;
        assert.throws(() => transport.marineProviderOrigin('STORMGLASS'), error => error.getResponse?.().code === 'MARINE_ENDPOINT_NOT_ALLOWED');
      }
      process.env.STORMGLASS_API_BASE_URL = before;
      for (const key of ['CI', 'NODE_ENV', 'D03_MARINE_TEST_CONFIRM']) {
        const prior = process.env[key]; delete process.env[key];
        assert.throws(() => transport.marineProviderOrigin('STORMGLASS'), error => error.getResponse?.().code === 'MARINE_ENDPOINT_NOT_ALLOWED');
        process.env[key] = prior;
      }
      assert.equal(transport.marineProviderOrigin('STORMGLASS'), origin); assert.equal(requests.length, count);
    });
    await check('the actual weather adapter preserves zero and binds only sg to the requested forecast source', async () => {
      const value = ok(await weather()); assert.equal(value.windSpeedKph, 0); assert.equal(value.windGustKph, 7.2); assert.equal(value.waveHeightM, 0);
      assert.equal(value.source, 'sg'); assert.equal(value.sourceEvidence.dataset, 'sg'); assert.equal(value.sourceEvidence.requestedFor, weatherTarget);
      assert.match(value.sourceEvidence.dataDigest, /^[a-f0-9]{64}$/); assert.equal(value.decision, 'REVIEW_REQUIRED');
      const config = ok(await call(null, '/integrations/weather/public-config')); unknownEvidence(config); assert.equal(config.providerObservation.status, 'RESPONSE_RECEIVED');
    });
    await check('NOAA and meteo data cannot be relabelled sg and failure cannot persist a weather review', async () => {
      const before = await weatherRows();
      for (mode of ['NOAA_ONLY', 'METEO_ONLY']) assert.equal(denied(await weather(), 503).code, 'WEATHER_REQUESTED_SOURCE_MISSING');
      assert.deepEqual(await weatherRows(), before);
      const config = ok(await call(null, '/integrations/weather/public-config')); assert.equal(config.providerObservation.status, 'FAILED'); unknownEvidence(config); reset();
    });
    await check('weather timestamps must be actual UTC instants inside the original requested trip window', async () => {
      for (const time of ['2026-02-30T12:00:00Z', '2026-01-01T12:00:00', new Date(Date.parse(weatherTarget) + 3601000).toISOString()]) {
        payloadOverride = { hours: [{ time, windSpeed: { sg: 1 } }] };
        assert.equal(denied(await weather(), 503).code, 'WEATHER_FORECAST_WINDOW_EMPTY');
      }
      reset();
    });
    await check('native refresh, human approval and unchanged-evidence refresh preserve the original weather gate', async () => {
      ok(await call(f.reviewer, '/trips/admin/' + trip.id + '/location', 'PATCH', { locationName: 'Synthetic D03 zero-coordinate source', latitude: 0, longitude: 0 }));
      let state = ok(await call(f.reviewer, reviewPath + '/refresh', 'POST')); assert.equal(state.review.status, 'PENDING');
      const gate = f.app.get(f.load('trips/weather-gate.service.js').WeatherGateService);
      assert.equal(gate.evaluateReview(state.review.snapshot, state.review.status, { enabled: true, mode: 'ENFORCE', provider: 'STORMGLASS' }, state.review.context, state.review.fetchedAt).blocking, true);
      state = ok(await call(f.reviewer, reviewPath + '/decision', 'POST', { status: 'APPROVED', expectedReview: state.review.decisionToken, notes: 'Synthetic human test decision, not real marine authorization.' }));
      assert.equal(state.review.status, 'APPROVED');
      const originalId = state.review.id, originalHash = state.review.snapshotHash;
      state = ok(await call(f.reviewer, reviewPath + '/refresh', 'POST'));
      assert.equal(state.review.id, originalId); assert.equal(state.review.snapshotHash, originalHash); assert.equal(state.review.status, 'APPROVED');
      assert.equal(gate.evaluateReview(state.review.snapshot, state.review.status, { enabled: true, mode: 'ENFORCE', provider: 'STORMGLASS' }, state.review.context, state.review.fetchedAt).blocking, false);
      const before = await weatherRows(), audits = await db.auditEvent.count(); ok(await call(f.reviewer, reviewPath));
      assert.deepEqual(await weatherRows(), before); assert.equal(await db.auditEvent.count(), audits);
    });
    await check('two native human decisions cannot approve and reject the same weather revision', async () => {
      waveHeight = 1; const current = ok(await call(f.reviewer, reviewPath + '/refresh', 'POST'));
      const results = await Promise.all(['APPROVED', 'REJECTED'].map(status => call(f.reviewer, reviewPath + '/decision', 'POST', { status, expectedReview: current.review.decisionToken })));
      assert.equal(results.filter(row => row.status === 201).length, 1); assert.equal(results.filter(row => row.status === 409).length, 1);
      assert.equal(await db.auditEvent.count({ where: { resourceId: current.review.id, action: { in: ['TRIP_WEATHER_APPROVED', 'TRIP_WEATHER_REJECTED'] } } }), 1);
    });
    await check('native trip context changed during a provider response invalidates that response without a new review', async () => {
      const before = await weatherRows();
      onRequest = async () => { ok(await call(f.reviewer, '/trips/admin/' + trip.id + '/location', 'PATCH', { locationName: 'Synthetic changed location', latitude: 1, longitude: 1 })); };
      denied(await call(f.reviewer, reviewPath + '/refresh', 'POST'), 409);
      assert.equal((await weatherRows()).length, before.length);
      assert.equal(ok(await call(f.reviewer, reviewPath)).review.requiresRefresh, true); reset();
    });
    await check('matching MMSI and IMO retain provenance but unassessed AIS never replaces caller coordinates', async () => {
      const value = ok(await distress({ tripId: trip.id, imo: '1234567' })); internalOnly(value);
      assert.equal(value.distress.aisLookupStatus, 'UNASSESSED'); assert.equal(value.distress.aisSnapshot.identityMatched, true);
      assert.deepEqual(value.distress.effectivePosition, { latitude: 18.2, longitude: 42.5, source: 'CALLER' });
      assert.deepEqual(value.distress.aisSnapshot.requestBinding, { mmsi: '123456789', imo: '1234567' });
      assert.equal(value.distress.aisSnapshot.freshness.operationalUseAllowed, false); assert.equal(value.distress.aisSnapshot.freshness.providerWindowMinutes, 5);
      assert.equal(value.distress.aisSnapshot.freshness.operationalPolicyReference, null);
      const original = await db.auditEvent.findFirstOrThrow({ where: { action: 'SAFETY_DISTRESS_CASE_OPENED', resourceId: value.incident.id } });
      assert.deepEqual(original.metadata.aisSnapshot, value.distress.aisSnapshot); assert.equal(original.metadata.aisUsedForEffectivePosition, false);
      unknownEvidence(ok(await call(f.reviewer, '/health/integrations/distress-ais')));
    });
    await check('positions outside the documented provider request window remain stale information with caller fallback', async () => {
      aisPatch = { TIMESTAMP: new Date(Date.now() - 360000).toISOString() };
      const value = ok(await distress()); internalOnly(value); assert.equal(value.distress.aisLookupStatus, 'STALE');
      assert.ok(value.distress.aisReasonCodes.includes('PROVIDER_REQUEST_WINDOW_EXCEEDED')); assert.equal(value.distress.effectivePosition.source, 'CALLER');
      const absent = ok(await distress({ latitude: undefined, longitude: undefined })); internalOnly(absent); assert.equal(absent.distress.effectivePosition, null); reset();
    });
    await check('IMO-only queries and dual identifiers reject mismatched vessels and ambiguous response rows', async () => {
      for (const input of [{ mmsi: undefined, imo: '7654321' }, { imo: '7654321' }, { mmsi: '987654321' }]) {
        const value = ok(await distress(input)); internalOnly(value); assert.equal(value.distress.aisLookupStatus, 'UNAVAILABLE');
        assert.ok(value.distress.aisReasonCodes.includes('AIS_VESSEL_IDENTITY_MISMATCH')); assert.equal(value.distress.effectivePosition.source, 'CALLER');
      }
      mode = 'AMBIGUOUS'; const value = ok(await distress()); assert.ok(value.distress.aisReasonCodes.includes('AIS_RESPONSE_AMBIGUOUS')); reset();
    });
    await check('missing, malformed, impossible, local-time and future AIS timestamps cannot become a current position', async () => {
      for (const TIMESTAMP of [null, '', 'yesterday', '2026-02-30T12:00:00Z', '2026-01-01T12:00:00', ['2026-01-01T00:00:00Z'], new Date(Date.now() + 3600000).toISOString()]) {
        aisPatch = { TIMESTAMP }; const value = ok(await distress()); internalOnly(value);
        assert.equal(value.distress.aisLookupStatus, 'UNAVAILABLE'); assert.equal(value.distress.aisSnapshot, null); assert.equal(value.distress.effectivePosition.source, 'CALLER');
        assert.ok(value.distress.aisReasonCodes.some(code => ['AIS_TIMESTAMP_INVALID', 'AIS_TIMESTAMP_IN_FUTURE'].includes(code)));
      }
      reset();
    });
    await check('malformed identifiers, invalid coordinates and nonexistent trip links fail before optional provider cost', async () => {
      const before = requests.length, count = await db.safetyIncident.count();
      for (const input of [{ mmsi: ['123456789'] }, { imo: ['1234567'] }, { latitude: false }, { longitude: 181 }, { locationName: 'x'.repeat(161) }, { tripId: 'invalid' }]) denied(await distress(input), 400);
      denied(await distress({ tripId: randomUUID() }), 404);
      assert.equal(requests.length, before); assert.equal(await db.safetyIncident.count(), count);
    });
    await check('a reporting account revoked during lookup cannot commit a late incident', async () => {
      const before = await db.safetyIncident.count(), original = await db.account.findUniqueOrThrow({ where: { id: f.participant.id } });
      onRequest = () => db.account.update({ where: { id: f.participant.id }, data: { status: 'SUSPENDED' } });
      try { denied(await distress(), 403); assert.equal(await db.safetyIncident.count(), before); }
      finally { await db.account.update({ where: { id: f.participant.id }, data: { status: original.status, updatedAt: original.updatedAt } }); reset(); }
    });
    await check('a trip removed during lookup cannot leave an incident attached to a stale reference', async () => {
      const temporary = await db.trip.create({ data: { title: 'Synthetic transient D03 trip', type: 'SHORE_DIVE', status: 'OPEN', capacity: 1, startsAt: weatherTarget, endsAt: new Date(Date.parse(weatherTarget) + 3600000) } });
      const before = await db.safetyIncident.count(); onRequest = () => db.trip.delete({ where: { id: temporary.id } });
      denied(await distress({ tripId: temporary.id }), 404); assert.equal(await db.safetyIncident.count(), before); reset();
    });
    await check('provider authentication, quota and server failures preserve the internal incident and never retry implicitly', async () => {
      for (mode of ['STATUS_401', 'STATUS_403', 'STATUS_429', 'STATUS_503']) {
        const before = requests.length; denied(await weather(), 503); assert.equal(requests.length, before + 1);
        const value = ok(await distress()); internalOnly(value); assert.equal(value.distress.aisLookupStatus, 'UNAVAILABLE');
        assert.equal(value.distress.effectivePosition.source, 'CALLER'); assert.equal(requests.length, before + 2);
      }
      reset();
    });
    await check('the actual HTTP transport refuses redirects without following a second endpoint or disclosing credentials', async () => {
      mode = 'REDIRECT'; const before = requests.length;
      const failure = denied(await weather(), 503); assert.equal(failure.code, 'MARINE_PROVIDER_REDIRECT_REFUSED'); assert.ok(!JSON.stringify(failure).includes(settings.STORMGLASS_API_KEY));
      const value = ok(await distress()); internalOnly(value); assert.ok(value.distress.aisReasonCodes.includes('MARINE_PROVIDER_REDIRECT_REFUSED'));
      assert.equal(requests.length, before + 2); assert.ok(!requests.some(row => row.path === '/redirect-followed')); reset();
    });
    await check('declared and streamed oversized bodies, non-JSON content and malformed bytes fail through the real transport', async () => {
      for (mode of ['DECLARED_OVERSIZE', 'CHUNK_OVERSIZE', 'BAD_CONTENT_TYPE', 'BAD_UTF8', 'BAD_JSON']) {
        const before = requests.length, response = denied(await weather(), 503);
        assert.ok(['MARINE_PROVIDER_RESPONSE_TOO_LARGE', 'MARINE_PROVIDER_CONTENT_TYPE_INVALID', 'MARINE_PROVIDER_RESPONSE_INVALID'].includes(response.code));
        assert.equal(requests.length, before + 1);
      }
      reset();
    });
    await check('the native response-body deadline aborts a stalled loopback response', async () => {
      mode = 'TIMEOUT'; const before = requests.length, started = Date.now();
      assert.equal(denied(await weather(), 503).code, 'MARINE_PROVIDER_TIMEOUT');
      assert.ok(Date.now() - started >= 7900); assert.ok(Date.now() - started < 15000); assert.equal(requests.length, before + 1); reset();
    });
    await check('configuration changed while the provider responds invalidates the captured request', async () => {
      onRequest = () => { process.env.STORMGLASS_API_KEY = 'SYNTHETIC_CHANGED_KEY'; };
      try { assert.equal(denied(await weather(), 503).code, 'MARINE_CONFIGURATION_CHANGED'); }
      finally { process.env.STORMGLASS_API_KEY = settings.STORMGLASS_API_KEY; reset(); }
      onRequest = () => { process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS = 'DISABLED'; };
      try { const value = ok(await distress()); internalOnly(value); assert.equal(value.distress.aisLookupStatus, 'UNAVAILABLE'); }
      finally { process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS = settings.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS; reset(); }
    });
    await check('a disabled provider or no vessel identifier leaves a valid internal report without external transmission', async () => {
      process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS = 'DISABLED'; const before = requests.length;
      try { const value = ok(await distress()); internalOnly(value); assert.equal(value.distress.aisLookupStatus, 'UNAVAILABLE'); }
      finally { process.env.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS = settings.HYDROLAND_INTEGRATION_DISTRESS_AIS_STATUS; }
      const without = ok(await distress({ mmsi: undefined, latitude: undefined, longitude: undefined })); internalOnly(without);
      assert.equal(without.distress.aisLookupStatus, 'NOT_REQUESTED'); assert.equal(without.distress.aisLookupAttempted, false); assert.equal(without.distress.effectivePosition, null);
      assert.equal(requests.length, before);
    });
    await check('no test activates a weather policy, invents a licence or budget, changes money or contacts an external service', async () => {
      assert.equal(JSON.stringify(await db.operationalSetting.findMany({ where: { key: 'WEATHER_GATE' } })), settingsBefore);
      assert.equal(JSON.stringify(await db.policyControl.findMany({ where: { category: 'WEATHER' } })), policyBefore);
      assert.equal(await db.financeEntry.count(), 0); assert.equal(externalAttempts.length, 0); assert.equal(f.externalAttempts.length, 0);
      unknownEvidence(ok(await call(null, '/integrations/weather/public-config'))); unknownEvidence(ok(await call(null, '/integrations/maps/public-config')));
    });
    const evidence = { scope: 'SYNTHETIC_HTTP_POSTGRESQL_D03', passed: checks.length, failed: 0, skipped: 0,
      runtime: process.version, postgresVersion: (await db.$queryRaw`SHOW server_version`)[0].server_version,
      actualLoopbackProviderRequests: requests.length, externalHttpRequests: externalAttempts.length,
      nativeWeatherReviewAndAudit: true, nativeInternalIncidentAndAudit: true, providerAcceptance: 'NOT_VERIFIED',
      license: 'NOT_VERIFIED', usagePlan: 'NOT_VERIFIED', operationalAcceptance: false, navigationGranted: false, externalDistressSent: false, checks };
    if (process.env.D03_MARINE_EVIDENCE_FILE) await writeFile(process.env.D03_MARINE_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve));
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await f.close(); global.fetch = nativeFetch;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
