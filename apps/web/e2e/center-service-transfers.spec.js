import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
import fixturePdf from './fixtures/license-text-pdf.json';

const original=Buffer.from(fixturePdf.base64,'base64');
const receipt=readFileSync(resolve(process.cwd(),'e2e/fixtures/license-arabic-scan.pdf'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=(route,body,status=200)=>route.fulfill({status,json:body});
const transferPath='/api/v1/finance/centers/center-a/service-transfers';
const center={id:'center-a',name:'الفرع الرئيسي',nameAr:'الفرع الرئيسي',organizationName:'مركز الاختبار'};
const candidate={financeEntryId:'entry-a',bookingId:'booking-a',amountMinor:45500,currency:'SAR'};
const transfer=()=>({id:'transfer-a',...candidate,paymentId:'payment-a',invoiceFinalizationId:'invoice-final-a',
  bankName:'بنك الاختبار',bankReference:'BANK-REF-1',transferredAt:'2026-11-20T09:00:00.000Z',status:'PENDING',
  submittedBy:'owner-account',submittedAt:'2026-11-20T09:01:00.000Z',reviewedBy:null,reviewedAt:null,receivedAt:null,decisionNote:null,
  documentSha256:sha(original),receiptDocumentSha256:null,bankTransferExecuted:false,externalTransferConfirmed:false,providerVerified:false,canConfirm:true});

async function setup(page,role='center'){
  const state={role,ownerStatus:200,canSubmit:role==='admin',items:role==='center'?[transfer()]:[],candidates:role==='admin'?[candidate]:[],writes:[],reads:[],postStatus:200,pendingPost:null};
  const profile={id:role==='admin'?'owner-account':'center-accountant',email:'b12@example.invalid',status:'ACTIVE',person:{firstName:'مراجع',lastName:'الاختبار'},roleAssignments:[{role:role==='admin'?'ADMIN':'DIVE_CENTER',status:'ACTIVE'}]};
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
  await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
  await page.route('**/api/v1/admin/overview',route=>json(route,{pendingReviews:0,activeBookings:0,accounts:1,openTrips:0}));
  await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:center.organizationName},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
  await page.route('**/api/v1/finance/mine/centers',route=>json(route,role==='center'?[center]:[]));
  await page.route('**/api/v1/finance/centers/*/workspace',route=>json(route,{centerOrgUnitId:'center-a',shift:null,totals:null,entries:[],receivers:[],handovers:[],closeSubmission:null}));
  await page.route('**/api/v1/finance/owner/service-transfer-centers',route=>json(route,state.ownerStatus===200?{centers:[center]}:{message:'owner denied'},state.ownerStatus));
  await page.route('**'+transferPath,async route=>{
    state.reads.push(route.request().method());
    if(route.request().method()==='GET')return json(route,{items:state.items,canSubmit:state.canSubmit,candidates:state.candidates});
    const body=route.request().postDataJSON();state.writes.push(body);if(state.pendingPost)await state.pendingPost;
    if(state.postStatus!==200)return json(route,{message:'evidence changed'},state.postStatus);
    const row={...transfer(),id:body.requestId,bankName:body.bankName,bankReference:body.bankReference,transferredAt:body.transferredAt,canConfirm:false};
    state.items=[row];state.candidates=[];return json(route,row,201);
  });
  await page.route('**'+transferPath+'/*/review',async route=>{
    const body=route.request().postDataJSON();state.writes.push(body);if(state.pendingPost)await state.pendingPost;
    if(state.postStatus!==200)return json(route,{message:'evidence changed'},state.postStatus);
    const row=state.items[0];Object.assign(row,{status:body.decision,canConfirm:false,decisionNote:body.note,externalTransferConfirmed:body.decision==='CONFIRMED',receivedAt:body.receivedAt||null,receiptDocumentSha256:body.documentBase64?sha(Buffer.from(body.documentBase64,'base64')):null});
    return json(route,row,201);
  });
  await page.route('**'+transferPath+'/*/document?*',route=>route.fulfill({contentType:'application/pdf',body:new URL(route.request().url()).searchParams.get('kind')==='receipt'?receipt:original}));
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCenterFinance&&window.HydrolandAdminControl&&window.HydrolandProfile&&window.HydrolandAuth));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'b12-access',refreshToken:'b12-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="'+role+'"]').click();await expect(page.locator('.hl-role-dashboard[data-role="'+role+'"]')).toBeVisible();return state;
}

