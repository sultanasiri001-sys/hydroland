import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL);
assert((process.env.CI === 'true' || process.env.NODE_ENV === 'test') && ['localhost','127.0.0.1','[::1]'].includes(url.hostname), 'Assessment migration tests require test-only loopback PostgreSQL');
const root = new PrismaClient(), source = await readFile(new URL('../prisma/migrations/20261026194000_department_closure_assessments/migration.sql', import.meta.url), 'utf8');
const boundary = source.indexOf('END $$;') + 'END $$;'.length;
const parts = [source.slice(0, boundary), ...source.slice(boundary).split(';').map(s => s.trim()).filter(Boolean)];
try {
  for (const type of ['text', 'uuid']) {
    const schema = 'closure_' + randomUUID().replaceAll('-', '');
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.toString() });
    try {
      await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${type} PRIMARY KEY)`);
      await db.$executeRawUnsafe(`CREATE TABLE "Organization" ("id" ${type} PRIMARY KEY)`);
      const actor = randomUUID(), org = randomUUID();
      await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ($1::${type})`, actor);
      await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ($1::${type})`, org);
      for (const sql of parts) await db.$executeRawUnsafe(sql);
      assert.equal(await db.departmentClosureAssessment.count(), 0, 'Migration creates no assessment or approval');
      const data = { organizationId: org, department: 'HR', revision: 1, policyVersion: 'fixture', specificationVersion: 'fixture', state: 'BLOCKED', gates: [], sourceDigest: 'fixture', authorityDigest: 'fixture', createdByAccountId: actor, recordDigest: 'fixture' };
      const first = await db.departmentClosureAssessment.create({ data });
      assert.equal((await db.departmentClosureAssessment.findFirstOrThrow({ where: { organizationId: org, department: 'HR', revision: 1 } })).id, first.id, 'Native Prisma codec works with both historical key types');
      await assert.rejects(() => db.departmentClosureAssessment.create({ data }), 'No duplicate scope revision');
      await assert.rejects(() => db.departmentClosureAssessment.create({ data: { ...data, revision: 0 } }), 'Positive revision constraint');
      await assert.rejects(() => db.$executeRawUnsafe(`DELETE FROM "Account" WHERE "id"=$1::${type}`, actor));
      await assert.rejects(() => db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id"=$1::${type}`, org));
      await assert.rejects(() => db.$transaction(async tx => { await tx.departmentClosureAssessment.create({ data: { ...data, revision: 2, previousAssessmentId: first.id } }); throw new Error('rollback'); }));
      assert.equal(await db.departmentClosureAssessment.count(), 1);
      assert.deepEqual(await db.departmentClosureAssessment.findUnique({ where: { id: first.id } }), first, 'Previous revision unchanged');
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
  console.log('Department assessment additive migration passed: TEXT/UUID references, native Prisma codec, no seeded closure, FKs, revision uniqueness and atomic rollback.');
} finally { await root.$disconnect(); }
