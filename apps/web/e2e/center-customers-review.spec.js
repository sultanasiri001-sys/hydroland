import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const rows=[{customerId:'customer-one',displayName:'عميل المركز',bookingCount:3,pendingBookings:0,confirmedBookings:2,cancelledBookings:1,totalSeats:4,nonCancelledSeats:3,trainingCount:1,activeTraining:1,completedTraining:0,lastActivityAt:'2026-10-02T00:00:00Z'}];
const pageData=(items=rows,extra={})=>({items,total:items.length,page:1,pageSize:20,totalPages:1,...extra});
const customerRoute=/\/api\/v1\/center\/me\/customers(?:\?.*)?$/;
async function install(page){
 const state={active:true,status:200,body:pageData(),reads:0,refreshes:0};const profile={id:'center-customer-review',email:'center-customer@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز العملاء'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:1}}));
 await page.route(customerRoute,route=>{state.reads++;return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterCustomers));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'customer-access',refreshToken:'customer-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center customers sidebar renders booking-derived scoped customer summary',async({page})=>{
 await install(page);await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel).toBeVisible();await expect(panel.locator('[data-center-customer="customer-one"]')).toContainText('عميل المركز');await expect(panel).toContainText('الحجوزات: 3');await expect(page.locator('#community')).not.toBeVisible();
});
test('center customers distinguishes denial, malformed payload and empty scope',async({page})=>{
 const state=await install(page);state.status=403;state.body={message:'Forbidden'};await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel.locator('[role="alert"]')).toContainText('لا تملك صلاحية');
 state.status=200;state.body={customers:[]};await panel.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
 state.body=pageData([]);await panel.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await expect(panel).toContainText('لا يوجد عملاء');
});
test('center customers escapes names and clears on logout',async({page})=>{
 const state=await install(page);state.body=pageData([{...rows[0],displayName:'<img src=x onerror="window.customerXss=1">'}]);await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.customerXss)).toBeUndefined();await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center customers discards pending response after role revocation',async({page})=>{
 const state=await install(page);let pending;await page.route(customerRoute,route=>{pending=route});await page.locator('[data-portal-label="العملاء"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()});await json(pending,pageData());await expect(page.locator('#hl-center-customers')).toHaveCount(0);await expect(page.getByText('عميل المركز')).toHaveCount(0);
});
test('center customers refreshes role before exposing booking-derived identities',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce();await window.HydrolandCenterCustomers.open()});await expect(page.locator('#hl-center-customers')).toHaveCount(0);expect(state.refreshes).toBeGreaterThanOrEqual(before+1);expect(state.reads).toBe(0);await expect(page.getByText('عميل المركز')).toHaveCount(0);
});

