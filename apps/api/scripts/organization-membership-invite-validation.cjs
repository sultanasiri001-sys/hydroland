const assert = require('node:assert/strict');
const path = require('node:path');
const { OrganizationMembershipService } = require('../.tmp-organization-membership-validation/organizations/organization-membership.service.js');

function fixture({ managerRole = 'OWNER', organizationKind = 'COMPANY', organizationStatus = 'ACTIVE', accountId = 'invited-account' } = {}) {
  const writes = { memberships: [], notifications: [], audits: [] };
  const tx = {
    organizationMember: {
      findFirst: async ({ where }) => where.accountId === 'manager-account' ? { id: 'manager-membership', organizationId: 'organization-a', accountId: 'manager-account', role: managerRole, status: 'ACTIVE', organization: { id: 'organization-a', kind: organizationKind, status: organizationStatus, displayName: 'جهة الاختبار' } } : null,
      findUnique: async () => null,
      create: async ({ data }) => { const row = { id: 'membership-new', ...data, updatedAt: new Date('2026-10-05T10:00:00.000Z') }; writes.memberships.push(row); return row; },
    },
    account: {
      findMany: async ({ where }) => { assert.equal(where.email.mode, 'insensitive'); return [{ id: accountId }]; },
      findUnique: async () => ({ status: 'ACTIVE', roleAssignments: [] }),
    },
    notification: { create: async ({ data }) => { writes.notifications.push(data); return data; } },
  };
  const db = { serializable: work => work(tx) };
  const audit = { record: async (data, transaction) => { assert.equal(transaction, tx); writes.audits.push(data); } };
  return { service: new OrganizationMembershipService(db, audit), writes };
}

async function main() {
  const owner = fixture();
  const pending = await owner.service.invite('manager-account', { email: 'Member@example.invalid', role: 'STAFF' }, 'organization-a');
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.accountId, 'invited-account');
  assert.equal(owner.writes.notifications[0].type, 'ORGANIZATION_INVITATION');
  assert.equal(owner.writes.audits[0].action, 'organization.member_invited');

  const admin = fixture({ managerRole: 'ADMIN' });
  await assert.rejects(() => admin.service.invite('manager-account', { email: 'next@example.invalid', role: 'ADMIN' }, 'organization-a'), error => error.getStatus?.() === 403);
  assert.equal(admin.writes.memberships.length, 0);

  const diveCenter = fixture({ organizationKind: 'DIVE_CENTER' });
  await assert.rejects(() => diveCenter.service.invite('manager-account', { email: 'next@example.invalid', role: 'ADMIN' }, 'organization-a'), error => error.getStatus?.() === 403);
  assert.equal(diveCenter.writes.memberships.length, 0);

  const suspended = fixture({ organizationStatus: 'SUSPENDED' });
  await assert.rejects(() => suspended.service.invite('manager-account', { email: 'next@example.invalid', role: 'STAFF' }, 'organization-a'), error => error.getStatus?.() === 409);
  assert.equal(suspended.writes.memberships.length, 0);
  console.log('Organization invitation validation passed: email lookup, pending membership, notification/audit, manager-role limits, center boundary, and inactive-organization denial.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
