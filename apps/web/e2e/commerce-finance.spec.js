import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
import fixturePdf from './fixtures/license-text-pdf.json';

const original=Buffer.from(fixturePdf.base64,'base64'),receipt=readFileSync(resolve(process.cwd(),'e2e/fixtures/license-arabic-scan.pdf'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=(route,body,status=200)=>route.fulfill({status,json:body});
const center={id:'center-a',name:'الفرع الرئيسي',nameAr:'الفرع الرئيسي',organizationName:'مركز الاختبار'};
const source={sourceType:'STORE_ORDER',sourceId:'goods-original',orderId:'unified-original',title:'قناع الغوص الأصلي',amountMinor:10000,currency:'SAR'};
const base='/api/v1/finance/centers/center-a/commerce-sources',sourcePath=base+'/STORE_ORDER/goods-original',transferPath='/api/v1/finance/centers/center-a/commerce-transfers';
const account={id:'account-original',name:'حساب مستحقات المركز'};
const transfer=()=>({id:'transfer-original',financeEntryId:'entry-original',sourceType:source.sourceType,sourceId:source.sourceId,invoiceFinalizationId:'invoice-final',amountMinor:8500,currency:'SAR',bankName:'بنك الاختبار',bankReference:'EXTERNAL-1',transferredAt:'2026-11-20T09:00:00.000Z',status:'PENDING',documentSha256:sha(original),receiptDocumentSha256:null,canConfirm:true});
async function setup(page,role='center') {
  const state={ownerStatus:200,role,writes:[],transfers:[],canConfirm:true,canSubmit:role==='admin',
    ready:{...source,canAllocate:role==='admin',canPrepare:role==='center',collectionVerified:true,refundedMinor:0,grossReadiness:'ELIGIBLE',eligibleGrossAmountMinor:10000,commissionAmountMinor:null,otherDeductionsMinor:null,netPayoutAmountMinor:null,allocationEvidenceHash:'a'.repeat(64),allocationApprovalEventId:null,allocationFinanceAccountId:null,settlementFinanceEntryId:null,canPrepareSettlement:false,blockers:[],reviewReasons:['OWNER_APPROVED_ALLOCATION_REQUIRED','FINALIZED_ORIGINAL_INVOICE_REQUIRED'],
      invoice:{status:'DRAFT',number:'INVOICE-1',issuedAt:null,amountMinor:10000,taxMinor:null,documentKey:{sourceType:source.sourceType,sourceId:source.sourceId},expectedEvidenceHash:'b'.repeat(64),canFinalize:role==='center',blockers:[],sellerFinancialProfile:{taxStatus:'TAXABLE',currency:'SAR'},lines:[{lineId:'goods-line-original',title:source.title,amountMinor:10000}]}}};
  const profile={id:role==='admin'?'owner-account':'center-accountant',email:'b08@example.invalid',status:'ACTIVE',person:{firstName:'مراجع',lastName:'الاختبار'},roleAssignments:[{role:role==='admin'?'ADMIN':'DIVE_CENTER',status:'ACTIVE'}]};
  await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));await page.route(/\/api\/v1\/me$/,route=>json(route,profile));await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
  await page.route('**/api/v1/admin/overview',route=>json(route,{pendingReviews:0,activeBookings:0,accounts:1,openTrips:0}));
  await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:center.organizationName},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
  await page.route('**/api/v1/finance/mine/centers',route=>json(route,role==='center'?[center]:[]));
  await page.route('**/api/v1/finance/centers/*/workspace',route=>json(route,{centerOrgUnitId:center.id,shift:null,totals:null,entries:[],receivers:[],handovers:[],closeSubmission:null}));
  await page.route('**/api/v1/finance/owner/commerce-centers',route=>json(route,state.ownerStatus===200?{centers:[center]}:{message:'صلاحية مالك المنصة مطلوبة'},state.ownerStatus));
  await page.route('**'+base,route=>json(route,{canAllocate:state.ready.canAllocate,canPrepare:state.ready.canPrepare,accounts:[account],items:[source]}));
  await page.route('**'+sourcePath,route=>json(route,state.ready));
  for(const action of ['allocation','allocation/revoke','invoice-finalization','prepare'])await page.route('**'+sourcePath+'/'+action,route=>{
    const body=route.request().postDataJSON();state.writes.push({action,body});
    if(action==='allocation'){Object.assign(state.ready,{allocationApprovalEventId:'approval-original',allocationFinanceAccountId:body.financeAccountId,commissionAmountMinor:body.commissionAmountMinor,otherDeductionsMinor:body.otherDeductionsMinor,netPayoutAmountMinor:10000-body.commissionAmountMinor-body.otherDeductionsMinor,reviewReasons:state.ready.reviewReasons.filter(code=>code!=='OWNER_APPROVED_ALLOCATION_REQUIRED')});return json(route,state.ready,201);}
    if(action==='allocation/revoke'){state.ready.allocationApprovalEventId=null;return json(route,{revoked:true},201);}
    if(action==='invoice-finalization'){Object.assign(state.ready.invoice,{status:'FINALIZED',canFinalize:false,issuedAt:body.issuedAt,taxMinor:body.taxLines[0].taxMinor});state.ready.reviewReasons=state.ready.reviewReasons.filter(code=>code!=='FINALIZED_ORIGINAL_INVOICE_REQUIRED');return json(route,{id:'invoice-final',status:'FINALIZED'},201);}
    Object.assign(state.ready,{canPrepareSettlement:false,settlementFinanceEntryId:'entry-original',settlementLedgerStatus:'PENDING_APPROVAL'});return json(route,state.ready,201);
  });
  await page.route('**'+transferPath,route=>{
    if(route.request().method()==='GET')return json(route,{canSubmit:state.canSubmit,items:state.transfers.map(row=>({...row,canConfirm:state.canConfirm&&row.status==='PENDING'&&!state.canSubmit})),candidates:state.canSubmit&&!state.transfers.length?[{financeEntryId:'entry-original',sourceType:source.sourceType,sourceId:source.sourceId,amountMinor:8500,currency:'SAR'}]:[]});
    const body=route.request().postDataJSON();state.writes.push({action:'transfer',body});const row={...transfer(),id:body.requestId,bankName:body.bankName,bankReference:body.bankReference,transferredAt:body.transferredAt,canConfirm:false};state.transfers=[row];return json(route,row,201);
  });
  await page.route('**'+transferPath+'/*/review',route=>{const body=route.request().postDataJSON();state.writes.push({action:'receipt',body});const row=state.transfers[0];Object.assign(row,{status:body.decision,canConfirm:false,receivedAt:body.receivedAt,receiptDocumentSha256:sha(Buffer.from(body.documentBase64,'base64'))});return json(route,row,201);});
  await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCommerceFinance&&window.HydrolandCenterFinance&&window.HydrolandAdminControl&&window.HydrolandProfile));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'commerce-access',refreshToken:'commerce-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="'+role+'"]').click();await expect(page.locator('.hl-role-dashboard[data-role="'+role+'"]')).toBeVisible();return state;
}
async function open(page,role='center') {
  if(role==='admin'){await page.locator('[data-portal-label="الموافقات والطلبات"]').click();await page.locator('[data-admin-commerce-finance] > summary').click();}
  else {await page.locator('[data-portal-label="ورديات المحاسب"]').click();await page.locator('#hl-center-finance [data-commerce-finance] > summary').click();}
  const panel=page.locator('[data-commerce-finance]');await expect(panel.locator('[data-commerce-source-picker]')).toBeEnabled();return panel;
}
async function selectSource(panel) {await panel.locator('[data-commerce-source-picker]').selectOption('STORE_ORDER:goods-original');await expect(panel.locator('[data-commerce-readiness]')).toContainText(source.title);}
async function fillAllocation(panel) {const form=panel.locator('[data-commerce-allocate]');await form.getByLabel('الحساب المالي').selectOption(account.id);await form.getByLabel('العمولة (ر.س)').fill('10.00');await form.getByLabel('الاستقطاعات الأخرى (ر.س)').fill('5.00');return form;}
async function openTransfers(panel) {const transfers=panel.locator('[data-commerce-transfers]');await transfers.locator(':scope > summary').click();await expect(transfers.getByRole('button',{name:'تحديث سجل الحوالات'})).toBeEnabled();return transfers;}
async function fillReceipt(panel,bytes=receipt) {await panel.getByText('مراجعة وصول الحوالة',{exact:true}).click();const form=panel.locator('[data-service-transfer-review]');await form.getByLabel('قرار المراجعة').selectOption('CONFIRMED');await form.getByLabel('توضيح المراجعة').fill('مطابقة مستقلة مع كشف حساب المركز');await form.getByLabel('تاريخ ووقت الوصول (بتوقيت السعودية)').fill('2026-11-20T13:00');await form.getByLabel('إثبات وصول مستقل PDF (حتى 5 ميغابايت)').setInputFiles({name:'receipt.pdf',mimeType:'application/pdf',buffer:bytes});return form;}

