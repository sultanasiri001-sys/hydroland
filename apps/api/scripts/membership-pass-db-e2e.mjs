import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Module, UnauthorizedException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../dist/database/database.service.js';
import { MembershipPassService } from '../dist/profile/membership-pass.service.js';
import { MembershipPassController } from '../dist/profile/membership-pass.controller.js';
import { AccessTokenGuard } from '../dist/auth/access-token.guard.js';
import { AuthService } from '../dist/auth/auth.service.js';

const url = new URL(process.env.DATABASE_URL || '');
assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname), 'Only isolated loopback databases are allowed');
assert.equal(process.env.NODE_ENV, 'test');
process.env.JWT_SECRET = 'local-membership-fixture-secret-at-least-32-characters';
const root = new PrismaClient({ datasourceUrl: url.href });
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };
try {
  for (const type of ['text', 'uuid']) {
    const before = passed, schema = `membership_${type}_${randomUUID().replaceAll('-', '')}`;
    const local = new URL(url); local.searchParams.set('schema', schema);
    const db = new DatabaseService({ datasourceUrl: local.href });
    let app, created = false;
    try {
      await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
      assert.equal((await db.$queryRaw`SELECT current_schema() AS name`)[0].name, schema);
      await db.$executeRawUnsafe(`CREATE TABLE "Person" ("id" ${type} PRIMARY KEY, "firstName" text NOT NULL, "lastName" text NOT NULL)`);
      await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${type} PRIMARY KEY, "personId" ${type} NOT NULL REFERENCES "Person"("id"), "email" text NOT NULL, "status" text NOT NULL, "emailVerifiedAt" timestamptz)`);
      await db.$executeRawUnsafe(`CREATE TABLE "Session" ("id" ${type} PRIMARY KEY, "accountId" ${type} NOT NULL REFERENCES "Account"("id"), "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz)`);
      await db.$executeRawUnsafe(`CREATE TABLE "RoleAssignment" ("id" ${type} PRIMARY KEY, "accountId" ${type} NOT NULL REFERENCES "Account"("id"), "role" text NOT NULL, "status" text NOT NULL)`);
      const ids = Object.fromEntries(['owner', 'admin', 'outsider'].map(key => [key, randomUUID()]));
      const sessions = Object.fromEntries(Object.keys(ids).map(key => [key, randomUUID()]));
      for (const [name, id] of Object.entries(ids)) {
        // Interpolated identifiers below are generated locally, never request input.
        await db.$executeRawUnsafe(`INSERT INTO "Person" VALUES ('${id}', 'Fixture', '${name}')`);
        await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ('${id}', '${id}', '${name}@example.invalid', 'ACTIVE', NOW())`);
        await db.$executeRawUnsafe(`INSERT INTO "Session" VALUES ('${sessions[name]}', '${id}', NOW() + INTERVAL '1 hour', NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "RoleAssignment" VALUES ('${randomUUID()}', '${id}', '${name === 'admin' ? 'ADMIN' : 'DIVER'}', 'ACTIVE')`);
      }
      const service = new MembershipPassService(db);
      // The real AccessTokenGuard and controller are exercised. Identity tokens
      // here are local fixtures, not real Google/password sign-in acceptance.
      const testAuth = { authenticateAccessToken: async token => {
        const name = Object.keys(ids).find(k => token === k + '-fixture');
        if (!name) throw new UnauthorizedException();
        const row = await db.session.findUnique({ where: { id: sessions[name] }, select: { revokedAt: true, expiresAt: true } });
        const account = await db.account.findUnique({ where: { id: ids[name] }, select: { status: true } });
        if (!row || row.revokedAt || row.expiresAt <= new Date() || account?.status !== 'ACTIVE') throw new UnauthorizedException();
        return { accountId: ids[name], sessionId: sessions[name] };
      } };
      class TestModule {}
      Module({ controllers: [MembershipPassController], providers: [AccessTokenGuard,
        { provide: AuthService, useValue: testAuth }, { provide: MembershipPassService, useValue: service }] })(TestModule);
      app = await NestFactory.create(TestModule, { logger: false });
      app.setGlobalPrefix('api/v1'); await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const post = async (path, token, body = {}) => {
        const response = await fetch(base + '/api/v1/me/membership-pass' + path, { method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
        return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
      };
      check((await post('', '')).status === 401, 'guest issue denied');
      check((await post('/verify', '', { reference: 'hlm1.invalid' })).status === 401, 'guest verification denied');
      const issued = await post('', 'owner-fixture');
      check(issued.status === 200 && issued.body.officialLicence === false, 'actual controller issue');
      check(issued.cache === 'no-store', 'issue cannot be cached');
      const pass = issued.body;
      check(pass.displayName === 'Fixture owner' && pass.roles.length === 1, 'current minimal account snapshot');
      const serialized = JSON.stringify(pass);
      check(!serialized.includes('@') && !serialized.includes(ids.owner) && !serialized.includes(sessions.owner) && !serialized.includes('medical') && !serialized.includes('credentialNumber'), 'no PII fields or identifiers in reference');
      check(Date.parse(pass.expiresAt) <= Date.now() + 300_000, 'bounded reference lifetime');
      check((await post('', pass.reference)).status === 401, 'membership reference is not a login token');
      const own = await post('/verify', 'owner-fixture', { reference: pass.reference });
      check(own.status === 200 && own.body.displayName === pass.displayName && own.cache === 'no-store', 'owner verification');
      check(!('reference' in own.body), 'verification does not reissue references');
      check((await post('/verify', 'outsider-fixture', { reference: pass.reference })).status === 403, 'ordinary member denial');
      check((await post('/verify', 'admin-fixture', { reference: pass.reference })).status === 200, 'existing active admin permission');
      await db.$executeRawUnsafe(`UPDATE "RoleAssignment" SET "status"='INACTIVE' WHERE "accountId"='${ids.admin}'`);
      check((await post('/verify', 'admin-fixture', { reference: pass.reference })).status === 403, 'admin revocation takes immediate effect');
      await db.$executeRawUnsafe(`UPDATE "RoleAssignment" SET "status"='ACTIVE' WHERE "accountId"='${ids.admin}'`);
      for (const bad of [null, {}, '', 'hlm1.' + 'A'.repeat(401), pass.reference + 'A', pass.reference.slice(0, 10) + (pass.reference[10] === 'A' ? 'B' : 'A') + pass.reference.slice(11)]) {
        check((await post('/verify', 'owner-fixture', { reference: bad })).status === 400, 'invalid/tampered reference rejected');
      }
      const adminPass = await post('', 'admin-fixture');
      check(adminPass.status === 200 && adminPass.body.roles.length === 0, 'internal privilege labels are not exported');
      const now = Date.now; Date.now = () => now() + 301_000;
      try { await assert.rejects(() => service.verify(ids.admin, pass.reference), e => e.getStatus?.() === 403); passed++; } finally { Date.now = now; }
      await db.$executeRawUnsafe(`UPDATE "Account" SET "status"='SUSPENDED' WHERE "id"='${ids.owner}'`);
      check((await post('/verify', 'admin-fixture', { reference: pass.reference })).status === 403, 'suspended owner reference invalid');
      await db.$executeRawUnsafe(`UPDATE "Account" SET "status"='ACTIVE', "emailVerifiedAt"=NULL WHERE "id"='${ids.owner}'`);
      check((await post('/verify', 'admin-fixture', { reference: pass.reference })).status === 403, 'unverified owner reference invalid');
      await db.$executeRawUnsafe(`UPDATE "Account" SET "emailVerifiedAt"=NOW() WHERE "id"='${ids.owner}'`);
      await db.$executeRawUnsafe(`UPDATE "Session" SET "revokedAt"=NOW() WHERE "id"='${sessions.owner}'`);
      check((await post('/verify', 'admin-fixture', { reference: pass.reference })).status === 403, 'issuing-session logout invalidates reference');
      check((await post('', 'owner-fixture')).status === 401, 'revoked session cannot issue');
      check((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Session"'))[0].n === 3, 'reference issuance never creates login sessions');
      console.log(`Membership ${type}: ${passed - before} assertions PASS`);
    } finally {
      if (app) await app.close(); await db.$disconnect();
      if (created) await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
  console.log(`Membership HTTP/PostgreSQL: ${passed} assertions PASS; local fixtures only`);
} finally { await root.$disconnect(); }
