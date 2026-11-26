import {test,expect} from '@playwright/test';
import fixturePdf from './fixtures/license-text-pdf.json';

const original=Buffer.from(fixturePdf.base64,'base64');
const finalizationPath='/api/v1/account/invoices/TRIP_PAYMENT/payment-org-1/finalization';
const json=(route,data,status=200)=>route.fulfill({status,json:data});

async function setup(page,{row={},preview={}}={}){
  const state={
    row:{sourceType:'TRIP_PAYMENT',sourceId:'payment-org-1',amountMinor:50000,currency:'SAR',occurredAt:'2026-11-25T10:00:00.000Z',
      sellerName:'مركز الاختبار',number:'CTR-ORG-42',nativeStatus:'DRAFT',isSale:true,isPurchase:false,hasDocument:true,
      canPrint:true,canFinalize:true,finalizationStatus:'DRAFT',...row},
    preview:{status:'DRAFT',canFinalize:true,blockers:[],number:'CTR-ORG-42',issuedAt:null,amountMinor:50000,currency:'SAR',
      seller:{id:'center-org',name:'مركز الاختبار',registrationNumber:'CENTER-REG',address:'عنوان المركز'},
      buyer:{id:'buyer-org',name:'جهة الاختبار',registrationNumber:'BUYER-REG',address:'عنوان الجهة'},
      collectionFinanceEntryId:'collection-entry-1',documentSha256:'a'.repeat(64),expectedEvidenceHash:'b'.repeat(64),finalizationId:null,...preview},
    reads:0,writes:[],postStatus:200,pendingPost:null
  };
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/account/invoices?*',route=>json(route,{items:[state.row],nextOffset:null}));
  await page.route('**/api/v1/account/invoices/TRIP_PAYMENT/payment-org-1/document',route=>route.fulfill({contentType:'application/pdf',body:original}));
  await page.route('**'+finalizationPath,async route=>{
    if(route.request().method()==='GET'){state.reads++;return json(route,state.preview);}
    const body=route.request().postDataJSON();state.writes.push(body);
    if(state.pendingPost)await state.pendingPost;
    if(state.postStatus!==200)return json(route,{message:'تغيرت أدلة التحصيل؛ أعد المراجعة.'},state.postStatus);
    state.row.finalizationStatus='FINALIZED';state.row.canFinalize=false;state.row.nativeStatus='ISSUED';
    state.preview={...state.preview,status:'FINALIZED',canFinalize:false,issuedAt:body.issuedAt,finalizationId:'finalization-1'};
    return json(route,{status:'FINALIZED',finalizationId:'finalization-1',number:state.row.number,issuedAt:body.issuedAt,alreadyFinalized:false});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#hl-invoices-dialog',{state:'attached'});
  await page.evaluate(()=>{
    window.invoiceSession=1;
    window.HydrolandAuth={isAuthenticated:()=>true,getSessionVersion:()=>window.invoiceSession,authorizedFetch:(path,options)=>fetch('/api/v1'+path,options)};
    window.HydrolandPortalAccess={getCurrentRole:()=>'center'};
    const trigger=document.createElement('button');trigger.dataset.accountInvoices='';document.body.append(trigger);trigger.click();
  });
  await expect(page.locator('#hl-invoices-dialog')).toContainText('CTR-ORG-42');
  return state;
}

async function openReview(page){
  const dialog=page.locator('#hl-invoices-dialog');
  await dialog.getByRole('button',{name:'مراجعة أصل فاتورة المركز',exact:true}).click();
  await expect(dialog.locator('[data-invoice-finalization]')).toContainText('جهة الاختبار');
  return dialog;
}

test('center accountant reviews the original, confirms its issue date and retains the same PDF after server approval',async({page})=>{
  const state=await setup(page);let finish;
  state.pendingPost=new Promise(resolve=>{finish=resolve;});
  const dialog=await openReview(page),form=dialog.locator('[data-invoice-finalization-form]');
  await expect(dialog).toContainText('CENTER-REG');await expect(dialog).toContainText('BUYER-REG');
  await expect(dialog).toContainText('عنوان الجهة');await expect(dialog).toContainText('collection-entry-1');
  const submit=form.getByRole('button',{name:'اعتماد أصل فاتورة المركز',exact:true});
  await expect(submit).toBeDisabled();
  await form.getByLabel('تاريخ ووقت إصدار الفاتورة الأصلية (بتوقيت السعودية)').fill('2026-11-25T13:15');
  await expect(submit).toBeDisabled();await form.getByRole('checkbox').check();
  await submit.click();await expect.poll(()=>state.writes.length).toBe(1);await expect(submit).toBeDisabled();
  expect(state.writes[0]).toEqual({issuedAt:'2026-11-25T10:15:00.000Z',expectedEvidenceHash:'b'.repeat(64),originalInvoiceVerified:true});
  await expect(dialog.getByText('أصل فاتورة المركز معتمد',{exact:true})).toHaveCount(0);
  finish();await expect(dialog.getByText('أصل فاتورة المركز معتمد',{exact:true})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');await dialog.getByRole('button',{name:'تحميل الفاتورة PDF'}).click();
  const download=await downloadPromise,stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(original);
  await page.setViewportSize({width:390,height:844});
  expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  await dialog.screenshot({animations:'disabled',path:test.info().outputPath('b12-invoice-finalized-mobile.png')});
});

for(const mode of ['blocked','not-authorized','missing-hash'])test('final invoice review cannot submit '+mode,async({page})=>{
  const preview=mode==='blocked'?{blockers:['قيد التحصيل غير مطابق.']}:mode==='not-authorized'?{canFinalize:false}:{expectedEvidenceHash:''};
  const state=await setup(page,{preview});
  const dialog=page.locator('#hl-invoices-dialog');await dialog.getByRole('button',{name:'مراجعة أصل فاتورة المركز'}).click();
  if(mode==='missing-hash')await expect(dialog.locator('[data-finalization-status]')).toHaveText('تعذر التحقق من بيانات المراجعة.');
  else await expect(dialog).toContainText(mode==='blocked'?'قيد التحصيل غير مطابق.':'جهة الاختبار');
  await expect(dialog.getByRole('button',{name:'اعتماد أصل فاتورة المركز',exact:true})).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});

for(const row of [
  {isSale:false,isPurchase:true},
  {sourceType:'TRAINING_ENROLLMENT'},
  {canFinalize:false,finalizationStatus:undefined}
])test('finalization control is limited to seller organization trip invoices '+JSON.stringify(row),async({page})=>{
  await setup(page,{row});await expect(page.getByRole('button',{name:'مراجعة أصل فاتورة المركز'})).toHaveCount(0);
});

test('conflicting invoice evidence requires a new review and never changes the displayed finalization state',async({page})=>{
  const state=await setup(page);state.postStatus=409;
  const dialog=await openReview(page),form=dialog.locator('[data-invoice-finalization-form]');
  await form.locator('[name=issuedAt]').fill('2026-11-25T13:15');await form.getByRole('checkbox').check();
  await form.getByRole('button',{name:'اعتماد أصل فاتورة المركز'}).click();
  await expect(dialog.locator('[data-finalization-status]')).toContainText('تغيرت أدلة التحصيل');
  await expect(form.getByRole('button',{name:'اعتماد أصل فاتورة المركز'})).toBeDisabled();
  await expect(dialog.getByText('أصل فاتورة المركز معتمد',{exact:true})).toHaveCount(0);
  state.preview.expectedEvidenceHash='c'.repeat(64);state.postStatus=200;
  await openReview(page);await expect(form.locator('[name=issuedAt]')).toHaveValue('');
  await form.locator('[name=issuedAt]').fill('2026-11-25T13:15');await form.getByRole('checkbox').check();
  await form.getByRole('button',{name:'اعتماد أصل فاتورة المركز'}).click();
  await expect(dialog.getByText('أصل فاتورة المركز معتمد',{exact:true})).toBeVisible();
  expect(state.writes.map(x=>x.expectedEvidenceHash)).toEqual(['b'.repeat(64),'c'.repeat(64)]);
});

for(const stage of ['review','approval'])test('late '+stage+' response cannot restore invoice details after logout',async({page})=>{
  const state=await setup(page);let pending;
  if(stage==='review')await page.route('**'+finalizationPath,route=>{pending=route;});
  const dialog=page.locator('#hl-invoices-dialog');
  await dialog.getByRole('button',{name:'مراجعة أصل فاتورة المركز'}).click();
  if(stage==='approval'){
    await expect(dialog.locator('[data-invoice-finalization-form]')).toBeVisible();
    await page.route('**'+finalizationPath,route=>{pending=route;});
    await dialog.locator('[name=issuedAt]').fill('2026-11-25T13:15');await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button',{name:'اعتماد أصل فاتورة المركز',exact:true}).click();
  }
  await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.evaluate(()=>{window.invoiceSession++;document.dispatchEvent(new Event('hydroland:session-cleared'));});
  await json(pending,stage==='review'?state.preview:{status:'FINALIZED',finalizationId:'late-receipt'});
  await expect(dialog).not.toBeVisible();await expect(dialog.locator('article')).toHaveCount(0);
});
