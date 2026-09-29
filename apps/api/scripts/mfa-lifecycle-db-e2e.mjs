import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

assert(['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL||'postgresql://missing').hostname),'MFA E2E requires a local test database');
Object.assign(process.env,{JWT_SECRET:'mfa-lifecycle-e2e-key-only-at-least-32-characters',MFA_ENCRYPTION_KEY:'mfa-lifecycle-e2e-encryption-key-only-at-least-32'});
const require=createRequire(import.meta.url);
const {DatabaseService}=require('../dist/database/database.service.js');
const {MfaService}=require('../dist/auth/mfa.service.js');
const {AuthService}=require('../dist/auth/auth.service.js');
const {decodeBase32}=require('../dist/auth/totp.js');
const {recoveryHash}=require('../dist/auth/mfa-crypto.js');
const db=new DatabaseService(),mfa=new MfaService(db),auth=new AuthService(db,mfa,{});
const accountIds=[],personIds=[];
const password='Mfa-Fixture-Only-2026!';
const totp=secret=>{const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',decodeBase32(secret)).update(counter).digest(),offset=digest[digest.length-1]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')};
const setting=accountId=>db.operationalSetting.findUniqueOrThrow({where:{key:`auth.mfa.account.${accountId}`}});
const unauthorized=error=>error.getStatus?.()===401;
const settledSuccesses=results=>results.filter(result=>result.status==='fulfilled');
const assertRejectedAuth=results=>{for(const result of results.filter(result=>result.status==='rejected'))assert(unauthorized(result.reason))};
const fixture=async()=>{
  const person=await db.person.create({data:{firstName:'MFA',lastName:'Local fixture'}});personIds.push(person.id);
  const account=await db.account.create({data:{personId:person.id,email:`mfa-${randomUUID()}@example.invalid`,passwordHash:auth.hash(password),status:'ACTIVE',emailVerifiedAt:new Date()}});accountIds.push(account.id);
  const session=await db.session.create({data:{accountId:account.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+600_000)}});
  return{account,session};
};
// Inject a database failure inside the actual PostgreSQL transaction, not a mock commit.
const failSessionWrite=method=>({serializable:work=>db.serializable(tx=>work(new Proxy(tx,{
  get(target,key){
    if(key!=='session')return Reflect.get(target,key);
    return new Proxy(target.session,{get(delegate,name){return name===method?async()=>{throw new Error('Injected session write failure')}:Reflect.get(delegate,name)}});
  }
})))});

