const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { AppModule } = require('../dist/app.module.js');

const prisma = new PrismaClient();
const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

async function cleanup() {
  const account = await prisma.account.findUnique({ where: { email } });
  if (account) {
    await prisma.session.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
    await prisma.profile.deleteMany({ where: { personId: account.personId } });
    await prisma.person.delete({ where: { id: account.personId } });
  }
}

async function main() {
  try {
    app = await NestFactory.create(AppModule, { logger: false });
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

    const register = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName: 'اختبار', lastName: 'هيدرولاند', email, password, preferredLanguage: 'ar' }),
    });
    assert.equal(register.status, 201, `register failed: ${JSON.stringify(register.body)}`);
    assert.equal(register.body.status, 'PENDING');
    console.log('PASS register');

    const login = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    assert.equal(login.status, 201, `login failed: ${JSON.stringify(login.body)}`);
    assert.equal(typeof login.body.accessToken, 'string');
    assert.match(login.body.refreshToken, /^[0-9a-f-]{36}\..+/i);
    console.log('PASS login');

    const firstRefreshToken = login.body.refreshToken;
    const refresh = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: firstRefreshToken }) });
    assert.equal(refresh.status, 201, `refresh failed: ${JSON.stringify(refresh.body)}`);
    assert.equal(typeof refresh.body.accessToken, 'string');
    assert.equal(typeof refresh.body.refreshToken, 'string');
    assert.notEqual(refresh.body.refreshToken, firstRefreshToken);
    console.log('PASS refresh rotation');

    const reusedOldRefresh = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: firstRefreshToken }) });
    assert.equal(reusedOldRefresh.status, 401, `old refresh was accepted: ${JSON.stringify(reusedOldRefresh.body)}`);
    console.log('PASS reject reused refresh');

    const logout = await request('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh.body.refreshToken }) });
    assert.equal(logout.status, 201, `logout failed: ${JSON.stringify(logout.body)}`);
    assert.deepEqual(logout.body, { success: true });
    console.log('PASS logout');

    const refreshAfterLogout = await request('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: refresh.body.refreshToken }) });
    assert.equal(refreshAfterLogout.status, 401, `revoked refresh was accepted: ${JSON.stringify(refreshAfterLogout.body)}`);
    console.log('PASS reject refresh after logout');
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
