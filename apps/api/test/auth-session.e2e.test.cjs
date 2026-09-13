const test = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { AppModule } = require('../dist/app.module.js');

const prisma = new PrismaClient();
let app;
let baseUrl;
const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
const password = 'Hydroland-E2E-Password-123!';

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

test.before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

test.after(async () => {
  const account = await prisma.account.findUnique({ where: { email } });
  if (account) {
    await prisma.session.deleteMany({ where: { accountId: account.id } });
    await prisma.account.delete({ where: { id: account.id } });
    await prisma.profile.deleteMany({ where: { personId: account.personId } });
    await prisma.person.delete({ where: { id: account.personId } });
  }
  await prisma.$disconnect();
  if (app) await app.close();
});

test('seed provides core roles and permissions', async () => {
  const roleKeys = ['PLATFORM_EXECUTIVE_OWNER', 'PROFESSIONAL_REVIEWER', 'AUDITOR', 'DIVER', 'INSTRUCTOR'];
  const permissionKeys = ['professional.role_requests.review', 'audit.read'];

  const roles = await prisma.role.findMany({ where: { key: { in: roleKeys } }, select: { key: true } });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { key: true } });

  assert.deepEqual(new Set(roles.map((item) => item.key)), new Set(roleKeys));
  assert.deepEqual(new Set(permissions.map((item) => item.key)), new Set(permissionKeys));
});

test('register, login, rotate refresh token, logout and reject revoked refresh', async () => {
  const register = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'اختبار',
      lastName: 'هيدرولاند',
      email,
      password,
      preferredLanguage: 'ar',
    }),
  });
  assert.equal(register.status, 201);
  assert.equal(register.body.status, 'PENDING');

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 201);
  assert.equal(typeof login.body.accessToken, 'string');
  assert.match(login.body.refreshToken, /^[0-9a-f-]{36}\..+/i);

  const firstRefreshToken = login.body.refreshToken;
  const refresh = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: firstRefreshToken }),
  });
  assert.equal(refresh.status, 201);
  assert.equal(typeof refresh.body.accessToken, 'string');
  assert.equal(typeof refresh.body.refreshToken, 'string');
  assert.notEqual(refresh.body.refreshToken, firstRefreshToken);

  const reusedOldRefresh = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: firstRefreshToken }),
  });
  assert.equal(reusedOldRefresh.status, 401);

  const logout = await request('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refresh.body.refreshToken }),
  });
  assert.equal(logout.status, 201);
  assert.deepEqual(logout.body, { success: true });

  const refreshAfterLogout = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refresh.body.refreshToken }),
  });
  assert.equal(refreshAfterLogout.status, 401);
});