async function open(page,role='center'){
  if(role==='admin'){
    await page.locator('[data-portal-label="الموافقات والطلبات"]').click();
    await page.locator('[data-admin-service-transfers] > summary').click();
  }else{
    await page.locator('[data-portal-label="ورديات المحاسب"]').click();
    await page.locator('#hl-center-finance [data-service-transfers] > summary').click();
  }
  const panel=page.locator('[data-service-transfers]');await expect(panel).toBeVisible();
  await expect(panel.getByRole('button',{name:'تحديث سجل الحوالات'})).toBeEnabled();return panel;
}

async function fillSubmission(panel){
  const form=panel.locator('[data-service-transfer-submit]');await form.getByRole('combobox',{name:'المستحق المعتمد',exact:true}).selectOption('entry-a');
  await form.getByLabel('اسم البنك').fill('بنك الاختبار');await form.getByLabel('مرجع الحوالة البنكية').fill('BANK-REF-1');
  await form.getByLabel('تاريخ ووقت الحوالة (بتوقيت السعودية)').fill('2026-11-20T12:00');
  await form.getByLabel('أصل إثبات الحوالة PDF (حتى 5 ميغابايت)').setInputFiles({name:'transfer.pdf',mimeType:'application/pdf',buffer:original});return form;
}
async function fillReview(panel,decision='CONFIRMED',bytes=receipt){
  const row=panel.locator('[data-transfer-id=transfer-a]');await row.getByText('مراجعة وصول الحوالة',{exact:true}).click();
  const form=row.locator('[data-service-transfer-review]');await form.getByLabel('قرار المراجعة').selectOption(decision);
  await form.getByLabel('توضيح المراجعة').fill(decision==='CONFIRMED'?'تمت المطابقة مع كشف حساب المركز':'الإثبات غير مطابق لكشف حساب المركز');
  if(decision==='CONFIRMED'){
    await form.getByLabel('تاريخ ووقت الوصول (بتوقيت السعودية)').fill('2026-11-20T13:00');
    await form.getByLabel('إثبات وصول مستقل PDF (حتى 5 ميغابايت)').setInputFiles({name:'receipt.pdf',mimeType:'application/pdf',buffer:bytes});
  }return form;
}

test('platform owner records an external transfer with exact approved amount and original PDF only after server acceptance',async({page})=>{
  const state=await setup(page,'admin'),panel=await open(page,'admin');let finish;state.pendingPost=new Promise(resolve=>{finish=resolve;});
  const form=await fillSubmission(panel);await expect(form.getByLabel('مبلغ المستحق المعتمد')).toHaveValue('455.00 ر.س.');
  await form.getByRole('button',{name:'تسجيل حوالة منفذة خارج هيدرولاند'}).click();await expect.poll(()=>state.writes.length).toBe(1);
  await expect(form.getByRole('button',{name:'تسجيل حوالة منفذة خارج هيدرولاند'})).toBeDisabled();await expect(panel.getByRole('heading',{name:'بانتظار تأكيد الوصول'})).toHaveCount(0);
  expect(state.writes[0]).toEqual({requestId:expect.stringMatching(/^[0-9a-f-]{36}$/),financeEntryId:'entry-a',amountMinor:45500,currency:'SAR',bankName:'بنك الاختبار',bankReference:'BANK-REF-1',transferredAt:'2026-11-20T09:00:00.000Z',documentBase64:fixturePdf.base64});
  finish();await expect(panel.getByRole('heading',{name:'بانتظار تأكيد الوصول'})).toBeVisible();await expect(panel.locator('[data-service-transfer-review]')).toHaveCount(0);
  const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:'تحميل إثبات الحوالة'}).click();const download=await downloadPromise,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(Buffer.concat(chunks)).toEqual(original);
  await page.setViewportSize({width:390,height:844});expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await panel.screenshot({animations:'disabled',path:test.info().outputPath('b12-owner-transfer-mobile.png')});
});

test('ordinary admin without verified owner authority cannot discover transfer centers or submit',async({page})=>{
  const state=await setup(page,'admin');state.ownerStatus=403;await page.locator('[data-portal-label="الموافقات والطلبات"]').click();await page.locator('[data-admin-service-transfers] > summary').click();
  await expect(page.locator('[data-owner-transfer-status]')).toContainText('تحقق من صلاحية مالك المنصة');await expect(page.locator('[data-service-transfer-submit]')).toHaveCount(0);expect(state.reads).toHaveLength(0);expect(state.writes).toHaveLength(0);
});