try{
  const {account,session}=await fixture(),id=account.id;
  const other=await db.session.create({data:{accountId:id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+600_000)}});
  const setups=await Promise.all([mfa.beginSetup(id),mfa.beginSetup(id),mfa.beginSetup(id)]);
  assert.equal(new Set(setups.map(value=>value.secret)).size,1,'Concurrent/reopened setup keeps the same unexpired key');
  const pending=await setting(id);
  assert.notEqual(pending.value.encryptedSecret,setups[0].secret,'TOTP key remains encrypted in storage');
  const failingMfa=new MfaService(failSessionWrite('updateMany'));
  await assert.rejects(()=>failingMfa.confirmSetup(id,totp(setups[0].secret),session.id),/Injected session write failure/);
  assert.deepEqual(await setting(id),pending,'Failed revocation rolls back MFA enablement and recovery-code generation');
  assert.equal((await db.session.findUniqueOrThrow({where:{id:other.id}})).revokedAt,null);

  const confirmations=await Promise.allSettled([mfa.confirmSetup(id,totp(setups[0].secret),session.id),mfa.confirmSetup(id,totp(setups[0].secret),session.id)]);
  assert.equal(settledSuccesses(confirmations).length,1,'Only one setup confirmation may succeed');assertRejectedAuth(confirmations);
  const codes=settledSuccesses(confirmations)[0].value.recoveryCodes;
  assert.equal(codes.length,10);assert.equal(new Set(codes).size,10);
  assert.equal((await db.session.findUniqueOrThrow({where:{id:session.id}})).revokedAt,null,'Current session stays available');
  assert((await db.session.findUniqueOrThrow({where:{id:other.id}})).revokedAt,'Other sessions are revoked atomically');
  const enabled=await setting(id);
  assert.deepEqual(enabled.value.recoveryCodeHashes,codes.map(recoveryHash),'Only recovery hashes are stored');
  await assert.rejects(()=>mfa.beginSetup(id),error=>error.getStatus?.()===409&&error.getResponse().code==='MFA_ALREADY_ENABLED');
  assert.deepEqual(await setting(id),enabled,'Starting setup cannot overwrite enabled MFA');
  const primary=await auth.login({email:account.email,password});
  assert.equal(primary.mfaRequired,true);assert.equal(primary.accessToken,undefined,'Primary login remains gated by MFA');
  await assert.rejects(()=>auth.verifyMfaChallenge(primary.challengeToken,'INVALID-CODE'),unauthorized);
  assert.deepEqual(await setting(id),enabled,'Invalid codes leave credentials untouched');

  const challenges=await Promise.all(Array.from({length:4},()=>mfa.beginChallenge(id)));
  const sameCode=await Promise.allSettled(challenges.map(challenge=>auth.verifyMfaChallenge(challenge.challengeToken,codes[0])));
  assert.equal(settledSuccesses(sameCode).length,1,'A recovery code succeeds only once across concurrent challenges');assertRejectedAuth(sameCode);
  assert.equal((await mfa.status(id)).recoveryCodesRemaining,9);
  const tokens=settledSuccesses(sameCode)[0].value;
  assert.equal((await auth.authenticateAccessToken(tokens.accessToken)).accountId,id,'Successful MFA creates a usable session');
  const retryChallenge=await mfa.beginChallenge(id);
  await assert.rejects(()=>auth.verifyMfaChallenge(retryChallenge.challengeToken,codes[0]),unauthorized);

  const distinct=await Promise.all([mfa.beginChallenge(id),mfa.beginChallenge(id)]);
  await Promise.all(distinct.map((challenge,index)=>auth.verifyMfaChallenge(challenge.challengeToken,codes[index+1])));
  const afterDistinct=await setting(id);
  assert.equal(afterDistinct.value.recoveryCodeHashes.length,7,'Concurrent distinct codes do not restore one another');
  for(const code of codes.slice(0,3))assert(!afterDistinct.value.recoveryCodeHashes.includes(recoveryHash(code)));

  const shared=await mfa.beginChallenge(id);
  const sameChallenge=await Promise.allSettled([3,4].map(index=>auth.verifyMfaChallenge(shared.challengeToken,codes[index])));
  assert.equal(settledSuccesses(sameChallenge).length,1);assertRejectedAuth(sameChallenge);
  const afterShared=await setting(id);
  assert.equal(afterShared.value.recoveryCodeHashes.length,6,'Losing a challenge race must not burn a second recovery code');
  const unused=codes.find(code=>afterShared.value.recoveryCodeHashes.includes(recoveryHash(code)));
  const failureChallenge=await mfa.beginChallenge(id);
  const failingAuth=new AuthService(failSessionWrite('create'),mfa,{});
  await assert.rejects(()=>failingAuth.verifyMfaChallenge(failureChallenge.challengeToken,unused),/Injected session write failure/);
  assert.deepEqual(await setting(id),afterShared,'Session issuance failure must roll back recovery consumption');
  await auth.verifyMfaChallenge(failureChallenge.challengeToken,unused);
  await assert.rejects(()=>auth.verifyMfaChallenge(failureChallenge.challengeToken,unused),unauthorized);

  const beforeDisable=await setting(id),remaining=codes.find(code=>beforeDisable.value.recoveryCodeHashes.includes(recoveryHash(code)));
  await assert.rejects(()=>mfa.disable(id,'INVALID-CODE',session.id),unauthorized);
  await assert.rejects(()=>failingMfa.disable(id,remaining,session.id),/Injected session write failure/);
  assert.deepEqual(await setting(id),beforeDisable,'Failed session revocation cannot leave MFA disabled');
  await mfa.disable(id,remaining,session.id);
  assert.equal((await mfa.status(id)).enabled,false);
  assert.equal(await db.session.count({where:{accountId:id,id:{not:session.id},revokedAt:null}}),0);

  const {account:expired}=await fixture();
  const old=await mfa.beginSetup(expired.id),oldRow=await setting(expired.id);
  await db.operationalSetting.update({where:{key:oldRow.key},data:{value:{...oldRow.value,setupExpiresAt:new Date(Date.now()-1000).toISOString()}}});
  await assert.rejects(()=>mfa.confirmSetup(expired.id,totp(old.secret),session.id),unauthorized);
  assert.notEqual((await mfa.beginSetup(expired.id)).secret,old.secret,'Expired setup receives a fresh key');
  console.log('MFA lifecycle PostgreSQL E2E passed: enabled protection, reusable pending setup, atomic confirmation/revocation, one-time concurrent recovery, challenge races, usable sessions, rollback on issuance failure, disable authorization and expiry.');
}finally{
  await db.operationalSetting.deleteMany({where:{key:{in:accountIds.map(id=>`auth.mfa.account.${id}`)}}});
  await db.session.deleteMany({where:{accountId:{in:accountIds}}});
  await db.account.deleteMany({where:{id:{in:accountIds}}});
  await db.person.deleteMany({where:{id:{in:personIds}}});
  await db.$disconnect();
}
