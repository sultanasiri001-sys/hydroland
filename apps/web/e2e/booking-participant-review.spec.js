import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(r,body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={active:true,writes:0,conflict:false,status:'PENDING',eligibility:'PENDING',name:'مشارك اختبار',revision:'2026-10-22T13:00:00.000Z'};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'review-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:state.active?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route(/\/api\/v1\/trips\/admin$/,r=>json(r,[{id:'trip-review',title:'رحلة اختبار إجرائي',type:'SHORE',status:'OPEN',startsAt:new Date(Date.now()+86400000).toISOString(),capacity:1}]));
 await page.route('**/trips/admin/trip-review/bookings',r=>json(r,[{id:'booking-review',status:state.status,seats:1,account:{person:{firstName:'حاجز',lastName:'اختبار'}},participants:[{id:'participant-review',fullName:state.name,eligibilityStatus:state.eligibility,certificationTitle:'بيانات مقدمة للاختبار',updatedAt:state.revision}]}]));
 await page.route('**/trips/admin/trip-review/bookings/booking-review/participants/participant-review/eligibility',r=>{
  state.writes++;const b=r.request().postDataJSON();expect(b.reviewed).toBe(true);expect(b.expectedUpdatedAt).toBe(state.revision);expect(b.reason).toBe('مراجعة إجرائية معزولة للاختبار');
  if(state.conflict)return json(r,{message:'تغيرت بيانات المشارك؛ حدّث الحجوزات وراجعها مجددًا.'},409);
  state.eligibility=b.status;state.revision='2026-10-22T13:01:00.000Z';return json(r,[]);
 });
 await page.route('**/trips/admin/trip-review/bookings/booking-review/confirm',r=>{expect(state.eligibility).toBe('ELIGIBLE');state.status='CONFIRMED';return json(r,{id:'booking-review',status:'CONFIRMED'})});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandBookingAdmin));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'isolated-admin-token',refreshToken:'isolated-admin-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('[data-portal-label="الرحلات والحجوزات"]').click();
 await expect(page.locator('[data-admin-booking="booking-review"]')).toBeVisible();return state;
}
async function prepare(page,status='ELIGIBLE'){
 await page.locator('[data-admin-participant] summary').click();const form=page.locator('[data-participant-review]');await form.getByLabel('قرار أهلية المشارك',{exact:true}).selectOption(status);await form.getByLabel('ملاحظات مراجعة الأهلية',{exact:true}).fill('مراجعة إجرائية معزولة للاختبار');return form;
}
for(const outcome of ['ELIGIBLE','REJECTED'])test(`admin participant ${outcome} review persists independently of booking confirmation`,async({page})=>{
 const state=await setup(page),form=await prepare(page,outcome);await form.getByRole('button',{name:'حفظ مراجعة الأهلية'}).click();expect(state.writes).toBe(0);await form.getByRole('checkbox').check();await form.getByRole('button',{name:'حفظ مراجعة الأهلية'}).click();await expect(page.locator('[data-admin-participant] summary')).toContainText(outcome==='ELIGIBLE'?'مؤهل':'مرفوض');expect(state.status).toBe('PENDING');expect(state.writes).toBe(1);
 if(outcome==='ELIGIBLE'){await page.locator('[data-confirm-booking]').click();await expect(page.locator('[data-admin-booking]')).toContainText('مؤكد');await expect(page.locator('[data-participant-review]')).toHaveCount(0)}
 await page.getByRole('button',{name:'تحديث الحجوزات',exact:true}).click();await expect(page.locator('[data-admin-participant] summary')).toContainText(outcome==='ELIGIBLE'?'مؤهل':'مرفوض');
});
test('stale review preserves notes and revoked admin cannot submit a second decision',async({page})=>{
 const state=await setup(page);state.conflict=true;const form=await prepare(page);await form.getByRole('checkbox').check();await form.getByRole('button',{name:'حفظ مراجعة الأهلية'}).click();await expect(form).toContainText('تغيرت بيانات المشارك');await expect(form.getByLabel('ملاحظات مراجعة الأهلية')).toHaveValue('مراجعة إجرائية معزولة للاختبار');state.active=false;await form.getByRole('button',{name:'حفظ مراجعة الأهلية'}).click();await expect(page.locator('[data-admin-booking]')).toHaveCount(0);expect(state.writes).toBe(1);
});
test('participant names are escaped, mobile form fits, logout clears private booking data',async({page})=>{
 const state=await setup(page);state.name='<img src=x onerror=alert(1)>';await page.getByRole('button',{name:'تحديث الحجوزات',exact:true}).click();await expect(page.locator('[data-admin-participant] summary')).toContainText('<img src=x');await expect(page.locator('.hl-booking-admin img')).toHaveCount(0);const form=await prepare(page);await page.setViewportSize({width:390,height:844});expect(await form.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-admin-booking]')).toHaveCount(0);await expect(page.locator('.hl-booking-admin')).toBeHidden();
});
