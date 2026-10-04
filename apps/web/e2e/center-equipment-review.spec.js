import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const item={resourceId:'eq-a',assetCode:'A-001',serialNumber:'S-001',sku:'SKU-1',location:'المستودع',stockStatus:'AVAILABLE',resourceName:'منظم غوص',active:true};
async function install(page){
 const state={active:true,moves:0,refreshes:0,reads:0};
 const profile={id:'center-eq-review',email:'center-eq@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/v1/me'){state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})}return json(route,[])});await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز المعدات'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route(/\/api\/v1\/center\/me\/equipment$/,route=>json(route,[item]));
 await page.route('**/api/v1/center/me/equipment/lookup/*',route=>json(route,item));
 await page.route('**/api/v1/center/me/equipment/eq-a/history',route=>json(route,[{movementType:'CHECK_IN',toLocation:'المستودع'}]));
 await page.route('**/api/v1/center/me/equipment/eq-a/move',route=>{state.moves++;return json(route,{stockStatus:'CHECKED_OUT'})});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterEquipment));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'eq-access',refreshToken:'eq-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();return state;
}
test('center equipment sidebar uses scoped inventory, lookup and movement history',async({page})=>{
 await install(page);const dash=page.locator('.hl-role-dashboard[data-role="center"]');await dash.locator('[data-portal-label="المعدات والمخزون"]').click();
 const panel=page.locator('#hl-center-equipment');await expect(panel).toBeVisible();await expect(panel.locator('[data-center-equipment-id="eq-a"]')).toContainText('منظم غوص');
 await panel.locator('[data-equipment-history-button]').click();await expect(panel.locator('[data-equipment-history]')).toContainText('إرجاع');
 await panel.locator('[data-equipment-lookup] input').fill('A-001');await panel.locator('[data-equipment-lookup]').evaluate(form=>form.requestSubmit());await expect(panel.locator('[data-center-equipment-id="eq-a"]')).toBeVisible();
});
test('center equipment reauthorizes before state mutation',async({page})=>{
 const state=await install(page);await page.locator('[data-portal-label="المعدات والمخزون"]').click();await expect(page.locator('#hl-center-equipment [data-move="CHECK_OUT"]')).toBeVisible();state.active=false;
 await page.locator('#hl-center-equipment [data-move="CHECK_OUT"]').click();await expect.poll(()=>state.moves).toBe(0);await expect(page.locator('#hl-center-equipment')).toHaveCount(0);
});
test('center equipment escapes API text and clears on logout',async({page})=>{
 await install(page);await page.unroute(/\/api\/v1\/center\/me\/equipment$/);await page.route(/\/api\/v1\/center\/me\/equipment$/,route=>json(route,[{...item,resourceName:'<img src=x onerror="window.eqXss=1">'}]));
 await page.locator('[data-portal-label="المعدات والمخزون"]').click();const panel=page.locator('#hl-center-equipment');await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.eqXss)).toBeUndefined();
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center equipment refreshes role before exposing inventory',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce();await window.HydrolandCenterEquipment.open()});await expect(page.locator('#hl-center-equipment')).toHaveCount(0);expect(state.refreshes).toBeGreaterThanOrEqual(before+1);expect(state.reads).toBe(0);await expect(page.getByText('منظم غوص')).toHaveCount(0);
});

test('center equipment offers only applicable movements and returns from lookup to full inventory',async({page})=>{
 await install(page);
 await page.route(/\/api\/v1\/center\/me\/equipment$/,route=>json(route,[item,{...item,resourceId:'retired',stockStatus:'RETIRED'},{...item,resourceId:'out',stockStatus:'CHECKED_OUT'}]));
 await page.locator('[data-portal-label="المعدات والمخزون"]').click();
 const panel=page.locator('#hl-center-equipment'),available=panel.locator('[data-center-equipment-id="eq-a"]');
 await expect(available).toContainText('متاحة');await expect(available.locator('[data-move="CHECK_IN"]')).toHaveCount(0);
 await expect(panel.locator('[data-center-equipment-id="retired"] [data-move]')).toHaveCount(0);
 await expect(panel.locator('[data-center-equipment-id="out"] [data-move="CHECK_IN"]')).toBeVisible();
 await panel.locator('[data-equipment-lookup] input').fill('A-001');await panel.locator('[data-equipment-lookup]').evaluate(form=>form.requestSubmit());
 await expect(panel.locator('[data-center-equipment-id]')).toHaveCount(1);
 await panel.getByRole('button',{name:'عرض جميع المعدات'}).click();await expect(panel.locator('[data-center-equipment-id]')).toHaveCount(3);
});

