import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';

const source=name=>resolve(__dirname,'../src',name);
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const snapshot={version:'2026-11-21.1',sourceType:'EQUIPMENT_RENTAL',sourceId:'rental-e2e',organizationId:'center-e2e',
  damagePolicy:{version:'RENTAL_DAMAGE_1',upfrontDepositMinor:0,renterLiability:'NEW_DAMAGE_AT_RETURN_ONLY'},
  customerAccountId:'customer-e2e',invoiceNumber:'RNT-E2E',amountMinor:5000,currency:'SAR',
  scheduledHandoverAt:'2099-12-01T09:00:00.000Z',originalDueAt:'2099-12-03T09:00:00.000Z',
  issuer:{organizationId:'center-e2e',legalName:'مركز التأجير التجريبي',registrationNumber:'SYNTHETIC-001',address:'عنوان تجريبي'},invoiceReadiness:'COMMERCIAL_RECORD_ONLY'};
const rental=()=>({id:'rental-e2e',invoiceNumber:'RNT-E2E',status:'RESERVED',paymentStatus:'PENDING',
  renterAccountId:'customer-e2e',totalHalala:5000,reservedAt:new Date().toISOString(),holdExpiresAt:new Date(Date.now()+900000).toISOString(),
  dueAt:snapshot.originalDueAt,scheduledHandoverAt:snapshot.scheduledHandoverAt,contractSnapshot:snapshot,
  pendingReturnCount:1,items:[{id:'item-e2e',resourceId:'equipment-e2e',equipmentNameSnapshot:'BCD تجريبي',assetCodeSnapshot:'SYN-BCD',unitPriceHalala:5000}]});

async function fixture(page,{admin=false,query='',paid=false}={}){
  await page.route(/\/rental-fixture(?:\?.*)?$/,route=>route.fulfill({status:200,contentType:'text/html',
    body:'<!doctype html><html lang="ar" dir="rtl"><body><div id="toast"></div><div class="profile-list"></div><section class="hl-inventory"></section></body></html>'}));
  await page.route(/\/api\/v1\/notifications$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/trips\/equipment-rentals\/mine$/,route=>json(route,[{...rental(),...(paid?{paymentStatus:'PAID'}:{})}]));
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/quote$/,route=>json(route,{snapshot,quoteHash:'original-rental-quote',policyVersion:snapshot.version}));
  await page.goto('/rental-fixture'+query);
  await page.evaluate(()=>{window.__rentalSession={authenticated:true,version:1};window.HydrolandAuth={isAuthenticated:()=>window.__rentalSession.authenticated,getSessionVersion:()=>window.__rentalSession.version,
    authorizedFetch:(path,options)=>fetch('/api/v1'+path,options)};});
  await page.addScriptTag({path:source('hydroland-i18n.js')});
  await page.addScriptTag({path:source(admin?'hydroland-equipment-rentals.js':'hydroland-account-center.js')});
  if(!admin&&!query)await page.evaluate(()=>window.HydrolandAccountCenter.openRentals());
}

async function delayRefundBody(page,method){
  await page.evaluate(method=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=async(path,options)=>{
      const response=await original(path,options);
      if(!path.endsWith('/refund-requests')||(options?.method||'GET')!==method)return response;
      return {ok:response.ok,status:response.status,json:async()=>{
        const body=await response.json();window.__refundBodyWaiting=true;
        await new Promise(resolve=>{window.__releaseRefundBody=resolve;});
        window.__refundBodyCompleted=true;return body;
      }};
    };
  },method);
}

