import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const rows=[{displayName:'عميل المركز',bookingCount:3,confirmedBookings:2,totalSeats:4,lastBookingAt:'2026-10-02T00:00:00Z'}];
async function install(page){
 const state={active:true,status:200,body:rows,reads:0,refreshes:0};const profile={id:'center-customer-review',email:'center-customer@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز العملاء'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:1}}));
 await page.route('**/api/v1/center/me/customers',route=>{state.reads++;return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterCustomers));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'customer-access',refreshToken:'customer-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center customers sidebar renders booking-derived scoped customer summary',async({page})=>{
 await install(page);await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel).toBeVisible();await expect(panel.locator('[data-center-customer="0"]')).toContainText('عميل المركز');await expect(panel).toContainText('3 حجز');await expect(page.locator('#community')).not.toBeVisible();
});
test('center customers distinguishes denial, malformed payload and empty scope',async({page})=>{
 const state=await install(page);state.status=403;state.body={message:'Forbidden'};await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel.locator('[role="alert"]')).toContainText('لا تملك صلاحية');
 state.status=200;state.body={customers:[]};await panel.locator('[data-center-customers-retry]').click();await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
 state.body=[];await panel.locator('[data-center-customers-retry]').click();await expect(panel).toContainText('لا يوجد عملاء');
});
test('center customers escapes names and clears on logout',async({page})=>{
 const state=await install(page);state.body=[{...rows[0],displayName:'<img src=x onerror="window.customerXss=1">'}];await page.locator('[data-portal-label="العملاء"]').click();const panel=page.locator('#hl-center-customers');await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.customerXss)).toBeUndefined();await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center customers discards pending response after role revocation',async({page})=>{
 const state=await install(page);let pending;await page.route('**/api/v1/center/me/customers',route=>{pending=route});await page.locator('[data-portal-label="العملاء"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()});await json(pending,rows);await expect(page.locator('#hl-center-customers')).toHaveCount(0);await expect(page.getByText('عميل المركز')).toHaveCount(0);
});
test('center customers refreshes role before exposing booking-derived identities',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce();await window.HydrolandCenterCustomers.open()});await expect(page.locator('#hl-center-customers')).toHaveCount(0);expect(state.refreshes).toBeGreaterThanOrEqual(before+1);expect(state.reads).toBe(0);await expect(page.getByText('عميل المركز')).toHaveCount(0);
});
