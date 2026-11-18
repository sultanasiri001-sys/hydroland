import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const database = new URL(process.env.DATABASE_URL || '');
if (process.env.NODE_ENV !== 'test' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('The community migration rehearsal requires a local test database.');
}
const migration = readFileSync(new URL('../prisma/migrations/20260925233000_community_runtime/migration.sql', import.meta.url), 'utf8');
const schemaFile = fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url));
const prisma = fileURLToPath(new URL('../../../node_modules/.bin/prisma', import.meta.url));
for (const keyType of ['text', 'uuid', 'varchar']) {
  const schema = 'community_rehearsal_' + randomBytes(8).toString('hex');
  const accountId = '00000000-0000-4000-8000-000000000001';
  const sql = [
    'BEGIN;',
    'CREATE SCHEMA ' + schema + ';',
    'SET LOCAL search_path TO ' + schema + ';',
    'CREATE TABLE "Account" ("id" ' + keyType + ' PRIMARY KEY);',
    migration,
    'INSERT INTO "Account" ("id") VALUES (\'' + accountId + '\');',
    'INSERT INTO "CommunityPost" ("authorAccountId","title","body") VALUES (\'' + accountId + '\',\'Rehearsal\',\'Sample post\');',
    `DO $check$
    BEGIN
      IF (SELECT count(*) FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND contype = 'f' AND convalidated) <> 8 THEN
        RAISE EXCEPTION 'Expected eight validated community foreign keys';
      END IF;
      BEGIN
        INSERT INTO "CommunityPost" ("authorAccountId","title","body")
          VALUES ('00000000-0000-4000-8000-000000000002','Rehearsal','Unknown author');
        RAISE EXCEPTION 'An unknown account was accepted';
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END;
    $check$;`,
    'ROLLBACK;',
  ].join('\n');
  execFileSync(prisma, ['db', 'execute', '--schema', schemaFile, '--stdin'], {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  console.log('Community migration passed with Account.id type ' + keyType);
}