test('rental refund requests require consent, preserve halalas and retry one customer request without executing money',async({page})=>{
  const calls=[],financialCalls=[];
  page.on('request',request=>{if(request.url().includes('/refund-operations'))financialCalls.push(request.url())});
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refund-requests$/,route=>{
    expect(route.request().method()).toBe('POST');calls.push(route.request().postDataJSON());
    return calls.length===1?json(route,{message:'Synthetic request retry'},503):json(route,{requestId:'refund-request-e2e',cancellationRecorded:true,financialActionExecuted:false},201);
  });
  await fixture(page,{paid:true});await page.locator('[data-rental-refund]').click();
  const form=page.locator('[data-rental-refund-form]'),submit=form.getByRole('button',{name:'إرسال للمراجعة'});
  await expect(form).toContainText('إرسال الطلب لا يعني اكتمال رد المبلغ');
  await expect(form.locator('[name=refundReason]')).toHaveAttribute('maxlength','1000');
  await form.locator('[name=refundAmount]').fill('12.34');
  await form.locator('[name=refundReason]').fill('  إلغاء تجريبي قبل تسليم المعدات  ');
  await submit.click();expect(calls).toHaveLength(0);
  await form.locator('[name=refundAccepted]').check();await submit.click();
  await expect(form.locator('[data-rental-refund-feedback]')).toContainText('Synthetic request retry');
  await expect(submit).toBeEnabled();await submit.click();
  await expect(form.locator('[data-rental-refund-feedback]')).toContainText('تم إلغاء الحجز وإيقاف التسليم، وطلب الاسترداد قيد المراجعة.');
  await expect(submit).toBeDisabled();await expect(form.locator('[name=refundAmount]')).toBeDisabled();
  expect(calls).toHaveLength(2);expect(calls[0]).toEqual(calls[1]);
  expect(calls[0]).toEqual({idempotencyKey:expect.stringMatching(/^rental-refund:rental-e2e:/),requestedAmountMinor:1234,cause:'CUSTOMER_CANCELLATION',reason:'إلغاء تجريبي قبل تسليم المعدات'});
  expect(financialCalls).toHaveLength(0);await expect(form).not.toContainText('تم تأكيد رد المبلغ');
  await expect(page).toHaveURL(/\/rental-fixture$/);
});

test('rental refund history separates requested amounts from confirmed partial refunds and holds unknown outcomes',async({page})=>{
  const unsafeReason='طلب تجريبي <img src=x onerror="window.refundReasonExecuted=1">';
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refund-requests$/,route=>{
    expect(route.request().method()).toBe('GET');return json(route,{rentalId:'rental-e2e',requests:[
      {requestId:'partial',requestedAmountMinor:5000,reason:unsafeReason,operations:[{status:'SUCCEEDED',amountMinor:1000}]},
      {requestId:'unknown',requestedAmountMinor:2500,reason:'طلب تجريبي ينتظر المطابقة',operations:[{status:'SUCCEEDED',amountMinor:500},{status:'RECONCILIATION_REQUIRED',amountMinor:1500},{status:'CANCELLED',amountMinor:5000}]}
    ]});
  });
  await fixture(page,{paid:true});await page.locator('[data-rental-refund-history]').click();
  const rows=page.locator('[data-rental-refund-request]');await expect(rows).toHaveCount(2);
  const formatted=await page.evaluate(()=>[5000,1000,2500,500].map(value=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR'}).format(value/100)));
  await expect(rows.nth(0)).toContainText('توجد عمليات رد مؤكدة');
  await expect(rows.nth(0)).toContainText('المبلغ المطلوب: '+formatted[0]);
  await expect(rows.nth(0)).toContainText('المبلغ المردود المؤكد: '+formatted[1]);
  await expect(rows.nth(0)).toContainText(unsafeReason);await expect(rows.nth(0).locator('img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.refundReasonExecuted)).toBeUndefined();
  await expect(rows.nth(1)).toContainText('قيد المطابقة؛ لا تكرر الطلب');
  await expect(rows.nth(1)).toContainText('المبلغ المطلوب: '+formatted[2]);
  await expect(rows.nth(1)).toContainText('المبلغ المردود المؤكد: '+formatted[3]);
  await expect(page.locator('[data-rental-refund-detail]')).not.toContainText('تم تأكيد رد المبلغ');
});

for(const method of ['POST','GET'])for(const action of ['account switch','logout','dialog closure'])test(`a delayed rental refund ${method} body cannot cross ${action}`,async({page})=>{
  let calls=0;
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refund-requests$/,route=>{
    calls++;expect(route.request().method()).toBe(method);
    return json(route,method==='POST'?{requestId:'old-customer-request',cancellationRecorded:true,financialActionExecuted:false}:
      {requests:[{requestId:'old-customer-request',requestedAmountMinor:5000,reason:'OLD_CUSTOMER_PRIVATE_REFUND_REASON',operations:[]}]},method==='POST'?201:200);
  });
  await fixture(page,{paid:true});await delayRefundBody(page,method);
  if(method==='GET')await page.locator('[data-rental-refund-history]').click();
  else{
    await page.locator('[data-rental-refund]').click();
    await page.locator('[name=refundReason]').fill('طلب استرداد تجريبي خاص بالعميل السابق');
    await page.locator('[name=refundAccepted]').check();
    await page.locator('[data-rental-refund-form] button[type=submit]').click();
  }
  await expect.poll(()=>page.evaluate(()=>window.__refundBodyWaiting)).toBe(true);
  await page.evaluate(action=>{
    if(action==='account switch'){window.__rentalSession.version++;document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));}
    else if(action==='logout'){window.__rentalSession.authenticated=false;window.__rentalSession.version++;document.dispatchEvent(new CustomEvent('hydroland:session-cleared'));}
    else document.getElementById('hl-rentals-dialog').close();
    window.__releaseRefundBody();
  },action);
  await expect.poll(()=>page.evaluate(()=>window.__refundBodyCompleted)).toBe(true);
  const dialog=page.locator('#hl-rentals-dialog');await expect(dialog).not.toBeVisible();
  if(action!=='dialog closure')await expect(dialog.locator('.hl-account-body')).toBeEmpty();
  await expect(dialog).not.toContainText('OLD_CUSTOMER_PRIVATE_REFUND_REASON');
  await expect(dialog).not.toContainText('تم إلغاء الحجز وإيقاف التسليم، وطلب الاسترداد قيد المراجعة.');
  expect(calls).toBe(1);await expect(page).toHaveURL(/\/rental-fixture$/);
});

