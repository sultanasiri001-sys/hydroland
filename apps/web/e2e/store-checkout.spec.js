import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const issuer={organizationId:'center-original',legalName:'المركز الأصلي',registrationNumber:'70001234',invoiceReadiness:'REVIEW_REQUIRED'};
const terms={version:'2026-11-21.1',issuer,amountMinor:12500,currency:'SAR',lines:[{title:'منظم الغوص الأصلي',quantity:1,amountMinor:12500,currency:'SAR',issuer}]};
const quote={snapshot:terms,quoteHash:'original-quote-hash',policyVersion:'2026-11-21.1'};

async function fixture(page){
  const profile={id:'store-buyer-e2e',email:'store-buyer@example.invalid',status:'ACTIVE',roleAssignments:[],person:{firstName:'Store',lastName:'Buyer',phone:null,professional:null}};
  const product={id:'product-store-e2e',sku:'REG-E2E',nameAr:'منظم غوص تجريبي',priceMinor:12500,currency:'SAR',stockQuantity:2,status:'ACTIVE'};
  const order={id:'order-store-e2e',accountId:profile.id,status:'CREATED',totalMinor:12500,currency:'SAR',createdAt:new Date().toISOString(),items:[{id:'line-original',productId:product.id,quantity:1,unitPriceMinor:12500,product}]};
  const state={orders:[],payments:[],creates:0,checkouts:[],refreshes:0};
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,profile));
  await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
  await page.route('**/api/v1/store/products',route=>json(route,[product]));
  await page.route(/\/api\/v1\/store\/orders$/,route=>{state.creates++;expect(route.request().postDataJSON()).toEqual({items:[{productId:product.id,quantity:1}]});state.orders=[order];product.stockQuantity=1;return json(route,order,201)});
  await page.route('**/api/v1/store/orders/mine',route=>json(route,state.orders));
  await page.route('**/api/v1/store/payments/mine',route=>json(route,state.payments));
  await page.route('**/api/v1/store/orders/order-store-e2e/quote',route=>json(route,quote));
  await page.route('**/api/v1/store/orders/order-store-e2e/checkout',route=>{state.checkouts.push(route.request().postDataJSON());state.payments=[{id:'payment',orderId:order.id,status:'PENDING',amountMinor:12500,currency:'SAR'}];return json(route,{status:'PENDING',checkoutUrl:null,collectionVerified:false,financialOutcome:'NOT_COLLECTED'})});
  await page.route('**/api/v1/store/orders/order-store-e2e/refresh',route=>{state.refreshes++;return json(route,{status:'CAPTURED',collectionVerified:false,financialActionExecuted:true})});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandStore));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'store-e2e-access',refreshToken:'store-e2e-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();window.HydrolandWorkspaceUI.show(document.getElementById('store'))});
  return {state,order};
}

async function createOrder(page){
  await page.locator('[data-store-add="product-store-e2e"]').click();
  await page.locator('.hl-store-checkout').click();
  await expect(page.locator('[data-store-order="order-store-e2e"]')).toBeVisible();
}

test('goods checkout requires original terms consent and retries the same order and request after an uncertain response',async({page})=>{
  const {state}=await fixture(page);await createOrder(page);
  expect(state.creates).toBe(1);expect(state.checkouts).toHaveLength(0);
  await expect(page.locator('.hl-store-summary')).toHaveText('السلة فارغة');
  await page.locator('[data-store-payment-retry]').click();
  const dialog=page.locator('#hl-store-payment-dialog');await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('المركز الأصلي');await expect(dialog).toContainText('منظم الغوص الأصلي');
  await expect(dialog).toContainText('٧ أيام');
  await dialog.locator('[data-commerce-pay]').click();await expect(dialog.getByRole('status')).toHaveText('وافق على الشروط للمتابعة');expect(state.checkouts).toHaveLength(0);
  await page.route('**/api/v1/store/orders/order-store-e2e/checkout',route=>{state.checkouts.push(route.request().postDataJSON());return json(route,{message:'يحتاج رد المزوّد إلى المطابقة؛ لا تنشئ دفعة جديدة.'},503)});
  await dialog.locator('[data-commerce-accepted]').check();await dialog.locator('[data-commerce-pay]').click();
  await expect(dialog.getByRole('status')).toContainText('لا تنشئ دفعة جديدة');
  await page.route('**/api/v1/store/orders/order-store-e2e/checkout',route=>{state.checkouts.push(route.request().postDataJSON());return json(route,{status:'RECONCILIATION_REQUIRED',checkoutUrl:null,financialActionExecuted:null})});
  await dialog.locator('[data-commerce-pay]').click();await expect(dialog.getByRole('status')).toContainText('حالة الدفع تحتاج مراجعة');
  expect(state.checkouts).toHaveLength(2);expect(state.checkouts[0]).toEqual(state.checkouts[1]);
  expect(state.checkouts[0]).toEqual({quoteHash:quote.quoteHash,acceptedPolicyVersion:quote.policyVersion,idempotencyKey:'store:order-store-e2e'});
  expect(state.creates).toBe(1);
  await dialog.locator('[data-commerce-refresh]').click();await expect(dialog).toContainText('بانتظار المطابقة المالية');expect(state.refreshes).toBe(1);expect(state.checkouts).toHaveLength(2);
});

