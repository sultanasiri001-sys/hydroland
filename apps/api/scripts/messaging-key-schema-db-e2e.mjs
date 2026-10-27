import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../dist/database/database.service.js';
import { MessagingService } from '../dist/messaging/messaging.service.js';

// Never create/drop test schemas against Render or another remote database.
const base = new URL(process.env.DATABASE_URL ?? '');
assert.ok(['localhost', '127.0.0.1', '[::1]', '::1'].includes(base.hostname), 'Messaging DB tests require a loopback database');
assert.equal(process.env.NODE_ENV, 'test', 'Messaging DB tests require NODE_ENV=test');
const root = new PrismaClient({ datasourceUrl: base.toString() });
const migration = await readFile(new URL('../prisma/migrations/20260925224500_messaging_runtime/migration.sql', import.meta.url), 'utf8');
const statements = sql => sql.split(';').map(part => part.trim()).filter(Boolean);
let scenarios = 0;
try {
  for (const type of ['text', 'uuid']) {
    const beforeScenarios = scenarios;
    const schema = `messaging_keys_${type}_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(base); url.searchParams.set('schema', schema);
    const db = new DatabaseService({ datasourceUrl: url.toString() });
    let created = false;
    try {
      await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
      const context = await db.$queryRaw`SELECT current_schema() AS name`;
      assert.equal(context[0].name, schema);
      await db.$executeRawUnsafe(`CREATE TABLE "Person" ("id" ${type} PRIMARY KEY, "firstName" text NOT NULL, "lastName" text NOT NULL)`);
      await db.$executeRawUnsafe(`CREATE TABLE "Account" ("id" ${type} PRIMARY KEY, "personId" ${type} NOT NULL REFERENCES "Person"("id"), "email" text NOT NULL, "status" text NOT NULL, "emailVerifiedAt" timestamptz)`);
      // Start from the actual canonical migration. The production recovery uses
      // the same messaging key graph with native UUID columns/defaults.
      const sql = type === 'text' ? migration : migration
        .replace(/"(id|[A-Za-z]+Id)" TEXT/g, '"$1" UUID')
        .replaceAll('gen_random_uuid()::text', 'gen_random_uuid()');
      for (const statement of statements(sql)) await db.$executeRawUnsafe(statement);
      const keyTypes = await db.$queryRaw`SELECT data_type FROM information_schema.columns WHERE table_schema=${schema} AND table_name='ConversationParticipant' AND column_name='accountId'`;
      assert.equal(keyTypes[0].data_type, type);
      const [owner, peer, outsider, unavailable] = Array.from({ length: 4 }, () => randomUUID());
      for (const id of [owner, peer, outsider, unavailable]) {
        // IDs are locally generated UUIDs, never external/user input.
        await db.$executeRawUnsafe(`INSERT INTO "Person" VALUES ('${id}', 'Fixture', 'Only')`);
        await db.$executeRawUnsafe(`INSERT INTO "Account" VALUES ('${id}', '${id}', '${id}@example.invalid', 'ACTIVE', ${id === unavailable ? 'NULL' : 'NOW()'})`);
      }
      const notices = [];
      const service = new MessagingService(db, { notify: async (...args) => { notices.push(args); } });
      assert.deepEqual(await service.listConversations(owner), []); scenarios++;
      const conversation = await service.createConversation(owner, { participantAccountIds: [peer, peer, owner], title: 'Isolated key contract' });
      assert.equal(conversation.participants.length, 2); assert.equal(conversation.createdByAccountId, owner); scenarios++;
      assert.equal((await service.listConversations(peer))[0].id, conversation.id); scenarios++;
      assert.deepEqual(await service.listConversations(outsider), []); scenarios++;
      for (const action of [
        () => service.getConversation(outsider, conversation.id),
        () => service.sendMessage(outsider, conversation.id, { body: 'denied' }),
        () => service.markRead(outsider, conversation.id),
      ]) { await assert.rejects(action, error => error.getStatus?.() === 403); scenarios++; }
      const body = `Bound SQL stays data: '); DROP TABLE "Message"; --`;
      const text = await service.sendMessage(owner, conversation.id, { body });
      assert.equal(text.body, body); assert.equal(text.senderAccountId, owner); scenarios++;
      const voice = await service.sendMessage(peer, conversation.id, { kind: 'VOICE', mediaUrl: 'https://example.invalid/test-only.ogg', durationSec: 7 });
      assert.equal(voice.kind, 'VOICE'); assert.equal(voice.durationSec, 7); scenarios++;
      // Deterministic ordering without sleeps or dependence on clock precision.
      await db.$executeRawUnsafe(`UPDATE "Message" SET "createdAt"='2026-01-01T00:00:00Z' WHERE "id"='${text.id}'`);
      await db.$executeRawUnsafe(`UPDATE "Message" SET "createdAt"='2026-01-01T00:00:01Z' WHERE "id"='${voice.id}'`);
      const reloaded = await service.getConversation(owner, conversation.id);
      assert.equal(reloaded.messages.length, 2); assert.deepEqual(new Set(reloaded.messages.map(message => message.id)), new Set([text.id, voice.id])); scenarios++;
      const latest = await service.listConversations(owner);
      assert.equal(latest[0].latestMessage.id, voice.id); scenarios++;
      assert.deepEqual(await service.markRead(peer, conversation.id), { conversationId: conversation.id, status: 'READ' });
      const afterRead = await service.getConversation(owner, conversation.id);
      assert.ok(afterRead.participants.find(participant => participant.accountId === peer).lastReadAt);
      assert.equal(afterRead.participants.find(participant => participant.accountId === owner).lastReadAt, null); scenarios++;
      assert.equal(notices.length, 2); assert.equal(notices[0][0], peer); assert.equal(notices[1][0], owner); scenarios++;
      await assert.rejects(() => service.createConversation(owner, { participantAccountIds: [unavailable] }), error => error.getStatus?.() === 400); scenarios++;
      await assert.rejects(() => service.createConversation(owner, { participantAccountIds: [randomUUID()] }), error => error.getStatus?.() === 400); scenarios++;
      await assert.rejects(() => service.createConversation(owner, { participantAccountIds: ['invalid-id'] }), error => error.getStatus?.() === 400); scenarios++;
      await assert.rejects(() => service.getConversation(owner, 'invalid-id'), error => error.getStatus?.() === 400); scenarios++;
      await assert.rejects(() => service.sendMessage(owner, conversation.id, { body: ' ' }), error => error.getStatus?.() === 400); scenarios++;
      assert.equal((await service.getConversation(owner, conversation.id)).messages.length, 2); scenarios++;
      const history = await service.createConversation(owner, { participantAccountIds: [peer], title: 'Bounded history' });
      const ids = page => page.messages.map(message => message.id);
      const messageId = number => `00000000-0000-0000-0000-${String(number).padStart(12, '0')}`;
      const expected = (first, last) => Array.from({ length: last - first + 1 }, (_, index) => messageId(first + index));
      const insertHistory = async (first, last) => db.$executeRawUnsafe(`
        INSERT INTO "Message" ("id","conversationId","senderAccountId","kind","body","createdAt")
        SELECT ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::${type}, '${history.id}'::${type}, '${owner}'::${type}, 'TEXT', 'History ' || n,
          '2026-02-01T00:00:00Z'::timestamptz + (n / 5) * interval '1 microsecond'
        FROM generate_series(${first},${last}) n
      `);
      assert.deepEqual(await service.listMessages(owner, history.id), { messages: [], hasMore: false, olderCursor: null }); scenarios++;
      await insertHistory(1, 199);
      let page = await service.getConversation(owner, history.id);
      assert.deepEqual(ids(page), expected(1, 199)); assert.equal(page.hasMore, false); assert.equal(page.olderCursor, null); scenarios++;
      await insertHistory(200, 200);
      page = await service.getConversation(owner, history.id);
      assert.deepEqual(ids(page), expected(1, 200)); assert.equal(page.hasMore, false); assert.equal(page.olderCursor, null); scenarios++;
      await insertHistory(201, 201);
      page = await service.getConversation(owner, history.id);
      assert.deepEqual(ids(page), expected(2, 201)); assert.equal(page.hasMore, true); assert.equal(page.olderCursor, messageId(2)); scenarios++;
      let older = await service.listMessages(owner, history.id, page.olderCursor);
      assert.deepEqual(ids(older), [messageId(1)]); assert.equal(older.hasMore, false); assert.equal(older.olderCursor, null); scenarios++;
      await insertHistory(202, 401);
      page = await service.getConversation(owner, history.id);
      assert.deepEqual(ids(page), expected(202, 401)); assert.equal(page.olderCursor, messageId(202)); scenarios++;
      older = await service.listMessages(owner, history.id, page.olderCursor);
      assert.deepEqual(ids(older), expected(2, 201)); assert.equal(older.olderCursor, messageId(2)); scenarios++;
      // New messages cannot shift an older page; tied timestamps and sub-ms
      // boundaries must round-trip through PostgreSQL, not JS millisecond dates.
      await insertHistory(402, 402);
      const repeated = await Promise.all([service.listMessages(owner, history.id, page.olderCursor), service.listMessages(owner, history.id, page.olderCursor)]);
      for (const result of repeated) assert.deepEqual(result, older);
      assert.deepEqual(ids(await service.getConversation(owner, history.id)), expected(203, 402)); scenarios++;
      const oldest = await service.listMessages(owner, history.id, older.olderCursor);
      assert.deepEqual(ids(oldest), [messageId(1)]); assert.equal(oldest.hasMore, false); assert.equal(oldest.olderCursor, null);
      const traversed = [...ids(oldest), ...ids(older), ...ids(page)];
      assert.deepEqual(traversed, expected(1, 401)); assert.equal(new Set(traversed).size, 401); scenarios++;
      assert.deepEqual(await service.listMessages(owner, history.id, messageId(1)), { messages: [], hasMore: false, olderCursor: null }); scenarios++;
      for (const cursor of ['', 'not-a-cursor', [messageId(202)], randomUUID(), text.id]) {
        await assert.rejects(() => service.listMessages(owner, history.id, cursor), error => error.getStatus?.() === 400); scenarios++;
      }
      for (const cursor of [page.olderCursor, text.id, 'malformed']) {
        await assert.rejects(() => service.listMessages(outsider, history.id, cursor), error => error.getStatus?.() === 403); scenarios++;
      }
      // An existing cursor never substitutes for membership, even after a
      // previously authorized page was loaded.
      await service.listMessages(peer, history.id);
      await db.$executeRawUnsafe(`DELETE FROM "ConversationParticipant" WHERE "conversationId"='${history.id}' AND "accountId"='${peer}'`);
      await assert.rejects(() => service.listMessages(peer, history.id, page.olderCursor), error => error.getStatus?.() === 403); scenarios++;
      const historyList = await service.listConversations(owner);
      assert.equal(historyList.find(item => item.id === history.id).latestMessage.id, messageId(402)); scenarios++;
      assert.equal(notices.length, 2, 'History reads must never deliver notifications'); scenarios++;
      console.log(`Messaging ${type} schema: PASS (${scenarios - beforeScenarios} scenarios)`);
    } finally {
      await db.$disconnect();
      if (created) await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
  console.log(`Messaging schema compatibility: ${scenarios}/${scenarios} PASS; no production data or external delivery used`);
} finally {
  await root.$disconnect();
}
