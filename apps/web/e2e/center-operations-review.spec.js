import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const trips=[{id:'trip-a',title:'رحلة المركز',type:'BOAT',startsAt:'2030-01-01T07:00:00Z',capacity:6,status:'OPEN',_count:{bookings:1}}];
const bookings=[{id:'booking-a',status:'CONFIRMED',seats:2,account:{person:{firstName:'عميل',lastName:'خاص'}},participants:[{id:'p1',fullName:'مشارك خاص',eligibilityStatus:'ELIGIBLE'}]}];
async function install(page){
 const state={active:true,bookingReads:0,tripReads:0,refreshes:0};const profile={id:'center-ops-review',email:'center-ops@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/v1/me'){state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})}return json(route,[])});await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز العمليات'},metrics:{newBookings:1,tripsToday:1,activeMembers:1,totalTrips:1}}));
 await page.route(/\/api\/v1\/center\/me\/trips$/,route=>json(route,trips));await page.route('**/api/v1/center/me/trips/trip-a/bookings',route=>{state.bookingReads++;return json(route,bookings)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterOperations));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'ops-access',refreshToken:'ops-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center operations sidebar exposes only center trip and booking details',async({page})=>{
 await install(page);await page.locator('[data-portal-label="الرحلات"]').click();const panel=page.locator('#hl-center-operations');await expect(panel).toBeVisible();expect(await panel.evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.hl-service-heading').getBoundingClientRect().bottom)).toBe(true);await expect(panel.locator('[data-center-trip="trip-a"]')).toContainText('رحلة المركز');
 await panel.locator('[data-center-bookings]').click();await expect(panel.locator('[data-center-booking="booking-a"]')).toContainText('عميل خاص');await expect(panel).toContainText('المشاركون: 1');await expect(panel).toContainText('مشارك خاص — مؤهل');await expect(panel).toContainText('مفتوحة للحجز');await expect(panel).toContainText('مؤكد');await expect(panel).toContainText('توقيت الرياض');
});
test('center operations reauthorizes before exposing booking identities',async({page})=>{
 const state=await install(page);await page.locator('[data-portal-label="الرحلات"]').click();await expect(page.locator('#hl-center-operations [data-center-bookings]')).toBeVisible();state.active=false;await page.locator('#hl-center-operations [data-center-bookings]').click();await expect.poll(()=>state.bookingReads).toBe(0);await expect(page.locator('#hl-center-operations')).toHaveCount(0);await expect(page.getByText('عميل خاص')).toHaveCount(0);
});
test('center operations escapes trip and customer names and clears on logout',async({page})=>{
 await install(page);await page.unroute(/\/api\/v1\/center\/me\/trips$/);await page.route(/\/api\/v1\/center\/me\/trips$/,route=>json(route,[{...trips[0],title:'<img src=x onerror="window.tripXss=1">'}]));
 await page.locator('[data-portal-label="الرحلات"]').click();const panel=page.locator('#hl-center-operations');await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.tripXss)).toBeUndefined();await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center operations refreshes role before exposing center trips',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce();await window.HydrolandCenterOperations.open()});await expect(page.locator('#hl-center-operations')).toHaveCount(0);expect(state.refreshes).toBeGreaterThanOrEqual(before+1);expect(state.tripReads).toBe(0);expect(state.bookingReads).toBe(0);await expect(page.getByText('رحلة المركز')).toHaveCount(0);
});

test('booking reload clears old identities and recovers without duplicate errors',async({page})=>{
 await install(page);await page.locator('[data-portal-label="إدارة الحجوزات"]').click();const panel=page.locator('#hl-center-operations'),button=panel.locator('[data-center-bookings]');await button.click();await expect(panel).toContainText('مشارك خاص');
 await page.route('**/api/v1/center/me/trips/trip-a/bookings',route=>json(route,{message:'تعذر تحميل الحجوزات'},500));
 for(let attempt=0;attempt<2;attempt++){await button.click();await expect(panel.locator('[role="alert"]')).toHaveCount(1);await expect(button).toBeEnabled();await expect(panel).not.toContainText('مشارك خاص');}
 await page.route('**/api/v1/center/me/trips/trip-a/bookings',route=>json(route,[]));await button.click();await expect(panel).toContainText('لا توجد حجوزات');await expect(panel.locator('[role="alert"]')).toHaveCount(0);
});
test('participant names and unknown eligibility never render executable markup',async({page})=>{
 await install(page);await page.route('**/api/v1/center/me/trips/trip-a/bookings',route=>json(route,[{...bookings[0],participants:[{fullName:'<img src=x onerror="window.participantXss=1">',eligibilityStatus:'UNKNOWN'}]}]));
 await page.locator('[data-portal-label="الرحلات"]').click();const panel=page.locator('#hl-center-operations');await panel.locator('[data-center-bookings]').click();await expect(panel).toContainText('<img src=x');await expect(panel).toContainText('تحتاج إلى مراجعة');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.participantXss)).toBeUndefined();
});