for(const status of [200,503])test(`a delayed rental refund history ${status} response cannot replace a newly opened request form`,async({page})=>{
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refund-requests$/,route=>json(route,status===200?
    {requests:[{requestId:'stale-history',requestedAmountMinor:5000,reason:'STALE_HISTORY_PRIVATE_REASON',operations:[]}]}:
    {message:'STALE_HISTORY_FAILURE'},status));
  await fixture(page,{paid:true});await delayRefundBody(page,'GET');
  await page.locator('[data-rental-refund-history]').click();
  await expect.poll(()=>page.evaluate(()=>window.__refundBodyWaiting)).toBe(true);
  await page.locator('[data-rental-refund]').click();
  const form=page.locator('[data-rental-refund-form]');
  await form.locator('[name=refundReason]').fill('تفاصيل طلب جديد يجب أن تبقى كما كتبها العميل');
  await page.evaluate(()=>window.__releaseRefundBody());
  await expect.poll(()=>page.evaluate(()=>window.__refundBodyCompleted)).toBe(true);
  await expect(form).toBeVisible();await expect(form.locator('[name=refundReason]')).toHaveValue('تفاصيل طلب جديد يجب أن تبقى كما كتبها العميل');
  await expect(page.locator('[data-rental-refund-detail]')).not.toContainText('STALE_HISTORY');
});

test('rental checkout displays original issuer and 24-hour terms and requires explicit acceptance',async({page})=>{
  const calls=[];
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/checkout$/,route=>{
    calls.push(route.request().postDataJSON());return json(route,{status:'PENDING',checkoutUrl:'http://127.0.0.1:4173/rental-hosted-provider'},201);
  });
  await page.route('http://127.0.0.1:4173/rental-hosted-provider',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Synthetic hosted provider</h1>'}));
  await fixture(page);
  await page.locator('[data-rental-checkout]').click();
  const detail=page.locator('[data-rental-payment-detail]');
  await expect(detail).toContainText('مركز التأجير التجريبي');
  await expect(detail).toContainText('SYNTHETIC-001');
  await expect(detail).toContainText('٢٤ ساعة');
  await expect(detail).toContainText('٢٥٪');
  await expect(detail).toContainText('الحقوق النظامية');
  await page.locator('[data-rental-start-checkout]').click();
  expect(calls).toHaveLength(0);
  await expect(detail).toContainText('وافق على شروط التأجير للمتابعة');
  await expect(page.getByText(/لا يُطلب ضمان مالي مقدم/)).toBeVisible();
  await page.locator('[data-rental-terms-accepted]').check();
  await page.locator('[data-rental-start-checkout]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/rental-hosted-provider');
  expect(calls).toEqual([{quoteHash:'original-rental-quote',acceptedPolicyVersion:'2026-11-21.1',idempotencyKey:'rental:rental-e2e'}]);
  expect(calls[0]).not.toHaveProperty('amountMinor');
  expect(calls[0]).not.toHaveProperty('paid');
});