const detailData=(extra={})=>({customer:rows[0],bookings:pageData([{id:'booking-one',status:'CONFIRMED',seats:2,createdAt:'2026-01-01T00:00:00Z',trip:{id:'trip-one',title:'رحلة عالم الغوص',status:'COMPLETED',startsAt:'2026-02-01T06:00:00Z'}}]),training:pageData([{id:'training-one',courseCode:'OPEN_WATER',status:'ACTIVE',enrolledAt:'2026-01-02T00:00:00Z',record:{status:'IN_PROGRESS',progressPercent:40}}]),...extra});
const detailRoute=/\/api\/v1\/center\/me\/customers\/customer-one(?:\?.*)?$/;
async function show(page){await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel.locator('[data-center-customer]')).toHaveCount(1);return panel;}
test('customer search and source filters are server paged and reset to first page',async({page})=>{
 await install(page);const queries=[];await page.route(customerRoute,route=>{const q=new URL(route.request().url()).searchParams;queries.push(Object.fromEntries(q));return json(route,pageData(rows,{total:21,totalPages:2,page:Number(q.get('page'))}))});const panel=await show(page);await panel.locator('[name=q]').fill('عميل المركز');await panel.locator('[name=source]').selectOption('TRAINING');await panel.getByRole('button',{name:'بحث',exact:true}).click();await expect.poll(()=>queries.at(-1)).toMatchObject({q:'عميل المركز',source:'TRAINING',page:'1',pageSize:'20'});await panel.getByRole('button',{name:'التالي',exact:true}).click();await expect.poll(()=>queries.at(-1)?.page).toBe('2');await panel.getByRole('button',{name:'مسح البحث',exact:true}).click();await expect.poll(()=>queries.at(-1)).toMatchObject({q:'',source:'ALL',page:'1'});
});
test('customer detail presents scoped bookings and training with independent pagination',async({page})=>{
 await install(page);const requests=[];await page.route(detailRoute,route=>{const q=new URL(route.request().url()).searchParams;requests.push(Object.fromEntries(q));return json(route,detailData({bookings:pageData(detailData().bookings.items,{page:Number(q.get('bookingsPage')),total:21,totalPages:2})}))});const panel=await show(page);await panel.getByRole('button',{name:'عرض سجل العميل'}).click();const detail=panel.locator('[data-customer-detail]');await expect(detail).toContainText('رحلة عالم الغوص');await expect(detail).toContainText('40٪');await detail.getByRole('navigation',{name:'صفحات الحجوزات'}).getByRole('button',{name:'التالي'}).click();await expect.poll(()=>requests.at(-1)).toEqual({bookingsPage:'2',trainingPage:'1'});await detail.getByRole('button',{name:'إغلاق السجل'}).click();await expect(detail).toBeHidden();
});
test('late search response cannot replace newer customer results',async({page})=>{
 await install(page);const panel=await show(page);let pending;await page.route(customerRoute,route=>{if(new URL(route.request().url()).searchParams.get('q')==='قديم'){pending=route;return}return json(route,pageData([{...rows[0],displayName:'العميل الجديد'}]))});await panel.locator('[name=q]').fill('قديم');await panel.getByRole('button',{name:'بحث',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);await panel.locator('[name=q]').fill('جديد');await panel.getByRole('button',{name:'بحث',exact:true}).click();await expect(panel).toContainText('العميل الجديد');await json(pending,pageData([{...rows[0],displayName:'نتيجة قديمة'}]));await expect(panel).not.toContainText('نتيجة قديمة');await expect(panel).toContainText('العميل الجديد');
});
test('revoked role cannot request customer detail',async({page})=>{
 const state=await install(page);let reads=0;await page.route(detailRoute,route=>{reads++;return json(route,detailData())});const panel=await show(page);state.active=false;await panel.getByRole('button',{name:'عرض سجل العميل'}).click();await expect(panel).toHaveCount(0);expect(reads).toBe(0);
});
test('customer detail denial supports retry and late response is discarded after logout',async({page})=>{
 await install(page);let denied=true,pending;await page.route(detailRoute,route=>{if(denied)return json(route,{message:'not found'},404);pending=route});const panel=await show(page);await panel.getByRole('button',{name:'عرض سجل العميل'}).click();const detail=panel.locator('[data-customer-detail]');await expect(detail.locator('[role=alert]')).toContainText('غير مرتبط');denied=false;await detail.getByRole('button',{name:'إعادة تحميل السجل'}).click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,detailData());await expect(panel).toHaveCount(0);await expect(page.getByText('رحلة عالم الغوص',{exact:true})).toHaveCount(0);
});
test('training-only customer and empty search are explicit',async({page})=>{
 const state=await install(page);state.body=pageData([{...rows[0],bookingCount:0,confirmedBookings:0,cancelledBookings:0,totalSeats:0,nonCancelledSeats:0,trainingCount:2}]);const panel=await show(page);await expect(panel).toContainText('الحجوزات: 0');await expect(panel).toContainText('الدورات: 2');state.body=pageData([]);await panel.locator('[name=q]').fill('لا يوجد');await panel.getByRole('button',{name:'بحث',exact:true}).click();await expect(panel).toContainText('لا توجد نتائج مطابقة');await expect(panel).toContainText('عدد العملاء المطابقين: 0');
});
