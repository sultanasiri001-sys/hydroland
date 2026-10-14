import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const report={center:{displayName:'عالم الغوص'},period:{from:'2032-01-01',to:'2032-01-31',timeZone:'Asia/Riyadh',basis:'TRIP_START_DATE'},trips:[{status:'OPEN',count:2,capacity:12}],bookings:[{status:'CONFIRMED',count:1,seats:2}],payments:[{status:'CAPTURED',currency:'SAR',count:1,amountMinor:12550},{status:'PENDING',currency:'SAR',count:1,amountMinor:20000},{status:'CAPTURED',currency:'USD',count:1,amountMinor:700}]};
async function setup(page){
 const state={active:true,status:200,body:report,reads:[]};const profile={id:'reports-owner',email:'reports@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'عالم الغوص'},metrics:{newBookings:2,tripsToday:1,activeMembers:1,totalTrips:2}}));
 await page.route(/\/api\/v1\/center\/me\/reports(?:\?|$)/,route=>{state.reads.push(new URL(route.request().url()).search);return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCenterReports&&window.HydrolandProfile&&window.HydrolandAuth));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'reports-access',refreshToken:'reports-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center reports opens scoped tables and keeps currencies and payment states separate',async({page})=>{
 const state=await setup(page);await page.locator('[data-portal-label="التقارير"]').click();const panel=page.locator('#hl-center-reports');await expect(panel).toBeVisible();await expect(panel).toContainText('125.50');await expect(panel).toContainText('معلّق');await expect(panel).toContainText('700 وحدة نقدية صغرى');await expect(panel).toContainText('ليست كشف تسوية بنكية');await expect(page.locator('.hl-admin')).toBeHidden();expect(await panel.evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.hl-service-heading').getBoundingClientRect().bottom)).toBe(true);
 await panel.locator('[name=from]').fill('2032-01-01');await panel.locator('[name=to]').fill('2032-01-31');await panel.getByRole('button',{name:'عرض التقرير'}).click();await expect.poll(()=>state.reads.at(-1)).toBe('?from=2032-01-01&to=2032-01-31');
});
test('financial report action routes to center report and pending count label is truthful',async({page})=>{
 await setup(page);await expect(page.locator('.hl-role-dashboard')).toContainText('حجوزات بانتظار التأكيد');await page.locator('[data-action-label="التقارير المالية"]').click();await expect(page.locator('#hl-center-reports')).toBeVisible();await expect(page.locator('#hl-center-reports')).toContainText('سجلات الدفع');
});
test('failed report refresh removes old totals, retains dates and supports retry',async({page})=>{
 const state=await setup(page);await page.locator('[data-portal-label="التقارير"]').click();const panel=page.locator('#hl-center-reports');await expect(panel).toContainText('125.50');await panel.locator('[name=from]').fill('2032-01-01');await panel.locator('[name=to]').fill('2032-01-31');state.status=500;await panel.getByRole('button',{name:'عرض التقرير'}).click();await expect(panel.locator('[role=alert]')).toContainText('تعذر');await expect(panel).not.toContainText('125.50');await expect(panel.locator('[name=from]')).toHaveValue('2032-01-01');state.status=200;state.body={...report,trips:[],bookings:[],payments:[]};await panel.getByRole('button',{name:'إعادة المحاولة'}).click();await expect(panel).toContainText('لا توجد رحلات');await expect(panel).toContainText('لا توجد سجلات دفع');
});
test('revoked center cannot read reports',async({page})=>{
 const state=await setup(page);state.active=false;await page.evaluate(()=>window.HydrolandCenterReports.open());await expect(page.locator('#hl-center-reports')).toHaveCount(0);expect(state.reads).toHaveLength(0);
});
test('report response cannot restore data after logout',async({page})=>{
 await setup(page);let pending;await page.route(/\/api\/v1\/center\/me\/reports(?:\?|$)/,route=>{pending=route});await page.locator('[data-portal-label="التقارير"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,report);await expect(page.locator('#hl-center-reports')).toHaveCount(0);
});
