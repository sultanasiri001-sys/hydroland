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

for(const width of [390,1280])test(`center topbar searches bookings, customers and equipment at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await install(page);
 const form=page.locator('.hl-portal-search'),input=form.getByRole('textbox'),scope=form.getByRole('combobox');
 await input.fill('عميل المركز');await scope.selectOption('customers');await form.getByRole('button',{name:'بحث',exact:true}).click();
 await expect(page.locator('#hl-center-customers')).toBeVisible();await expect(page.locator('#hl-center-customers [name=q]')).toHaveValue('عميل المركز');await expect(page.locator('[data-center-customer]')).toContainText('عميل المركز');
 let bookingQuery;await page.route(/\/api\/v1\/center\/me\/bookings\?/,route=>{bookingQuery=new URL(route.request().url()).searchParams;return json(route,{items:[{id:'B-1',customerName:'عميل الحجز',status:'PENDING',seats:1,trip:{title:'رحلة المركز'}}],total:1,page:1,totalPages:1,counts:[]})});
 await scope.selectOption('bookings');await input.fill('B-1');await form.getByRole('button',{name:'بحث',exact:true}).click();await expect(page.locator('[data-center-booking="B-1"]')).toBeVisible();expect(bookingQuery.get('q')).toBe('B-1');expect(bookingQuery.get('status')).toBe('ALL');expect(bookingQuery.get('page')).toBe('1');
 let code;await page.route('**/center/me/equipment/lookup/**',route=>{code=decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());return json(route,{resourceId:'gear-1',resourceName:'معدة المركز',assetCode:'A/1',stockStatus:'AVAILABLE',active:true})});
 await scope.selectOption('equipment');await input.fill('A/1');await form.getByRole('button',{name:'بحث',exact:true}).click();await expect(page.locator('[data-center-equipment-id="gear-1"]')).toBeVisible();expect(code).toBe('A/1');
 expect(await form.evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBe(true);
});
test('center search denies revoked role before reading customer records',async({page})=>{
 const state=await install(page);state.active=false;const form=page.locator('.hl-portal-search');await form.getByRole('combobox').selectOption('customers');await form.getByRole('textbox').fill('عميل');await form.getByRole('button',{name:'بحث',exact:true}).click();await expect(page.locator('#hl-center-customers')).toHaveCount(0);await expect.poll(()=>state.refreshes).toBeGreaterThan(1);expect(state.reads).toBe(0);
});
test('center search discards a late response after logout',async({page})=>{
 await install(page);let pending;await page.route(customerRoute,route=>{pending=route});const form=page.locator('.hl-portal-search');await form.getByRole('combobox').selectOption('customers');await form.getByRole('textbox').fill('عميل');await form.getByRole('button',{name:'بحث',exact:true}).click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,pageData());await expect(page.locator('#hl-center-customers')).toHaveCount(0);await expect(page.getByText('عميل المركز',{exact:true})).toHaveCount(0);
});
