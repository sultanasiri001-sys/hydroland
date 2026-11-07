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
function fixture({ state = 'ENABLED', safety = 'ALLOWED', regulatory = 'APPROVED', failAt, terminal = false } = {}) {
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
      const sql = strings.join('');
      if (sql.includes('GREATEST')) { hit('revision'); return [{ changedAt: start }]; }
      if (sql.includes('PolicyControl')) { hit('policy:' + values[1]); return [{ state: values[0] === 'WEATHER' ? 'DISABLED' : state }]; }
      if (sql.includes('OperationalSetting')) { hit('weather-setting'); return []; }
      if (sql.includes('CrewAssignment')) { hit('crew'); return [{ tripId: 'trip', status: 'ACCEPTED' }]; }
      if (sql.includes('CalendarAllocation')) { hit('allocations'); return allocations; }
      if (sql.includes('BoatResourceCompliance')) { hit('boat-proof'); return [{ resourceId: 'BOAT', registrationNumber: 'fixture', registrationStatus: 'VERIFIED', navigationLicenseNumber: 'fixture', navigationLicenseExpiresAt: end, safetyCertificateExpiresAt: end, passengerLimit: 2 }]; }
      if (sql.includes('EquipmentInspection')) { hit('equipment-proof'); return [{ resourceId: 'EQUIPMENT', status: 'PASS', serviceExpiresAt: end }]; }
      if (sql.includes('TripComplianceReview')) { hit('trip-proof'); return [{ regulatoryStatus: regulatory, permitStatus: 'APPROVED' }]; }
      if (sql.includes('TripOperationalLocation') || sql.includes('TripWeatherReview')) { hit('weather-proof'); return []; }
      throw Error('Unexpected query: ' + sql);
    },
    marineAsset: { findUnique: async () => { hit('marine-proof'); return { id: 'asset', status: 'ACTIVE', calendarResourceId: 'BOAT', maintenance: [], documents: REQUIRED_MARINE_DOCUMENTS.map(documentType => ({ documentType, status: 'VERIFIED', expiresAt: end })) }; } },
    marineReadinessSnapshot: { create: async input => { hit('marine-snapshot'); snapshots.push(input); return input; } },
    auditEvent: { findFirst: async () => ({ id: 'prior', action: 'OPERATIONAL_CLEARANCE_GRANTED', occurredAt: end }) },
  };
  const root = new Proxy({ serializable: async work => { const n = snapshots.length, g = grants.length; try { hit('transaction'); return await work(tx); } catch (e) { snapshots.length = n; grants.length = g; throw e; } } }, { get(target, key) { if (key in target) return target[key]; rootReads++; throw Error('Root client escaped transaction: ' + String(key)); } });
  const audit = { record: async (input, client) => { assert.equal(client, tx); hit('audit'); grants.push(input); return { id: 'grant' }; } };
  const policies = new PolicyControlService(root, audit), gate = new WeatherGateService(root, audit);
  const calendar = new CalendarAllocationService(root, audit, gate, policies, new BoatComplianceService(root, policies, audit), new EquipmentInspectionService(root, audit, policies), new TripComplianceService(root, policies, audit), new MarineOperationsService(root, {}, audit), new TripWeatherReviewService(root, {}, audit));
  const clearance = new OperationalClearanceService(root, audit, calendar);
  return { tx, calendar, clearance, reads, snapshots, grants, failure, rootReads: () => rootReads };
}
(async () => {
  for (const state of ['ENABLED', 'REVIEW', 'DISABLED']) {
    const f = fixture({ state }), r = await f.clearance.grant('reviewer', 'trip', 'Documented test review reason');
    assert.equal(r.clearance, 'GRANTED'); assert.equal(r.readiness.status, 'READY'); assert.equal(f.grants.length, 1); assert.equal(f.snapshots.length, 1); assert.equal(f.rootReads(), 0);
    for (const name of ['trip', 'trips', 'weather-setting', 'weather-proof', 'policy:REGISTRATION', 'policy:INSPECTION_STATUS', 'policy:PERMIT_REQUIRED', 'marine-proof', 'marine-snapshot', 'boat-proof', 'equipment-proof', 'trip-proof', 'audit']) assert(f.reads.includes(name), name);
    checks++;
    for (const options of [{ safety: 'DEFERRED' }, { regulatory: 'REJECTED' }]) {
      const blocked = fixture({ state, ...options });
      await assert.rejects(() => blocked.clearance.grant('reviewer', 'trip'), e => e.getStatus() === 409);
      assert.equal(blocked.grants.length, 0); assert.equal(blocked.snapshots.length, 0); assert.equal(blocked.rootReads(), 0); checks++;
    }
  }
  for (const failAt of ['boat-proof', 'equipment-proof', 'trip-proof', 'marine-snapshot', 'audit']) {
    const f = fixture({ failAt }); await assert.rejects(() => f.clearance.grant('reviewer', 'trip'), e => e === f.failure);
    assert.equal(f.grants.length, 0); assert.equal(f.snapshots.length, 0); assert.equal(f.rootReads(), 0); checks++;
  }
  // A previously valid event/revision cannot hide a newly expired/blocked check.
  for (const method of ['assertCurrent', 'assertReadinessUnchanged']) {
    const blocked = fixture({ state: 'DISABLED', regulatory: 'REJECTED' });
    await assert.rejects(() => blocked.clearance[method]('trip', method === 'assertCurrent' ? 'prior' : start, blocked.tx), e => e.getStatus() === 409); checks++;
    const valid = fixture(); await valid.clearance[method]('trip', method === 'assertCurrent' ? 'prior' : start, valid.tx); assert.equal(valid.rootReads(), 0); checks++;
  }
  const ended = fixture({ terminal: true }); await assert.rejects(() => ended.clearance.grant('reviewer', 'trip'), e => e.getStatus() === 409); assert(!ended.reads.includes('boat-proof')); checks++;
  console.log(`Clearance snapshot routing: ${checks} groups PASS; actual compiled readers, zero root/provider calls; transaction failures preserved. Database isolation is covered separately.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
