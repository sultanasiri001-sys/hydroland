import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const endpoint='**/api/v1/center/me/overview';
const snapshot=()=>({center:{id:'home-center',displayName:'مركز أمواج عسير'},date:'2030-01-02',timeZone:'Asia/Riyadh',generatedAt:'2030-01-02T06:00:00Z',metrics:{newBookings:12,tripsToday:3,activeMembers:4,totalTrips:25},operations:{draftTrips:2,confirmedBookingsToday:6,confirmedSeatsToday:15},safety:{openIncidents:3,criticalIncidents:1},licenses:{total:5,expired:1,expiringSoon:2,incomplete:1,pendingReview:2},equipment:{available:true,total:4,groups:[{status:'AVAILABLE',active:true,count:2},{status:'QUARANTINED',active:true,count:1},{status:'MAINTENANCE',active:false,count:1}]},schedule:{trips:{total:8,items:[{id:'t1',title:'رحلة جزيرة سمر',startsAt:'2030-01-03T04:00:00Z',status:'OPEN'}]},training:{total:1,items:[{id:'s1',courseCode:'OPEN-WATER',startsAt:'2030-01-04T06:00:00Z',status:'SCHEDULED'}]}}});
async function install(page){
 const state={active:true,status:200,body:snapshot(),reads:0,authorizations:0};
 const profile={id:'home-owner',email:'home@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.authorizations++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route(endpoint,route=>{state.reads++;return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandRoleDashboards));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'home-access',refreshToken:'home-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await expect(page.locator('[data-center-home-status]')).toContainText('آخر تحديث');return state;
}
const home=page=>page.locator('.hl-role-dashboard[data-role="center"]');
const refresh=page=>home(page).locator('[data-center-home-refresh]');

test('center home renders real daily counts, scoped schedules and honest stock/license labels',async({page})=>{
 await install(page);await expect(home(page).locator('.hl-role-tile b')).toHaveText(['12','3','4','25']);await expect(home(page)).toContainText('مركز أمواج عسير');
 await expect(home(page).locator('.hl-queue')).toContainText('المقاعد المؤكدة لرحلات اليوم');await expect(home(page).locator('.hl-queue')).toContainText('15');await expect(home(page).locator('.hl-center-schedule')).toContainText('المعروض 1 من 8');await expect(home(page)).toContainText('رحلة جزيرة سمر');await expect(home(page)).toContainText('OPEN-WATER');await expect(home(page).locator('.hl-center-stock')).toContainText('محجوزة للفحص');await expect(home(page).locator('.hl-center-stock')).toContainText('غير مفعلة');await expect(home(page).locator('.hl-center-license-summary')).toContainText('تنتهي خلال 30 يومًا');await expect(home(page).locator('[data-center-home-status]')).toContainText('بتوقيت الرياض');
});
test('home links all nine center sections and training mode through authorized controllers',async({page})=>{
 const state=await install(page);await page.evaluate(()=>{window.homeCalls=[];for(const key of ['Bookings','Operations','Equipment','Team','Customers','Documents','Safety','Reports','BusinessProfile'])window['HydrolandCenter'+key]={...window['HydrolandCenter'+key],open:(...args)=>window.homeCalls.push({key,args})}});
 const labels=['إدارة الحجوزات','الرحلات','المعدات والمخزون','محترفي الغوص','العملاء','المستندات والتراخيص','السلامة','التقارير','الملف التجاري'];
 const before=state.authorizations;for(const [index,label] of labels.entries()){await home(page).locator('[data-portal-label]').filter({hasText:label}).click();await expect.poll(()=>page.evaluate(()=>window.homeCalls.length)).toBe(index+1)}
 await home(page).getByRole('button',{name:'فتح جدول التدريب',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.homeCalls.map(x=>x.key))).toEqual(['Bookings','Operations','Equipment','Team','Customers','Documents','Safety','Reports','BusinessProfile','Team']);expect(await page.evaluate(()=>window.homeCalls.at(-1).args)).toEqual(['assignments']);expect(state.authorizations).toBeGreaterThanOrEqual(before+10);
 for(const [index,button] of (await home(page).locator('button.hl-role-tile').all()).entries()){await button.click();await expect.poll(()=>page.evaluate(()=>window.homeCalls.length)).toBe(index+11)}expect(await page.evaluate(()=>window.homeCalls.slice(-4).map(x=>x.key))).toEqual(['Bookings','Operations','Team','Operations']);
});
test('failed refresh removes stale values and supports recovery without false zeros',async({page})=>{
 const state=await install(page);state.status=500;await refresh(page).click();await expect(home(page).locator('[role=alert]')).toContainText('تعذر تحميل');await expect(home(page).locator('.hl-role-tile b')).toHaveText(['—','—','—','—']);await expect(home(page)).not.toContainText('رحلة جزيرة سمر');await expect(home(page).locator('[data-center-name]')).not.toContainText('أمواج');state.status=200;state.body.metrics.newBookings=9;await refresh(page).click();await expect(home(page).locator('.hl-role-tile b').first()).toHaveText('9');
});
test('malformed successful response is an error and never a zero summary',async({page})=>{
 const state=await install(page);state.body={center:{displayName:'غير صالح'},metrics:{}};await refresh(page).click();await expect(home(page).locator('[role=alert]')).toContainText('تعذر التحقق');await expect(home(page).locator('.hl-role-tile b')).toHaveText(['—','—','—','—']);
});
test('overlapping refresh results cannot overwrite the newer home snapshot',async({page})=>{
 await install(page);const pending=[];await page.route(endpoint,route=>pending.push(route));
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed')));await expect.poll(()=>pending.length).toBe(1);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('hydroland:center-profile-saved')));await expect.poll(()=>pending.length).toBe(2);
 const latest=snapshot();latest.metrics.newBookings=77;latest.center.displayName='المركز الأحدث';await json(pending[1],latest);await expect(home(page).locator('.hl-role-tile b').first()).toHaveText('77');await json(pending[0],snapshot());await expect(home(page).locator('[data-center-name]')).toHaveText('المركز الأحدث');await expect(home(page).locator('.hl-role-tile b').first()).toHaveText('77');
});
test('returning home after a service refreshes the snapshot',async({page})=>{
 const state=await install(page);await page.route('**/api/v1/center/me/safety',route=>json(route,{checklists:[],incidents:[]}));await home(page).locator('.hl-command [data-action-label="تقارير السلامة"]').click();await expect(page.locator('#hl-center-safety')).toBeVisible();state.body.metrics.newBookings=31;const reads=state.reads;await page.locator('[data-portal-home]').click();await expect(home(page).locator('.hl-role-tile b').first()).toHaveText('31');expect(state.reads).toBeGreaterThan(reads);
});
test('home role revocation blocks the read and removes protected dashboard',async({page})=>{
 const state=await install(page);state.active=false;const before=state.reads;await refresh(page).click();await expect(home(page)).toHaveCount(0);expect(state.reads).toBe(before);
});
test('late home response after logout cannot restore private center data',async({page})=>{
 await install(page);let pending;await page.route(endpoint,route=>{pending=route});await refresh(page).click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,snapshot());await expect(home(page)).toHaveCount(0);await expect(page.getByText('رحلة جزيرة سمر',{exact:true})).toHaveCount(0);
});
test('server membership denial clears summaries while retaining recovery and business profile access',async({page})=>{
 const state=await install(page);state.status=403;await refresh(page).click();await expect(home(page).locator('[role=alert]')).toContainText('صلاحية إدارة مركز نشط');await expect(home(page)).not.toContainText('رحلة جزيرة سمر');await expect(home(page).locator('[data-portal-label="الملف التجاري"]')).toBeEnabled();await expect(refresh(page)).toBeEnabled();
});
test('empty and unavailable data are distinct and escaped on home',async({page})=>{
 const state=await install(page);state.body.schedule={trips:{total:0,items:[]},training:{total:0,items:[]}};state.body.licenses={total:0,expired:0,expiringSoon:0,incomplete:0,pendingReview:0};state.body.equipment={available:false,total:null,groups:[]};await refresh(page).click();await expect(home(page)).toContainText('لا توجد رحلات قادمة');await expect(home(page)).toContainText('لا توجد جلسات تدريب');await expect(home(page)).toContainText('لا توجد تراخيص');await expect(home(page)).toContainText('ملخص المخزون غير متاح');
 state.body=snapshot();state.body.center.displayName='<img src=x onerror="window.homeXss=1">';state.body.schedule.trips.items[0].title=state.body.center.displayName;await refresh(page).click();await expect(home(page).locator('.hl-home-agenda').first()).toContainText('<img src=x');await expect(home(page).locator('.hl-home-agenda img')).toHaveCount(0);expect(await page.evaluate(()=>window.homeXss)).toBeUndefined();
});
test('mobile home keeps working shortcuts and avoids horizontal overflow',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await install(page);await expect(refresh(page)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);await page.screenshot({path:testInfo.outputPath('portal-center-home-mobile.png'),fullPage:true});await home(page).locator('[data-portal-menu]').click();await home(page).locator('[data-portal-label="السلامة"]').click();await expect(page.locator('#hl-center-safety')).toBeVisible();
});