for(const transition of ['logout','account-switch','dismiss'])test('late goods quote is discarded after '+transition,async({page})=>{
  const {state}=await fixture(page);await createOrder(page);let release;const held=new Promise(resolve=>release=resolve),seen={value:false};
  await page.route('**/api/v1/store/orders/order-store-e2e/quote',async route=>{seen.value=true;await held;await json(route,quote)});
  await page.locator('[data-store-payment-retry]').click();await expect.poll(()=>seen.value).toBe(true);
  if(transition==='dismiss')await page.locator('#hl-store-payment-dialog [data-commerce-close]').click();
  else if(transition==='logout')await page.evaluate(()=>window.HydrolandAuth.terminateSession());
  else await page.evaluate(()=>window.HydrolandAuth.acceptSession({accessToken:'other-store-account',refreshToken:'other-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  const response=page.waitForResponse('**/api/v1/store/orders/order-store-e2e/quote');release();await(await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('#hl-store-payment-dialog')).not.toBeVisible();
  await expect(page.locator('[data-commerce-accepted]')).toHaveCount(0);expect(state.checkouts).toHaveLength(0);
  if(transition!=='dismiss')await expect(page.locator('[data-store-order]')).toHaveCount(0);
});

test('course payment uses its enrollment and preserves pending training rather than claiming activation',async({page})=>{
  const {state}=await fixture(page);const enrollment={id:'enrollment-original',storeCourseOfferId:'course-original',courseCode:'OW',status:'PENDING',metadata:{source:'UNIFIED_STORE',title:'دورة المياه المفتوحة الأصلية'}};
  await page.route('**/api/v1/training/mine/enrollments',route=>json(route,[enrollment]));
  const courseQuote={...quote,policyVersion:'2026-11-21.2',snapshot:{...terms,kind:'COURSE',title:enrollment.metadata.title,quantity:1,lines:undefined,originalSchedule:{startsAt:'2031-02-03T06:00:00.000Z'}}};
  await page.route('**/api/v1/payments/courses/enrollment-original/quote',route=>json(route,courseQuote));
  const writes=[];await page.route('**/api/v1/payments/courses/enrollment-original/checkout',route=>{writes.push(route.request().postDataJSON());return json(route,{status:'CAPTURED',collectionVerified:false,trainingStatus:'PENDING'})});
  await page.locator('.hl-store-course-payments').click();await page.locator('[data-course-checkout]').click();
  const dialog=page.locator('#hl-store-payment-dialog');await expect(dialog).toContainText('يُخصم ٢٥٪');await expect(dialog).toContainText('خلال آخر ٤٨ ساعة لا يُردّ المبلغ');
  await dialog.locator('[data-commerce-accepted]').check();await dialog.locator('[data-commerce-pay]').click();
  await expect(dialog.getByRole('status')).toContainText('بانتظار المطابقة المالية');expect(writes).toHaveLength(1);expect(writes[0].idempotencyKey).toBe('course:enrollment-original');expect(state.creates).toBe(0);
  await expect(dialog).toContainText('تأكيد الدفع لا يعني قبول التدريب أو إتمامه.');
});

test('confirmed course cancellation shows the recorded decision and retains a cancelled enrollment on refresh',async({page})=>{
  await fixture(page);
  const enrollment={id:'confirmed-course',storeCourseOfferId:'offer',courseCode:'OW',status:'PENDING',
    metadata:{source:'UNIFIED_STORE',title:'دورة مؤكدة',financialConfirmation:{status:'VERIFIED'}}};
  await page.route('**/api/v1/training/mine/enrollments',route=>json(route,[enrollment]));
  let requests=0;
  await page.route('**/api/v1/payments/courses/confirmed-course/cancellation',route=>{
    expect(route.request().method()).toBe('POST');
    requests++; enrollment.status='CANCELLED';
    return json(route,{requestId:'receipt',financialActionExecuted:false,decision:{status:'NO_REFUND',refundAmountMinor:0,currency:'SAR'}},201);
  });
  await page.locator('.hl-store-course-payments').click();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('[data-course-cancel]').click();expect(requests).toBe(0);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-course-cancel]').click();
  await expect(page.locator('[data-course-enrollment]')).toContainText('CANCELLED');
  await expect(page.locator('[data-course-cancel]')).toHaveCount(0);expect(requests).toBe(1);
});
