// Replay the exact additive C06 migration against both historical identity types.
// Only explicitly confirmed disposable loopback databases may be inspected.
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
assert.equal(process.env.COMMERCE_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
assert.equal(process.env.C06_DB_TEST_CONFIRM, 'DISPOSABLE_LOOPBACK_ONLY');
const url = new URL(process.env.DATABASE_URL || 'invalid:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert.match(url.pathname, /^\/commerce_test_c06_[a-z0-9_]+$/);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sql = await readFile(resolve(repo, 'apps/api/prisma/migrations/20261127090000_campaign_lifecycle/migration.sql'), 'utf8');
const root = new PrismaClient(), directory = await mkdtemp(join(tmpdir(), 'hydroland-c06-migration-'));
const denied = (work, codes) => assert.rejects(work, error => codes.includes(error?.meta?.code));

try {
  for (const type of ['TEXT', 'UUID']) {
    const schema = 'c06_' + randomUUID().replaceAll('-', ''), id = randomUUID(), second = randomUUID();
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const scoped = new URL(url); scoped.searchParams.set('schema', schema);
    const db = new PrismaClient({ datasourceUrl: scoped.href }), file = join(directory, type + '.sql');
    const apply = () => execFileSync(process.execPath, [resolve(repo, 'node_modules/prisma/build/index.js'), 'db', 'execute', '--url', scoped.href, '--file', file], { stdio: 'pipe', timeout: 30000 });
    try {
      const originals = ['Organization', 'Account', 'Person', 'ManagedDocument', 'FinanceAccount', 'MarketingCampaignDraft'];
      for (const table of originals) {
        await db.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" ${type} PRIMARY KEY, "marker" TEXT NOT NULL)`);
        await db.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ($1::${type},$2),($3::${type},$4)`, id, 'ORIGINAL_' + table, second, 'ORIGINAL_SECOND_' + table);
      }
      await db.$executeRawUnsafe('CREATE TABLE "MarketingCampaignDraftRevision" ("id" TEXT PRIMARY KEY,"recordDigest" TEXT NOT NULL,"snapshot" JSONB NOT NULL)');
      await db.$executeRawUnsafe('INSERT INTO "MarketingCampaignDraftRevision" VALUES ($1,$2,$3::jsonb)', randomUUID(), 'a'.repeat(64), JSON.stringify({ syntheticOriginal: true, campaignDraftId: id }));
      const original = async () => JSON.stringify(await Promise.all([...originals, 'MarketingCampaignDraftRevision'].map(table => db.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY "id"`))));
      const before = await original();
      await writeFile(file, `SET search_path TO "${schema}";\n${sql}\n`);
      apply();
      // Reproduce tables created by db push: forward replay must restore SQL-only guards.
      for (const table of ['MarketingCampaignLifecycle', 'MarketingCampaignLifecycleEvent']) {
        const checks = await db.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE contype='c' AND conrelid=$1::regclass`, '"' + table + '"');
        for (const row of checks) await db.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
      }
      await db.$executeRawUnsafe('DROP TRIGGER "campaign_lifecycle_event_no_update_delete" ON "MarketingCampaignLifecycleEvent"');
      await db.$executeRawUnsafe('DROP TRIGGER "campaign_lifecycle_event_no_truncate" ON "MarketingCampaignLifecycleEvent"');
      apply(); apply();
      const references = await db.$queryRawUnsafe(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND column_name IN ('organizationId','campaignDraftId','rightsDocumentId','budgetDocumentId','financeAccountId','actorAccountId','actorPersonId') ORDER BY table_name,column_name`, schema);
      assert.equal(references.length, 9); assert.ok(references.every(row => row.data_type.toUpperCase() === type));
      const data = { id: randomUUID(), organizationId: id, campaignDraftId: id, revision: 1, status: 'PREPARED', boundDraftRevision: 1, boundDraftDigest: 'a'.repeat(64),
        rightsDocumentId: id, rightsVersion: 1, rightsHash: 'b'.repeat(64), rightsSnapshot: {}, budgetDocumentId: id, budgetVersion: 1, budgetHash: 'c'.repeat(64), budgetSnapshot: {},
        financeAccountId: id, budgetAmountMinor: 10000, budgetTaxMinor: 1000, budgetCurrency: 'USD', budgetTaxBasis: 'TAX_INCLUDED',
        validFrom: new Date('2026-01-01T00:00:00Z'), validUntil: new Date('2026-12-01T00:00:00Z'), recommendation: 'Synthetic migration acceptance only', ownerBinding: {}, decision: {}, evidenceBindings: [], recordDigest: 'd'.repeat(64) };
      const lifecycle = await db.marketingCampaignLifecycle.create({ data });
      for (const change of ['"revision"=0', '"status"=\'PUBLISHED\'', '"boundDraftRevision"=0', '"budgetAmountMinor"=-1', '"budgetTaxMinor"=10001', '"budgetCurrency"=\'usd\'', '"budgetTaxBasis"=\'NO_SPEND\'', '"validUntil"="validFrom"', '"recordDigest"=\'invalid\'', '"evidenceBindings"=\'{}\'::jsonb']) {
        await denied(() => db.$executeRawUnsafe('UPDATE "MarketingCampaignLifecycle" SET ' + change), ['23514']);
      }
      await assert.rejects(() => db.marketingCampaignLifecycle.create({ data: { ...data, id: randomUUID() } }), error => error.code === 'P2002');
      for (const field of ['rightsDocumentId', 'budgetDocumentId', 'financeAccountId']) await assert.rejects(() => db.marketingCampaignLifecycle.create({ data: { ...data, id: randomUUID(), campaignDraftId: second, [field]: randomUUID() } }), error => error.code === 'P2003');
      const event = { id: randomUUID(), organizationId: id, lifecycleId: lifecycle.id, campaignDraftId: id, requestId: randomUUID(), requestFingerprint: 'e'.repeat(64), actorAccountId: id, actorPersonId: id,
        action: 'PREPARE', afterRevision: 1, reason: 'Synthetic migration acceptance only', previousDigest: null, snapshot: JSON.parse(JSON.stringify(lifecycle)), eventDigest: 'f'.repeat(64) };
      await db.marketingCampaignLifecycleEvent.create({ data: event });
      await assert.rejects(() => db.marketingCampaignLifecycleEvent.create({ data: { ...event, id: randomUUID(), afterRevision: 2 } }), error => error.code === 'P2002');
      await assert.rejects(() => db.marketingCampaignLifecycleEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID() } }), error => error.code === 'P2002');
      for (const field of ['actorAccountId', 'actorPersonId', 'campaignDraftId', 'lifecycleId']) await assert.rejects(() => db.marketingCampaignLifecycleEvent.create({ data: { ...event, id: randomUUID(), requestId: randomUUID(), afterRevision: 2, [field]: randomUUID() } }), error => error.code === 'P2003');
      for (const statement of ['UPDATE "MarketingCampaignLifecycleEvent" SET "reason"=\'changed\'', 'DELETE FROM "MarketingCampaignLifecycleEvent"', 'TRUNCATE "MarketingCampaignLifecycleEvent"']) await denied(() => db.$executeRawUnsafe(statement), ['55000']);
      await denied(() => db.$executeRawUnsafe('DELETE FROM "MarketingCampaignLifecycle"'), ['23001', '23503']);
      for (const table of originals) await denied(() => db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "id"=$1::${type}`, id), ['23001', '23503']);
      const snapshot = async () => JSON.stringify(await Promise.all([db.marketingCampaignLifecycle.findMany({ orderBy: { id: 'asc' } }), db.marketingCampaignLifecycleEvent.findMany({ orderBy: { id: 'asc' } })]));
      const retained = await snapshot(); apply(); assert.equal(await snapshot(), retained); assert.equal(await original(), before);
      console.log('PASS C06 migration ' + type + ': typed native source/actor FKs; original draft history unchanged; budget/state constraints; unique occurrences; immutable events; forward replay');
    } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); }
  }
} finally { await root.$disconnect(); await rm(directory, { recursive: true, force: true }); }
