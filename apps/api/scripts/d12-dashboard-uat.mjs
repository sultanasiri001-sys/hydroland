import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const dbUrl = new URL(process.env.DATABASE_URL);
const base = new URL(process.env.D12_UAT_API);
if (process.env.NODE_ENV !== 'test' || base.hostname !== '127.0.0.1' || dbUrl.hostname !== '127.0.0.1'
    || dbUrl.pathname !== '/hydroland_d12_uat' || process.env.D12_OWNER_EMAIL !== 'owner-d12@example.invalid') {
  throw new Error('D12 fixtures require the dedicated loopback acceptance database and synthetic mailbox.');
}
const db = new PrismaClient(), key = 'PLATFORM_STAFFING_ORGANIZATION:v1';
const suffix = randomUUID();
const password = randomBytes(28).toString('hex'), salt = randomBytes(16).toString('hex');
const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
async function createAccount(email, role) {
  const account = await db.account.create({ data: {
    email, status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash,
    person: { create: { firstName: 'D12', lastName: 'Fixture' } },
    roleAssignments: { create: { role, status: 'ACTIVE' } },
  } });
  const res = await fetch(new URL('auth/login', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({email,password}) });
  assert.equal(res.status, 200);
  const {accessToken} = await res.json();
  assert.ok(accessToken);
  return { id: account.id, accessToken };
}
const get = (path, account) => fetch(new URL('admin/d12/organizations' + path, base), {
  headers: account ? {authorization:'Bearer ' + account.accessToken} : {},
});
const org = (ownerId, displayName, kind) => db.organization.create({ data: {displayName, ownerId, kind, status:'ACTIVE'} });
const day = new Date('2026-10-02T12:00:00Z');
try {
  assert.equal(await db.account.count(), 0, 'Use a fresh disposable database');
  const owner = await createAccount(process.env.D12_OWNER_EMAIL, 'ADMIN');
  const centerManager = await createAccount('center@example.invalid','CENTER_MANAGER');
  const otherAdmin = await createAccount('other-admin@example.invalid','ADMIN');
  const platform = await org(owner.id, 'Platform', 'HYDROLAND_INTERNAL_PLATFORM');
  const center = await org(centerManager.id, 'Dive Center UAT', 'DIVE_CENTER');
  await db.operationalSetting.create({data:{key,value:{organizationId:platform.id}}});
  const url = '/' + center.id + '/summary?from=2026-10-02&to=2026-10-02';
  for (const path of ['', url]) {
    for (const [who, expected] of [[undefined,401],[centerManager,403],[otherAdmin,403]]) {
      const res = await get(path,who);
      assert.equal(res.status,expected);
      assert(!JSON.stringify(await res.json()).includes(center.displayName));
    }
  }
  assert.equal((await get('?q=Dive',owner)).status,200);
  console.log('PASS list and summary: anonymous 401, center manager and other active admin 403, owner accepted');

  const trip = await db.trip.create({data:{organizationId:center.id,title:'Test',type:'DIVE',capacity:2,startsAt:day,endsAt:day}});
  const booking = await db.booking.create({data:{tripId:trip.id,accountId:centerManager.id,organizationId:platform.id}});
  const payment = await db.payment.create({data:{bookingId:booking.id,accountId:centerManager.id,amountMinor:3800,idempotencyKey:suffix,createdAt:day}});
  const invoice = await db.invoice.create({data:{paymentId:payment.id,number:suffix}});
  const unit = await db.orgUnit.create({data:{organizationId:center.id,type:'CENTER',code:'D12',nameAr:'فرع الاختبار'}});
  await db.receivable.create({data:{invoiceId:invoice.id,customerAccountId:centerManager.id,centerOrgUnitId:unit.id,totalMinor:3800,paidMinor:350,outstandingMinor:3450,dueAt:day,status:'PARTIALLY_PAID'}});
  for (const [organizationId, amount, status, currency] of [[center.id,12501,'POSTED','SAR'],[center.id,310,'POSTED','USD'],[center.id,5600,'DRAFT','SAR'],[platform.id,9999,'POSTED','SAR']]) {
    const account = await db.financeAccount.create({data:{organizationId,name:'ledger',currency}});
    await db.financeEntry.create({data:{organizationId,financeAccountId:account.id,type:'REVENUE',status,currency,amountMinor:amount,referenceType:'TEST',referenceId:randomUUID(),requestedByAccountId:owner.id,postedAt:day}});
  }
  await db.storeCourseOffer.create({data:{organizationId:center.id,courseCode:suffix,title:'Test',description:'Test',locationName:'Test',startsAt:day,endsAt:day,capacity:2,priceMinor:100,createdAt:day}});
  for (const [scope, at] of [[center.id,day],[center.id,day],[platform.id,day],[center.id,new Date('2026-10-02T21:00:00Z')]]) {
    await db.auditEvent.create({data:{action:'organization.customer_case.replied',resource:'CustomerCase',resourceId:suffix,occurredAt:at,metadata:{organizationId:scope,details:'private fixture'}}});
  }
  const res = await get(url, owner);
  assert.equal(res.status,200);
  assert.match(res.headers.get('cache-control'), /no-store/);
  const report = await res.json();
  const cases = report.audit.find(row => row.category==='case');
  assert.equal(cases.events,2);
  assert.equal(cases.subjects,1);
  assert(cases.sources.includes('CustomerCase / organization.customer_case.replied'));
  assert.equal(report.payments,1); assert.equal(report.offers,1);
  assert.deepEqual(report.revenue,[{currency:'SAR',minor:'12501'},{currency:'USD',minor:'310'}]);
  assert.deepEqual(report.receivables,[{currency:'SAR',minor:'3450'}]);
  assert(!JSON.stringify(report).includes('private fixture'));
  assert.deepEqual((await (await get(url,owner)).json()).audit, report.audit);
  assert.equal((await get('/'+center.id+'/summary?from=2026-02-30',owner)).status,400);
  console.log('PASS organization, Riyadh date boundary, deduplication, separate currencies, posted ledger and current receivables');
  if (process.env.D12_UAT_BROWSER === '1') {
    const { verifyDashboard } = await import('../../../apps/web/scripts/d12-dashboard-browser.mjs');
    await verifyDashboard({ base:base.href, email:process.env.D12_OWNER_EMAIL, password, centerName:center.displayName });
  }
  await db.organization.update({where:{id:platform.id},data:{ownerId:otherAdmin.id}});
  assert.equal((await get(url,owner)).status,403);
  assert.equal((await get(url,otherAdmin)).status,403);
  await db.organization.update({where:{id:platform.id},data:{ownerId:owner.id}});
  await db.roleAssignment.update({where:{accountId_role:{accountId:owner.id,role:'ADMIN'}},data:{status:'SUSPENDED'}});
  assert.equal((await get(url,owner)).status,403);
  console.log('PASS owner transfer and role suspension both revoke access');
} finally { await db.$disconnect(); }
