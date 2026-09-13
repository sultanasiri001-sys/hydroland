const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { AppModule } = require('../dist/app.module.js');

const prisma = new PrismaClient();
const applicantEmail = `e2e-applicant-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const reviewerEmail = `e2e-reviewer-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const password = 'Hydroland-E2E-Password-123!';
let app;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

function bearer(accessToken) {
  return { authorization: `Bearer ${accessToken}` };
}

async function registerAndLogin(email, firstName) {
  const register = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName: 'هيدرولاند', email, password, preferredLanguage: 'ar' }),
  });
  assert.equal(register.status, 201, `register failed: ${JSON.stringify(register.body)}`);
  assert.equal(register.body.status, 'PENDING');

  const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  assert.equal(login.status, 201, `login failed: ${JSON.stringify(login.body)}`);
  assert.equal(typeof login.body.accessToken, 'string');
  assert.match(login.body.refreshToken, /^[0-9a-f-]{36}\..+/i);
  return login.body;
}

async function cleanup() {
  const accounts = await prisma.account.findMany({
    where: { email: { in: [applicantEmail, reviewerEmail] } },
    select: { id: true, personId: true },
  });
  const accountIds = accounts.map((item) => item.id);
  const personIds = accounts.map((item) => item.personId);
  if (!personIds.length) return;

  await prisma.documentRecord.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.professionalCredential.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.professionalRoleRequest.deleteMany({
    where: { OR: [{ personId: { in: personIds } }, { reviewerPersonId: { in: personIds } }] },
  });
  await prisma.notification.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.auditEvent.deleteMany({ where: { actorPersonId: { in: personIds } } });
  await prisma.personRole.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.session.deleteMany({ where: { accountId: { in: accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  await prisma.profile.deleteMany({ where: { personId: { in: personIds } } });
  await prisma.person.deleteMany({ where: { id: { in: personIds } } });
}

async function main() {
  try {
    app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();

    const roleKeys = ['PLATFORM_EXECUTIVE_OWNER', 'PROFESSIONAL_REVIEWER', 'AUDITOR', 'DIVER', 'INSTRUCTOR'];
    const permissionKeys = ['professional.role_requests.review', 'audit.read'];
    const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { key: true } });
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { key: true } });
    assert.deepEqual(new Set(roles.map((item) => item.key)), new Set(roleKeys));
    assert.deepEqual(new Set(permissions.map((item) => item.key)), new Set(permissionKeys));
    console.log('PASS seed roles and permissions');

    const applicant = await registerAndLogin(applicantEmail, 'متقدم');
    const reviewer = await registerAndLogin(reviewerEmail, 'مراجع');
    console.log('PASS register and login two actors');

    const applicantAccount = await prisma.account.findUniqueOrThrow({ where: { email: applicantEmail } });
    const reviewerAccount = await prisma.account.findUniqueOrThrow({ where: { email: reviewerEmail } });
    const reviewerRole = await prisma.role.findUniqueOrThrow({ where: { key: 'PROFESSIONAL_REVIEWER' } });
    const diverRole = await prisma.role.findUniqueOrThrow({ where: { key: 'DIVER' } });

    await prisma.personRole.createMany({
      data: [
        { personId: applicantAccount.personId, roleId: reviewerRole.id, scope: 'PLATFORM' },
        { personId: reviewerAccount.personId, roleId: reviewerRole.id, scope: 'PLATFORM' },
      ],
    });

    const createRequest = await request('/api/v1/me/professional/role-requests', {
      method: 'POST',
      headers: bearer(applicant.accessToken),
      body: JSON.stringify({ roleKey: 'DIVER', applicantNote: 'اختبار دورة الاعتماد المهنية' }),
    });
    assert.equal(createRequest.status, 201, `create role request failed: ${JSON.stringify(createRequest.body)}`);
    assert.equal(createRequest.body.status, 'DRAFT');
    const requestPublicId = createRequest.body.publicId;

    const submit = await request(`/api/v1/me/professional/role-requests/${requestPublicId}/submit`, {
      method: 'POST',
      headers: bearer(applicant.accessToken),
      body: JSON.stringify({}),
    });
    assert.equal(submit.status, 201, `submit role request failed: ${JSON.stringify(submit.body)}`);
    assert.equal(submit.body.status, 'SUBMITTED');
    console.log('PASS create and submit professional role request');

    const selfClaim = await request(`/api/v1/review/professional-role-requests/${requestPublicId}/claim`, {
      method: 'POST',
      headers: bearer(applicant.accessToken),
      body: JSON.stringify({}),
    });
    assert.equal(selfClaim.status, 403, `self review was not denied: ${JSON.stringify(selfClaim.body)}`);
    console.log('PASS deny self-review');

    const pending = await request('/api/v1/review/professional-role-requests', {
      method: 'GET',
      headers: bearer(reviewer.accessToken),
    });
    assert.equal(pending.status, 200, `review queue failed: ${JSON.stringify(pending.body)}`);
    assert.equal(pending.body.some((item) => item.publicId === requestPublicId), true);

    const claim = await request(`/api/v1/review/professional-role-requests/${requestPublicId}/claim`, {
      method: 'POST',
      headers: bearer(reviewer.accessToken),
      body: JSON.stringify({}),
    });
    assert.equal(claim.status, 201, `review claim failed: ${JSON.stringify(claim.body)}`);
    assert.equal(claim.body.status, 'UNDER_REVIEW');

    const decision = await request(`/api/v1/review/professional-role-requests/${requestPublicId}/decision`, {
      method: 'POST',
      headers: bearer(reviewer.accessToken),
      body: JSON.stringify({ decision: 'APPROVED', reviewerNote: 'اعتماد اختبار E2E' }),
    });
    assert.equal(decision.status, 201, `review decision failed: ${JSON.stringify(decision.body)}`);
    assert.equal(decision.body.status, 'APPROVED');
    console.log('PASS reviewer claim and approval');

    const activatedRole = await prisma.personRole.findFirst({
      where: { personId: applicantAccount.personId, roleId: diverRole.id, revokedAt: null },
    });
    assert.ok(activatedRole, 'approved request did not activate the requested role');

    const notifications = await prisma.notification.findMany({ where: { personId: applicantAccount.personId } });
    assert.equal(notifications.some((item) => item.type === 'PROFESSIONAL_ROLE_SUBMITTED'), true);
    assert.equal(notifications.some((item) => item.type === 'PROFESSIONAL_ROLE_UNDER_REVIEW'), true);
    assert.equal(notifications.some((item) => item.type === 'PROFESSIONAL_ROLE_APPROVED'), true);

    const auditEvents = await prisma.auditEvent.findMany({ where: { entityId: requestPublicId } });
    assert.equal(auditEvents.some((item) => item.action === 'professional.role_request.submit'), true);
    assert.equal(auditEvents.some((item) => item.action === 'professional.role_request.claim'), true);
    assert.equal(auditEvents.some((item) => item.action === 'professional.role_request.decision'), true);
    console.log('PASS role activation, notifications and audit trail');

    const firstRefreshToken = applicant.refreshToken;
    const refresh = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: firstRefreshToken }) });
    assert.equal(refresh.status, 201, `refresh failed: ${JSON.stringify(refresh.body)}`);
    assert.equal(typeof refresh.body.accessToken, 'string');
    assert.equal(typeof refresh.body.refreshToken, 'string');
    assert.notEqual(refresh.body.refreshToken, firstRefreshToken);

    const reusedOldRefresh = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: firstRefreshToken }) });
    assert.equal(reusedOldRefresh.status, 401, `old refresh was accepted: ${JSON.stringify(reusedOldRefresh.body)}`);

    const logout = await request('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh.body.refreshToken }) });
    assert.equal(logout.status, 201, `logout failed: ${JSON.stringify(logout.body)}`);
    assert.deepEqual(logout.body, { success: true });

    const refreshAfterLogout = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: refresh.body.refreshToken }) });
    assert.equal(refreshAfterLogout.status, 401, `revoked refresh was accepted: ${JSON.stringify(refreshAfterLogout.body)}`);
    console.log('PASS refresh rotation, logout and revoked-token rejection');
  } finally {
    await cleanup();
    await prisma.$disconnect();
    if (app) await app.close();
  }
}

main().catch((error) => {
  console.error('E2E FAILURE');
  console.error(error?.stack || error);
  process.exitCode = 1;
});
