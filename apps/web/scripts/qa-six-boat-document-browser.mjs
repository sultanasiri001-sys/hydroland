import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { chromium, expect } from '@playwright/test';
import { marineReviewFixture, marineTestToken } from '../../api/scripts/marine-review-fixture.mjs';
import { openWorkspaceSwitcher } from '../e2e/portal-test-helpers.js';

const base='http://127.0.0.1:3101/api/v1';
const web='http://127.0.0.1:4173';
assert.equal(process.env.BOAT_ACCEPTANCE_DB,'DISPOSABLE_RUNNER');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'127.0.0.1');
const db=new PrismaClient();
const types=['REGISTRATION','NAVIGATION_LICENSE','OPERATING_LICENSE','SAFETY_CERTIFICATE','PERIODIC_INSPECTION','COMMUNICATIONS_LICENSE'];
const run=randomUUID().slice(0,8);
const boatName='TEST BOAT '+run;
const files=new Map();
let browser;
let fixture;

function testPdf(label) {
  const stream='BT /F1 12 Tf 36 700 Td (SYNTHETIC TEST ONLY - '+label+') Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(const [i,object] of objects.entries()){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+object+'\nendobj\n';}
  const xref=pdf.length;
  pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return {name:label+'.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf,'ascii')};
}

async function actor(role){
  const person=await db.person.create({data:{firstName:role,lastName:'QA'}});
  const account=await db.account.create({data:{personId:person.id,email:role.toLowerCase()+'-'+run+'@example.invalid',passwordHash:'disabled',status:'ACTIVE',emailVerifiedAt:new Date()}});
  await db.roleAssignment.create({data:{accountId:account.id,role,status:'ACTIVE',activeAt:new Date()}});
  return {id:account.id,token:await marineTestToken(db,account.id,process.env.JWT_SECRET)};
}

async function portal(account,role){
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ar-SA',reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['127.0.0.1','localhost'].includes(url.hostname)||url.protocol==='data:')return route.continue();
    return route.abort();
  });
  await context.addInitScript(({base,token})=>{
    window.HYDROLAND_API_BASE=base;
    sessionStorage.setItem('hl-access-token',token);
    sessionStorage.setItem('hl-refresh-token','isolated-test-session');
  },{base,token:account.token});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('dialog',async dialog=>{console.log(role+' UI feedback: '+dialog.message().slice(0,160));await dialog.dismiss();});
  await page.goto(web,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineDocuments));
  await page.evaluate(async()=>{window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load();});
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="'+role+'"]').click();
  const dash=page.locator('.hl-role-dashboard[data-role="'+role+'"]');
  if(role==='boat')await dash.locator('[data-action-label="المستندات والتراخيص"]').click();
  else if(role==='center')await dash.getByRole('button',{name:'وثائق الأصول البحرية'}).click();
  else await page.locator('.hl-role-dashboard .hl-portal-nav-item[data-portal-label="الوساطة البحرية"]').click();
  const panel=page.locator('#hl-marine-documents');await expect(panel).toBeVisible();return {page,panel,context};
}

async function readBytes(view,card,expected){
  const reply=view.page.waitForResponse(r=>r.url().endsWith('/access')&&r.request().method()==='GET');
  await card.getByRole('button',{name:'عرض الملف'}).click();
  const received=await reply;assert.equal(received.status(),200);
  const {url}=await received.json();assert.equal(new URL(url).hostname,'127.0.0.1');
  const downloaded=await view.context.request.get(url);assert.equal(downloaded.status(),200);assert.deepEqual(await downloaded.body(),expected.buffer);
}

