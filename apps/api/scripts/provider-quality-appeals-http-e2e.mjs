import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.PROVIDER_QUALITY_BASE_URL;
assert.equal(process.env.NODE_ENV, 'test');
for (const address of [base, process.env.DATABASE_URL]) {
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(address).hostname));
}
const suffix = randomBytes(10).toString('hex');
const password = randomBytes(24).toString('hex');
const salt = randomBytes(16).toString('hex');
const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
const accounts = [], organizations = [], cases = [];
async function request(path, token, data, status = 201) {
  const response = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(token && { authorization: 'Bearer ' + token }) },
    ...(data && { body: JSON.stringify(data) }),
  });
  const body = await response.json();
  assert.equal(response.status, status, path + ': ' + JSON.stringify(body.message ?? response.status));
  return body;
}
try {
  for (const name of ['first-owner', 'second-owner', 'recorder', 'reviewer']) {
    const email = name + '-' + suffix + '@example.invalid';
    const account = await db.account.create({ data: { email, passwordHash, status: 'ACTIVE', emailVerifiedAt: new Date(),
      person: { create: { firstName: name, lastName: 'QualityFixture' } } } });
    accounts.push(account);
    account.token = (await request('/auth/login', null, { email, password }, 200)).accessToken;
    assert(account.token);
  }
  const [first, second, recorder, reviewer] = accounts;
  for (const account of [first, recorder, reviewer]) {
    await db.roleAssignment.create({ data: { accountId: account.id, role: 'REVIEWER', status: 'ACTIVE', activeAt: new Date() } });
  }
  for (const [index, owner] of [first, second].entries()) {
    const org = await db.organization.create({ data: { displayName: 'Quality fixture ' + index,
      kind: 'DIVE_CENTER', status: 'ACTIVE', regionCode: 'region-' + index, ownerId: owner.id,
      members: { create: { accountId: owner.id, role: 'OWNER', status: 'ACTIVE' } } } });
    organizations.push(org);
    org.trip = await db.trip.create({ data: { organizationId: org.id, type: 'SHORE', title: 'Quality rehearsal',
      startsAt: new Date('2030-03-01T09:00:00Z'), endsAt: new Date('2030-03-01T11:00:00Z'), capacity: 2 } });
  }
  const route = org => '/organizations/' + org.id + '/provider-quality';
  const source = { tripId: organizations[1].trip.id, reason: 'Disputed delay' };
  await request(route(organizations[0]) + '/observations', recorder.token, source, 404);
  assert.equal(await db.customerCase.count({ where: { organizationId: organizations[0].id } }), 0);
  console.log('PASS source from another provider cannot be recorded');
  for (const [index, org] of organizations.entries()) {
    const owner = accounts[index], other = accounts[1 - index];
    const observation = await request(route(org) + '/observations', recorder.token, { tripId: org.trip.id, reason: 'Disputed delay' });
    cases.push(observation.id);
    const path = route(org) + '/' + observation.id;
    await request(path + '/appeals', other.token, { reason: 'Outside center' }, 403);
    await request(path + '/appeals', owner.token, { reason: 'Correction in trip record' });
    await request(path + '/appeals', owner.token, { reason: 'Duplicate' }, 409);
    const decision = { outcome: 'RETRACT', reason: 'Reconciled with original trip register' };
    await request(path + '/decision', owner.token, decision, 403);
    await request(path + '/decision', recorder.token, decision, 403);
    await request(path + '/decision', reviewer.token, decision);
    await request(path + '/decision', reviewer.token, decision, 409);
    const result = await request(path, owner.token, null, 200);
    assert.equal(result.observation.referenceId, org.trip.id);
    assert.equal(result.observation.description, 'Disputed delay');
    assert.equal(result.effectiveOutcome, 'RETRACT');
    assert.equal(result.observation.status, 'RESOLVED');
    assert.equal(result.replies.length, 2);
    assert.equal(result.replies.find(reply => reply.actorType === 'STAFF').message, decision.reason);
    assert.deepEqual(result.history.map(event => event.action).sort(),
      ['provider_quality.appealed', 'provider_quality.decided', 'provider_quality.observed']);
    assert.equal(result.history.find(event => event.action === 'provider_quality.decided').actorId, reviewer.personId);
    assert.equal((await db.organization.findUniqueOrThrow({ where: { id: org.id } })).status, 'ACTIVE');
  }
  console.log('PASS both providers: authenticated appeal; independent reviewer; original and correction retained; duplicate rejected; equivalent result across two regions; no change to operational status');
} finally {
  const accountIds = accounts.map(a => a.id), people = accounts.map(a => a.personId), orgs = organizations.map(o => o.id);
  await db.auditEvent.deleteMany({ where: { OR: [{ actorId: { in: people } }, { resource: 'CustomerCase', resourceId: { in: cases } }] } });
  await db.customerCase.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.trip.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.organizationMember.deleteMany({ where: { organizationId: { in: orgs } } });
  await db.organization.deleteMany({ where: { id: { in: orgs } } });
  await db.roleAssignment.deleteMany({ where: { accountId: { in: accountIds } } });
  await db.account.deleteMany({ where: { id: { in: accountIds } } });
  await db.person.deleteMany({ where: { id: { in: people } } });
  await db.$disconnect();
}
