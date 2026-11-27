// Replay the exact additive migration on both native historical identity types.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

assert.equal(process.env.CI, 'true');
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.D01_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/participation_test_d01_[a-z0-9_]+$/);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sql = await readFile(resolve(repo, 'apps/api/prisma/migrations/20261127010000_participation_source_eligibility/migration.sql'), 'utf8');
const root = new PrismaClient(), directory = await mkdtemp(join(tmpdir(), 'hydroland-d01-migration-'));
const denied = (work, codes) => assert.rejects(work, error => codes.includes(error?.meta?.code));

try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'd01_' + randomUUID().replaceAll('-', ''), id = randomUUID(), second = randomUUID();
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.href }), file = join(directory, type + '.sql');
    const apply = () => execFileSync(process.execPath, [resolve(repo, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', scoped.href, '--file', file], { stdio: 'pipe', timeout: 30000 });
    try {
      const originals = ['Organization', 'Account', 'Person', 'BookingParticipant', 'TrainingEnrollment', 'ManagedDocument'];
      for (const table of originals) {
        await db.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" ${type} PRIMARY KEY, "marker" TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${type},$2),($3::${type},$4)`, id, 'ORIGINAL_' + table, second, 'ORIGINAL_SECOND_' + table);
      }
      const original = async () => JSON.stringify(await Promise.all(originals.map(table => db.$queryRawUnsafe(`SELECT "id"::text AS id,"marker",pg_typeof("id")::text AS "identityType" FROM "${table}" ORDER BY "id"`))));
      const before = await original();
      await writeFile(file, `SET search_path TO "${schema}";\n${sql}\n`);
      apply();
      // Prisma db push does not create SQL-only constraints. Prove forward replay
      // installs them even when the tables already exist, without losing rows.
      for (const table of ['ParticipationCase', 'ParticipationEvent']) {
        const rows = await db.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE contype='c' AND conrelid=$1::regclass`, '"' + table + '"');
        for (const row of rows) await db.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
      }
      await db.$executeRawUnsafe('DROP TRIGGER "ParticipationEvent_immutable" ON "ParticipationEvent"');
      apply(); apply();
      const references = await db.$queryRawUnsafe(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND column_name IN ('organizationId','bookingParticipantId','trainingEnrollmentId','actorAccountId','actorPersonId','policyDocumentId','identityDocumentId') ORDER BY table_name,column_name`, schema);
      assert.equal(references.length, 7);
      assert.ok(references.every(row => row.data_type.toUpperCase() === type));
      const data = { id: randomUUID(), organizationId: id, bookingParticipantId: id, participantAccountId: id,
        policyDocumentId: id, identityDocumentId: id, createdByAccountId: id, revision: 1, digest: 'a'.repeat(64),
        state: { schemaVersion: 1, subjectType: 'BOOKING_PARTICIPANT', subjectId: id, organizationId: id } };
      const participationCase = await db.participationCase.create({ data });
      const saved = () => db.participationCase.findUniqueOrThrow({ where: { id: participationCase.id } });
      const invalidChanges = [
        '"bookingParticipantId"=NULL',
        `"trainingEnrollmentId"='${id}'::${type}`,
        '"revision"=0', '"digest"=\'invalid\'',
        '"state"=\'{}\'::jsonb', '"state"=\'[]\'::jsonb',
        '"state"=jsonb_set("state",\'{subjectId}\',\'null\'::jsonb)',
        '"state"=jsonb_set("state",\'{organizationId}\',\'null\'::jsonb)',
        '"state"=jsonb_set("state",\'{subjectType}\',\'null\'::jsonb)',
        `"state"=jsonb_set("state",'{subjectId}',to_jsonb('${second}'::text))`,
        `"state"=jsonb_set("state",'{organizationId}',to_jsonb('${second}'::text))`,
        '"state"=jsonb_set("state",\'{subjectType}\',\'"TRAINING_ENROLLMENT"\'::jsonb)',
      ];
      for (const change of invalidChanges) await denied(() => db.$executeRawUnsafe('UPDATE "ParticipationCase" SET ' + change), ['23514']);
      await denied(() => db.$executeRawUnsafe('UPDATE "ParticipationCase" SET "state"="state"||jsonb_build_object(\'oversize\',repeat(\'x\',262144))'), ['23514']);
      assert.equal((await saved()).digest, data.digest);
      await assert.rejects(() => db.participationCase.create({ data: { ...data, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.participationCase.create({ data: { ...data, id: randomUUID(), bookingParticipantId: second, policyDocumentId: randomUUID(), state: { ...data.state, subjectId: second } } }), error => error.code === 'P2003');
      const training = await db.participationCase.create({ data: { ...data, id: randomUUID(), bookingParticipantId: null, trainingEnrollmentId: id,
        state: { ...data.state, subjectType: 'TRAINING_ENROLLMENT' } } });
      assert.equal(training.trainingEnrollmentId, id);
      const event = { id: randomUUID(), caseId: participationCase.id, actorAccountId: id, actorPersonId: id, requestId: randomUUID(), action: 'CREATE',
        requestFingerprint: 'b'.repeat(64), beforeRevision: 0, afterRevision: 1, previousDigest: null,
        resultDigest: data.digest, evidenceHash: 'c'.repeat(64), payload: {} };
      await db.participationEvent.create({ data: event });
      await assert.rejects(() => db.participationEvent.create({ data: { ...event, id: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.participationEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID() } }), error => error.code === 'P2002');
      await assert.rejects(() => db.participationEvent.create({ data: { ...event, id: randomUUID(), caseId: randomUUID(), requestId: randomUUID() } }), error => error.code === 'P2003');
      await denied(() => db.$executeRawUnsafe('UPDATE "ParticipationEvent" SET "action"=\'REVIEW\''), ['55000']);
      await denied(() => db.$executeRawUnsafe('DELETE FROM "ParticipationEvent"'), ['55000']);
      await denied(() => db.$executeRawUnsafe('DELETE FROM "ParticipationCase"'), ['23001', '23503']);
      for (const table of originals) await denied(() => db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id"=$1::${type}`, id), ['23001', '23503']);
      const snapshot = async () => JSON.stringify(await Promise.all([db.participationCase.findMany({ orderBy: { id: 'asc' } }), db.participationEvent.findMany({ orderBy: { id: 'asc' } })]));
      const retained = await snapshot(); apply();
      assert.equal(await snapshot(), retained); assert.equal(await original(), before);
      console.log('PASS D01 migration ' + type + ': typed source/actor FKs; exactly one native subject; null, mismatched, oversized and invalid revisions blocked; unique occurrences; immutable evidence; existing rows preserved; forward replay');
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); await rm(directory, { recursive: true, force: true }); }
