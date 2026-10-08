const assert = require('node:assert/strict');
const { CustomerCaseType } = require('@prisma/client');
const { CustomerCaseService } = require('../.tmp-organization-case-validation/customer-service/customer-case.service.js');

function fixture({ role = 'OWNER', status = 'ACTIVE', orgStatus = 'ACTIVE', caseFound = true } = {}) {
  const writes = { cases: [], interactions: [], audits: [] };
  const tx = {
    organization: { findFirst: async ({ where }) => where.id === 'org-a' && where.status === orgStatus ? { id: 'org-a' } : null },
    organizationMember: { findFirst: async ({ where }) => where.organizationId === 'org-a' && where.accountId === 'member-a' && where.status === status && (!where.role || where.role.in.includes(role)) ? { id: 'membership-a' } : null },
    customerCase: {
      create: async ({ data, select }) => { writes.cases.push({ data, select }); return { id: 'case-new', type: data.type, status: 'OPEN', priority: data.priority, subject: data.subject, description: data.description, createdAt: new Date(), updatedAt: new Date(), interactions: [] }; },
      findFirst: async ({ where }) => where.id === 'case-a' && where.organizationId === 'org-a' && caseFound ? { id: 'case-a', interactions: [] } : null,
      findMany: async ({ where, take, skip }) => { assert.equal(where.organizationId, 'org-a'); writes.listQuery = { take, skip }; return []; },
      count: async ({ where }) => { assert.equal(where.organizationId, 'org-a'); return 0; },
    },
    customerInteraction: { create: async ({ data }) => { writes.interactions.push(data); return { id: 'interaction-new', actorType: data.actorType, channel: data.channel, message: data.message, createdAt: new Date() }; } },
  };
  const db = { serializable: work => work(tx) };
  const audit = { record: async (data, transaction) => { assert.equal(transaction, tx); writes.audits.push(data); } };
  return { service: new CustomerCaseService(db, audit), writes };
}

async function main() {
  const owner = fixture();
  const created = await owner.service.createForOrganization('member-a', 'org-a', { type: CustomerCaseType.QUESTION, subject: 'استفسار', description: 'تفاصيل الطلب' });
  assert.equal(created.id, 'case-new');
  assert.equal(owner.writes.cases[0].data.organizationId, 'org-a');
  assert.equal(owner.writes.cases[0].data.customerId, 'member-a');
  assert.equal(owner.writes.audits[0].action, 'organization.customer_case.created');

  const viewer = fixture({ role: 'VIEWER' });
  await assert.rejects(() => viewer.service.createForOrganization('member-a', 'org-a', { type: CustomerCaseType.QUESTION, subject: 'طلب', description: 'تفاصيل' }), error => error.getStatus?.() === 403);
  await assert.rejects(() => viewer.service.replyForOrganization('member-a', 'org-a', 'case-a', 'رد'), error => error.getStatus?.() === 403);
  assert.equal(viewer.writes.cases.length + viewer.writes.interactions.length, 0);

  const scoped = fixture({ caseFound: false });
  await assert.rejects(() => scoped.service.getForOrganization('member-a', 'org-a', 'case-from-org-b'), error => error.getStatus?.() === 404);
  await scoped.service.listForOrganization('member-a', 'org-a', 2, 500);
  assert.deepEqual(scoped.writes.listQuery, { take: 50, skip: 50 });

  const suspended = fixture({ orgStatus: 'SUSPENDED' });
  await assert.rejects(() => suspended.service.listForOrganization('member-a', 'org-a'), error => error.getStatus?.() === 403);
  console.log('Organization customer-case validation passed: tenant-scoped persistence, role-gated writes, audit, cross-organization not-found, pagination, and suspended-organization denial.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
