import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const rows=[{role:'OWNER',status:'ACTIVE',organization:{id:'center-profile',displayName:'عالم الغوص',kind:'DIVE_CENTER',regionCode:'ASIR',status:'PENDING_REVIEW'}}];
async function install(page){
 const state={active:true,status:200,body:rows,reads:0,refreshes:0};const profile={id:'center-customer-review',email:'center-customer@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز العملاء'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:1}}));
 await page.route('**/api/v1/organizations/mine',route=>{state.reads++;return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterBusinessProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'customer-access',refreshToken:'customer-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();return state;
}

test('business profile opens pending center identity instead of community and survives reopening',async({page})=>{
 await install(page);const link=page.locator('[data-portal-label="الملف التجاري"]');await expect(link).toBeEnabled();await link.click();const panel=page.locator('#hl-center-business-profile');await expect(panel).toBeVisible();expect(await panel.evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.hl-service-heading').getBoundingClientRect().bottom)).toBe(true);await expect(panel).toContainText('عالم الغوص');await expect(panel).toContainText('عسير');await expect(panel).toContainText('بانتظار مراجعة الإدارة');await expect(panel).toContainText('المالك');await expect(page.locator('#community')).toBeHidden();await page.locator('[data-portal-home]').click();await link.click();await expect(panel).toBeVisible();await expect(panel).toContainText('عالم الغوص');
});
test('business profile filters non-managed memberships and escapes organization fields',async({page})=>{
 const state=await install(page);state.body=[{...rows[0],organization:{...rows[0].organization,displayName:'<img src=x onerror="window.profileXss=1">'}},{...rows[0],role:'VIEWER',organization:{...rows[0].organization,displayName:'hidden viewer center'}},{...rows[0],status:'PENDING',organization:{...rows[0].organization,displayName:'hidden invitation'}}];await page.locator('[data-portal-label="الملف التجاري"]').click();const panel=page.locator('#hl-center-business-profile');await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);await expect(panel).not.toContainText('hidden');expect(await page.evaluate(()=>window.profileXss)).toBeUndefined();
});
test('business profile distinguishes failed requests and discards late data after logout',async({page})=>{
 const state=await install(page);state.status=500;await page.locator('[data-portal-label="الملف التجاري"]').click();const panel=page.locator('#hl-center-business-profile');await expect(panel.locator('[role="alert"]')).toContainText('تعذر تحميل');let pending;await page.route('**/api/v1/organizations/mine',route=>{pending=route});await panel.locator('[data-center-business-profile-retry]').click();await expect.poll(()=>Boolean(pending)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await json(pending,rows);await expect(panel).toHaveCount(0);await expect(page.getByText('عالم الغوص',{exact:true})).toHaveCount(0);
});
test('business profile rejects a revoked center role before fetching membership data',async({page})=>{
 const state=await install(page);state.active=false;const before=state.reads;await page.evaluate(()=>window.HydrolandCenterBusinessProfile.open());await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toHaveCount(0);await expect(page.locator('#hl-center-business-profile')).toHaveCount(0);expect(state.reads).toBe(before);
});

async function edit(page,state){
 state.body=structuredClone(rows);state.body[0].organization={...state.body[0].organization,status:'ACTIVE',updatedAt:'2026-10-04T00:00:00.000Z'};
 await page.locator('[data-portal-label="الملف التجاري"]').click();await page.locator('#hl-center-business-profile summary').click();return page.locator('[data-center-profile-edit]');
}
test('center manager saves business metadata and refreshes dashboard name',async({page})=>{
 const state=await install(page),form=await edit(page,state);let saved;
 await page.route('**/api/v1/center/center-profile/business-profile',route=>{saved=route.request().postDataJSON();state.body[0].organization={...state.body[0].organization,...saved,updatedAt:'2026-10-04T01:00:00.000Z'};return json(route,state.body[0].organization)});
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:state.body[0].organization.displayName},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:1}}));
 await form.locator('[name=displayName]').fill('عالم الغوص الجديد');await form.locator('[name=legalName]').fill('مؤسسة عالم الغوص');await form.locator('[name=registrationNumber]').fill('REG-123');await form.locator('[type=submit]').click();
 await expect(page.locator('#hl-center-business-profile')).toContainText('تم حفظ بيانات المركز');await expect(page.locator('#hl-center-business-profile h3')).toHaveText('عالم الغوص الجديد');await expect(page.locator('[data-center-name]').first()).toHaveText('عالم الغوص الجديد');
 expect(saved).toEqual({displayName:'عالم الغوص الجديد',legalName:'مؤسسة عالم الغوص',registrationNumber:'REG-123',regionCode:'عسير',expectedUpdatedAt:'2026-10-04T00:00:00.000Z'});
});
test('failed profile save preserves edits for correction',async({page})=>{
 const state=await install(page),form=await edit(page,state);await page.route('**/api/v1/center/center-profile/business-profile',route=>json(route,{message:'رقم السجل مستخدم لدى مركز آخر'},409));await form.locator('[name=registrationNumber]').fill('DUPLICATE');await form.locator('[type=submit]').click();await expect(form.locator('[data-center-profile-feedback]')).toContainText('رقم السجل مستخدم');await expect(form.locator('[name=registrationNumber]')).toHaveValue('DUPLICATE');await expect(form.locator('[type=submit]')).toBeEnabled();
});
test('revoked manager cannot submit business profile edits',async({page})=>{
 const state=await install(page),form=await edit(page,state);let writes=0;await page.route('**/api/v1/center/center-profile/business-profile',route=>{writes++;return json(route,{})});await form.locator('[name=displayName]').fill('changed');state.active=false;await form.evaluate(node=>node.requestSubmit());await expect(page.locator('#hl-center-business-profile')).toHaveCount(0);expect(writes).toBe(0);
});
