import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const price={pricePerSeatMinor:12500,currency:'SAR',configured:true};
const trip=()=>({id:'trip-pay-1',title:'رحلة جزيرة سمر',type:'BOAT_DIVE',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),capacity:4,bookedSeats:0,remainingSeats:4,status:'OPEN',price,safety:{decision:'ALLOWED'},weather:{snapshot:{decision:'ALLOWED',waveHeightM:0.5},evaluation:{blocking:false,decision:'ALLOWED'}}});

const installCommonApi=async page=>{
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[trip()]));
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'account-pay-e2e',email:'pay-e2e@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Sultan',lastName:'Asiri',professional:null}}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:{medicalFitnessStatus:'FIT'},equipment:[]}));
  await page.route(/\/api\/v1\/trips\/bookings\/mine$/,route=>json(route,[]));
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

test('paid booking requires displayed original terms before payment and redirects to hosted checkout',async({page})=>{
  await installAuth(page);await installCommonApi(page);
  const state={paymentBody:null,bookingSeats:null,bookingCalls:0};
  const originalDeparture='2030-04-05T21:30:00.000Z';
  await page.route(/\/api\/v1\/payments\/bookings\/booking-pay-1\/quote$/,route=>json(route,{snapshot:{amountMinor:25000,currency:'SAR',quantity:2,originalSchedule:{startsAt:originalDeparture},issuer:{legalName:'مركز اختبار الرحلات <img src=x onerror="window.checkoutXss=1">'}},quoteHash:'quote-original-1',policyVersion:'2026-11-21.1'}));
  await page.route(/\/api\/v1\/trips\/trip-pay-1\/bookings$/,async route=>{
    state.bookingCalls++;state.bookingSeats=route.request().postDataJSON()?.seats;
    return json(route,{id:'booking-pay-1',tripId:'trip-pay-1',accountId:'account-pay-e2e',status:'PENDING',seats:state.bookingSeats,price,participants:[]},201);
  });
  await page.route(/\/api\/v1\/payments$/,async route=>{
    state.paymentBody=route.request().postDataJSON();
    return json(route,{id:'payment-local-1',bookingId:'booking-pay-1',amountMinor:25000,currency:'SAR',status:'PENDING',provider:'MOYASAR',checkoutUrl:'http://127.0.0.1:4173/provider-checkout',providerStatus:'initiated'},201);
  });
  await page.route('http://127.0.0.1:4173/provider-checkout',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Hosted payment</title><h1>Moyasar hosted checkout stub</h1>'}));
  await prepare(page);
  await page.waitForFunction(()=>Boolean(window.HydrolandWorkspaceUI));
  await page.locator('#navigation a[href="#trips"]').click();
  const book=page.locator('[data-book="رحلة جزيرة سمر"]').first();
  await expect.poll(()=>book.isEnabled()).toBe(true);
  await book.click();
  await expect(page.locator('#booking-price')).toContainText('ر.س للمقعد');
  await expect(page.locator('#booking-price')).not.toContainText('مجانية');
  await page.locator('#booking-seats').fill('2');
  await page.locator('#confirm-booking').click();
  await expect(page.locator('[data-checkout-terms]')).toContainText('٤٨ ساعة');
  await expect(page.locator('[data-checkout-terms]')).toContainText('٥٠٪');
  await expect(page.locator('[data-checkout-terms]')).toContainText('مركز اختبار الرحلات');
  await expect(page.locator('[data-checkout-terms]')).toContainText('<img src=x onerror="window.checkoutXss=1">');
  await expect(page.locator('[data-checkout-terms] img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.checkoutXss)).toBeUndefined();
  await expect(page.locator('[data-checkout-quantity]')).toHaveText('عدد المقاعد في هذا الحجز: 2');
  const originalRiyadh=await page.evaluate(value=>new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)),originalDeparture);
  await expect(page.locator('[data-checkout-departure]')).toContainText(originalRiyadh);
  await expect(page.locator('[data-checkout-departure]')).toContainText('Asia/Riyadh');
  expect(state.paymentBody).toBeNull();
  await page.locator('#confirm-booking').click();
  expect(state.paymentBody).toBeNull();
  await page.evaluate(()=>window.HydrolandI18n.setLocale('en'));
  await expect(page.locator('[data-checkout-quantity]')).toHaveText('Seats in this booking: 2');
  const englishRiyadh=await page.evaluate(value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)),originalDeparture);
  await expect(page.locator('[data-checkout-departure]')).toContainText('Original departure (Saudi Arabia time, Asia/Riyadh)');
  await expect(page.locator('[data-checkout-departure]')).toContainText(englishRiyadh);
  await page.locator('[data-accept-checkout-terms]').check();
  await page.locator('#confirm-booking').click();
  await expect.poll(()=>state.paymentBody).not.toBeNull();
  expect(state.bookingCalls).toBe(1);
  expect(state.bookingSeats).toBe(2);
  expect(state.paymentBody).toEqual({bookingId:'booking-pay-1',idempotencyKey:'booking:booking-pay-1',policyAcceptance:{version:'2026-11-21.1',quoteHash:'quote-original-1'}});
  expect(Object.hasOwn(state.paymentBody,'amountMinor')).toBe(false);
  await expect(page).toHaveURL('http://127.0.0.1:4173/provider-checkout');
});

