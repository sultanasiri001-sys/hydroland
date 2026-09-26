import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const price={pricePerSeatMinor:12500,currency:'SAR',configured:true};
const trip=()=>({id:'trip-pay-1',title:'رحلة جزيرة سمر',type:'BOAT_DIVE',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:4,bookedSeats:0,remainingSeats:4,status:'OPEN',price,safety:{decision:'ALLOWED'},weather:{snapshot:{decision:'ALLOWED',waveHeightM:0.5},evaluation:{blocking:false,decision:'ALLOWED'}}});

const installCommonApi=async page=>{
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[trip()]));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'account-pay-e2e',email:'pay-e2e@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Sultan',lastName:'Asiri',professional:null}}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]}));
};

const installAuth=async page=>{
  await page.addInitScript(()=>{
    sessionStorage.setItem('hl-access-token','payment-e2e-access');
    sessionStorage.setItem('hl-refresh-token','payment-e2e-refresh');
  });
};

const prepare=async page=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandBookings));
  await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
};

test('paid booking sends only booking identity to payment API and redirects to hosted checkout',async({page})=>{
  await installAuth(page);await installCommonApi(page);
  const state={paymentBody:null,bookingSeats:null};
  await page.route(/\/api\/v1\/trips\/trip-pay-1\/bookings$/,async route=>{
    state.bookingSeats=route.request().postDataJSON()?.seats;
    return json(route,{id:'booking-pay-1',tripId:'trip-pay-1',accountId:'account-pay-e2e',status:'PENDING',seats:state.bookingSeats,price,participants:[]},201);
  });
  await page.route(/\/api\/v1\/payments$/,async route=>{
    state.paymentBody=route.request().postDataJSON();
    return json(route,{id:'payment-local-1',bookingId:'booking-pay-1',amountMinor:25000,currency:'SAR',status:'PENDING',provider:'MOYASAR',checkoutUrl:'http://127.0.0.1:4173/provider-checkout',providerStatus:'initiated'},201);
  });
  await page.route('http://127.0.0.1:4173/provider-checkout',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Hosted payment</title><h1>Moyasar hosted checkout stub</h1>'}));
  await prepare(page);
  const book=page.locator('[data-book="رحلة جزيرة سمر"]').first();
  await expect.poll(()=>book.isEnabled()).toBe(true);
  await book.click();
  await expect(page.locator('#booking-price')).toContainText('ر.س للمقعد');
  await expect(page.locator('#booking-price')).not.toContainText('مجانية');
  await page.locator('#booking-seats').fill('2');
  await page.locator('#confirm-booking').click();
  await expect.poll(()=>state.paymentBody).not.toBeNull();
  expect(state.bookingSeats).toBe(2);
  expect(state.paymentBody).toEqual({bookingId:'booking-pay-1',idempotencyKey:'booking:booking-pay-1'});
  expect(Object.hasOwn(state.paymentBody,'amountMinor')).toBe(false);
  await expect(page).toHaveURL('http://127.0.0.1:4173/provider-checkout');
});

test('payment return ignores success query until server reconciliation confirms provider state',async({page})=>{
  await installAuth(page);await installCommonApi(page);
  const state={refreshCalls:0,refreshMethod:null};
  await page.route(/\/api\/v1\/payments\/payment-local-1\/refresh$/,route=>{
    state.refreshCalls+=1;state.refreshMethod=route.request().method();
    return json(route,{id:'payment-local-1',bookingId:'booking-pay-1',amountMinor:25000,currency:'SAR',status:'PENDING',provider:'MOYASAR',providerStatus:'initiated'});
  });
  await page.goto('/?payment=success&payment_id=payment-local-1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandBookings));
  await expect.poll(()=>state.refreshCalls).toBe(1);
  expect(state.refreshMethod).toBe('POST');
  await expect(page.locator('#toast')).toContainText('قيد المعالجة');
  await expect.poll(()=>new URL(page.url()).searchParams.has('payment')).toBe(false);
  expect(new URL(page.url()).searchParams.has('payment_id')).toBe(false);
});
