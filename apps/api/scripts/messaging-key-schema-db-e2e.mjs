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
      console.log(`Messaging ${type} schema: PASS (19 scenarios)`);
    } finally {
      await db.$disconnect();
      if (created) await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
  console.log(`Messaging schema compatibility: ${scenarios}/38 PASS; no production data or external delivery used`);
} finally {
  await root.$disconnect();
}