test('owner allocation requires explicit amounts and an existing account without manual source IDs',async({page})=>{
  const state=await setup(page,'admin'),panel=await open(page,'admin');await selectSource(panel);
  const form=panel.locator('[data-commerce-allocate]');await expect(form.getByLabel('العمولة (ر.س)')).toHaveValue('');await expect(form.getByLabel('الاستقطاعات الأخرى (ر.س)')).toHaveValue('');
  await form.getByRole('button',{name:'اعتماد توزيع المستحق'}).click();expect(state.writes).toHaveLength(0);
  await fillAllocation(panel);await form.getByRole('button',{name:'اعتماد توزيع المستحق'}).click();await expect(panel.locator('[data-commerce-status]')).toHaveText('تم اعتماد توزيع المستحق.');
  expect(state.writes).toEqual([{action:'allocation',body:{financeAccountId:account.id,commissionAmountMinor:1000,otherDeductionsMinor:500,expectedEvidenceHash:'a'.repeat(64)}}]);
  await expect(panel.locator('[data-commerce-finalize],[data-commerce-prepare]')).toHaveCount(0);await expect(panel.locator('[data-commerce-revoke]')).toBeVisible();
});

test('accountant finalizes original tax lines then prepares only the owner-approved account and allocation',async({page},testInfo)=>{
  const state=await setup(page);Object.assign(state.ready,{allocationApprovalEventId:'approval-original',allocationFinanceAccountId:account.id,canPrepareSettlement:true,commissionAmountMinor:1000,otherDeductionsMinor:500,netPayoutAmountMinor:8500,reviewReasons:['FINALIZED_ORIGINAL_INVOICE_REQUIRED']});
  const panel=await open(page);await selectSource(panel);await expect(panel.locator('[data-commerce-allocate]')).toHaveCount(0);await expect(panel.locator('[data-commerce-prepare]')).toHaveCount(0);
  await expect(panel.locator('[data-account-invoices]')).toHaveAttribute('data-invoice-source',source.sourceId);
  const form=panel.locator('[data-commerce-finalize]');await form.getByLabel('تاريخ ووقت إصدار الأصل (بتوقيت السعودية)').fill('2026-11-20T12:00');await form.getByLabel('ضريبة البند كما في الأصل (ر.س)').fill('13.04');
  await form.getByRole('button',{name:'اعتماد أصل الفاتورة'}).click();expect(state.writes).toHaveLength(0);await form.getByRole('checkbox').check();await form.getByRole('button',{name:'اعتماد أصل الفاتورة'}).click();
  await expect(panel.locator('[data-commerce-status]')).toHaveText('تم اعتماد أصل الفاتورة.');expect(state.writes[0]).toEqual({action:'invoice-finalization',body:{issuedAt:'2026-11-20T09:00:00.000Z',expectedEvidenceHash:'b'.repeat(64),taxLines:[{lineId:'goods-line-original',taxMinor:1304}]}});
  await panel.locator('[data-commerce-prepare]').getByRole('button',{name:'تجهيز قيد المستحق'}).click();await expect(panel.locator('[data-commerce-status]')).toContainText('بانتظار اعتماده');
  expect(state.writes[1]).toEqual({action:'prepare',body:{financeAccountId:account.id,allocationApprovalEventId:'approval-original'}});await expect(panel.locator('[data-commerce-prepare]')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await panel.locator(':scope > summary').focus();expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await panel.screenshot({animations:'disabled',path:testInfo.outputPath('commerce-finance-mobile.png')});
});

test('read-only readiness exposes no mutation controls and unknown amounts remain under review',async({page})=>{
  const state=await setup(page);state.ready.canPrepare=false;state.ready.invoice.canFinalize=true;const panel=await open(page);await selectSource(panel);
  await expect(panel.locator('[data-commerce-readiness] form')).toHaveCount(0);await expect(panel.locator('[data-commerce-readiness]')).toContainText('يتطلب مراجعة');expect(state.writes).toHaveLength(0);
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));await expect(panel.locator('[data-commerce-readiness]')).toContainText('Original center invoice');await expect(panel.locator('[data-commerce-readiness]')).toContainText(source.title);
});

