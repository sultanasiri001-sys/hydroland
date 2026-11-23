import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { sendTrial, checkTrialReceipt } from './trial-push.mjs';

const url = new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname === '/commerce_notice_test');
const require = createRequire(import.meta.url);
const { DatabaseService } = require('../dist/database/database.service.js');
const { NotificationsService } = require('../dist/notifications/notifications.service.js');
process.env.MFA_ENCRYPTION_KEY = 'local-only-push-dispatch-test-key-32';
const db = new DatabaseService();
const notices = new NotificationsService(db);
const never = async () => { throw new Error('unexpected provider call'); };
const makeSession = async () => {
  const account = await db.account.create({data:{email:randomUUID()+'@example.invalid',passwordHash:'fixture',status:'ACTIVE',
    emailVerifiedAt:new Date(),person:{create:{firstName:'Trial',lastName:'Push'}}}});
  return db.session.create({data:{accountId:account.id,tokenHash:randomUUID(),expiresAt:new Date(Date.now()+600000)}});
};
const notice = (s,type='INVOICE_ISSUED') => notices.notify(s.accountId,type,{title:'sensitive fixture',customerName:'do not transmit'});
const submit = (s,n,post) => sendTrial(db,s.accountId,n.id,s.id,post);
const check = (s,n,post) => checkTrialReceipt(db,s.accountId,n.id,post);
const registered = async s => Boolean((await db.session.findUniqueOrThrow({where:{id:s.id}})).pushTokenCiphertext);
try {
  const first = await makeSession(), second = await makeSession();
  const token = 'ExpoPushToken['+randomUUID()+']';
  await notices.registerDevice(first.accountId,first.id,token);
  const invoice = await notice(first);
  assert.equal(await submit(second,invoice,never),'INELIGIBLE');
  assert.equal(await sendTrial(db,second.accountId,invoice.id,first.id,never),'INELIGIBLE');
  assert.equal(await submit(first,await notice(first,'AUTH_TEST'),never),'INELIGIBLE');
  let calls = 0;
  const ticket = randomUUID();
  const submitOk = async (endpoint,msgs) => {
    assert.equal(endpoint,'send'); calls++;
    assert.deepEqual(msgs,[{to:token,title:'هيدرولاند',body:'لديك إشعار جديد داخل المنصة.',ttl:0}]);
    return {data:[{status:'ok',id:ticket}]};
  };
  const results = await Promise.all(Array.from({length:4},()=>submit(first,invoice,submitOk)));
  assert.equal(calls,1);
  assert.equal(results.filter(x=>x==='AWAITING_RECEIPT').length,1);
  assert.equal(results.filter(x=>x==='ALREADY_CLAIMED').length,3);
  assert.equal(await check(second,invoice,never),'INELIGIBLE');
  assert.equal(await check(first,invoice,async()=>({data:{[randomUUID()]:{status:'ok'}}})),'AWAITING_RECEIPT');
  assert.equal(await check(first,invoice,async()=>({data:{}})),'AWAITING_RECEIPT');
  let lookups = 0;
  const settled = await Promise.all(Array.from({length:3},()=>check(first,invoice,async(endpoint,body)=>{
    assert.equal(endpoint,'getReceipts'); assert.deepEqual(body,{ids:[ticket]}); lookups++;
    return {data:{[ticket]:{status:'ok'}}};
  })));
  assert.deepEqual(settled,Array(3).fill('PROVIDER_CONFIRMED')); assert.equal(lookups,1);

  const repeatedTicketNotice = await notice(first);
  assert.equal(await submit(first,repeatedTicketNotice,async()=>({data:[{status:'ok',id:ticket}]})),'REVIEW_REQUIRED');
  assert.equal(await check(first,invoice,never),'REVIEW_REQUIRED');

  const booking = await notice(first,'BOOKING_CONFIRMED');
  let attempts = 0;
  assert.equal(await submit(first,booking,async()=>{attempts++; throw Error('response lost');}),'REVIEW_REQUIRED');
  assert.equal(await submit(first,booking,never),'ALREADY_CLAIMED'); assert.equal(attempts,1);
  const renewed = await notice(first), oldTicket = randomUUID();
  assert.equal(await submit(first,renewed,async()=>({data:[{status:'ok',id:oldTicket}]})),'AWAITING_RECEIPT');
  await notices.registerDevice(first.accountId,first.id,token);
  const invalidDevice = {status:'error',details:{error:'DeviceNotRegistered'}};
  assert.equal(await check(first,renewed,async()=>({data:{[oldTicket]:invalidDevice}})),'DEVICE_UNREGISTERED');
  assert.equal(await registered(first),true);
  const stale = await notice(first), staleTicket = randomUUID();
  assert.equal(await submit(first,stale,async()=>({data:[{status:'ok',id:staleTicket}]})),'AWAITING_RECEIPT');
  await db.session.update({where:{id:first.id},data:{revokedAt:new Date()}});
  await notices.registerDevice(second.accountId,second.id,token);
  const rejected = {status:'error',details:{error:'DeviceNotRegistered'}};
  assert.equal(await check(first,stale,async()=>({data:{[staleTicket]:rejected}})),'DEVICE_UNREGISTERED');
  assert.equal(await registered(second),true);
  assert.equal(await submit(first,await notice(first),never),'INELIGIBLE');
  assert.equal(await submit(second,await notice(second),async()=>({data:[rejected]})),'DEVICE_UNREGISTERED');
  assert.equal(await registered(second),false);
  console.log('PASS trial push: isolated recipient, single submission, private payload, ambiguous retry suppression, ticket/receipt matching, account switch and scoped rejection.');
} finally { await db.$disconnect(); }