test('rental checkout rejects executable and non-HTTP loopback schemes and accepts HTTPS',async({page})=>{
  let checkoutUrl='javascript://localhost/%0awindow.checkoutSchemeExecuted=1',paymentCalls=0;
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/checkout$/,route=>{paymentCalls++;return json(route,{status:'PENDING',checkoutUrl},201)});
  await page.route('https://checkout.example/rental',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Synthetic HTTPS rental checkout</h1>'}));
  await fixture(page);await page.locator('[data-rental-checkout]').click();await page.locator('[data-rental-terms-accepted]').check();
  for(const url of ['javascript://localhost/%0awindow.checkoutSchemeExecuted=1','ftp://127.0.0.1/rental','data://localhost/text/html,unsafe']){
    checkoutUrl=url;const before=paymentCalls;
    await page.locator('[data-rental-start-checkout]').click();await expect.poll(()=>paymentCalls).toBe(before+1);
    await expect(page.locator('[data-rental-start-checkout]')).toBeEnabled();
    await expect(page.locator('[data-rental-payment-message]')).toContainText('رابط الدفع غير صالح');
    await expect(page).toHaveURL(/\/rental-fixture$/);
    expect(await page.evaluate(()=>window.checkoutSchemeExecuted)).toBeUndefined();
  }
  checkoutUrl='https://checkout.example/rental';await page.locator('[data-rental-start-checkout]').click();
  await expect(page).toHaveURL('https://checkout.example/rental');
});

test('rental return navigation cannot mark payment paid and uses the verified refresh result',async({page})=>{
  let calls=0;
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refresh$/,route=>{
    calls++;expect(route.request().method()).toBe('POST');return json(route,{status:'PENDING',paymentStatus:'PENDING',collectionVerified:false});
  });
  await fixture(page,{query:'?rental_payment=success&rental_id=rental-e2e'});
  await expect(page.locator('[data-rental-payment-detail]')).toContainText('لم يكتمل التحصيل بعد');
  await expect(page.locator('#hl-rentals-dialog')).not.toContainText('تم تأكيد دفع التأجير.');
  expect(calls).toBe(1);
  await expect.poll(()=>new URL(page.url()).searchParams.has('rental_payment')).toBe(false);
});

test('captured provider payment waits for financial publication and reservation confirmation',async({page})=>{
  let state={status:'CAPTURED',paymentStatus:'PENDING',collectionVerified:false};
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/refresh$/,route=>json(route,state));
  await fixture(page);
  await page.locator('[data-rental-refresh]').click();
  await expect(page.locator('[data-rental-payment-detail]')).toContainText('بانتظار المطابقة المالية');
  state={...state,collectionVerified:true};
  await page.locator('[data-rental-refresh]').click();
  await expect(page.locator('[data-rental-payment-detail]')).toContainText('بانتظار تأكيد الحجز');
  state={...state,paymentStatus:'PAID'};
  await page.locator('[data-rental-refresh]').click();
  await expect(page.locator('[data-rental-payment-detail]')).toContainText('تم تأكيد دفع التأجير.');
});

test('unknown rental checkout keeps the original request and asks for review without redirect',async({page})=>{
  const calls=[];
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/checkout$/,route=>{
    calls.push(route.request().postDataJSON());return json(route,{status:'RECONCILIATION_REQUIRED',paymentStatus:'PENDING',collectionVerified:false,checkoutUrl:null});
  });
  await fixture(page);await page.locator('[data-rental-checkout]').click();
  await page.locator('[data-rental-terms-accepted]').check();
  await page.locator('[data-rental-start-checkout]').click();
  await expect(page.locator('[data-rental-payment-message]')).toContainText('لا تنشئ دفعة جديدة');
  await page.locator('[data-rental-start-checkout]').click();
  expect(calls).toHaveLength(2);expect(calls[0].idempotencyKey).toBe(calls[1].idempotencyKey);
  await expect(page).toHaveURL(/\/rental-fixture$/);
});

