import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher,returnToDiverWorkspace} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
  const state={policy:'ENABLED',active:true,writes:[],failed:false};
  const rule=()=>({category:'BOOKING',ruleKey:'SAFETY_APPROVAL',state:state.policy});
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,async route=>{if(state.authorizationGate)await state.authorizationGate;return json(route,{id:'policy-admin',status:'ACTIVE',email:'admin@example.invalid',person:{firstName:'مدير',lastName:'اختبار'},roleAssignments:[{role:state.active?'ADMIN':'DIVER',status:'ACTIVE'}]});});
  await page.route(/\/api\/v1\/admin\/policies(?:\?.*)?$/,route=>json(route,[rule()]));
  await page.route('**/api/v1/admin/policies/BOOKING/SAFETY_APPROVAL/state',route=>{
    state.writes.push(route.request().postDataJSON());
    if(state.failed)return json(route,{message:'Unavailable'},503);
    state.policy=route.request().postDataJSON().state;return json(route,rule());
  });
  await page.route(/\/api\/v1\/trips$/,route=>json(route,[{id:'trip-policy-test',title:'رحلة اختبار السياسة',type:'SHORE_DIVE',startsAt:'2099-01-01T10:00:00Z',capacity:1,remainingSeats:1,price:{configured:true,pricePerSeatMinor:100,currency:'SAR'},safety:null,bookingPolicy:{safetyApproval:state.policy},weather:{evaluation:{blocking:false}}}]));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandBookingSafetyControl&&window.HydrolandProfile));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'policy-test',refreshToken:'policy-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load();});
  await openAdmin(page);
  await expect(page.locator('[data-booking-safety-control]')).toContainText('مفعّل — اعتماد السلامة مطلوب');
  return state;
}
async function openAdmin(page){
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role=admin]').click();
  await page.locator('.hl-portal-nav-item').filter({hasText:'الرحلات والحجوزات'}).click();
}
test('admin explicitly disables and re-enables the requirement with an audited reason and matching store availability',async({page})=>{
  const state=await setup(page),panel=page.locator('[data-booking-safety-control]');
  expect(state.writes).toEqual([]);await expect(panel.getByRole('button',{name:'تفعيل اشتراط السلامة',exact:true})).toBeDisabled();
  await panel.getByRole('button',{name:'إيقاف اشتراط السلامة',exact:true}).click();expect(state.writes).toEqual([]);
  await panel.getByLabel('سبب تغيير اشتراط السلامة').fill('اختبار اختياري موثق للحجز');
  await panel.getByRole('button',{name:'إيقاف اشتراط السلامة',exact:true}).click();
  await expect(panel).toContainText('موقوف — اعتماد السلامة اختياري');
  expect(state.writes).toEqual([{state:'DISABLED',reason:'اختبار اختياري موثق للحجز'}]);
  await returnToDiverWorkspace(page);await page.getByRole('link',{name:'المتجر والتأجير',exact:true}).click();
  await expect(page.locator('#store [data-trip-id="trip-policy-test"]')).toBeEnabled();
  await openAdmin(page);await panel.getByLabel('سبب تغيير اشتراط السلامة').fill('إعادة تفعيل اشتراط الاعتماد');
  await panel.getByRole('button',{name:'تفعيل اشتراط السلامة',exact:true}).click();await expect(panel).toContainText('مفعّل — اعتماد السلامة مطلوب');
  await returnToDiverWorkspace(page);await page.getByRole('link',{name:'المتجر والتأجير',exact:true}).click();
  await expect(page.locator('#store [data-trip-id="trip-policy-test"]')).toBeDisabled();expect(state.writes).toHaveLength(2);
});
test('failed writes require a fresh state read instead of claiming success',async({page})=>{
  const state=await setup(page);state.failed=true;const panel=page.locator('[data-booking-safety-control]');
  await panel.getByLabel('سبب تغيير اشتراط السلامة').fill('اختبار فشل حفظ الإعداد');await panel.getByRole('button',{name:'إيقاف اشتراط السلامة',exact:true}).click();
  await expect(panel).toContainText('تعذر تأكيد الحفظ');await expect(panel.getByRole('button',{name:'إيقاف اشتراط السلامة',exact:true})).toBeDisabled();
  await panel.getByRole('button',{name:'تحديث حالة اشتراط السلامة'}).click();await expect(panel).toContainText('مفعّل — اعتماد السلامة مطلوب');
});
test('fresh role authorization prevents a revoked administrator from changing policy',async({page})=>{
  const state=await setup(page),panel=page.locator('[data-booking-safety-control]'),button=panel.getByRole('button',{name:'إيقاف اشتراط السلامة',exact:true});
  await panel.getByLabel('سبب تغيير اشتراط السلامة').fill('يجب رفض تغيير غير مخول');await expect(button).toBeEnabled();
  // Hold revoked refresh responses until the real click dispatches. Otherwise
  // correct background enforcement can remove the form before the test acts.
  let release;state.authorizationGate=new Promise(resolve=>release=resolve);state.active=false;
  try{await button.click()}finally{release();state.authorizationGate=null}
  await expect(panel).toBeHidden();expect(state.writes).toEqual([]);
});
test('missing or malformed policy stays enforced; optional approval never ignores deferral or weather',async({page})=>{
  await setup(page);
  const results=await page.evaluate(()=>{
    const trip={remainingSeats:1,startsAt:'2099-01-01',price:{configured:true},safety:null};const explain=window.HydrolandBookingAvailability.explain;
    return [explain(trip),explain({...trip,bookingPolicy:{safetyApproval:'invalid'}}),explain({...trip,bookingPolicy:{safetyApproval:'DISABLED'}}),explain({...trip,bookingPolicy:{safetyApproval:'DISABLED'},safety:{decision:'DEFERRED'}}),explain({...trip,bookingPolicy:{safetyApproval:'DISABLED'},weather:{evaluation:{blocking:true,decision:'UNAVAILABLE'}}})];
  });
  expect(results).toEqual(['تحتاج اعتماد السلامة','تحتاج اعتماد السلامة','','مؤجلة بقرار السلامة','بيانات الطقس غير متاحة']);
});
