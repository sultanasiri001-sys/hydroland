import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={active:true,failed:false,writes:[],revision:1};
 const rules=[{id:'WEATHER.WEATHER_GATE',group:'الحجز والسلامة',labelAr:'اشتراط مراجعة الطقس',description:'اختبار حالة الطقس',state:'DISABLED',revision:'a'.repeat(64)},{id:'TRAINING.ATTENDANCE_REQUIRED',group:'التدريب',labelAr:'الحضور قبل بدء الجلسة وإنهائها',description:'الإيقاف لا يسجل حضورًا ولا يمنح شهادة تلقائيًا.',state:'ENABLED',revision:'b'.repeat(64)}];
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'policy-admin',status:'ACTIVE',email:'admin@example.invalid',person:{firstName:'مدير',lastName:'اختبار'},roleAssignments:[{role:state.active?'ADMIN':'DIVER',status:'ACTIVE'}]}));
 await page.route(/\/api\/v1\/admin\/operational-controls$/,route=>json(route,rules));
 await page.route(/\/api\/v1\/admin\/operational-controls\/[^/]+$/,route=>{
  const body=route.request().postDataJSON(),id=decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());state.writes.push({id,...body});
  if(state.failed)return json(route,{message:'Stale'},409);
  const rule=rules.find(rule=>rule.id===id);rule.state=body.state;rule.revision=String(++state.revision).padStart(64,'0');return json(route,rule);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandPolicyAdmin&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'control-test',refreshToken:'control-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role=admin]').click();
 await page.locator('.hl-portal-nav-item').filter({hasText:'ضوابط الرحلات والتدريب'}).click();
 await expect(page.locator('.hl-policy-center')).toBeVisible();await expect(page.locator('[data-control-id="WEATHER.WEATHER_GATE"]')).toContainText('موقوف — OFF');
 return state;
}
test('central controls preserve current state, require a reason, toggle off/on and survive repeated navigation',async({page})=>{
 const state=await setup(page),panel=page.locator('.hl-policy-center'),card=panel.locator('[data-control-id="TRAINING.ATTENDANCE_REQUIRED"]');
 expect(state.writes).toEqual([]);await card.getByRole('button',{name:'إيقاف — OFF'}).click();expect(state.writes).toEqual([]);
 await card.getByRole('textbox').fill('تجربة موثقة للضابط التدريبي');await card.getByRole('button',{name:'إيقاف — OFF'}).click();await expect(card.locator('[data-control-status]')).toHaveText('موقوف — OFF');
 expect(state.writes[0]).toMatchObject({id:'TRAINING.ATTENDANCE_REQUIRED',state:'DISABLED',expectedRevision:'b'.repeat(64)});
 await card.getByRole('textbox').fill('إعادة تفعيل حضور التدريب');await card.getByRole('button',{name:'تشغيل — ON'}).click();await expect(card.locator('[data-control-status]')).toHaveText('مفعّل — ON');
 await returnToDiverWorkspace(page);await expect(panel).toBeHidden();await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role=admin]').click();await page.locator('.hl-portal-nav-item').filter({hasText:'ضوابط الرحلات والتدريب'}).click();await expect(card.locator('[data-control-status]')).toHaveText('مفعّل — ON');expect(state.writes).toHaveLength(2);
});
test('stale update clears usable state and requires refresh',async({page})=>{
 const state=await setup(page);state.failed=true;const panel=page.locator('.hl-policy-center'),card=panel.locator('[data-control-id="WEATHER.WEATHER_GATE"]');
 await card.getByRole('textbox').fill('اختبار تحديث متزامن للطقس');await card.getByRole('button',{name:'تشغيل — ON'}).click();await expect(panel).toContainText('تغير الإعداد بواسطة مسؤول آخر');await expect(panel.locator('[data-policy-state]')).toHaveCount(0);
 await panel.getByRole('button',{name:'تحديث الحالات'}).click();await expect(card.locator('[data-control-status]')).toHaveText('موقوف — OFF');
});
test('revoked admin cannot write or retain the panel',async({page})=>{
 const state=await setup(page);state.active=false;const panel=page.locator('.hl-policy-center'),card=panel.locator('[data-control-id="WEATHER.WEATHER_GATE"]');
 await card.getByRole('textbox').fill('محاولة تغيير بصلاحية منتهية');await card.getByRole('button',{name:'تشغيل — ON'}).click();await expect(panel).toBeHidden();expect(state.writes).toEqual([]);
});
test('mobile layout keeps controls and reason fields within the screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);const card=page.locator('[data-control-id="TRAINING.ATTENDANCE_REQUIRED"]');await card.scrollIntoViewIfNeeded();
 const bounds=await card.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(391);await expect(card.getByRole('textbox')).toBeVisible();await expect(card.getByRole('button',{name:'إيقاف — OFF'})).toBeEnabled();
});
