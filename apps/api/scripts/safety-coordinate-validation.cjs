const assert = require('node:assert/strict');
const { finiteNumericInput } = require('../dist/geo/coordinate-input');
const { MarineTrafficAisService } = require('../dist/integrations/marinetraffic-ais.service');
const { SafetyDistressService } = require('../dist/safety/safety-distress.service');
const { TripWeatherReviewService } = require('../dist/trips/trip-weather-review.service');
const { WeatherGateController } = require('../dist/trips/weather-gate.controller');
const { StormglassWeatherService } = require('../dist/trips/stormglass-weather.service');

// Offline only: fake persistence/provider collaborators, no credentials or settings.
let networkCalls = 0;
global.fetch = async () => { networkCalls++; throw new Error('Network prohibited in coordinate validation.'); };
const bad = [undefined, null, '', '  ', false, true, [], [0], {}, NaN, Infinity, -Infinity, 'NaN', 'Infinity', 'not-a-number'];
const invalidPair = (lat, lon) => ({ latitude: lat, longitude: lon });
const status = expected => error => error.getStatus?.() === expected;
let checks = 0;
const check = fn => { fn(); checks++; };
const rejects = async (fn, expected) => { await assert.rejects(fn, status(expected)); checks++; };

(async () => {
  for (const value of bad) check(() => assert.equal(finiteNumericInput(value), null));
  for (const [value, expected] of [[0, 0], ['0', 0], [' -18.2 ', -18.2], ['+42.5', 42.5], ['1e1', 10]]) {
    check(() => assert.equal(finiteNumericInput(value), expected));
  }

  const ais = new MarineTrafficAisService({});
  const parse = row => ais.position([row], '123456789');
  for (const value of bad) {
    check(() => assert.throws(() => parse({ MMSI: '123456789', LAT: value, LON: 42.5 }), status(503)));
    check(() => assert.throws(() => parse({ MMSI: '123456789', LAT: 18.2, LON: value }), status(503)));
  }
  for (const [LAT, LON] of [[91, 42.5], [-91, 42.5], [18.2, 181], [18.2, -181]]) {
    check(() => assert.throws(() => parse({ MMSI: '123456789', LAT, LON }), status(503)));
  }
  check(() => assert.throws(() => parse({ MMSI: '987654321', LAT: 18.2, LON: 42.5 }), status(503)));
  for (const [LAT, LON] of [[0, 0], ['0', '0'], [-90, -180], ['90', '180'], [' 18.2 ', '42.5']]) {
    const position = parse({ MMSI: '123456789', LAT, LON });
    check(() => assert.equal(position.latitude, Number(LAT)));
    check(() => assert.equal(position.longitude, Number(LON)));
    check(() => assert.equal(position.speedKnots, null));
    check(() => assert.equal(position.courseDeg, null));
    check(() => assert.equal(position.headingDeg, null));
  }
  for (const value of bad) {
    const position = parse({ MMSI: '123456789', LAT: 18.2, LON: 42.5, SPEED: value, COURSE: value, HEADING: value });
    check(() => assert.equal(position.speedKnots, null));
    check(() => assert.equal(position.courseDeg, null));
    check(() => assert.equal(position.headingDeg, null));
  }
  const zero = parse({ MMSI: '123456789', LAT: 0, LON: 0, SPEED: '0', COURSE: 0, HEADING: '0' });
  check(() => assert.deepEqual([zero.speedKnots, zero.courseDeg, zero.headingDeg], [0, 0, 0]));
  check(() => assert.equal(parse({ MMSI: '123456789', LAT: 0, LON: 0, SPEED: '124' }).speedKnots, 12.4));

  let incidentWrites = 0, aisCalls = 0;
  const audits = [];
  const distress = new SafetyDistressService(
    { create: async (_accountId, input) => { incidentWrites++; return { id: 'offline-incident', ...input }; } },
    { singleVesselByMmsi: async () => { aisCalls++; return parse({ MMSI: '123456789' }); } },
    { record: async event => audits.push(event) },
  );
  const fallback = await distress.open('offline-account', { description: 'Offline regression', mmsi: '123456789', latitude: 18.2, longitude: 42.5 });
  check(() => assert.deepEqual(fallback.distress.effectivePosition, { latitude: 18.2, longitude: 42.5, source: 'CALLER' }));
  check(() => assert.equal(fallback.distress.aisLookupStatus, 'UNAVAILABLE'));
  check(() => assert.equal(fallback.distress.aisSnapshot, null));
  check(() => assert.equal(fallback.distress.externalDistressSent, false));
  check(() => assert.equal(fallback.distress.externalTransmission, 'NOT_IMPLEMENTED'));
  check(() => assert.equal(fallback.distress.humanEmergencyEscalationRequired, true));
  check(() => assert.equal(audits[0].metadata.externalDistressSent, false));
  const absent = await distress.open('offline-account', { description: 'Offline no position', mmsi: '123456789' });
  check(() => assert.equal(absent.distress.effectivePosition, null));
  const before = { incidentWrites, aisCalls, auditWrites: audits.length };
  for (const value of bad.filter(v => v !== undefined && v !== null)) {
    await rejects(() => distress.open('offline-account', { description: 'Offline invalid input', mmsi: '123456789', latitude: value, longitude: value }), 400);
  }
  await rejects(() => distress.open('offline-account', { description: 'Offline missing pair', latitude: 18.2 }), 400);
  check(() => assert.deepEqual({ incidentWrites, aisCalls, auditWrites: audits.length }, before));
  check(() => assert.deepEqual(distress.coordinates('0', 0), { latitude: 0, longitude: 0 }));
  check(() => assert.equal(distress.coordinates(null, null), null));

  let locationWrites = 0;
  const reviews = new TripWeatherReviewService(
    { trip: { findUnique: async () => ({ id: 'offline-trip' }) }, $queryRaw: async () => { locationWrites++; return [{}]; }, $executeRaw: async () => {} },
    {}, { record: async () => {} },
  );
  for (const value of bad) {
    await rejects(() => reviews.setLocation('offline-account', 'offline-trip', { locationName: 'Offline', ...invalidPair(value, 42.5) }), 400);
    await rejects(() => reviews.setLocation('offline-account', 'offline-trip', { locationName: 'Offline', ...invalidPair(18.2, value) }), 400);
  }
  check(() => assert.equal(locationWrites, 0));
  for (const [latitude, longitude] of [[0, 0], ['0', '0'], ['18.2', '42.5'], [-90, 180]]) {
    check(() => assert.deepEqual(reviews.validateLocation({ locationName: ' Offline ', latitude, longitude }), { locationName: 'Offline', latitude: Number(latitude), longitude: Number(longitude) }));
  }
  for (const [latitude, longitude] of [[91, 0], [0, -181]]) {
    check(() => assert.throws(() => reviews.validateLocation({ locationName: 'Offline', latitude, longitude }), status(400)));
  }

  let providerChecks = 0;
  const weather = new StormglassWeatherService({ requireOperational: () => { providerChecks++; throw new Error('Provider must not be reached.'); } });
  const controller = new WeatherGateController({}, weather, {});
  for (const value of bad) {
    await rejects(async () => controller.snapshot({ query: invalidPair(value, '42.5') }), 400);
    await rejects(async () => controller.snapshot({ query: invalidPair('18.2', value) }), 400);
  }
  for (const [latitude, longitude] of [['91', '0'], ['0', '-181']]) {
    await rejects(async () => controller.snapshot({ query: { latitude, longitude } }), 400);
  }
  check(() => assert.equal(providerChecks, 0));
  const normalized = new WeatherGateController({}, { snapshot: (...args) => args }, {});
  check(() => assert.deepEqual(normalized.snapshot({ query: { latitude: ' 0 ', longitude: '0' } }), [0, 0, undefined]));
  check(() => assert.deepEqual(normalized.snapshot({ query: { latitude: '18.2', longitude: '42.5' } }), [18.2, 42.5, undefined]));
  check(() => assert.equal(networkCalls, 0));
  console.log(`Safety coordinate validation: ${checks} offline assertions passed; AIS fallback, valid zero, optional nulls, trip/weather rejection, no provider calls or external dispatch.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
