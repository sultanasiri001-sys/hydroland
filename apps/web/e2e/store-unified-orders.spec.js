import {test, expect} from '@playwright/test';

test.use({viewport:{width:390,height:844}, timezoneId:'America/Los_Angeles'});
const json = (route, body, status = 200) => route.fulfill({status, contentType:'application/json', body:JSON.stringify(body)});
const issuer = {organizationId:'center-original',legalName:'المركز الأصلي',displayName:'المركز الأصلي',registrationNumber:'70001234',address:'جدة'};
const startsAt = '2031-02-03T06:00:00.000Z', endsAt = '2031-02-03T10:00:00.000Z';
const product = {id:'good-1',nameAr:'قناع الغوص',sku:'MASK-1',stockQuantity:3,priceMinor:10000,currency:'SAR',status:'ACTIVE',organizationId:issuer.organizationId};
const trip = {id:'trip-1',title:'رحلة البحر',startsAt,endsAt,capacity:4,remainingSeats:4,type:'BOAT_DIVE',price:{configured:true,pricePerSeatMinor:25000},safety:{decision:'ALLOWED'},organizationId:issuer.organizationId};
const course = {id:'course-1',title:'دورة المياه المفتوحة',courseCode:'OW',startsAt,endsAt,capacity:2,remainingSeats:2,priceMinor:50000,currency:'SAR',organization:{displayName:issuer.displayName},organizationId:issuer.organizationId};
const rental = {id:'resource-1',title:'أسطوانة تأجير',sku:'TANK-1',supplier:issuer.displayName,available:true,priceMinor:7500,currency:'SAR',organizationId:issuer.organizationId};
function orderFixture() {
  const sources = [
    ['GOODS','STORE_ORDER','goods-original',10000,product.nameAr],
    ['TRIP','TRIP_BOOKING','booking-original',50000,trip.title],
    ['COURSE','TRAINING_ENROLLMENT','enrollment-original',50000,course.title],
    ['RENTAL','EQUIPMENT_RENTAL','rental-original',7500,rental.title]
  ];
  const lines = sources.map(([kind,sourceType,sourceId,amountMinor,title]) => {
    const base = {GOODS:'/store/orders/',TRIP:'/payments/bookings/',COURSE:'/payments/courses/',RENTAL:'/payments/rentals/'}[kind] + sourceId;
    const item = {version:'2026-11-21.1',source:{kind:sourceType,id:sourceId},kind:kind === 'GOODS' ? 'PHYSICAL_GOOD' : kind,title,amountMinor,currency:'SAR',issuer,quantity:kind === 'TRIP' ? 2 : 1,
      originalSchedule:{startsAt,endsAt},refundPolicy:{status:'RECORDED',snapshot:{kind:kind === 'GOODS' ? 'PHYSICAL_GOOD' : kind,version:kind === 'COURSE' ? '2026-11-21.2' : '2026-11-21.1'}}};
    const contractSnapshot = kind === 'RENTAL' ? {version:'2026-11-21.1',sourceType,sourceId,amountMinor,currency:'SAR',issuer,
      scheduledHandoverAt:startsAt,originalDueAt:endsAt,policySnapshot:{kind:'RENTAL',version:'2026-11-21.1'},damagePolicy:{version:'RENTAL_DAMAGE_1'},lines:[{resourceId:rental.id,equipmentName:rental.title,amountMinor}]}
      : kind === 'GOODS' ? {version:'2026-11-21.1',amountMinor,currency:'SAR',issuer,lines:[item]} : item;
    return {id:'line-' + kind,kind,sourceType,sourceId,organizationId:issuer.organizationId,title,amountMinor,currency:'SAR',status:kind === 'RENTAL' ? 'RESERVED' : 'PENDING',paymentStatus:'PENDING',contractSnapshot,contractHash:'hash-' + kind,capturedMinor:0,refundedMinor:0,netCollectedMinor:0,remainingMinor:amountMinor,financialReviewRequired:false,refundPending:false,
      actions:{quote:base + '/quote',checkout:kind === 'TRIP' ? '/payments' : base + '/checkout',refresh:kind === 'TRIP' ? null : base + '/refresh'}};
  });
  return {id:'unified-original',requestId:'11111111-1111-4111-8111-111111111111',currency:'SAR',totalMinor:117500,createdAt:'2026-11-26T10:00:00.000Z',paymentMode:'PER_SOURCE',financialActionExecuted:false,paidMinor:0,refundedMinor:0,netCollectedMinor:0,remainingMinor:117500,financialReviewRequired:false,refundPending:false,lines};
}
async function fixture(page) {
  const profile = {id:'buyer-original',email:'buyer@example.invalid',status:'ACTIVE',roleAssignments:[],person:{firstName:'Buyer',lastName:'Test',phone:null,professional:null}};
  const state = {order:orderFixture(),orders:[],creates:[],checkouts:[],legacyCreates:0,refreshes:[]};
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/auth/google/config', route => json(route, {enabled:false}));
  await page.route(/\/api\/v1\/me$/, route => json(route, profile));
  await page.route('**/api/v1/me/diver-profile', route => json(route, {profile:null,equipment:[]}));
  await page.route('**/api/v1/store/products', route => json(route, [product]));
  await page.route('**/api/v1/trips', route => json(route, [trip]));
  await page.route('**/api/v1/store/courses', route => json(route, [course]));
  await page.route('**/api/v1/store/rental-offers', route => json(route, [rental]));
  await page.route(/\/api\/v1\/store\/orders$/, route => {state.legacyCreates++;return json(route, {}, 201);});
  await page.route(/\/api\/v1\/store\/unified-orders$/, route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();state.creates.push(body);state.order.requestId = body.requestId;state.orders = [state.order];return json(route, state.order, 201);
    }
    return json(route, {items:route.request().headers().authorization === 'Bearer other-account' ? [] : state.orders});
  });
  for (const line of state.order.lines) {
    const policyVersion = line.kind === 'COURSE' ? '2026-11-21.2' : '2026-11-21.1';
    await page.route('**/api/v1' + line.actions.quote, route => json(route, {snapshot:line.contractSnapshot,quoteHash:line.contractHash,policyVersion}));
    await page.route('**/api/v1' + line.actions.checkout, route => {
      state.checkouts.push({kind:line.kind,body:route.request().postDataJSON()});
      line.paymentStatus = 'CAPTURED';
      if (line.kind === 'TRIP') {line.paymentId = 'payment-original';line.actions.refresh = '/payments/payment-original/refresh';}
      return json(route, {status:'CAPTURED',collectionVerified:false,checkoutUrl:null});
    });
    if (line.actions.refresh) await page.route('**/api/v1' + line.actions.refresh, route => {state.refreshes.push(line.sourceId);return json(route, {status:line.paymentStatus,collectionVerified:false});});
  }
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => Boolean(window.HydrolandStore && window.HydrolandProfile && window.HydrolandUnifiedStore));
  await page.evaluate(async () => {
    window.HydrolandAuth.acceptSession({accessToken:'buyer-access',refreshToken:'buyer-refresh'}, window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();window.HydrolandWorkspaceUI.show(document.getElementById('store'));
  });
  return state;
}
async function addMixedCart(page) {
  await page.locator('[data-store-add="good-1"]').click();
  const tripCard = page.locator('[data-store-trip="trip-1"]');
  await tripCard.locator('[name=seats]').fill('2');await tripCard.locator('[data-unified-add]').click();
  await page.locator('[data-store-course="course-1"] [data-unified-add]').click();
  const rentalCard = page.locator('[data-store-rental="resource-1"]');
  await rentalCard.locator('[name=scheduledHandoverAt]').fill('2031-02-03T09:00');
  await rentalCard.locator('[name=dueAt]').fill('2031-02-03T13:00');
  await rentalCard.locator('[data-unified-add]').click();
  await expect(page.locator('[data-unified-cart] article')).toHaveCount(4);
}
async function createMixed(page) {
  await addMixedCart(page);await page.locator('.hl-store-checkout').click();
  await expect(page.locator('[data-unified-order="unified-original"]')).toBeVisible();
}
const lineCard = (page,kind) => page.locator('[data-unified-line="line-' + kind + '"]');
async function settleResponse(page, response) {
  await (await response).finished();await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('one mobile cart keeps four offering identities, Saudi rental dates and original sources without charging', async ({page}, testInfo) => {
  const state = await fixture(page);await createMixed(page);
  expect(state.creates).toHaveLength(1);expect(state.legacyCreates).toBe(0);expect(state.checkouts).toHaveLength(0);
  expect(state.creates[0].requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(state.creates[0].items).toEqual([
    {kind:'GOODS',productId:'good-1',quantity:1,expectedUnitPriceMinor:10000},
    {kind:'TRIP',tripId:'trip-1',seats:2,expectedUnitPriceMinor:25000},
    {kind:'COURSE',courseId:'course-1',expectedUnitPriceMinor:50000},
    {kind:'RENTAL',resourceId:'resource-1',scheduledHandoverAt:'2031-02-03T09:00:00+03:00',dueAt:'2031-02-03T13:00:00+03:00',expectedUnitPriceMinor:7500}
  ]);
  await expect(page.locator('.hl-store-summary')).toHaveText('السلة فارغة');
  await expect(page.locator('[data-unified-line]')).toHaveCount(4);
  await expect(page.locator('[data-unified-orders]')).toContainText('سداد بند لا يسدد بقية الطلب');
  await lineCard(page,'COURSE').locator('summary').click();await expect(lineCard(page,'COURSE')).toContainText('2026-11-21.2');
  await expect(lineCard(page,'RENTAL').locator('[data-account-invoices]')).toHaveAttribute('data-invoice-source','rental-original');
  await expect(lineCard(page,'TRIP').locator('[data-account-invoices]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('unified-store-mobile.png'),fullPage:true});
});

test('uncertain order creation retries one request identity and retains all cart lines', async ({page}) => {
  const state = await fixture(page);await addMixedCart(page);
  await page.route(/\/api\/v1\/store\/unified-orders$/, route => {
    const body = route.request().postDataJSON();state.creates.push(body);
    if (state.creates.length === 1) return json(route, {message:'تعذر الرد؛ أعد المحاولة للطلب نفسه.'}, 503);
    return json(route, {...state.order,requestId:body.requestId}, 201);
  });
  await page.locator('.hl-store-checkout').click();await expect(page.locator('#toast')).toContainText('تعذر الرد');
  await expect(page.locator('[data-unified-cart] article')).toHaveCount(4);
  await page.locator('.hl-store-checkout').click();await expect(page.locator('[data-unified-order]')).toBeVisible();
  expect(state.creates).toHaveLength(2);expect(state.creates[0]).toEqual(state.creates[1]);expect(state.checkouts).toHaveLength(0);
});

test('goods-only cart across two centers uses one unified order with two original goods sources',async({page})=>{
  const state=await fixture(page),second={...product,id:'good-2',sku:'MASK-2',nameAr:'قناع المركز الثاني',priceMinor:3500,organizationId:'center-second'};
  await page.route('**/api/v1/store/products',route=>json(route,[product,second]));await page.evaluate(()=>window.HydrolandStore.reloadProducts());
  const first=state.order.lines[0],otherIssuer={...issuer,organizationId:second.organizationId,legalName:'المركز الثاني'},secondLine={...structuredClone(first),id:'line-GOODS-second',sourceId:'goods-second',organizationId:second.organizationId,title:second.nameAr,amountMinor:3500,remainingMinor:3500};
  secondLine.contractSnapshot={...secondLine.contractSnapshot,amountMinor:3500,issuer:otherIssuer,lines:[{...secondLine.contractSnapshot.lines[0],title:second.nameAr,amountMinor:3500,issuer:otherIssuer}]};
  secondLine.actions={quote:'/store/orders/goods-second/quote',checkout:'/store/orders/goods-second/checkout',refresh:'/store/orders/goods-second/refresh'};
  state.order={...state.order,totalMinor:13500,remainingMinor:13500,lines:[first,secondLine]};
  await page.route('**/api/v1/store/orders/goods-second/quote',route=>json(route,{snapshot:secondLine.contractSnapshot,quoteHash:'second-center-quote',policyVersion:'2026-11-21.1'}));
  await page.locator('[data-store-add="good-1"]').click();await page.locator('[data-store-add="good-2"]').click();await page.locator('.hl-store-checkout').click();
  await expect(page.locator('[data-unified-line]')).toHaveCount(2);expect(state.legacyCreates).toBe(0);expect(state.creates).toHaveLength(1);
  expect(state.creates[0].items).toEqual([{kind:'GOODS',productId:product.id,quantity:1,expectedUnitPriceMinor:10000},{kind:'GOODS',productId:second.id,quantity:1,expectedUnitPriceMinor:3500}]);
  await expect(page.locator('[data-unified-line="line-GOODS"] [data-account-invoices]')).toHaveAttribute('data-invoice-source','goods-original');
  await expect(page.locator('[data-unified-line="line-GOODS-second"] [data-account-invoices]')).toHaveAttribute('data-invoice-source','goods-second');
  const expected=await page.evaluate(()=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR'}).format(13500/100));await expect(page.locator('[data-unified-totals]')).toContainText('المتبقي للتحصيل: '+expected);
  await page.locator('[data-unified-line="line-GOODS-second"] [data-unified-pay]').click();await expect(page.locator('#hl-store-payment-dialog')).toContainText('المركز الثاني');await expect(page.locator('#hl-store-payment-dialog')).toContainText(second.nameAr);expect(state.checkouts).toHaveLength(0);
});

test('capturing one source leaves the other three payable and links the trip invoice to its payment', async ({page}) => {
  const state = await fixture(page);state.orders = [state.order];
  state.order.lines[1].paymentStatus = 'CAPTURED';state.order.lines[1].paymentId = 'trip-payment-original';state.order.lines[1].actions.refresh = '/payments/trip-payment-original/refresh';
  Object.assign(state.order.lines[1],{capturedMinor:50000,refundedMinor:25000,netCollectedMinor:25000,remainingMinor:0});Object.assign(state.order,{paidMinor:50000,refundedMinor:25000,netCollectedMinor:25000,remainingMinor:67500});
  await page.locator('.hl-store-orders').click();
  await expect(page.locator('[data-unified-pay]')).toHaveCount(3);
  await expect(lineCard(page,'TRIP').locator('[data-unified-payment-state]')).toHaveText('CAPTURED');
  await expect(lineCard(page,'RENTAL').locator('[data-unified-payment-state]')).toHaveText('PENDING');
  await expect(lineCard(page,'TRIP').locator('[data-account-invoices]')).toHaveAttribute('data-invoice-type','TRIP_PAYMENT');
  await expect(lineCard(page,'TRIP').locator('[data-account-invoices]')).toHaveAttribute('data-invoice-source','trip-payment-original');
  const totals=page.locator('[data-unified-totals]');await expect(totals).toContainText('إجمالي التحصيل');await expect(totals).toContainText('المبلغ المسترد');
  expect(await totals.locator('p').allTextContents()).toEqual(await page.evaluate(()=>[['إجمالي التحصيل',50000],['المبلغ المسترد',25000],['صافي التحصيل',25000],['المتبقي للتحصيل',67500]].map(([name,value])=>name+': '+new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR'}).format(value/100))));
  expect(state.checkouts).toHaveLength(0);
});

test('unreconciled amounts remain unknown and do not become zero or a payable duplicate',async({page})=>{
  const state=await fixture(page);state.orders=[state.order];Object.assign(state.order,{paidMinor:null,refundedMinor:null,netCollectedMinor:null,remainingMinor:null,financialReviewRequired:true,refundPending:true});
  Object.assign(state.order.lines[3],{paymentStatus:'CAPTURED',capturedMinor:null,refundedMinor:null,netCollectedMinor:null,remainingMinor:null,financialReviewRequired:true,refundPending:true});
  await page.locator('.hl-store-orders').click();
  for(const row of await page.locator('[data-unified-totals] p').allTextContents())expect(row).toContain('يتطلب مراجعة');
  await expect(page.locator('[data-unified-orders]')).toContainText('يوجد طلب رد بانتظار المطابقة.');
  await expect(lineCard(page,'RENTAL').locator('[data-unified-pay]')).toHaveCount(0);await expect(lineCard(page,'RENTAL').locator('[data-unified-source-totals]')).toContainText('يتطلب مراجعة');expect(state.checkouts).toHaveLength(0);
});

for (const kind of ['TRIP','RENTAL']) test(kind + ' checkout accepts only its original quote and independent policy', async ({page}) => {
  const state = await fixture(page);await createMixed(page);await lineCard(page,kind).locator('[data-unified-pay]').click();
  const dialog = page.locator('#hl-unified-payment-dialog');
  await expect(dialog).toContainText(kind === 'TRIP' ? 'خصم ٥٠٪' : 'خصم ٢٥٪');
  if (kind === 'RENTAL') await expect(dialog).toContainText('لا يُطلب ضمان مالي مقدم');
  await dialog.locator('[data-unified-checkout]').click();await expect(dialog.getByRole('status')).toContainText('وافق على الشروط');expect(state.checkouts).toHaveLength(0);
  await dialog.locator('[data-unified-accepted]').check();await dialog.locator('[data-unified-checkout]').click();
  await expect(dialog.getByRole('status')).toContainText('بانتظار المطابقة المالية');
  expect(state.checkouts).toEqual([{kind,body:kind === 'TRIP'
    ? {bookingId:'booking-original',idempotencyKey:'booking:booking-original',policyAcceptance:{version:'2026-11-21.1',quoteHash:'hash-TRIP'}}
    : {quoteHash:'hash-RENTAL',acceptedPolicyVersion:'2026-11-21.1',idempotencyKey:'rental:rental-original'}}]);
  await expect(page.locator('input[autocomplete="cc-number"]')).toHaveCount(0);
});

for (const transition of ['logout','account-switch','dismiss']) test('late mixed rental quote is discarded after ' + transition, async ({page}) => {
  const state = await fixture(page);await createMixed(page);let release,seen = false;const held = new Promise(resolve => release = resolve);
  await page.route('**/api/v1/payments/rentals/rental-original/quote', async route => {seen = true;await held;await json(route,{snapshot:state.order.lines[3].contractSnapshot,quoteHash:'hash-RENTAL',policyVersion:'2026-11-21.1'});});
  await lineCard(page,'RENTAL').locator('[data-unified-pay]').click();await expect.poll(() => seen).toBe(true);
  if (transition === 'dismiss') await page.locator('[data-unified-close]').click();
  else if (transition === 'logout') await page.evaluate(() => window.HydrolandAuth.terminateSession());
  else await page.evaluate(() => window.HydrolandAuth.acceptSession({accessToken:'other-account',refreshToken:'other-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  const response = page.waitForResponse('**/api/v1/payments/rentals/rental-original/quote');release();await settleResponse(page,response);
  await expect(page.locator('#hl-unified-payment-dialog')).not.toBeVisible();await expect(page.locator('[data-unified-accepted]')).toHaveCount(0);expect(state.checkouts).toHaveLength(0);
  if (transition !== 'dismiss') await expect(page.locator('[data-unified-order]')).toHaveCount(0);
});

test('late order creation cannot populate another account or erase its new cart', async ({page}) => {
  const state = await fixture(page);await addMixedCart(page);let release,seen = false;const held = new Promise(resolve => release = resolve);
  await page.route(/\/api\/v1\/store\/unified-orders$/, async route => {
    state.creates.push(route.request().postDataJSON());seen = true;await held;await json(route,state.order,201);
  });
  await page.locator('.hl-store-checkout').click();await expect.poll(() => seen).toBe(true);
  await page.evaluate(() => window.HydrolandAuth.acceptSession({accessToken:'other-account',refreshToken:'other-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  await page.evaluate(async () => {await window.HydrolandProfile.load();window.HydrolandWorkspaceUI.show(document.getElementById('store'));});
  await page.locator('[data-store-add="good-1"]').click();
  const response = page.waitForResponse(/\/api\/v1\/store\/unified-orders$/);release();await settleResponse(page,response);
  await expect(page.locator('[data-unified-order]')).toHaveCount(0);await expect(page.locator('[data-unified-cart] article')).toHaveCount(1);
  expect(await page.evaluate(() => window.HydrolandStore.getCart().map(row => row.id))).toEqual(['good-1']);expect(state.checkouts).toHaveLength(0);
});

test('late hosted checkout cannot redirect a replacement account', async ({page}) => {
  const state = await fixture(page);await createMixed(page);await lineCard(page,'RENTAL').locator('[data-unified-pay]').click();
  await page.locator('[data-unified-accepted]').check();let release,seen = false;const held = new Promise(resolve => release = resolve);
  await page.route('**/api/v1/payments/rentals/rental-original/checkout', async route => {seen = true;await held;await json(route,{status:'PENDING',checkoutUrl:'https://payments.example.invalid/original-account'});});
  await page.locator('[data-unified-checkout]').click();await expect.poll(() => seen).toBe(true);const originalURL = page.url();
  await page.evaluate(() => window.HydrolandAuth.acceptSession({accessToken:'other-account',refreshToken:'other-refresh'},window.HydrolandAuth.beginAuthAttempt()));
  const response = page.waitForResponse('**/api/v1/payments/rentals/rental-original/checkout');release();await settleResponse(page,response);
  expect(page.url()).toBe(originalURL);await expect(page.locator('#hl-unified-payment-dialog')).not.toBeVisible();await expect(page.locator('[data-unified-order]')).toHaveCount(0);expect(state.checkouts).toHaveLength(0);
});

test('a quote for a different source is rejected before presenting payment consent', async ({page}) => {
  const state = await fixture(page);await createMixed(page);
  await page.route('**/api/v1/payments/rentals/rental-original/quote',route => json(route,{snapshot:{...state.order.lines[3].contractSnapshot,sourceId:'another-rental'},quoteHash:'another-hash',policyVersion:'2026-11-21.1'}));
  await lineCard(page,'RENTAL').locator('[data-unified-pay]').click();
  await expect(page.locator('#hl-unified-payment-dialog')).toContainText('تعذر تحميل شروط الدفع.');
  await expect(page.locator('[data-unified-accepted]')).toHaveCount(0);expect(state.checkouts).toHaveLength(0);
});