test('trip checkout rejects executable and non-HTTP loopback schemes and accepts HTTPS',async({page})=>{
  await installAuth(page);await installCommonApi(page);
  let checkoutUrl='javascript://localhost/%0awindow.checkoutSchemeExecuted=1',paymentCalls=0;
  await page.route(/\/api\/v1\/trips\/trip-pay-1\/bookings$/,route=>json(route,{id:'booking-pay-1',tripId:'trip-pay-1',accountId:'account-pay-e2e',status:'PENDING',seats:1,price},201));
  await page.route(/\/api\/v1\/payments\/bookings\/booking-pay-1\/quote$/,route=>json(route,{snapshot:{amountMinor:12500,currency:'SAR',quantity:1,originalSchedule:{startsAt:trip().startsAt},issuer:{legalName:'مركز اختبار'}},quoteHash:'scheme-quote',policyVersion:'2026-11-21.1'}));
  await page.route(/\/api\/v1\/payments$/,route=>{paymentCalls++;return json(route,{status:'PENDING',provider:'MOYASAR',checkoutUrl},201)});
  await page.route('https://checkout.example/trip',route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Synthetic HTTPS checkout</h1>'}));
  await prepare(page);await page.evaluate(()=>window.HydrolandBookings.openBooking('trip-pay-1'));
  await page.locator('#confirm-booking').click();await page.locator('[data-accept-checkout-terms]').check();
  for(const url of ['javascript://localhost/%0awindow.checkoutSchemeExecuted=1','ftp://127.0.0.1/trip','data://localhost/text/html,unsafe']){
    checkoutUrl=url;const before=paymentCalls;
    await page.locator('#confirm-booking').click();await expect.poll(()=>paymentCalls).toBe(before+1);
    await expect(page.locator('#confirm-booking')).toBeEnabled();
    await expect(page.locator('#toast')).toContainText('رابط الدفع غير آمن');
    await expect(page.locator('#booking-dialog')).toBeVisible();
    expect(await page.evaluate(()=>window.checkoutSchemeExecuted)).toBeUndefined();
  }
  checkoutUrl='https://checkout.example/trip';await page.locator('#confirm-booking').click();
  await expect(page).toHaveURL('https://checkout.example/trip');
});

for(const phase of ['quote','payment'])for(const change of ['dismiss','logout','account-switch']){
  test(`delayed ${phase} JSON cannot restore consent or redirect after ${change}`,async({page})=>{
    await installAuth(page);await installCommonApi(page);
    const endpoint=phase==='quote'?'/payments/bookings/booking-pay-1/quote':'/payments';
    // authorizedFetch checks the session when the Response arrives. Hold json()
    // afterwards to exercise the separate UI continuation and redirect boundary.
    await page.addInitScript(({endpoint})=>{
      const originalFetch=window.fetch.bind(window);
      window.checkoutJsonGate={enabled:false,entered:false,released:false};
      window.fetch=async(...args)=>{
        const response=await originalFetch(...args),input=args[0];
        const pathname=new URL(typeof input==='string'?input:input.url||String(input),window.location.href).pathname;
        if(window.checkoutJsonGate.enabled&&pathname.endsWith(endpoint)){
          const parse=response.json.bind(response);
          response.json=async()=>{
            const body=await parse();window.checkoutJsonGate.enabled=false;window.checkoutJsonGate.entered=true;
            await new Promise(resolve=>{window.releaseCheckoutJson=resolve});
            window.checkoutJsonGate.released=true;return body;
          };
        }
        return response;
      };
    },{endpoint});
    const state={bookingCalls:0,paymentCalls:0,redirects:0};
    await page.route(/\/api\/v1\/trips\/trip-pay-1\/bookings$/,route=>{
      state.bookingCalls++;return json(route,{id:'booking-pay-1',tripId:'trip-pay-1',accountId:'account-pay-e2e',status:'PENDING',seats:1,price,participants:[]},201);
    });
    await page.route(/\/api\/v1\/payments\/bookings\/booking-pay-1\/quote$/,route=>json(route,{
      snapshot:{amountMinor:12500,currency:'SAR',issuer:{legalName:'PRIVATE OLD CHECKOUT ISSUER'}},quoteHash:'private-quote-1',policyVersion:'2026-11-21.1',
    }));
    await page.route(/\/api\/v1\/payments$/,route=>{
      state.paymentCalls++;return json(route,{id:'payment-local-1',bookingId:'booking-pay-1',amountMinor:12500,currency:'SAR',status:'PENDING',provider:'MOYASAR',checkoutUrl:'http://127.0.0.1:4173/provider-checkout'},201);
    });
    await page.route('http://127.0.0.1:4173/provider-checkout',route=>{
      state.redirects++;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Unexpected old checkout</title>'});
    });
    await prepare(page);
    await page.evaluate(()=>window.HydrolandBookings.openBooking('trip-pay-1'));
    await expect(page.locator('#booking-dialog')).toBeVisible();
    if(phase==='payment'){
      await page.locator('#confirm-booking').click();
      await expect(page.locator('[data-checkout-terms]')).toContainText('PRIVATE OLD CHECKOUT ISSUER');
      await page.locator('[data-accept-checkout-terms]').check();
    }
    await page.evaluate(()=>{window.checkoutJsonGate.enabled=true});
    await page.locator('#confirm-booking').click();
    await page.waitForFunction(()=>window.checkoutJsonGate.entered);
    if(change==='dismiss')await page.locator('#close-booking').click();
    else if(change==='logout')await page.evaluate(()=>window.HydrolandAuth.terminateSession());
    else await page.evaluate(()=>{const auth=window.HydrolandAuth;auth.acceptSession({accessToken:'different-checkout-account',refreshToken:'different-checkout-refresh'},auth.beginAuthAttempt())});
    await expect(page.locator('#booking-dialog')).not.toBeVisible();
    await expect(page.locator('[data-checkout-terms]')).toHaveCount(0);
    await page.evaluate(()=>window.releaseCheckoutJson());
    await page.waitForFunction(()=>window.checkoutJsonGate.released);
    await page.waitForTimeout(50);
    await expect(page.locator('[data-checkout-terms]')).toHaveCount(0);
    await expect(page.locator('#booking-dialog')).not.toBeVisible();
    expect(state.bookingCalls).toBe(1);
    expect(state.paymentCalls).toBe(phase==='payment'?1:0);
    expect(state.redirects).toBe(0);
    await expect(page).not.toHaveURL(/\/provider-checkout/);
  });
}

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

const paymentResult=()=>({id:'payment-local-1',bookingId:'booking-pay-1',amountMinor:12500,currency:'SAR',status:'CAPTURED',provider:'MOYASAR',providerStatus:'paid'});
const bookingResult=status=>({id:'booking-pay-1',tripId:'trip-pay-1',status,seats:1,trip:trip()});
const paymentDialog=page=>page.locator('#hl-payment-status-dialog');
const returnFromPayment=async page=>{
  await page.goto('/?payment=success&payment_id=payment-local-1',{waitUntil:'domcontentloaded'});
  await expect(paymentDialog(page)).toBeVisible();
  await expect(paymentDialog(page).locator('[data-payment-status-refresh]')).toBeEnabled();
};
const installPaymentStatus=async(page,state)=>{
  await page.route(/\/api\/v1\/payments\/payment-local-1\/refresh$/,route=>{
    state.refreshCalls=(state.refreshCalls||0)+1;
    expect(route.request().method()).toBe('POST');
    return json(route,state.paymentError?{message:'Temporary provider outage'}:paymentResult(),state.paymentError?503:200);
  });
  await page.route(/\/api\/v1\/trips\/bookings\/mine$/,route=>{
    state.bookingCalls=(state.bookingCalls||0)+1;
    return json(route,state.bookingError?{message:'Temporary booking outage'}:state.missingBooking?[bookingResult('CONFIRMED')].map(row=>({...row,id:'another-booking'})):[bookingResult(state.bookingStatus)],state.bookingError?503:200);
  });
  state.otherMutations=[];
  page.on('request',request=>{
    if(request.method()!=='GET'&&/\/api\/v1\/(payments$|trips\/[^/]+\/bookings$|trips\/.*\/confirm$)/.test(request.url()))state.otherMutations.push(request.url());
  });
};

test('captured payment is separate from pending approval and manual refresh follows actual confirmation',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await installAuth(page);await installCommonApi(page);
  const state={bookingStatus:'PENDING'};await installPaymentStatus(page,state);
  await returnFromPayment(page);
  const dialog=paymentDialog(page);
  await expect(dialog.locator('[data-payment-state]')).toHaveText('تم الدفع بنجاح');
  await expect(dialog.locator('[data-payment-booking-state]')).toHaveText('بانتظار تأكيد المشغّل');
  await expect(dialog.locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.');
  await expect(dialog.locator('[data-payment-next-step]')).toContainText('دون تكرار الدفع');
  expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await dialog.screenshot({path:testInfo.outputPath('visitor-payment-status-pending.png')});
  await expect.poll(()=>new URL(page.url()).searchParams.has('payment_id')).toBe(false);
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBe('payment-local-1');
  expect(state.refreshCalls).toBe(1);expect(state.bookingCalls).toBe(1);

  state.bookingStatus='CONFIRMED';
  await dialog.locator('[data-payment-status-refresh]').click();
  await expect(dialog.locator('[data-payment-booking-state]')).toHaveText('مؤكد');
  await expect(dialog.locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، وحجزك مؤكد.');
  expect(state.refreshCalls).toBe(2);expect(state.bookingCalls).toBe(2);expect(state.otherMutations).toEqual([]);

  state.bookingStatus='CANCELLED';
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(paymentDialog(page)).toBeVisible();
  await expect(paymentDialog(page).locator('[data-payment-booking-state]')).toHaveText('ملغى');
  await expect(paymentDialog(page).locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، لكن الحجز ملغى.');
  await expect(paymentDialog(page).locator('[data-payment-next-step]')).toContainText('إلغاء الحجز لا يعني استرداده تلقائيًا');
  expect(state.refreshCalls).toBe(3);expect(state.otherMutations).toEqual([]);
  await paymentDialog(page).locator('[data-payment-status-close]').click();
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBeNull();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandBookings));
  await expect(paymentDialog(page)).toHaveCount(0);
  expect(state.refreshCalls).toBe(3);
});

for(const unavailable of ['bookingError','missingBooking','unknownStatus']){
  test(`paid return does not infer confirmation from ${unavailable}`,async({page})=>{
    await installAuth(page);await installCommonApi(page);
    const state={bookingStatus:unavailable==='unknownStatus'?'UNRECOGNIZED':'CONFIRMED',[unavailable]:true};await installPaymentStatus(page,state);
    await returnFromPayment(page);
    const dialog=paymentDialog(page);
    await expect(dialog.locator('[data-payment-state]')).toHaveText('تم الدفع بنجاح');
    await expect(dialog.locator('[data-payment-booking-state]')).toHaveText('تعذر التحقق من حالة الحجز');
    await expect(dialog.locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح. تعذر التحقق من حالة الحجز.');
    await expect(dialog.locator('[data-payment-next-step]')).toContainText('ولا تكرر الدفع');
    expect(state.otherMutations).toEqual([]);
  });
}

test('manual refresh failure clears obsolete success and supports verification retry without another checkout',async({page})=>{
  await installAuth(page);await installCommonApi(page);
  const state={bookingStatus:'PENDING'};await installPaymentStatus(page,state);await returnFromPayment(page);
  const dialog=paymentDialog(page);
  state.paymentError=true;
  await dialog.locator('[data-payment-status-refresh]').click();
  await expect(dialog.locator('[data-payment-state]')).toHaveText('تعذر التحقق من الدفع');
  await expect(dialog.locator('[data-payment-booking-state]')).toHaveText('تعذر التحقق من حالة الحجز');
  await expect(dialog.locator('[data-payment-status-refresh]')).toBeEnabled();
  await expect(dialog.locator('[data-payment-next-step]')).toContainText('ولا تكرر الدفع');
  expect(state.bookingCalls).toBe(1);
  state.paymentError=false;state.bookingStatus='CONFIRMED';
  await dialog.locator('[data-payment-status-refresh]').click();
  await expect(dialog.locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، وحجزك مؤكد.');
  expect(state.refreshCalls).toBe(3);expect(state.otherMutations).toEqual([]);
});

for(const change of ['dismiss','logout','account-switch']){
  test(`late booking response cannot restore payment result after ${change}`,async({page})=>{
    await installAuth(page);await installCommonApi(page);
    await page.addInitScript(()=>{window.paymentReconciledEvents=0;window.addEventListener('hydroland:payment-reconciled',()=>window.paymentReconciledEvents++)});
    await page.route(/\/api\/v1\/payments\/payment-local-1\/refresh$/,route=>json(route,paymentResult()));
    let release,entered=false;
    const wait=new Promise(resolve=>{release=resolve});
    await page.route(/\/api\/v1\/trips\/bookings\/mine$/,async route=>{entered=true;await wait;return json(route,[bookingResult('CONFIRMED')])});
    await page.goto('/?payment=success&payment_id=payment-local-1',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>entered).toBe(true);
    await expect(paymentDialog(page)).toBeVisible();
    if(change==='dismiss')await paymentDialog(page).locator('[data-payment-status-close]').click();
    else if(change==='logout')await page.evaluate(()=>window.HydrolandAuth.terminateSession());
    else await page.evaluate(()=>{const auth=window.HydrolandAuth;auth.acceptSession({accessToken:'another-account-access',refreshToken:'another-account-refresh'},auth.beginAuthAttempt())});
    const response=page.waitForResponse(/\/api\/v1\/trips\/bookings\/mine$/);release();await response;
    await page.waitForTimeout(100);
    await expect(paymentDialog(page)).not.toBeVisible();
    await expect(page.locator('#toast')).not.toContainText('تم الدفع بنجاح');
    expect(await page.evaluate(()=>window.paymentReconciledEvents)).toBe(0);
    expect(await page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBeNull();
    expect(new URL(page.url()).searchParams.has('payment_id')).toBe(false);
  });
}

test('signed-out payment return waits for authentication before reading protected payment and booking data',async({page})=>{
  await installCommonApi(page);
  const state={bookingStatus:'PENDING'};await installPaymentStatus(page,state);
  await page.goto('/?payment=success&payment_id=payment-local-1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandBookings&&window.HydrolandAuth));
  expect(state.refreshCalls||0).toBe(0);await expect(paymentDialog(page)).toHaveCount(0);
  await page.evaluate(()=>{const auth=window.HydrolandAuth;auth.acceptSession({accessToken:'payment-e2e-access',refreshToken:'payment-e2e-refresh'},auth.beginAuthAttempt())});
  await expect(paymentDialog(page)).toBeVisible();
  await expect(paymentDialog(page).locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.');
  expect(state.refreshCalls).toBe(1);expect(state.otherMutations).toEqual([]);
});

for(const recovery of ['same-account','different-account','explicit-logout']){
  test(`expired payment-return session handles ${recovery} recovery without retaining a private result`,async({page})=>{
    await installAuth(page);await installCommonApi(page);
    await page.addInitScript(()=>{window.paymentReconciledEvents=0;window.addEventListener('hydroland:payment-reconciled',()=>window.paymentReconciledEvents++)});
    const state={bookingStatus:'PENDING',authenticatedAgain:false,authRefreshCalls:0,loginCalls:0};await installPaymentStatus(page,state);
    await page.route(/\/api\/v1\/payments\/payment-local-1\/refresh$/,route=>{
      state.refreshCalls=(state.refreshCalls||0)+1;
      expect(route.request().headers().authorization).toBe(state.authenticatedAgain?'Bearer payment-reauthenticated-access':'Bearer payment-e2e-access');
      if(!state.authenticatedAgain)return json(route,{message:'Access token expired'},401);
      return recovery==='different-account'?json(route,{message:'Payment not found'},404):json(route,paymentResult());
    });
    await page.route(/\/api\/v1\/auth\/refresh$/,route=>{
      state.authRefreshCalls++;
      expect(route.request().postDataJSON()).toEqual({refreshToken:'payment-e2e-refresh'});
      return json(route,{message:'Refresh token expired'},401);
    });
    await page.route(/\/api\/v1\/auth\/login$/,route=>{
      state.loginCalls++;state.authenticatedAgain=true;
      return json(route,{accessToken:'payment-reauthenticated-access',refreshToken:'payment-reauthenticated-refresh'});
    });
    await page.route(/\/api\/v1\/integrations\/email\/public-config$/,route=>json(route,{enabled:true,restricted:false}));
    await page.goto('/?payment=success&payment_id=payment-local-1',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>state.authRefreshCalls).toBe(1);
    await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
    await expect(paymentDialog(page)).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBe('payment-local-1');
    expect(await page.evaluate(()=>sessionStorage.getItem('hl-access-token'))).toBeNull();
    expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
    await expect(page.locator('#toast')).not.toContainText('تم الدفع بنجاح');
    expect(await page.evaluate(()=>window.paymentReconciledEvents)).toBe(0);
    expect(state.bookingCalls||0).toBe(0);

    if(recovery==='explicit-logout'){
      await page.evaluate(()=>window.HydrolandAuth.terminateSession());
      expect(await page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBeNull();
    }
    await page.locator('.hl-login-primary').click();
    const panel=page.locator('.hl-auth-panel');
    await panel.locator('input[name="email"]').fill(recovery==='different-account'?'another-account@hydroland.test':'pay-e2e@hydroland.test');
    await panel.locator('input[name="password"]').fill('Synthetic-payment-password');
    await panel.locator('.hl-auth-submit').click();
    await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
    if(recovery==='same-account'){
      await expect(paymentDialog(page).locator('[data-payment-summary]')).toHaveText('تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.');
      expect(state.refreshCalls).toBe(2);expect(state.bookingCalls).toBe(1);
      expect(await page.evaluate(()=>window.paymentReconciledEvents)).toBe(1);
    }else if(recovery==='different-account'){
      await expect(paymentDialog(page).locator('[data-payment-state]')).toHaveText('تعذر التحقق من الدفع');
      await expect(paymentDialog(page).locator('[data-payment-booking-state]')).toHaveText('تعذر التحقق من حالة الحجز');
      await expect(paymentDialog(page)).not.toContainText('رحلة جزيرة سمر');
      await expect(page.locator('#toast')).not.toContainText('تم الدفع بنجاح');
      expect(state.refreshCalls).toBe(2);expect(state.bookingCalls||0).toBe(0);
      expect(await page.evaluate(()=>window.paymentReconciledEvents)).toBe(0);
    }else{
      await expect(paymentDialog(page)).toHaveCount(0);
      expect(state.refreshCalls).toBe(1);expect(state.bookingCalls||0).toBe(0);
      expect(await page.evaluate(()=>sessionStorage.getItem('hl-payment-return-id'))).toBeNull();
    }
    expect(state.loginCalls).toBe(1);expect(state.authRefreshCalls).toBe(1);expect(state.otherMutations).toEqual([]);
  });
}
