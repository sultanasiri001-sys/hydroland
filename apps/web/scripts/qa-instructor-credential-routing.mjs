import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { chromium, expect } from '@playwright/test';
import { marineReviewFixture, marineTestToken } from '../../api/scripts/marine-review-fixture.mjs';
import { openWorkspaceSwitcher } from '../e2e/portal-test-helpers.js';

const base='http://127.0.0.1:3101/api/v1';
const web='http://127.0.0.1:4173';
assert.equal(process.env.TRAINER_ACCEPTANCE_DB,'DISPOSABLE_RUNNER');
assert.equal(new URL(process.env.DATABASE_URL).hostname,'127.0.0.1');
const db=new PrismaClient();

const run=randomUUID().slice(0,8);


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
  page.on('dialog',async dialog=>{console.log(role+' UI dialog');await dialog.accept();});
  await page.goto(web,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandMarineDocuments));
  await page.evaluate(async()=>{window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load();});
  return page;
}

try {
  const trainer = await actor('INSTRUCTOR');
  const center = await actor('DIVE_CENTER');
  const admin = await actor('ADMIN');
  fixture = await marineReviewFixture(db,base,center.id,admin.id,{storage:true});
  await db.organizationMember.create({data:{organizationId:fixture.center.id,accountId:trainer.id,role:'INSTRUCTOR',status:'ACTIVE'}});
  await db.organizationMember.create({data:{organizationId:fixture.center.id,accountId:center.id,role:'OWNER',status:'ACTIVE'}});
  browser = await chromium.launch({headless:true});
  const page = await portal(trainer,'trainer');
  const certs = page.locator('.hl-certificates');
  await page.locator('#navigation [data-hl-action="certs"]').click();
  await certs.locator('.hl-member-actions button').first().click();
  const editor = page.locator('#hl-credential-editor');
  const title = 'QA instructor qualification ' + run;
  await editor.locator('[name="issuer"]').fill('SYNTHETIC QA');
  await editor.locator('[name="title"]').fill(title);
  const expiry = editor.locator('[name="expiresAt"]');
  if (await expiry.count()) await expiry.fill('2031-11-21');
  await editor.locator('button[type="submit"]').click();
  const card = certs.locator('article').filter({hasText:title}).first();
  await expect(card).toBeVisible();
  const file = testPdf('TRAINER-QUALIFICATION-'+run);
  const uploaded = page.waitForResponse(r=>r.request().method()==='POST' && /\/credentials\/[^/]+\/documents$/.test(new URL(r.url()).pathname));
  await card.locator('input[data-credential-upload]').setInputFiles(file);
  const upload = await uploaded;
  assert.ok(upload.ok(),'The real upload must succeed');
  const doc = await upload.json();
  await expect(card).toContainText(file.name);
  console.log('TRAINER: attached a synthetic PDF from the signed-in instructor account.');
  const submission = page.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname.endsWith('/submit'));
  await card.locator('[data-credential-submit]').click();
  const sent = await submission;
  assert.ok(sent.ok(),'Submission must succeed');
  const result = await sent.json();
  assert.ok(result.id);
  console.log('TRAINER: submitted own certificate. Recorded state: '+result.status);
  const centerPage = await portal(center,'center');
  await openWorkspaceSwitcher(centerPage);
  await centerPage.locator('#role-dialog [data-role="center"]').click();
  const dash = centerPage.locator('.hl-role-dashboard[data-role="center"]');
  await expect(dash).toBeVisible();
  console.log('CENTER: signed in to the center that has the active instructor membership.');
  const adminPage = await portal(admin,'platform');
  await openWorkspaceSwitcher(adminPage);
  await adminPage.locator('#role-dialog [data-role="admin"]').click();
  const queueResponse = adminPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/credentials/admin/pending'));
  await adminPage.locator('.hl-role-dashboard [data-action-label="الاعتمادات"]').click();
  const queue = await queueResponse;
  assert.ok(queue.ok());
  const rows = await queue.json();
  const pending = rows.find(row=>row.id===result.id && row.documents.some(d=>d.id===doc.id));
  if (pending) {
    const reviewCard = adminPage.locator('[data-credential-review="'+result.id+'"]');
    await expect(reviewCard).toContainText(title);
    console.log('ROUTING RESULT: the platform review queue already displays the instructor submission and the same attachment before the center has issued any decision. No final approval was performed.');
  } else {
    console.log('ROUTING RESULT: the platform queue did not receive this certificate prior to center approval. Center receipt and return need their own verification.');
  }
  assert.ok(!pending,'Center-first acceptance not met: this trainer certificate already appears in platform review.');
} finally {
  await browser?.close();
  if (fixture) await db.organizationMember.deleteMany({where:{organizationId:fixture.center.id}});
  await fixture?.close();
  await db.$disconnect();
}
