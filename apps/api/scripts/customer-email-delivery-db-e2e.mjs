import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {reconcileCustomerEmail} from './reconcile-customer-email.mjs';

const url = new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname === '/commerce_notice_test');
const db = new PrismaClient();
try {
  const to = 'buyer@example.invalid', providerMessageId = randomUUID();
  const recipientHash = createHash('sha256').update(to).digest('hex');
  const data = {event:'BOOKING_CONFIRMED',sourceType:'BOOKING',accountId:randomUUID(),
    sourceId:randomUUID(),state:'PROVIDER_ACCEPTED',providerMessageId,recipientHash};
  const row = await db.customerNoticeEmail.create({data});
  const valid = {object:'email', id:providerMessageId, last_event:'delivered', to:[to], cc:[], bcc:[]};
  const run = overrides => reconcileCustomerEmail(db,row.id,'synthetic',async (target, options) => {
    assert.equal(options.method,'GET');
    assert.equal(target,'https://api.resend.com/emails/'+providerMessageId);
    return Response.json({...valid,...overrides});
  });
  for (const invalid of [{id:randomUUID()},{last_event:'sent'},{last_event:'bounced'},
    {to:['other@example.invalid']},{to:[to,to]},{bcc:[to]},{cc:null}]) {
    assert.equal(await run(invalid),'UNCONFIRMED');
  }
  const duplicate = await db.customerNoticeEmail.create({data:{...data,sourceId:randomUUID()}});
  assert.equal(await run({}),'UNCONFIRMED');
  await db.customerNoticeEmail.delete({where:{id:duplicate.id}});
  assert.equal((await db.customerNoticeEmail.findUnique({where:{id:row.id}})).state,'PROVIDER_ACCEPTED');
  const results = await Promise.all([run({}),run({}),run({})]);
  assert.equal(results.filter(value => value === 'RECORDED').length,1);
  assert.equal(results.filter(value => value === 'ALREADY_RECORDED').length,2);
  assert.equal(await db.auditEvent.count({where:{resourceId:row.id,action:'customer_email.provider_delivered'}}),1);
  assert.equal(await reconcileCustomerEmail(db,row.id,'',()=>assert.fail('no second lookup')), 'ALREADY_RECORDED');
  console.log('PASS: delivery receipt bound to one notice and recipient; concurrent repeats retained one audit event.');
} finally { await db.$disconnect(); }
