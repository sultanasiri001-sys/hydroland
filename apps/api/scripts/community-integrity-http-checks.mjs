import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// Called by the existing disposable HTTP/PostgreSQL community fixture. The
// application remains opt-in and available only with NODE_ENV=test.
export async function runCommunityIntegrityChecks({ db, base, accounts, tokens }) {
  assert.equal(process.env.NODE_ENV, 'test');
  for (const value of [base, process.env.DATABASE_URL]) {
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname));
  }
  const [member, other, admin] = accounts;
  const [memberToken, otherToken, adminToken] = tokens;
  const suffix = randomBytes(8).toString('hex');
  const prefix = 'Q04 community ' + suffix;
  const auditFunction = 'q04_community_audit_' + suffix;
  const auditTrigger = auditFunction + '_trigger';
  const delayFunction = 'q04_community_delay_' + suffix;
  const delayTrigger = delayFunction + '_trigger';
  const startsAt = new Date(Date.now() + 2 * 86400_000).toISOString();
  const endsAt = new Date(Date.now() + 2 * 86400_000 + 3600_000).toISOString();
  const personIds = accounts.map(account => account.personId);
  const accountIds = accounts.map(account => account.id);
  let groups = 0;

  const call = async (token, method, path, body) => {
    const response = await fetch(base + '/community/' + path, {
      method,
      headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const ok = async (...args) => {
    const result = await call(...args);
    assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result));
    return result.body;
  };
  const snapshot = async () => ({
    posts: await db.communityPost.findMany({ where: { authorAccountId: { in: accountIds } }, orderBy: { id: 'asc' } }),
    events: await db.communityEvent.findMany({ where: { createdByAccountId: admin.id }, orderBy: { id: 'asc' } }),
    registrations: await db.communityVolunteerRegistration.findMany({ where: { accountId: { in: accountIds } }, orderBy: { id: 'asc' } }),
    engagements: await db.communityEngagementRequest.findMany({ where: { requesterAccountId: { in: accountIds } }, orderBy: { id: 'asc' } }),
    audit: await db.auditEvent.findMany({ where: { actorId: { in: personIds }, action: { startsWith: 'COMMUNITY_' } }, orderBy: { id: 'asc' } }),
  });
  const eventInput = label => ({ title: prefix + ' ' + label, description: 'Synthetic event for transactional acceptance.', locationName: 'Isolated fixture', startsAt, endsAt, capacity: 2, status: 'PUBLISHED' });
  const newEvent = label => ok(adminToken, 'POST', 'admin/events', eventInput(label));
  const newEngagement = label => ok(memberToken, 'POST', 'engagement-requests', { type: 'CONSULTATION', subject: prefix + ' ' + label, description: 'Synthetic request for transactional acceptance.' });
  const waitForDelay = async () => {
    const until = Date.now() + 5000;
    while (Date.now() < until) {
      const rows = await db.$queryRawUnsafe(`SELECT 1 FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = current_database() AND wait_event = 'PgSleep'`);
      if (rows.length) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('The disposable database race barrier was not reached.');
  };
  const withDelay = async (table, condition, work) => {
    assert.ok(['CommunityEvent', 'CommunityVolunteerRegistration', 'CommunityEngagementRequest'].includes(table));
    await db.$executeRawUnsafe(`CREATE FUNCTION "${delayFunction}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN PERFORM pg_sleep(0.5); END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER "${delayTrigger}" BEFORE UPDATE ON "${table}" FOR EACH ROW EXECUTE FUNCTION "${delayFunction}"()`);
    try { return await work(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${delayTrigger}" ON "${table}"`);
      await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${delayFunction}"()`);
    }
  };

  try {
    const feed = await ok(null, 'GET', 'posts');
    const ownPublished = feed.find(post => post.author?.id === member.id);
    assert.ok(ownPublished, 'The original HTTP fixture published a post.');
    for (const key of ['reviewNotes', 'reviewedByAccountId', 'reviewedAt']) {
      assert.equal(Object.hasOwn(ownPublished, key), false, 'Public posts must exclude moderation field ' + key);
    }
    assert.ok(ownPublished.title && ownPublished.body && ownPublished.publishedAt && ownPublished.author.person.firstName);
    groups++;

    const post = await ok(memberToken, 'POST', 'posts', { title: prefix + ' post', body: 'Synthetic post for transactional acceptance.' });
    const event = await newEvent('atomic event');
    const registration = await ok(memberToken, 'POST', 'events/' + event.id + '/volunteers');
    const engagement = await newEngagement('atomic request');
    const cases = [
      ['COMMUNITY_POST_CREATED', memberToken, 'POST', 'posts', { title: prefix + ' failed post', body: 'Must roll back when its audit insert fails.' }],
      ['COMMUNITY_POST_REVIEWED', adminToken, 'PATCH', 'admin/posts/' + post.id + '/status', { status: 'PUBLISHED', reviewNotes: 'Synthetic publication.' }],
      ['COMMUNITY_EVENT_CREATED', adminToken, 'POST', 'admin/events', eventInput('failed event')],
      ['COMMUNITY_EVENT_UPDATED', adminToken, 'PATCH', 'admin/events/' + event.id, { capacity: 3 }],
      ['COMMUNITY_VOLUNTEER_REGISTERED', otherToken, 'POST', 'events/' + event.id + '/volunteers'],
      ['COMMUNITY_VOLUNTEER_CANCELLED', memberToken, 'PATCH', 'volunteers/' + registration.id + '/cancel'],
      ['COMMUNITY_VOLUNTEER_REVIEWED', adminToken, 'PATCH', 'admin/volunteers/' + registration.id + '/status', { status: 'ATTENDED', approvedMinutes: 60 }],
      ['COMMUNITY_ENGAGEMENT_REQUESTED', memberToken, 'POST', 'engagement-requests', { type: 'MEETING', subject: prefix + ' failed request', description: 'Must roll back when its audit insert fails.' }],
      ['COMMUNITY_ENGAGEMENT_CANCELLED', memberToken, 'PATCH', 'engagement-requests/' + engagement.id + '/cancel'],
      ['COMMUNITY_ENGAGEMENT_DECIDED', adminToken, 'PATCH', 'admin/engagement-requests/' + engagement.id + '/status', { status: 'SCHEDULED', scheduledAt: startsAt }],
    ];
    await db.$executeRawUnsafe(`CREATE FUNCTION "${auditFunction}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic community audit rejection'; END $$`);
    for (const [action, token, method, route, body] of cases) {
      assert.match(action, /^COMMUNITY_[A-Z_]+$/);
      await db.$executeRawUnsafe(`CREATE TRIGGER "${auditTrigger}" BEFORE INSERT ON "AuditEvent" FOR EACH ROW WHEN (NEW."action" = '${action}') EXECUTE FUNCTION "${auditFunction}"()`);
      try {
        const before = await snapshot();
        const result = await call(token, method, route, body);
        assert.equal(result.status, 500, action + ' must report the failed transaction.');
        assert.deepEqual(await snapshot(), before, action + ' must not leave a business write without its audit.');
        groups++;
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${auditTrigger}" ON "AuditEvent"`);
      }
    }

    const capacityEvent = await newEvent('capacity race');
    await ok(memberToken, 'POST', 'events/' + capacityEvent.id + '/volunteers');
    await withDelay('CommunityEvent', 'OLD."capacity" = 2 AND NEW."capacity" = 1', async () => {
      const shrinking = call(adminToken, 'PATCH', 'admin/events/' + capacityEvent.id, { capacity: 1 });
      await waitForDelay();
      const joining = call(otherToken, 'POST', 'events/' + capacityEvent.id + '/volunteers');
      const results = await Promise.all([shrinking, joining]);
      assert.ok(results.every(result => [200, 201, 409].includes(result.status)), JSON.stringify(results));
      const final = await db.communityEvent.findUniqueOrThrow({ where: { id: capacityEvent.id } });
      const active = await db.communityVolunteerRegistration.count({ where: { eventId: capacityEvent.id, status: { in: ['REGISTERED', 'ATTENDED'] } } });
      assert.ok(active <= final.capacity, 'A concurrent capacity reduction cannot overbook the event.');
      groups++;
    });

    const cancellationEvent = await newEvent('cancellation race');
    const cancellationRegistration = await ok(memberToken, 'POST', 'events/' + cancellationEvent.id + '/volunteers');
    await withDelay('CommunityVolunteerRegistration', `NEW."status"::text = 'CANCELLED'`, async () => {
      const cancelling = call(memberToken, 'PATCH', 'volunteers/' + cancellationRegistration.id + '/cancel');
      await waitForDelay();
      const reviewing = call(adminToken, 'PATCH', 'admin/volunteers/' + cancellationRegistration.id + '/status', { status: 'ATTENDED', approvedMinutes: 30 });
      const [cancelled, reviewed] = await Promise.all([cancelling, reviewing]);
      assert.equal(cancelled.status, 200);
      assert.equal(reviewed.status, 409, 'A review must recheck a concurrently cancelled registration.');
      const final = await db.communityVolunteerRegistration.findUniqueOrThrow({ where: { id: cancellationRegistration.id } });
      assert.equal(final.status, 'CANCELLED');
      assert.equal(final.approvedMinutes, null);
      groups++;
    });

    const cancellationRequest = await newEngagement('cancellation race');
    await withDelay('CommunityEngagementRequest', `NEW."status"::text = 'CANCELLED'`, async () => {
      const cancelling = call(memberToken, 'PATCH', 'engagement-requests/' + cancellationRequest.id + '/cancel');
      await waitForDelay();
      const reviewing = call(adminToken, 'PATCH', 'admin/engagement-requests/' + cancellationRequest.id + '/status', { status: 'SCHEDULED', scheduledAt: startsAt });
      const [cancelled, reviewed] = await Promise.all([cancelling, reviewing]);
      assert.equal(cancelled.status, 200);
      assert.equal(reviewed.status, 409, 'A decision must recheck a concurrently cancelled request.');
      assert.equal((await db.communityEngagementRequest.findUniqueOrThrow({ where: { id: cancellationRequest.id } })).status, 'CANCELLED');
      groups++;
    });

    const deniedBefore = await snapshot();
    const role = await db.roleAssignment.findFirstOrThrow({ where: { accountId: admin.id, role: 'ADMIN', status: 'ACTIVE' } });
    await db.roleAssignment.update({ where: { id: role.id }, data: { status: 'SUSPENDED' } });
    try {
      assert.equal((await call(adminToken, 'PATCH', 'admin/posts/' + post.id + '/status', { status: 'PUBLISHED' })).status, 403);
      assert.deepEqual(await snapshot(), deniedBefore);
      groups++;
    } finally { await db.roleAssignment.update({ where: { id: role.id }, data: { status: 'ACTIVE' } }); }
    await db.account.update({ where: { id: member.id }, data: { status: 'SUSPENDED' } });
    try {
      assert.equal((await call(memberToken, 'POST', 'posts', { title: prefix + ' denied post', body: 'Suspended account must not create content.' })).status, 401);
      assert.deepEqual(await snapshot(), deniedBefore);
      groups++;
    } finally { await db.account.update({ where: { id: member.id }, data: { status: 'ACTIVE' } }); }
    console.log('Community integrity HTTP/PostgreSQL passed: ' + groups + ' groups; public projection, ten audit rollbacks, three deterministic races, revoked role and suspended account.');
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${auditTrigger}" ON "AuditEvent"`).catch(() => {});
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${auditFunction}"()`).catch(() => {});
    await db.communityVolunteerRegistration.deleteMany({ where: { event: { title: { startsWith: prefix } } } });
    await db.communityEvent.deleteMany({ where: { title: { startsWith: prefix } } });
    await db.communityEngagementRequest.deleteMany({ where: { subject: { startsWith: prefix } } });
    await db.communityPost.deleteMany({ where: { title: { startsWith: prefix } } });
  }
}
