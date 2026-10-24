import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { requireExistingMigrationHistory } from './production-recovery-history.mjs';

const raw = process.env.DATABASE_URL;
assert.equal(process.env.CI, 'true', 'History fixtures run only in CI');
assert.equal(process.env.RECOVERY_HISTORY_CHECK_CONFIRM, 'NEW_LOOPBACK_DATABASES_ONLY');
assert.notEqual(process.env.NODE_ENV, 'production');
const base = new URL(raw);
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'No remote or production fixture connections');
assert(['postgres:', 'postgresql:'].includes(base.protocol));
const admin = new PrismaClient({ datasourceUrl: raw }), created = [];
let checks = 0;
try {
  for (const state of ['absent', 'empty', 'existing']) {
    const name = 'hydroland_history_guard_' + randomUUID().replaceAll('-', '');
    assert(/^[a-z_0-9]{1,63}$/.test(name));
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    created.push(name);
    const target = new URL(base); target.pathname = '/' + name;
    const db = new PrismaClient({ datasourceUrl: target.toString() });
    try {
      await db.$executeRawUnsafe('CREATE TABLE public.guard_application_sentinel (id integer PRIMARY KEY, label text NOT NULL)');
      await db.$executeRawUnsafe("INSERT INTO public.guard_application_sentinel VALUES (1,'SYNTHETIC GUARD FIXTURE ONLY')");
      if (state !== 'absent') await db.$executeRawUnsafe('CREATE TABLE public."_prisma_migrations" (id text PRIMARY KEY, checksum text NOT NULL, finished_at timestamptz, migration_name text NOT NULL, logs text, rolled_back_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)');
      // An unfinished fixture proves that existing failed history remains
      // available to the original narrow repair logic. It is never "applied".
      if (state === 'existing') await db.$executeRawUnsafe("INSERT INTO public.\"_prisma_migrations\" (id,checksum,migration_name) VALUES ('GUARD_FIXTURE_ONLY','not-a-production-checksum','NOT_A_PRODUCTION_MIGRATION')");
      const before = await db.$queryRawUnsafe('SELECT * FROM public.guard_application_sentinel');
      const historyBefore = state === 'absent' ? null : await db.$queryRawUnsafe('SELECT * FROM public."_prisma_migrations"');
      let repairReached = false;
      const entry = async () => { await requireExistingMigrationHistory(db); repairReached = true; };
      if (state === 'existing') { await entry(); assert.equal(repairReached, true); }
      else await assert.rejects(entry, error => error.code === 'MIGRATION_HISTORY_REQUIRED' && /No repair was attempted/.test(error.message));
      assert.equal(repairReached, state === 'existing'); checks++;
      assert.deepEqual(await db.$queryRawUnsafe('SELECT * FROM public.guard_application_sentinel'), before); checks++;
      if (state === 'absent') assert.deepEqual(await db.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present"), [{ present: false }]);
      else assert.deepEqual(await db.$queryRawUnsafe('SELECT * FROM public."_prisma_migrations"'), historyBefore);
      checks++;
    } finally { await db.$disconnect(); }
  }
  console.log(`Production recovery history guard: ${checks} native PostgreSQL assertions passed; absent/empty history refuses repair, existing history and application rows stay unchanged.`);
} finally {
  for (const name of created.reverse()) await admin.$executeRawUnsafe(`DROP DATABASE "${name}"`);
  await admin.$disconnect();
}
