const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { TripWeatherReviewService } = require('../dist/trips/trip-weather-review.service');
const { WeatherGateService } = require('../dist/trips/weather-gate.service');
const { canonicalWeatherJson, validWeatherReview, forecastWindow } = require('../dist/trips/weather-review-context');

// No live database, secrets, operational settings, provider or emergency channels.
let networkCalls = 0, assertions = 0;
global.fetch = async () => { networkCalls++; throw new Error('Network forbidden.'); };
const check = fn => { fn(); assertions++; };
const rejects = async (fn, expected = 409) => { await assert.rejects(fn, error => error.getStatus?.() === expected); assertions++; };
const copy = value => structuredClone(value);
const settings = { enabled: true, mode: 'ENFORCE', provider: 'STORMGLASS' };
const gate = new WeatherGateService({}, {});
const evaluate = review => gate.evaluateReview(review?.snapshot, review?.status, settings, review?.context, review?.fetchedAt);
function harness() {
  const start = new Date(Date.now() + 2 * 86400000);
  const state = { trip: { id: 'offline-trip', title: 'Offline', startsAt: start, endsAt: new Date(start.getTime() + 3600000), status: 'OPEN' }, location: { tripId: 'offline-trip', locationName: 'A', latitude: 18.2, longitude: 42.5, revision: 'location-1' }, reviews: [], audits: [], counter: 1 };
  let tail = Promise.resolve(), activeAdmin = true, failAudit = false, casMiss = false;
  const revise = row => ({ ...row, revision: 'revision-' + ++state.counter, updatedAt: new Date() });
  const db = {
    serializable(work) {
      const result = tail.then(async () => { const before = copy(state); try { return await work(db); } catch (error) { Object.assign(state, before); throw error; } });
      tail = result.catch(() => {}); return result;
    },
    trip: { findUnique: async () => copy(state.trip) },
    roleAssignment: { findFirst: async query => { assert.equal(query.where.role, 'ADMIN'); assert.deepEqual(query.where.account, { status: 'ACTIVE' }); return activeAdmin ? { id: 'offline-role' } : null; } },
    $queryRaw: async (strings, ...values) => {
      const sql = strings.join('');
      if (sql.includes('FOR UPDATE')) return [{ id: state.trip.id }];
      if (sql.includes('FROM "TripOperationalLocation"')) return state.location ? [copy(state.location)] : [];
      if (sql.includes('FROM "TripWeatherReview"')) return state.reviews.length ? [copy(state.reviews.at(-1))] : [];
      if (sql.startsWith('INSERT INTO "TripOperationalLocation"')) {
        state.location = revise({ ...state.location, locationName: values[0], latitude: values[1], longitude: values[2] }); return [copy(state.location)];
      }
      if (sql.startsWith('INSERT INTO "TripWeatherReview"')) {
        const row = revise({ id: 'review-' + state.counter, tripId: state.trip.id, provider: values[0], forecastAt: values[1], fetchedAt: values[2], snapshot: JSON.parse(canonicalWeatherJson(JSON.parse(values[3]))), snapshotHash: values[4], status: 'PENDING', notes: null, reviewedAt: null, reviewedByAccountId: null, createdAt: new Date() });
        state.reviews.push(row); return [copy(row)];
      }
      if (sql.startsWith('UPDATE "TripWeatherReview" SET "provider"')) {
        const index = state.reviews.findIndex(row => row.id === values[4]);
        state.reviews[index] = revise({ ...state.reviews[index], provider: values[0], forecastAt: values[1], fetchedAt: values[2], snapshot: JSON.parse(values[3]) });
        return [copy(state.reviews[index])];
      }
      if (sql.startsWith('UPDATE "TripWeatherReview" SET "status"')) {
        check(() => assert.match(sql, /AND "snapshotHash"=.*AND "updatedAt"=.*::timestamptz/));
        const index = state.reviews.findIndex(row => row.id === values[3] && row.snapshotHash === values[4] && row.revision === values[5]);
        if (index < 0 || casMiss) return [];
        state.reviews[index] = revise({ ...state.reviews[index], status: values[0], notes: values[1], reviewedByAccountId: values[2], reviewedAt: new Date() });
        return [copy(state.reviews[index])];
      }
      throw new Error('Unexpected offline SQL: ' + sql);
    },
    $executeRaw: async () => { state.reviews = state.reviews.map(row => row.status === 'APPROVED' ? revise({ ...row, status: 'PENDING', reviewedAt: null, reviewedByAccountId: null }) : row); return 1; },
  };
  let providerCalls = 0;
  const weather = { snapshot: async () => { providerCalls++; return { provider: 'STORMGLASS', observedAt: state.trip.startsAt.toISOString(), windSpeedKph: 10 }; } };
  const service = new TripWeatherReviewService(db, weather, { record: async (event, tx) => { check(() => assert.equal(tx, db)); if (failAudit) throw new Error('Offline audit failure'); state.audits.push(copy(event)); } });
  const approve = async review => service.decide('offline-admin', state.trip.id, { status: 'APPROVED', expectedReview: review.decisionToken });
  return { state, service, weather, approve, providerCalls: () => providerCalls, revoke: () => activeAdmin = false, failAudit: () => failAudit = true, casMiss: () => casMiss = true };
}

