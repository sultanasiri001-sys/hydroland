import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./historical-migration-replay.mjs', import.meta.url));
const allowed = { ...process.env, CI: 'true', NODE_ENV: 'test', HISTORICAL_REPLAY_CONFIRM: 'EMPTY_CI_DATABASE_ONLY', DATABASE_URL: 'postgresql://hydroland:test@127.0.0.1:5432/hydroland_history_replay?schema=public' };
for (const override of [
  { CI: 'false' }, { NODE_ENV: 'production' }, { HISTORICAL_REPLAY_CONFIRM: '' },
  { DATABASE_URL: 'postgresql://hydroland:test@remote.invalid:5432/hydroland_history_replay?schema=public' },
  { DATABASE_URL: 'postgresql://hydroland:test@127.0.0.1:5432/production?schema=public' },
  { DATABASE_URL: 'postgresql://hydroland:test@127.0.0.1:5432/hydroland_history_replay?schema=private' },
]) {
  const result = spawnSync(process.execPath, [script], { env: { ...allowed, ...override }, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AssertionError/);
  assert.doesNotMatch(result.stderr, /PrismaClientInitializationError|Can't reach database/);
}
console.log('Historical replay guard checks passed: non-CI, production, unconfirmed, remote host, wrong database and wrong schema are denied before connection.');