test('equipment creation retains input and request identity after failure then saves and refreshes',async({page})=>{
 await install(page);const payloads=[];
 await page.route(/\/api\/v1\/center\/me\/equipment$/,route=>{
  if(route.request().method()!=='POST')return json(route,payloads.length>1?[{...item,resourceName:'أسطوانة جديدة'}]:[item]);
  payloads.push(route.request().postDataJSON());return payloads.length===1?json(route,{message:'تعذر الحفظ مؤقتًا'},503):json(route,{resourceId:payloads[0].requestId,assetCode:'NEW-001'},201);
 });
 await page.locator('[data-portal-label="المعدات والمخزون"]').click();const panel=page.locator('#hl-center-equipment');
 await panel.getByText('إضافة معدة',{exact:true}).click();const form=panel.locator('[data-equipment-create]');
 await form.getByLabel('اسم المعدة').fill('أسطوانة جديدة');await form.getByLabel('الرقم التسلسلي').fill('SER-1');await form.getByLabel('موقع التخزين').fill('عسير');
 await form.getByRole('button',{name:'حفظ المعدة'}).click();await expect(form).toContainText('تعذر الحفظ مؤقتًا');await expect(form.getByLabel('اسم المعدة')).toHaveValue('أسطوانة جديدة');
 await form.getByRole('button',{name:'حفظ المعدة'}).click();await expect(form).toContainText('تم حفظ المعدة');await expect(panel.locator('[data-center-equipment]')).toContainText('أسطوانة جديدة');
 expect(payloads).toHaveLength(2);expect(payloads[0]).toEqual(payloads[1]);expect(payloads[0].organizationId).toBeUndefined();await expect(form.getByLabel('اسم المعدة')).toHaveValue('');
});
test('equipment inspection shows expired service and escapes notes',async({page})=>{
 await install(page);await page.route('**/api/v1/center/me/equipment/eq-a/inspection',route=>json(route,{blocked:true,reviewRequired:false,history:[{status:'PASS',inspectedAt:'2025-01-01T09:00:00Z',serviceExpiresAt:'2025-02-01T09:00:00Z',notes:'<img src=x onerror=alert(1)>'}]}));
 await page.locator('[data-portal-label="المعدات والمخزون"]').click();const panel=page.locator('#hl-center-equipment');await panel.getByRole('button',{name:'الفحص والصيانة'}).click();
 const box=panel.locator('[data-equipment-inspection]');await expect(box).toContainText('انتهت مدة الصيانة');await expect(box).toContainText('إخراج المعدة ممنوع');await expect(box).toContainText('اجتاز الفحص');await expect(box.locator('img')).toHaveCount(0);
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});

test('center saves inspection for review with a Riyadh service date and stable retry identity',async({page})=>{
 await install(page);const reports=[];
 await page.route('**/api/v1/center/me/equipment/eq-a/inspection',route=>{
  reports.push(route.request().postDataJSON());return reports.length===1?json(route,{message:'تعذر حفظ الفحص مؤقتًا'},503):json(route,{id:reports[0].requestId,status:'REVIEW'},201);
 });
 await page.locator('[data-portal-label="المعدات والمخزون"]').click();const panel=page.locator('#hl-center-equipment');await panel.getByText('تسجيل فحص وصيانة',{exact:true}).click();const form=panel.locator('[data-equipment-inspection-form]');
 await expect(form.locator('option[value="PASS"]')).toHaveCount(0);
 await form.getByLabel('تفاصيل الفحص والصيانة واسم الفني').fill('فحص المنظم بواسطة الفني');await form.getByLabel('انتهاء صلاحية الصيانة (اختياري)').fill('2030-02-15');
 await form.getByRole('button',{name:'حفظ الفحص'}).click();await expect(form).toContainText('تعذر حفظ الفحص مؤقتًا');await expect(form.locator('textarea')).toHaveValue('فحص المنظم بواسطة الفني');
 await form.getByRole('button',{name:'حفظ الفحص'}).click();await expect(panel.locator('[data-equipment-feedback]')).toContainText('تم حفظ الفحص وحجز المعدة');
 expect(reports).toHaveLength(2);expect(reports[0]).toEqual(reports[1]);expect(reports[0].status).toBe('REVIEW');expect(reports[0].serviceExpiresAt).toBe('2030-02-15T20:59:59.000Z');
});