for(const [phase,action] of [['quote','account switch'],['checkout','account switch'],['checkout','dialog closure']])test(`a delayed rental ${phase} body cannot cross ${action}`,async({page})=>{
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/checkout$/,route=>json(route,{status:'PENDING',checkoutUrl:'http://127.0.0.1:4173/forbidden-old-customer-checkout'}));
  await fixture(page);
  await page.evaluate(phase=>{
    const original=window.HydrolandAuth.authorizedFetch;
    window.HydrolandAuth.authorizedFetch=async(path,options)=>{
      const response=await original(path,options);
      if(!path.endsWith('/'+phase))return response;
      return {ok:response.ok,status:response.status,json:async()=>{
        const body=await response.json();window.__rentalBodyWaiting=true;
        await new Promise(resolve=>{window.__releaseRentalBody=resolve;});return body;
      }};
    };
  },phase);
  await page.locator('[data-rental-checkout]').click();
  if(phase==='checkout'){
    await page.locator('[data-rental-terms-accepted]').check();
    await page.locator('[data-rental-start-checkout]').click();
  }
  await expect.poll(()=>page.evaluate(()=>window.__rentalBodyWaiting)).toBe(true);
  await page.evaluate(action=>{
    if(action==='account switch'){window.__rentalSession.version=2;document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));}
    else document.getElementById('hl-rentals-dialog').close();
    window.__releaseRentalBody();
  },action);
  await expect(page.locator('#hl-rentals-dialog')).not.toBeVisible();
  if(action==='account switch')await expect(page.locator('#hl-rentals-dialog')).not.toContainText('مركز التأجير التجريبي');
  await expect(page).toHaveURL(/\/rental-fixture$/);
});

test('rental administration captures handover separately and publishes a real ledger reference before confirmation',async({page})=>{
  let created,collectionBody,confirmationCalls=0;
  await page.route(/\/api\/v1\/trips\/admin\/equipment\/lookup\?code=SYN-BCD$/,route=>json(route,{resourceId:'equipment-e2e'}));
  await page.route(/\/api\/v1\/trips\/equipment-rentals$/,route=>{
    created=route.request().postDataJSON();return json(route,{...rental(),scheduledHandoverAt:created.scheduledHandoverAt,dueAt:created.dueAt},201);
  });
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/collection$/,route=>{
    collectionBody=route.request().postDataJSON();return json(route,{status:'COLLECTION_VERIFIED',paymentConfirmationRequired:true},201);
  });
  await page.route(/\/api\/v1\/trips\/admin\/equipment-rentals\/rental-e2e\/payment-confirmation$/,route=>{
    confirmationCalls++;return json(route,{status:'RESERVED',paymentStatus:'PAID'});
  });
  await fixture(page,{admin:true});await page.locator('#hl-rental-new').click();
  await page.locator('#hl-renter-account').fill('customer-e2e');
  await page.locator('#hl-rental-codes').fill('SYN-BCD');await page.locator('#hl-rental-prices').fill('50');
  await page.locator('#hl-rental-due').fill('2099-12-03T12:00');
  await page.locator('#hl-rental-create').click();expect(created).toBeUndefined();
  await page.locator('#hl-rental-handover').fill('2099-12-01T12:00');
  await page.locator('#hl-rental-create').click();
  await expect(page.locator('#hl-rental-current')).toContainText('RNT-E2E');
  expect(Date.parse(created.scheduledHandoverAt)).toBeLessThan(Date.parse(created.dueAt));
  page.once('dialog',dialog=>dialog.accept('posted-revenue-entry-e2e'));
  await page.locator('#hl-rental-collection').click();
  await expect.poll(()=>collectionBody).toEqual({financeEntryId:'posted-revenue-entry-e2e'});
  expect(confirmationCalls).toBe(0);
  await page.locator('#hl-rental-paid').click();
  await expect(page.locator('#hl-rental-paid')).toBeDisabled();expect(confirmationCalls).toBe(1);
});