try{
  const owner=await actor('BOAT_OWNER'),center=await actor('DIVE_CENTER'),admin=await actor('ADMIN');
  const org=await db.organization.create({data:{displayName:boatName+' operator',kind:'MARINE_OPERATOR',status:'ACTIVE',ownerId:owner.id}});
  await db.organizationMember.create({data:{organizationId:org.id,accountId:owner.id,status:'ACTIVE',role:'OWNER'}});
  fixture=await marineReviewFixture(db,base,center.id,admin.id,{storage:true});
  await db.organizationMember.create({data:{organizationId:fixture.center.id,accountId:center.id,status:'ACTIVE',role:'OWNER'}});
  const asset=await fixture.ok(owner.token,'assets','POST',{organizationId:org.id,name:boatName,assetType:'DIVE_BOAT',registrationNumber:'QA-'+run});
  await fixture.bind(owner.token,asset.id);
  browser=await chromium.launch({headless:true});
  const boat=await portal(owner,'boat');
  const assetCard=boat.panel.locator('[data-marine-asset="'+asset.id+'"]');
  const slot=type=>assetCard.locator('[data-document-slot="'+type+'"]');
  await expect(assetCard.locator('[data-document-slot]')).toHaveCount(6);
  for(const type of types){
    const file=testPdf(type+'-'+run);files.set(type,file);
    await slot(type).getByText('رفع الوثيقة',{exact:true}).click();
    const form=slot(type).locator('[data-marine-doc-form]');
    await form.locator('[name="referenceNumber"]').fill(type+'-'+run);
    await form.locator('[name="expiresAt"]').fill('2031-11-21');
    await form.locator('input[type="file"]').setInputFiles(file);
    await form.getByRole('button',{name:'رفع وإرسال للمراجعة'}).click();
    await expect(slot(type).locator('[data-document-state="pending"]')).toBeVisible();
    console.log('OWNER uploaded '+type);
  }
  const review=await portal(center,'center');
  const docs=(await fixture.ok(center.token,'center/documents/pending')).filter(x=>x.marineAsset.id===asset.id);
  assert.equal(docs.length,6);
  assert.equal((await fixture.ok(admin.token,'admin/documents/pending')).filter(x=>x.marineAsset.id===asset.id).length,0);
  const centerCard=id=>review.panel.locator('[data-marine-doc="'+id+'"]');
  for(const doc of docs){await readBytes(review,centerCard(doc.id),files.get(doc.documentType));console.log('CENTER received and opened '+doc.documentType);}
  const sample=docs.find(x=>x.documentType==='NAVIGATION_LICENSE');
  await centerCard(sample.id).locator('[data-review-note]').fill('QA: replace test attachment');
  await centerCard(sample.id).locator('[data-marine-decision="RETURNED"]').click();
  await expect(centerCard(sample.id)).toHaveCount(0);
  await boat.panel.locator('[data-marine-refresh]').click();
  await expect(slot(sample.documentType)).toContainText('QA: replace test attachment');
  const correction=slot(sample.documentType).locator('[data-correct-doc]');
  await slot(sample.documentType).getByText('تعديل المستند وإعادة إرساله للمركز',{exact:true}).click();
  const replacement=testPdf('REVISED-'+sample.documentType+'-'+run);files.set(sample.documentType,replacement);
  await correction.locator('input[type="file"]').setInputFiles(replacement);
  await correction.getByRole('button',{name:'رفع وإرسال للمراجعة'}).click();
  await expect(slot(sample.documentType).locator('[data-document-state="pending"]')).toBeVisible();
  await review.panel.locator('[data-marine-refresh]').click();
  await readBytes(review,centerCard(sample.id),replacement);
  console.log('CENTER returned NAVIGATION_LICENSE; OWNER corrected it; CENTER opened the revised bytes');
  for(const doc of docs){await centerCard(doc.id).locator('[data-marine-decision="FORWARD"]').click();await expect(centerCard(doc.id)).toHaveCount(0);console.log('CENTER forwarded '+doc.documentType);}
  await boat.panel.locator('[data-marine-refresh]').click();
  for(const type of types){await expect(slot(type)).toContainText('بانتظار الإدارة العليا');await expect(slot(type).locator('[data-document-state="pending"]')).toBeVisible();}
  const final=await portal(admin,'admin');
  for(const doc of docs){
    const card=final.panel.locator('[data-marine-doc="'+doc.id+'"]');
    await readBytes(final,card,files.get(doc.documentType));
    await card.locator('[data-marine-decision="VERIFIED"]').click();await expect(card).toHaveCount(0);console.log('PLATFORM opened and approved '+doc.documentType);
  }
  await boat.panel.locator('[data-marine-refresh]').click();
  for(const type of types)await expect(slot(type).locator('[data-document-state="complete"]')).toHaveText('مكتمل');
  console.log('PASS: 6/6 uploaded by owner in browser, opened by center, forwarded, opened by platform, approved, and displayed as complete to owner; corrected attachment round-trip verified.');
}finally{
  await browser?.close();
  if(fixture) await db.organizationMember.deleteMany({where:{organizationId:fixture.center.id}});
  await fixture?.close();
  await db.$disconnect();
}
