import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('checkout creates one order, survives payment-record failure, and resumes payment from existing order',async({page})=>{
  const profile={id:'store-buyer-e2e',email:'store-buyer@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Store',lastName:'Buyer',phone:null,professional:null}};
  const product={id:'product-store-e2e',sku:'REG-E2E',nameAr:'منظم غوص تجريبي',priceMinor:12500,currency:'SAR',stockQuantity:2,status:'ACTIVE'};
  const order={id:'order-store-e2e',accountId:'store-buyer-e2e',status:'CREATED',totalMinor:12500,currency:'SAR',createdAt:new Date().toISOString(),items:[{id:'item-store-e2e',productId:product.id,quantity:1,unitPriceMinor:12500,product}]};
  let payment=null,orderCreates=0,paymentAttempts=0,firstPaymentKey=null;
  const requireAuth=request=>request.headers().authorization==='Bearer store-e2e-access';

  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/store\/products$/,route=>json(route,[product]));
  await page.route(/\/api\/v1\/store\/orders$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    orderCreates+=1;const body=route.request().postDataJSON();
    expect(body).toEqual({items:[{productId:product.id,quantity:1}]});product.stockQuantity=1;return json(route,order,201);
  });
  await page.route(/\/api\/v1\/store\/orders\/mine$/,route=>requireAuth(route.request())?json(route,[order]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/store\/payments\/mine$/,route=>requireAuth(route.request())?json(route,payment?[payment]:[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/store\/orders\/order-store-e2e\/payment$/,route=>{
    if(!requireAuth(route.request()))return json(route,{message:'Unauthorized'},401);
    paymentAttempts+=1;const body=route.request().postDataJSON();
    expect(typeof body.idempotencyKey).toBe('string');expect(body.idempotencyKey.length).toBeGreaterThan(12);
    if(paymentAttempts===1){firstPaymentKey=body.idempotencyKey;return json(route,{message:'temporary payment record failure'},503)}
    payment={id:'store-payment-e2e',orderId:order.id,accountId:profile.id,amountMinor:12500,currency:'SAR',idempotencyKey:body.idempotencyKey,status:'CREATED',provider:'NOT_SELECTED',financialActionExecuted:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),invoice:null};
    return json(route,payment,201);
  });

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandStore));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','store-e2e-access');sessionStorage.setItem('hl-refresh-token','store-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});

  const add=page.locator('[data-store-add="product-store-e2e"]');await expect(add).toBeVisible();await add.click();
  await expect(page.locator('.hl-store-summary')).toContainText('1 منتج');
  await page.locator('.hl-store-checkout').click();
  await expect.poll(()=>orderCreates).toBe(1);await expect.poll(()=>paymentAttempts).toBe(1);
  expect(firstPaymentKey).toBeTruthy();
  await expect(page.locator('.hl-store-summary')).toHaveText('السلة فارغة');
  await expect(page.locator('#toast')).toContainText('تم إنشاء الطلب وحفظ المخزون');

  await page.locator('.hl-store-orders').click();
  const orderCard=page.locator('[data-store-order="order-store-e2e"]');await expect(orderCard).toBeVisible();
  await expect(orderCard.locator('[data-store-payment-state]')).toHaveText('لا يوجد سجل دفع');
  await orderCard.locator('[data-store-payment-retry]').click();
  await expect.poll(()=>paymentAttempts).toBe(2);
  await expect.poll(()=>orderCreates).toBe(1);
  await expect(orderCard.locator('[data-store-payment-state]')).toContainText('CREATED');
  await expect(orderCard.locator('[data-store-payment-state]')).toContainText('NOT_SELECTED');
  await expect(orderCard.locator('[data-store-payment-state]')).toContainText('لا يوجد تحصيل مالي منفذ');
  await expect(orderCard.locator('[data-store-payment-retry]')).toHaveCount(0);
});
