import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const password = process.env.E2E_ADMIN_PASSWORD;

if (!base?.startsWith('https://')) throw new Error('E2E_BASE_URL must use HTTPS.');
if (!password || password.length < 12) throw new Error('E2E_ADMIN_PASSWORD must be at least 12 characters.');

const suffix = Date.now().toString();
const actors = [
  { label: 'requester', email: `finance-requester-${suffix}@hydroland.test` },
  { label: 'approver', email: `finance-approver-${suffix}@hydroland.test` },
  { label: 'poster', email: `finance-poster-${suffix}@hydroland.test` },
];
const created = { accountIds: [], personIds: [] };

async function request(path, options = {}) {
  const response = await fetch(`${base}/api/v1${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function auth(token) {
  return { 'content-type': 'application/json', authorization: `Bearer ${token}` };
}

async function registerAndAuthorize(actor) {
  const registration = await request('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: actor.email, password }),
  });
  if (!registration.response.ok) {
    throw new Error(`${actor.label} registration failed: HTTP ${registration.response.status}`);
  }

  const account = await db.account.findUnique({
    where: { email: actor.email },
    select: { id: true, personId: true },
  });
  if (!account) throw new Error(`${actor.label} account was not persisted.`);
  actor.accountId = account.id;
  actor.personId = account.personId;
  created.accountIds.push(account.id);
  created.personIds.push(account.personId);

  await db.$transaction([
    db.account.update({
      where: { id: account.id },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    }),
    db.roleAssignment.upsert({
      where: { accountId_role: { accountId: account.id, role: 'ADMIN' } },
      create: {
        accountId: account.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        activeAt: new Date(),
        scope: { purpose: 'FINANCE_E2E_ONLY' },
      },
      update: {
        status: 'ACTIVE',
        activeAt: new Date(),
        endedAt: null,
        scope: { purpose: 'FINANCE_E2E_ONLY' },
      },
    }),
  ]);

  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: actor.email, password }),
  });
  if (login.response.status !== 200 || !login.body?.accessToken) {
    throw new Error(`${actor.label} login failed: HTTP ${login.response.status}`);
  }
  actor.token = login.body.accessToken;
}

try {
  for (const actor of actors) await registerAndAuthorize(actor);
  const [requester, approver, poster] = actors;

  const organization = await db.organization.create({
    data: {
      displayName: `Finance production E2E ${suffix}`,
      kind: 'DIVE_CENTER',
      regionCode: 'ASIR',
      ownerId: requester.accountId,
    },
  });
  created.organizationId = organization.id;

  const unauthenticated = await request('/finance/admin/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ organizationId: organization.id, name: 'Denied account' }),
  });
  if (unauthenticated.response.status !== 401) {
    throw new Error(`Finance authentication boundary failed: expected 401, got ${unauthenticated.response.status}`);
  }

  let result = await request('/finance/admin/accounts', {
    method: 'POST',
    headers: auth(requester.token),
    body: JSON.stringify({ organizationId: organization.id, name: 'Production E2E Cash', currency: 'SAR' }),
  });
  if (!result.response.ok) {
    throw new Error(`Finance account creation failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  created.financeAccountId = result.body.id;

  result = await request('/finance/admin/entries', {
    method: 'POST',
    headers: auth(requester.token),
    body: JSON.stringify({
      organizationId: organization.id,
      financeAccountId: created.financeAccountId,
      type: 'REVENUE',
      amountMinor: 25000,
      currency: 'SAR',
      referenceType: 'PRODUCTION_E2E',
      referenceId: suffix,
      description: 'Temporary production finance verification',
    }),
  });
  if (!result.response.ok) {
    throw new Error(`Finance entry creation failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  created.entryId = result.body.id;

  result = await request(`/finance/admin/entries/${created.entryId}/decision`, {
    method: 'POST',
    headers: auth(requester.token),
    body: JSON.stringify({ approved: true }),
  });
  if (result.response.status < 400) throw new Error('Requester self-approval was accepted.');
  let entry = await db.financeEntry.findUniqueOrThrow({ where: { id: created.entryId } });
  if (entry.status !== 'PENDING_APPROVAL') throw new Error('Denied self-approval mutated the finance entry.');

  result = await request(`/finance/admin/entries/${created.entryId}/decision`, {
    method: 'POST',
    headers: auth(approver.token),
    body: JSON.stringify({ approved: true, note: 'Production E2E approval' }),
  });
  if (!result.response.ok) {
    throw new Error(`Independent approval failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  entry = await db.financeEntry.findUniqueOrThrow({ where: { id: created.entryId } });
  if (entry.status !== 'APPROVED' || entry.approvedByAccountId !== approver.accountId || !entry.approvedAt) {
    throw new Error('Approval status or provenance is invalid.');
  }

  result = await request(`/finance/admin/entries/${created.entryId}/post`, {
    method: 'POST',
    headers: auth(approver.token),
  });
  if (result.response.status < 400) throw new Error('Approver was allowed to post the entry.');

  result = await request(`/finance/admin/entries/${created.entryId}/post`, {
    method: 'POST',
    headers: auth(poster.token),
  });
  if (!result.response.ok) {
    throw new Error(`Independent posting failed: HTTP ${result.response.status} ${JSON.stringify(result.body)}`);
  }
  entry = await db.financeEntry.findUniqueOrThrow({ where: { id: created.entryId } });
  if (entry.status !== 'POSTED' || entry.postedByAccountId !== poster.accountId || !entry.postedAt) {
    throw new Error('Posting status or UUID provenance is invalid.');
  }

  result = await request(`/finance/admin/entries/${created.entryId}/post`, {
    method: 'POST',
    headers: auth(requester.token),
  });
  if (result.response.status < 400) throw new Error('A posted entry was posted twice.');

  const [approvedAudit, postedAudit] = await Promise.all([
    db.auditEvent.findFirst({
      where: {
        resource: 'FinanceEntry',
        resourceId: created.entryId,
        action: 'FINANCE_ENTRY_APPROVED',
        actorId: approver.personId,
      },
    }),
    db.auditEvent.findFirst({
      where: {
        resource: 'FinanceEntry',
        resourceId: created.entryId,
        action: 'FINANCE_ENTRY_POSTED',
        actorId: poster.personId,
      },
    }),
  ]);
  if (!approvedAudit || !postedAudit) throw new Error('Finance approval or posting audit evidence is missing.');

  console.log('Production finance E2E passed: authentication, create, SoD denial, approval, posting UUID provenance, duplicate denial and audit evidence.');
} finally {
  if (created.entryId) {
    await db.auditEvent.deleteMany({ where: { resource: 'FinanceEntry', resourceId: created.entryId } });
    await db.financeApproval.deleteMany({ where: { financeEntryId: created.entryId } });
    await db.financeEntry.deleteMany({ where: { id: created.entryId } });
  }
  if (created.financeAccountId) {
    await db.financeAccount.deleteMany({ where: { id: created.financeAccountId } });
  }
  if (created.organizationId) {
    await db.organization.deleteMany({ where: { id: created.organizationId } });
  }
  if (created.accountIds.length) {
    await db.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
    await db.session.deleteMany({ where: { accountId: { in: created.accountIds } } });
    await db.roleAssignment.deleteMany({ where: { accountId: { in: created.accountIds } } });
    await db.account.deleteMany({ where: { id: { in: created.accountIds } } });
  }
  if (created.personIds.length) {
    await db.auditEvent.deleteMany({ where: { actorId: { in: created.personIds } } });
    await db.person.deleteMany({ where: { id: { in: created.personIds } } });
  }
  await db.$disconnect();
}