test('independent center accountant confirms receipt using a separate original PDF and server-confirmed status',async({page})=>{
  const state=await setup(page),panel=await open(page);let finish;state.pendingPost=new Promise(resolve=>{finish=resolve;});
  await expect(panel.locator('[data-service-transfer-submit]')).toHaveCount(0);const form=await fillReview(panel);
  await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();await expect.poll(()=>state.writes.length).toBe(1);
  await expect(panel.getByRole('heading',{name:'تم تأكيد الوصول'})).toHaveCount(0);
  expect(state.writes[0]).toEqual({decision:'CONFIRMED',note:'تمت المطابقة مع كشف حساب المركز',receivedAt:'2026-11-20T10:00:00.000Z',documentBase64:receipt.toString('base64')});
  finish();await expect(panel.getByRole('heading',{name:'تم تأكيد الوصول'})).toBeVisible();await expect(panel.locator('[data-transfer-status]')).toContainText('ترحيل المستحق');await panel.screenshot({animations:'disabled',path:test.info().outputPath('b12-center-receipt-confirmed.png')});
  const downloadPromise=page.waitForEvent('download');await panel.getByRole('button',{name:'تحميل إثبات الوصول'}).click();const download=await downloadPromise,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(Buffer.concat(chunks)).toEqual(receipt);
});

test('receipt reviewer can reject with a reason without uploading confirmation evidence',async({page})=>{
  const state=await setup(page),panel=await open(page),form=await fillReview(panel,'REJECTED');await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();
  await expect(panel.getByRole('heading',{name:'إثبات مرفوض'})).toBeVisible();expect(state.writes).toEqual([{decision:'REJECTED',note:'الإثبات غير مطابق لكشف حساب المركز'}]);
});

test('the submitter or another non-independent center accountant is not offered receipt approval',async({page})=>{
  const state=await setup(page);state.items[0].canConfirm=false;const panel=await open(page);await expect(panel.locator('[data-service-transfer-review]')).toHaveCount(0);expect(state.writes).toHaveLength(0);
});

test('receipt confirmation rejects reusing the transfer PDF before sending any mutation',async({page})=>{
  const state=await setup(page),panel=await open(page),form=await fillReview(panel,'CONFIRMED',original);await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();
  await expect(panel.locator('[data-transfer-status]')).toHaveText('أرفق إثبات وصول مستقلًا عن مستند الحوالة.');expect(state.writes).toHaveLength(0);await expect(panel.locator('[data-service-transfer-review]')).toHaveCount(0);
});

test('conflicting receipt evidence clears stale approval actions and requires a fresh server read',async({page})=>{
  const state=await setup(page),panel=await open(page),form=await fillReview(panel);state.postStatus=409;await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();
  await expect(panel.locator('[data-transfer-status]')).toContainText('حدّث البيانات');await expect(panel.locator('[data-service-transfer-review]')).toHaveCount(0);
  state.items[0].canConfirm=false;await panel.getByRole('button',{name:'تحديث سجل الحوالات'}).click();await expect(panel.getByRole('heading',{name:'بانتظار تأكيد الوصول'})).toBeVisible();await expect(panel.locator('[data-service-transfer-review]')).toHaveCount(0);expect(state.writes).toHaveLength(1);
});

for(const stage of ['load','mutation'])test('closing the owner transfer panel ignores late '+stage+' data',async({page})=>{
  const state=await setup(page,'admin');let pending;
  if(stage==='load')await page.route('**'+transferPath,route=>{pending=route;});
  await page.locator('[data-portal-label="الموافقات والطلبات"]').click();await page.locator('[data-admin-service-transfers] > summary').click();
  if(stage==='mutation'){
    const panel=page.locator('[data-service-transfers]');const form=await fillSubmission(panel);await page.route('**'+transferPath,route=>{pending=route;});await form.getByRole('button',{name:'تسجيل حوالة منفذة خارج هيدرولاند'}).click();
  }
  await expect.poll(()=>Boolean(pending)).toBe(true);await page.locator('[data-admin-service-transfers] > summary').click();
  await json(pending,stage==='load'?{items:[],canSubmit:true,candidates:state.candidates}:{...transfer(),id:'late-transfer'});
  await expect(page.locator('[data-owner-transfer-workspace]')).toBeEmpty();await expect(page.locator('[data-owner-transfer-centers]')).toBeEmpty();
});

test('switching the authenticated session clears owner transfer details and ignores a late receipt list',async({page})=>{
  await setup(page,'admin');let pending;await page.route('**'+transferPath,route=>{pending=route;});
  await page.locator('[data-portal-label="الموافقات والطلبات"]').click();await page.locator('[data-admin-service-transfers] > summary').click();await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,{items:[transfer()],canSubmit:true,candidates:[]});
  await expect(page.locator('[data-owner-transfer-workspace]')).toBeEmpty();await expect(page.locator('[data-owner-transfer-centers]')).toBeEmpty();await expect(page.locator('[data-admin-service-transfers]')).not.toHaveAttribute('open','');
});
