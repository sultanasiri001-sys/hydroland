import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
test.use({viewport:{width:390,height:844}});
const revision='2026-10-09T01:00:00.000Z';
const course={id:'course-1',title:'دورة مياه مفتوحة',courseCode:'OW',description:'تدريب عملي',locationName:'جدة',startsAt:'2031-02-03T06:00:00.000Z',endsAt:'2031-02-05T10:00:00.000Z',capacity:3,remainingSeats:3,priceMinor:100000,currency:'SAR',status:'ACTIVE',organization:{displayName:'عالم الغوص'},updatedAt:revision,_count:{enrollments:0}};
const service={id:'service-1',sku:'SERVICE-1',nameAr:'صيانة معدات',description:'موعد الخدمة بالتنسيق',kind:'SERVICE',priceMinor:12550,stockQuantity:2,status:'DRAFT',currency:'SAR',updatedAt:revision,_count:{items:0}};
async function setup(page,center=false){
 const state={active:true,products:[],courses:[],writes:[]};
 const profile={id:'store-user',email:'store@example.invalid',status:'ACTIVE',person:{firstName:'سلطان',lastName:'المركز'},roleAssignments:center?[{role:'DIVE_CENTER',status:'ACTIVE'}]:[]};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));
 await page.route('**/api/v1/me/diver-profile',route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'عالم الغوص'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/store/products',route=>json(route,[{...service,status:'ACTIVE'}]));
 await page.route('**/api/v1/store/courses',route=>json(route,[course]));
 await page.route('**/api/v1/store/provider/catalog',route=>json(route,{organization:{id:'org',displayName:'عالم الغوص'},products:state.products,courses:state.courses}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI&&window.HydrolandStoreProvider&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'store-access',refreshToken:'store-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 if(center){
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
  await expect.poll(()=>page.evaluate(()=>({role:window.HydrolandPortalAccess.getCurrentRole(),allowed:window.HydrolandPortalAccess.roleAllowed('center')}))).toEqual({role:'center',allowed:true});
  const link=page.locator('[data-portal-label="المتجر والعروض"]');if(!await link.isVisible())await page.locator('.hl-role-dashboard [data-portal-menu]').click();await link.click();
 }else await page.evaluate(()=>window.HydrolandWorkspaceUI.show(document.getElementById('store')));
 return state;
}
test('one store filters services and courses, then records a training request without a goods order',async({page})=>{
 await setup(page);let enrolls=0,orders=0;
 await page.route('**/api/v1/store/courses/course-1/enroll',route=>{enrolls++;expect(route.request().method()).toBe('POST');return json(route,{id:'enrollment',status:'PENDING'},201)});
 await page.route(/\/api\/v1\/store\/orders$/,route=>{orders++;return json(route,{},201)});
 await page.evaluate(()=>window.HydrolandPublicUI.navigate('training'));await page.locator('[data-public-training-store]').click();await expect(page.locator('[data-store-type-filter="courses"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-store-course]')).toBeVisible();await expect(page.locator('[data-public-product="service-1"]')).toHaveCount(0);
 await page.locator('[data-store-course] summary').click();await expect(page.locator('[data-store-course]')).toContainText('تدريب عملي');
 page.once('dialog',d=>d.dismiss());await page.locator('[data-store-enroll]').click();expect(enrolls).toBe(0);
 page.once('dialog',d=>d.accept());await page.locator('[data-store-enroll]').click();await expect.poll(()=>enrolls).toBe(1);expect(orders).toBe(0);
 await expect(page.locator('#toast')).toContainText('لم يُخصم أي مبلغ');
 await page.locator('[data-store-type-filter="services"]').click();await expect(page.locator('[data-public-product="service-1"]')).toBeVisible();await expect(page.locator('[data-store-course]')).toHaveCount(0);
 await expect(page.locator('[data-store-manage]')).toBeHidden();
});
test('partial catalog failure retains other offers and retry restores the failed category',async({page})=>{
 await setup(page);await page.route('**/api/v1/store/products',route=>json(route,{message:'Unavailable'},503));
 await page.evaluate(()=>window.HydrolandStore.reloadProducts());await expect(page.locator('#store .hl-store-retry')).toBeVisible();await expect(page.locator('[data-store-course]')).toBeVisible();
 await page.route('**/api/v1/store/products',route=>json(route,[service]));await page.locator('#store .hl-store-retry').click();await expect(page.locator('[data-public-product="service-1"]')).toBeVisible();await expect(page.locator('#store .hl-store-retry')).toHaveCount(0);
});
test('center creates and edits a service, stops it and deletes the unused offer',async({page})=>{
 const state=await setup(page,true);
 await page.route('**/api/v1/store/provider/products',route=>{const body=route.request().postDataJSON();state.writes.push(body);state.products=[{...service,...body,id:body.requestId}];return json(route,state.products[0],201)});
 await page.locator('[data-store-manage]').click();const form=page.locator('[data-offer-form][data-type="products"][data-id=""]');await form.locator('..').locator('summary').click();
 for(const[key,value]of Object.entries({nameAr:'خدمة جديدة',sku:'NEW-SERVICE',price:'125.50',stockQuantity:'2'}))await form.locator(`[name=${key}]`).fill(value);
 await form.locator('[name=kind]').selectOption('SERVICE');await form.locator('[name=status]').selectOption('ACTIVE');await form.locator('[type=submit]').click();
 await expect(page.locator('.hl-store-provider')).toContainText('تم حفظ العرض');expect(state.writes[0]).toMatchObject({kind:'SERVICE',priceMinor:12550,stockQuantity:2});expect(state.writes[0]).not.toHaveProperty('organizationId');
 const id=state.products[0].id;let revisionCount=0;
 await page.route('**/api/v1/store/provider/products/'+id,route=>{
   state.writes.push(route.request().postDataJSON());if(route.request().method()==='DELETE'){state.products=[];return json(route,{deleted:true})}
   state.products=[{...state.products[0],...route.request().postDataJSON(),updatedAt:`2026-10-09T01:00:0${++revisionCount}.000Z`}];return json(route,state.products[0]);
 });
 await page.route('**/api/v1/store/provider/products/'+id+'/status',route=>{state.writes.push(route.request().postDataJSON());state.products[0]={...state.products[0],status:'INACTIVE',updatedAt:'2026-10-09T01:00:09.000Z'};return json(route,{status:'INACTIVE'})});
 let row=page.locator('[data-managed-offer]');await row.locator('summary').click();await row.locator('[name=nameAr]').fill('خدمة معدلة');await row.locator('[type=submit]').click();await expect(row).toContainText('خدمة معدلة');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-status]').click();await expect(row).toContainText('متوقف');
 page.once('dialog',d=>d.accept());await row.locator('[data-offer-delete]').click();await expect(page.locator('[data-managed-offer]')).toHaveCount(0);
 expect(state.writes[1].expectedUpdatedAt).toBe(revision);expect(state.writes.at(-1).expectedUpdatedAt).toBe('2026-10-09T01:00:09.000Z');
});
test('course form preserves failed values and retry identity with Riyadh dates',async({page},testInfo)=>{
 await setup(page,true);const writes=[];await page.route('**/api/v1/store/provider/courses',route=>{writes.push(route.request().postDataJSON());return json(route,{message:'تعذر الحفظ مؤقتًا'},503)});
 await page.locator('[data-store-manage]').click();const form=page.locator('[data-offer-form][data-type="courses"][data-id=""]');await form.locator('..').locator('summary').click();
 for(const[key,value]of Object.entries({title:'دورة جديدة',courseCode:'OW',locationName:'جدة',startsAt:'2031-02-03T09:00',endsAt:'2031-02-05T13:00',capacity:'3',price:'1000'}))await form.locator(`[name=${key}]`).fill(value);
 for(let i=0;i<2;i++){await form.locator('[type=submit]').click();await expect(form.locator('[data-offer-feedback]')).toHaveText('تعذر الحفظ مؤقتًا');await expect(form.locator('[name=title]')).toHaveValue('دورة جديدة')}
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('public-store-provider-mobile.png'),fullPage:true});
 expect(writes).toHaveLength(2);expect(writes[0].requestId).toBe(writes[1].requestId);expect(writes[0].startsAt).toBe(course.startsAt);expect(writes[0].priceMinor).toBe(100000);
});
test('revoked role clears provider data and prevents writes',async({page})=>{
 const state=await setup(page,true);state.products=[service];let writes=0;await page.route('**/api/v1/store/provider/products/service-1/status',route=>{writes++;return json(route,{})});
 await page.locator('[data-store-manage]').click();await expect(page.locator('[data-managed-offer]')).toBeVisible();state.active=false;
 page.once('dialog',d=>d.accept());await page.locator('[data-offer-status]').click();await expect(page.locator('.hl-store-provider')).toBeHidden();await expect(page.locator('[data-managed-offer]')).toHaveCount(0);expect(writes).toBe(0);
});
