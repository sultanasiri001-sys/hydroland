const assert = require('node:assert/strict');
const { CalendarAllocationService } = require('../dist/trips/calendar-allocation.service');
const { OperationalClearanceService } = require('../dist/trips/operational-clearance.service');
const { PolicyControlService } = require('../dist/trips/policy-control.service');
const { BoatComplianceService } = require('../dist/trips/boat-compliance.service');
const { TripComplianceService } = require('../dist/trips/trip-compliance.service');
const { EquipmentInspectionService } = require('../dist/trips/equipment-inspection.service');
const { WeatherGateService } = require('../dist/trips/weather-gate.service');
const { TripWeatherReviewService } = require('../dist/trips/trip-weather-review.service');
const { MarineOperationsService } = require('../dist/marine-operations/marine-operations.service');
const { REQUIRED_MARINE_DOCUMENTS } = require('../dist/marine-operations/marine-operations.domain');
const start = new Date('2080-06-15T06:00:00Z'), end = new Date('2080-06-15T07:00:00Z');
let checks = 0;
global.fetch = () => { throw Error('Provider/network calls forbidden'); };
function fixture({ state = 'ENABLED', safety = 'ALLOWED', regulatory = 'APPROVED', maintenance = false, missingMaintenanceSchema = false, failAt, terminal = false } = {}) {
  const reads = [], snapshots = [], grants = [], failure = new Error('Injected ' + failAt);
  let rootReads = 0;
  const hit = name => { reads.push(name); if (name === failAt) throw failure; };
  const trip = { id: 'trip', title: 'Fixture', type: 'BOAT', startsAt: start, endsAt: end, capacity: 2, status: terminal ? 'CANCELLED' : 'OPEN', bookings: [{ seats: 1 }], safetyChecklists: [{ decision: safety }] };
  const allocations = ['BOAT', 'EQUIPMENT'].map(type => ({ id: type, tripId: 'trip', resourceType: type, resourceId: type, resourceName: type }));
  const tx = {
    trip: {
      findUnique: async () => { hit('trip'); return trip; },
      findMany: async args => { hit('trips'); assert.equal(args.where.id, 'trip'); return [trip]; },
    },
    $queryRaw: async (strings, ...values) => {
      const sql = Array.isArray(strings) ? strings.join('') : strings.sql;
      if (sql.includes('GREATEST')) { hit('revision'); return [{ changedAt: start }]; }
      if (sql.includes('PolicyControl')) { hit('policy:' + values[1]); return [{ state: values[0] === 'WEATHER' ? 'DISABLED' : state }]; }
      if (sql.includes('OperationalSetting')) { hit('weather-setting'); return []; }
      if (sql.includes('CrewAssignment')) { hit('crew'); return [{ tripId: 'trip', status: 'ACCEPTED' }]; }
      if (sql.includes('CalendarAllocation')) { hit('allocations'); return allocations; }
      if (sql.includes('BoatResourceCompliance')) { hit('boat-proof'); return [{ resourceId: 'BOAT', registrationNumber: 'fixture', registrationStatus: 'VERIFIED', navigationLicenseNumber: 'fixture', navigationLicenseExpiresAt: end, safetyCertificateExpiresAt: end, passengerLimit: 2 }]; }
      if (sql.includes('EquipmentInspection')) { hit('equipment-proof'); return [{ resourceId: 'EQUIPMENT', status: 'PASS', serviceExpiresAt: end }]; }
      if (sql.includes('to_regclass') && sql.includes('MaintenanceWorkOrder')) { hit('maintenance-schema'); return [{ absent: missingMaintenanceSchema }]; }
      if (sql.includes('MaintenanceWorkOrder')) { hit('maintenance-proof'); return maintenance ? [{ resourceId: 'EQUIPMENT' }] : []; }
      if (sql.includes('TripComplianceReview')) { hit('trip-proof'); return [{ regulatoryStatus: regulatory, permitStatus: 'APPROVED' }]; }
      if (sql.includes('TripOperationalLocation') || sql.includes('TripWeatherReview')) { hit('weather-proof'); return []; }
      throw Error('Unexpected query: ' + sql);
    },
    marineAsset: { findUnique: async () => { hit('marine-proof'); return { id: 'asset', status: 'ACTIVE', calendarResourceId: 'BOAT', maintenance: [], documents: REQUIRED_MARINE_DOCUMENTS.map(documentType => ({ documentType, status: 'VERIFIED', expiresAt: end })) }; } },
    marineReadinessSnapshot: { create: async input => { hit('marine-snapshot'); snapshots.push(input); return input; } },
    bookingParticipant: { findMany: async () => { hit('participants'); return []; } },
    auditEvent: { findFirst: async () => ({ id: 'prior', action: 'OPERATIONAL_CLEARANCE_GRANTED', occurredAt: end }) },
  };
  const root = new Proxy({ serializable: async work => { const n = snapshots.length, g = grants.length; try { hit('transaction'); return await work(tx); } catch (e) { snapshots.length = n; grants.length = g; throw e; } } }, { get(target, key) { if (key in target) return target[key]; rootReads++; throw Error('Root client escaped transaction: ' + String(key)); } });
  const audit = { record: async (input, client) => { assert.equal(client, tx); hit('audit'); grants.push(input); return { id: 'grant' }; } };
  const policies = new PolicyControlService(root, audit), gate = new WeatherGateService(root, audit);
  const calendar = new CalendarAllocationService(root, audit, gate, policies, new BoatComplianceService(root, policies, audit), new EquipmentInspectionService(root, audit, policies), new TripComplianceService(root, policies, audit), new MarineOperationsService(root, {}, audit), new TripWeatherReviewService(root, {}, audit));
  const clearance = new OperationalClearanceService(root, audit, calendar);
  return { tx, calendar, clearance, reads, snapshots, grants, failure, rootReads: () => rootReads };
}
function statusFixture({ state = 'ENABLED', invalidSource = false, changedAt = start, action = 'OPERATIONAL_CLEARANCE_GRANTED', auditFailure = false } = {}) {
  const events = action ? [{ id: 'prior', action, occurredAt: end }] : [], audits = [];
  const failure = new Error('Injected revocation audit failure');
  const tx = {
    auditEvent: { findFirst: async () => events.at(-1) ?? null },
    bookingParticipant: { findMany: async () => invalidSource ? [{ id: 'participant' }] : [] },
    // The production evaluator must reject corrupt adopted evidence even when
    // the generic eligibility preference is REVIEW or DISABLED.
    participationCase: { findUnique: async () => ({ id: 'case', revision: 1, digest: 'invalid', state: { schemaVersion: 0 } }) },
    $queryRaw: async strings => {
      const sql = strings.join('');
      if (sql.includes('GREATEST')) return [{ changedAt }];
      if (sql.includes('PolicyControl')) return [{ state }];
      throw Error('Unexpected status query: ' + sql);
    },
  };
  const db = new Proxy({ serializable: async work => {
    const before = events.slice(), count = audits.length;
    try { return await work(tx); }
    catch (error) { events.splice(0, events.length, ...before); audits.length = count; throw error; }
  } }, { get(target, key) { if (key in target) return target[key]; throw Error('Status escaped its transaction: ' + String(key)); } });
  const audit = { record: async (input, client) => {
    assert.equal(client, tx);
    const event = { id: 'revocation-' + (audits.length + 1), action: input.action, occurredAt: new Date(end.getTime() + 1) };
    events.push(event); audits.push(input);
    if (auditFailure) throw failure;
    return event;
  } };
  const calendar = new Proxy({}, { get() { throw Error('A status read must not execute readiness providers or persist snapshots'); } });
  return { tx, events, audits, failure, clearance: new OperationalClearanceService(db, audit, calendar) };
}
(async () => {
  for (const state of ['ENABLED', 'REVIEW', 'DISABLED']) {
    const f = fixture({ state }), r = await f.clearance.grant('reviewer', 'trip', 'Documented test review reason');
    assert.equal(r.clearance, 'GRANTED'); assert.equal(r.readiness.status, 'READY'); assert.equal(f.grants.length, 1); assert.equal(f.snapshots.length, 1); assert.equal(f.rootReads(), 0);
    for (const name of ['trip', 'trips', 'weather-setting', 'weather-proof', 'policy:REGISTRATION', 'policy:INSPECTION_STATUS', 'policy:PERMIT_REQUIRED', 'marine-proof', 'marine-snapshot', 'boat-proof', 'equipment-proof', 'maintenance-schema', 'maintenance-proof', 'trip-proof', 'audit']) assert(f.reads.includes(name), name);
    checks++;
    for (const options of [{ safety: 'DEFERRED' }, { regulatory: 'REJECTED' }, { maintenance: true }]) {
      const blocked = fixture({ state, ...options });
      await assert.rejects(() => blocked.clearance.grant('reviewer', 'trip'), e => e.getStatus() === 409);
      assert.equal(blocked.grants.length, 0); assert.equal(blocked.snapshots.length, 0); assert.equal(blocked.rootReads(), 0); checks++;
    }
  }
  for (const failAt of ['boat-proof', 'equipment-proof', 'maintenance-schema', 'maintenance-proof', 'trip-proof', 'marine-snapshot', 'audit']) {
    const f = fixture({ failAt }); await assert.rejects(() => f.clearance.grant('reviewer', 'trip'), e => e === f.failure);
    assert.equal(f.grants.length, 0); assert.equal(f.snapshots.length, 0); assert.equal(f.rootReads(), 0); checks++;
  }
  // A previously valid event/revision cannot hide a newly expired/blocked check.
  for (const method of ['assertCurrent', 'assertReadinessUnchanged']) {
    for (const options of [{ regulatory: 'REJECTED' }, { maintenance: true }]) {
      const blocked = fixture({ state: 'DISABLED', ...options });
      await assert.rejects(() => blocked.clearance[method]('trip', method === 'assertCurrent' ? 'prior' : start, blocked.tx), e => e.getStatus() === 409); assert.equal(blocked.rootReads(), 0); checks++;
    }
    const valid = fixture(); await valid.clearance[method]('trip', method === 'assertCurrent' ? 'prior' : start, valid.tx); assert.equal(valid.rootReads(), 0); checks++;
  }
  // A legacy database with no C05 registry cannot contain a maintenance claim.
  const legacy = fixture({ missingMaintenanceSchema: true });
  assert.equal((await legacy.clearance.grant('reviewer', 'trip')).clearance, 'GRANTED');
  assert(legacy.reads.includes('maintenance-schema')); assert(!legacy.reads.includes('maintenance-proof')); assert.equal(legacy.rootReads(), 0); checks++;
  const ended = fixture({ terminal: true }); await assert.rejects(() => ended.clearance.grant('reviewer', 'trip'), e => e.getStatus() === 409); assert(!ended.reads.includes('boat-proof')); checks++;
  const current = statusFixture();
  assert.equal((await current.clearance.status('trip')).status, 'ACTIVE');
  assert.equal((await current.clearance.revokeIfStale('trip')).reason, 'CURRENT');
  assert.equal(current.audits.length, 0); checks++;
  for (const state of ['ENABLED', 'REVIEW', 'DISABLED']) {
    const stale = statusFixture({ state, invalidSource: true });
    assert.equal((await stale.clearance.currentStatus('trip', stale.tx)).status, 'STALE');
    assert.equal((await stale.clearance.status('trip')).status, 'STALE');
    assert.equal(stale.audits.length, 0, 'Displaying stale source evidence must not write a revocation');
    const revoked = await stale.clearance.revokeIfStale('trip');
    assert.equal(revoked.revoked, true); assert.equal(revoked.previousClearanceEventId, 'prior');
    assert.equal(stale.audits.length, 1);
    assert.equal((await stale.clearance.status('trip')).status, 'REVOKED');
    assert.equal((await stale.clearance.revokeIfStale('trip')).reason, 'NO_ACTIVE_CLEARANCE');
    assert.equal(stale.audits.length, 1, 'Repeated scans must preserve the one revocation'); checks++;
  }
  const failedScan = statusFixture({ invalidSource: true, auditFailure: true });
  await assert.rejects(() => failedScan.clearance.revokeIfStale('trip'), error => error === failedScan.failure);
  assert.equal(failedScan.events.length, 1); assert.equal(failedScan.audits.length, 0);
  assert.equal((await failedScan.clearance.status('trip')).status, 'STALE'); checks++;
  const revised = statusFixture({ changedAt: new Date(end.getTime() + 1) });
  assert.equal((await revised.clearance.status('trip')).status, 'STALE'); assert.equal(revised.audits.length, 0);
  assert.equal((await revised.clearance.revokeIfStale('trip')).revoked, true); checks++;
  for (const action of [null, 'OPERATIONAL_CLEARANCE_REVOKED']) {
    const inactive = statusFixture({ action });
    assert.equal((await inactive.clearance.status('trip')).status, action ? 'REVOKED' : 'MISSING');
    assert.equal((await inactive.clearance.revokeIfStale('trip')).reason, 'NO_ACTIVE_CLEARANCE');
    assert.equal(inactive.audits.length, 0); checks++;
  }
  console.log(`Clearance snapshot routing: ${checks} groups PASS; actual compiled readers, zero root/provider calls; transaction failures preserved. Database isolation is covered separately.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
