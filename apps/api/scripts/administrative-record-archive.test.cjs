const assert = require('node:assert/strict');
const test = require('node:test');
const { AdministrativeAffairsPersistenceService } = require('../dist/administrative-affairs/administrative-affairs-persistence.service');

function fixture({ status = 'REGISTERED', archiveOnTransaction = false, lockFailure = false } = {}) {
  let currentStatus = status, writes = 0, audits = 0;
  const steps = [];
  const record = { id: 'record', organizationId: 'org', unitId: 'origin', status };
  const routing = { id: 'routing', recordId: 'record', organizationId: 'org', toUnitId: 'target', requestedByAccountId: 'requester', assignedToAccountId: 'reviewer', decision: null };
  const db = {
    organizationMember: { findFirst: async () => ({ role: 'ADMIN' }) },
    roleAssignment: { findMany: async () => [] },
    orgUnit: { findUniqueOrThrow: async () => ({ organizationId: 'org', active: true }) },
    administrativeRecord: { findUniqueOrThrow: async () => ({ ...record }) },
    administrativeRouting: { findUniqueOrThrow: async () => ({ ...routing }) },
    $transaction: async work => {
      if (archiveOnTransaction) currentStatus = 'ARCHIVED';
      const before = { writes, audits };
      const tx = {
        $queryRaw: async (sql, id) => {
          assert.equal(id, 'record');
          assert.match(sql.join(''), /AdministrativeRecord.*FOR UPDATE/);
          steps.push('lock');
          if (lockFailure) throw new Error('Fixture lock unavailable');
          return [{ id: 'record' }];
        },
        administrativeRecord: { findUniqueOrThrow: async () => { steps.push('status'); return { status: currentStatus }; } },
        administrativeRouting: {
          create: async () => { steps.push('write'); writes++; return routing; },
          updateMany: async () => { steps.push('write'); writes++; return { count: 1 }; },
          findUniqueOrThrow: async () => routing,
        },
        account: { findUniqueOrThrow: async () => ({ personId: 'person' }) },
        auditEvent: { create: async () => { steps.push('audit'); audits++; } },
      };
      try { return await work(tx); } catch (error) { ({ writes, audits } = before); throw error; }
    },
  };
  const service = new AdministrativeAffairsPersistenceService(db);
  return {
    run: action => action === 'route' ? service.route('record', 'target', 'requester') : action === 'assign' ? service.assign('routing', 'reviewer', 'manager') : service.decide('routing', 'APPROVE', 'reviewer'),
    snapshot: () => ({ writes, audits, steps }),
  };
}

for (const action of ['route', 'assign', 'decide']) {
  test(`${action} refuses an archive committed after preflight without mutation`, async () => {
    const f = fixture({ archiveOnTransaction: true });
    await assert.rejects(() => f.run(action), error => error.getStatus?.() === 409 && error.message === 'ADMIN_RECORD_ARCHIVED');
    assert.deepEqual(f.snapshot(), { writes: 0, audits: 0, steps: ['lock', 'status'] });
  });
  test(`${action} serializes on the parent before writing an active record`, async () => {
    const f = fixture(); await f.run(action);
    assert.deepEqual(f.snapshot(), { writes: 1, audits: 1, steps: ['lock', 'status', 'write', 'audit'] });
  });
  test(`${action} does not write if the parent lock fails`, async () => {
    const f = fixture({ lockFailure: true });
    await assert.rejects(() => f.run(action), /Fixture lock unavailable/);
    assert.deepEqual(f.snapshot(), { writes: 0, audits: 0, steps: ['lock'] });
  });
}
for (const action of ['assign', 'decide']) for (const status of ['DRAFT', 'ARCHIVED']) {
  test(`${action} refuses a ${status} parent`, async () => {
    const f = fixture({ status });
    await assert.rejects(() => f.run(action), error => error.getStatus?.() === 409);
    assert.equal(f.snapshot().writes, 0); assert.equal(f.snapshot().audits, 0);
  });
}