test('admin without owner authority cannot load center entitlements',async({page})=>{
  const state=await setup(page,'admin');state.ownerStatus=403;await page.locator('[data-portal-label="الموافقات والطلبات"]').click();await page.locator('[data-admin-commerce-finance] > summary').click();
  await expect(page.locator('[data-commerce-owner-status]')).toContainText('صلاحية مالك المنصة');await expect(page.locator('[data-commerce-finance]')).toHaveCount(0);expect(state.writes).toHaveLength(0);
});

for(const phase of ['read','write'])test('late finance '+phase+' cannot repopulate after an account change',async({page})=>{
  const state=await setup(page,'admin'),panel=await open(page,'admin');let release,seen=false;const held=new Promise(resolve=>release=resolve);
  if(phase==='read')await page.route('**'+sourcePath,async route=>{seen=true;await held;await json(route,state.ready);});
  await selectSourceForLate();
  async function selectSourceForLate(){if(phase==='read'){await panel.locator('[data-commerce-source-picker]').selectOption('STORE_ORDER:goods-original');return;}await selectSource(panel);const form=await fillAllocation(panel);await page.route('**'+sourcePath+'/allocation',async route=>{seen=true;state.writes.push(route.request().postDataJSON());await held;await json(route,{allocationApprovalEventId:'approval-original'},201);});await form.getByRole('button',{name:'اعتماد توزيع المستحق'}).click();}
  await expect.poll(()=>seen).toBe(true);await page.evaluate(()=>window.HydrolandAuth.acceptSession({accessToken:'other-account',refreshToken:'other-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  const response=page.waitForResponse('**'+sourcePath+(phase==='write'?'/allocation':''));release();await(await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page.locator('[data-commerce-readiness]')).toHaveCount(0);await expect(page.locator('[data-admin-commerce-finance]')).not.toHaveAttribute('open','');expect(state.writes).toHaveLength(phase==='write'?1:0);
});

test('commerce receipt requires independent evidence and an independent reviewer',async({page})=>{
  const state=await setup(page);state.transfers=[transfer()];state.canConfirm=false;const panel=await open(page),transfers=await openTransfers(panel);
  await expect(transfers.locator('[data-service-transfer-review]')).toHaveCount(0);state.canConfirm=true;await transfers.getByRole('button',{name:'تحديث سجل الحوالات'}).click();
  let form=await fillReceipt(transfers,original);await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();await expect(transfers.locator('[data-transfer-status]')).toHaveText('أرفق إثبات وصول مستقلًا عن مستند الحوالة.');expect(state.writes).toHaveLength(0);
  await transfers.getByRole('button',{name:'تحديث سجل الحوالات'}).click();form=await fillReceipt(transfers);await form.getByRole('button',{name:'حفظ قرار المراجعة'}).click();await expect(transfers.getByRole('heading',{name:'تم تأكيد الوصول'})).toBeVisible();
  expect(state.writes).toHaveLength(1);expect(state.writes[0].action).toBe('receipt');expect(state.writes[0].body.receivedAt).toBe('2026-11-20T10:00:00.000Z');expect(sha(Buffer.from(state.writes[0].body.documentBase64,'base64'))).not.toBe(sha(original));
});

test('owner records an approved commerce entitlement and cannot confirm its receipt',async({page})=>{
  const state=await setup(page,'admin'),panel=await open(page,'admin'),transfers=await openTransfers(panel),form=transfers.locator('[data-service-transfer-submit]');
  await form.getByRole('combobox',{name:'المستحق المعتمد',exact:true}).selectOption('entry-original');await form.getByLabel('اسم البنك').fill('بنك الاختبار');await form.getByLabel('مرجع الحوالة البنكية').fill('EXTERNAL-1');await form.getByLabel('تاريخ ووقت الحوالة (بتوقيت السعودية)').fill('2026-11-20T12:00');await form.getByLabel('أصل إثبات الحوالة PDF (حتى 5 ميغابايت)').setInputFiles({name:'transfer.pdf',mimeType:'application/pdf',buffer:original});
  await form.getByRole('button',{name:'تسجيل حوالة منفذة خارج هيدرولاند'}).click();await expect(transfers.getByRole('heading',{name:'بانتظار تأكيد الوصول'})).toBeVisible();await expect(transfers.locator('[data-service-transfer-review]')).toHaveCount(0);
  expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({action:'transfer',body:{financeEntryId:'entry-original',amountMinor:8500,currency:'SAR',bankName:'بنك الاختبار',bankReference:'EXTERNAL-1',transferredAt:'2026-11-20T09:00:00.000Z'}});
});
