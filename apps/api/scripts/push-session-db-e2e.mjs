import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const url = new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname === '/commerce_notice_test');
const require = createRequire(import.meta.url);
const {DatabaseService} = require('../dist/database/database.service.js');
const {AuthService} = require('../dist/auth/auth.service.js');
const {NotificationsService} = require('../dist/notifications/notifications.service.js');
const {revealSecret} = require('../dist/auth/mfa-crypto.js');
process.env.MFA_ENCRYPTION_KEY = 'local-only-push-registration-test-key-32';
const db = new DatabaseService(), notices = new NotificationsService(db);
const token = 'ExpoPushToken[fixture-device]', rotated = 'ExpoPushToken[fixture-rotated]';
async function fixture(refreshToken = randomUUID()) {
  const account = await db.account.create({data:{email:randomUUID()+'@example.invalid',passwordHash:'fixture',status:'ACTIVE',emailVerifiedAt:new Date(),
    person:{create:{firstName:'Test',lastName:'Push'}}}});
  return db.session.create({data:{accountId:account.id,tokenHash:createHash('sha256').update(refreshToken).digest('hex'),expiresAt:new Date(Date.now()+60000)}});
}
const read = async s => (await db.$queryRaw`SELECT "pushTokenCiphertext" AS cipher,"pushTokenHash" AS hash FROM "Session" WHERE id::text=${s.id}`)[0];
const bind = (s,value) => notices.registerDevice(s.accountId,s.id,value);
try {
  const first = await fixture(), second = await fixture();
  await Promise.all([bind(first,token),bind(first,token)]);
  const stored = await read(first);
  assert.notEqual(stored.cipher,token);
  assert.equal(revealSecret(stored.cipher,'push-device:'+first.id),token);
  await assert.rejects(()=>bind(second,token),e=>e.getStatus()===409);
  await db.session.update({where:{id:first.id},data:{revokedAt:new Date()}});
  assert.deepEqual(await read(first),{cipher:null,hash:null});
  await assert.rejects(()=>bind(first,token),e=>e.getStatus()===401);
  await bind(second,token); await bind(second,rotated);
  await notices.unregisterDevice(second.accountId,second.id,token);
  await notices.unregisterDevice(first.accountId,first.id,rotated);
  assert.equal(revealSecret((await read(second)).cipher,'push-device:'+second.id),rotated);
  await notices.unregisterDevice(second.accountId,second.id,rotated);
  assert.deepEqual(await read(second),{cipher:null,hash:null});
  process.env.JWT_SECRET = 'local-only-token-refresh-test-key-32';
  const auth = new AuthService(db, {}, {});
  const refreshToken = randomUUID() + randomUUID();
  const oldSession = await fixture(refreshToken);
  await bind(oldSession,token);
  const oldBinding = await read(oldSession);
  const fresh = await auth.refresh(refreshToken);
  const claims = await auth.authenticateAccessToken(fresh.accessToken);
  assert.equal(claims.accountId, oldSession.accountId);
  assert.deepEqual(await read(oldSession), {cipher:null,hash:null});
  const nextSession = {id:claims.sessionId,accountId:claims.accountId};
  const nextBinding = await read(nextSession);
  assert.equal(nextBinding.hash,oldBinding.hash);
  assert.notEqual(nextBinding.cipher,oldBinding.cipher);
  assert.equal(revealSecret(nextBinding.cipher,'push-device:'+nextSession.id),token);
  await notices.unregisterDevice(oldSession.accountId,oldSession.id,token);
  assert.deepEqual(await read(nextSession), nextBinding);
  await auth.logout(fresh.refreshToken);
  assert.deepEqual(await read(nextSession), {cipher:null,hash:null});
  console.log('PASS: refresh retained one device on the same account; logout erased its new binding.');
  console.log('PASS: session-bound device token registration, revocation, switch, rotation and late unregister.');
} finally { await db.$disconnect(); }
