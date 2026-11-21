import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';

const source=name=>resolve(__dirname,'../src',name);
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const snapshot={version:'2026-11-21.1',sourceType:'EQUIPMENT_RENTAL',sourceId:'rental-e2e',organizationId:'center-e2e',
  customerAccountId:'customer-e2e',invoiceNumber:'RNT-E2E',amountMinor:5000,currency:'SAR',
  scheduledHandoverAt:'2099-12-01T09:00:00.000Z',originalDueAt:'2099-12-03T09:00:00.000Z',
  issuer:{organizationId:'center-e2e',legalName:'مركز التأجير التجريبي',registrationNumber:'SYNTHETIC-001',address:'عنوان تجريبي'},invoiceReadiness:'COMMERCIAL_RECORD_ONLY'};
const rental=()=>({id:'rental-e2e',invoiceNumber:'RNT-E2E',status:'RESERVED',paymentStatus:'PENDING',
  renterAccountId:'customer-e2e',totalHalala:5000,reservedAt:new Date().toISOString(),holdExpiresAt:new Date(Date.now()+900000).toISOString(),
  dueAt:snapshot.originalDueAt,scheduledHandoverAt:snapshot.scheduledHandoverAt,contractSnapshot:snapshot,
  pendingReturnCount:1,items:[{id:'item-e2e',resourceId:'equipment-e2e',equipmentNameSnapshot:'BCD تجريبي',assetCodeSnapshot:'SYN-BCD',unitPriceHalala:5000}]});

async function fixture(page,{admin=false,query=''}={}){
  await page.route(/\/rental-fixture(?:\?.*)?$/,route=>route.fulfill({status:200,contentType:'text/html',
    body:'<!doctype html><html lang="ar" dir="rtl"><body><div id="toast"></div><div class="profile-list"></div><section class="hl-inventory"></section></body></html>'}));
  await page.route(/\/api\/v1\/notifications$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/trips\/equipment-rentals\/mine$/,route=>json(route,[rental()]));
  await page.route(/\/api\/v1\/payments\/rentals\/rental-e2e\/quote$/,route=>json(route,{snapshot,quoteHash:'original-rental-quote',policyVersion:snapshot.version}));
  await page.goto('/rental-fixture'+query);
  await page.evaluate(()=>{window.__rentalSession={authenticated:true,version:1};window.HydrolandAuth={isAuthenticated:()=>window.__rentalSession.authenticated,getSessionVersion:()=>window.__rentalSession.version,
    authorizedFetch:(path,options)=>fetch('/api/v1'+path,options)};});
  await page.addScriptTag({path:source('hydroland-i18n.js')});
  await page.addScriptTag({path:source(admin?'hydroland-equipment-rentals.js':'hydroland-account-center.js')});
  if(!admin&&!query)await page.evaluate(()=>window.HydrolandAccountCenter.openRentals());
}

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
  await page.locator('[data-rental-terms-accepted]').check();
  await page.locator('[data-rental-start-checkout]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/rental-hosted-provider');
  expect(calls).toEqual([{quoteHash:'original-rental-quote',acceptedPolicyVersion:'2026-11-21.1',idempotencyKey:'rental:rental-e2e'}]);
  expect(calls[0]).not.toHaveProperty('amountMinor');
  expect(calls[0]).not.toHaveProperty('paid');
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