(async () => {
  let h = harness();
  let current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  check(() => assert.equal(current.status, 'PENDING'));
  check(() => assert.equal(current.requiresRefresh, false));
  check(() => assert.match(current.decisionToken, /^[a-f0-9]{64}$/));
  check(() => assert.equal(evaluate(current).blocking, true));
  let approved = (await h.approve(current)).review;
  check(() => assert.equal(approved.status, 'APPROVED'));
  check(() => assert.equal(evaluate(approved).blocking, false));
  check(() => assert.notEqual(approved.decisionToken, current.decisionToken));
  await rejects(() => h.approve(current));
  const identical = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  check(() => assert.equal(identical.status, 'APPROVED'));
  check(() => assert.equal(identical.snapshotHash, approved.snapshotHash));
  check(() => assert.notEqual(identical.decisionToken, approved.decisionToken));
  await rejects(() => h.approve(approved));
  const providerCount = h.providerCalls();
  await h.service.setLocation('offline-admin', h.state.trip.id, { locationName: 'B', latitude: 25, longitude: 50 });
  let stale = await h.service.latest(h.state.trip.id);
  check(() => assert.equal(stale.status, 'PENDING'));
  check(() => assert.equal(stale.requiresRefresh, true));
  check(() => assert.equal(stale.decisionToken, null));
  check(() => assert.equal(evaluate(stale).blocking, true));
  await rejects(() => h.approve(identical));
  check(() => assert.equal(h.providerCalls(), providerCount));
  current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  approved = (await h.approve(current)).review;
  check(() => assert.equal(approved.snapshot.forecastContext.locationName, 'B'));
  check(() => assert.equal(evaluate(approved).blocking, false));
  h.state.trip.startsAt = new Date(h.state.trip.startsAt.getTime() + 86400000);
  h.state.trip.endsAt = new Date(h.state.trip.endsAt.getTime() + 86400000);
  stale = await h.service.latest(h.state.trip.id);
  check(() => assert.equal(stale.status, 'PENDING'));
  await rejects(() => h.approve(approved));
  check(() => assert.equal(evaluate(stale).blocking, true));

  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  delete h.state.reviews[0].snapshot.forecastContext;
  stale = await h.service.latest(h.state.trip.id);
  check(() => assert.equal(stale.requiresRefresh, true));
  await rejects(() => h.approve(current));
  await rejects(() => h.service.decide('offline-admin', h.state.trip.id, { status: 'APPROVED' }));
  check(() => assert.equal(gate.evaluateReview({}, 'APPROVED', settings).decision, 'REVIEW_REQUIRED'));
  check(() => assert.equal(gate.evaluateReview({}, 'APPROVED', { ...settings, mode: 'ADVISORY' }).blocking, false));
  check(() => assert.equal(gate.evaluateReview({}, 'APPROVED', { ...settings, enabled: false }).blocking, false));

  for (const mutation of [
    row => row.fetchedAt = new Date(Date.now() + 60000),
    row => row.fetchedAt = new Date(NaN),
    row => row.snapshot.observedAt = '2020-01-01T00:00:00Z',
    row => row.snapshot.observedAt = 'not-a-date',
    row => row.snapshot = { forecastContext: row.snapshot.forecastContext },
    row => row.snapshotHash = 'a'.repeat(64),
    row => row.forecastAt = new Date('2020-01-01'),
  ]) {
    h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
    mutation(h.state.reviews[0]); stale = await h.service.latest(h.state.trip.id);
    check(() => assert.equal(stale.requiresRefresh, true));
    check(() => assert.equal(evaluate(stale).blocking, true));
    await rejects(() => h.approve(current));
  }
  h = harness();
  h.weather.snapshot = async () => ({ provider: 'STORMGLASS', observedAt: h.state.trip.startsAt.toISOString() });
  await rejects(() => h.service.refresh('offline-admin', h.state.trip.id), 503);
  check(() => assert.equal(h.state.reviews.length, 0));

  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  h.revoke(); await rejects(() => h.approve(current), 403);
  check(() => assert.equal(h.state.reviews[0].status, 'PENDING'));
  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  h.casMiss(); await rejects(() => h.approve(current));
  check(() => assert.equal(h.state.reviews[0].status, 'PENDING'));
  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  const before = copy(h.state); h.failAudit();
  await assert.rejects(() => h.approve(current), /Offline audit failure/);
  check(() => assert.deepEqual(h.state, before));
  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  const concurrent = await Promise.allSettled([h.approve(current), h.approve(current)]);
  check(() => assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1));
  check(() => assert.equal(h.state.audits.filter(row => row.action === 'TRIP_WEATHER_APPROVED').length, 1));

  h = harness();
  h.weather.snapshot = async () => { await h.service.setLocation('offline-admin', h.state.trip.id, { locationName: 'Changed while fetching', latitude: 21, longitude: 40 }); return { provider: 'STORMGLASS', observedAt: h.state.trip.startsAt.toISOString(), waveHeightM: 0 }; };
  await rejects(() => h.service.refresh('offline-admin', h.state.trip.id));
  check(() => assert.equal(h.state.reviews.length, 0));
  check(() => assert.equal(h.state.audits.filter(row => row.action === 'TRIP_WEATHER_REFRESHED').length, 0));

  h = harness(); current = (await h.service.refresh('offline-admin', h.state.trip.id)).review;
  // Do not invent a TTL or ban current forecasts for in-progress trips.
  const past = { ...current.context, startsAt: new Date(Date.now() - 3600000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString() };
  check(() => assert.equal(validWeatherReview({ windSpeedKph: 0, observedAt: past.startsAt, forecastContext: past }, past, new Date()), true));
  check(() => assert.equal(validWeatherReview(current.snapshot, current.context, current.fetchedAt), true));

  // Isolated adapter VM: process.env is a fixture object, fetch is an in-memory response.
  // No real environment variables are read/changed, and no network request can occur.
  const filename = path.resolve(__dirname, '../dist/trips/stormglass-weather.service.js');
  const adapterModule = { exports: {} }; let payload, requests = 0;
  const sandbox = { module: adapterModule, exports: adapterModule.exports, require: createRequire(filename), process: { env: { STORMGLASS_API_KEY: 'offline-fixture', STORMGLASS_API_BASE_URL: 'https://provider.invalid' } }, URL, AbortSignal, Date, fetch: async () => { requests++; return { ok: true, json: async () => payload }; } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  const adapter = new adapterModule.exports.StormglassWeatherService({ requireOperational: () => {} });
  const target = new Date(Date.now() + 2 * 86400000), window = forecastWindow(target.getTime());
  for (const bad of [null, {}, { hours: [null, {}, { time: 'bad' }] }, { hours: [{ time: target.toISOString() }] }, { hours: [{ time: target.toISOString(), windSpeed: { sg: null } }] }, { hours: [{ time: new Date(window.start - 1).toISOString(), waveHeight: { sg: 1 } }] }, { hours: [{ time: new Date(window.end + 1).toISOString(), waveHeight: { sg: 1 } }] }]) {
    payload = bad; await rejects(() => adapter.snapshot(18.2, 42.5, target), 503);
  }
  payload = { hours: [{ time: target.toISOString(), windSpeed: { sg: 0 }, gust: { sg: 2 } }] };
  const forecast = await adapter.snapshot(18.2, 42.5, target);
  check(() => assert.equal(forecast.windSpeedKph, 0));
  check(() => assert.equal(forecast.windGustKph, 7.2));
  check(() => assert.equal(forecast.waveHeightM, undefined));
  payload = { hours: [{ time: new Date(window.start).toISOString(), waveHeight: { sg: 0 } }] };
  const boundary = await adapter.snapshot(18.2, 42.5, target);
  check(() => assert.equal(boundary.waveHeightM, 0));
  check(() => assert.equal(networkCalls, 0));
  console.log(`Weather context validation: ${assertions} offline assertions passed; context binding, legacy fail-closed, CAS/concurrency, atomic audit, provider-window/measurement validation, preserved toggles and ${requests} in-memory adapter fixtures (zero network calls).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
