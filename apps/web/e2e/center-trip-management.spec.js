import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const trip={id:'trip-edit',title:'رحلة محفوظة',type:'BOAT',startsAt:'2031-02-03T06:00:00.000Z',endsAt:'2031-02-03T10:00:00.000Z',capacity:6,status:'DRAFT',updatedAt:'2026-10-04T01:00:00.000Z',price:{pricePerSeatMinor:12550,currency:'SAR'},location:{locationName:'موقع المركز',latitude:18.2,longitude:41.5},_count:{bookings:0}};
async function setup(page,rows=[]){
 const state={active:true,rows,writes:[]};const profile={id:'center-manager',email:'manager@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]}));await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'عالم الغوص'},metrics:{totalTrips:state.rows.length}}));
 await page.route(/\/api\/v1\/center\/me\/trips$/,route=>{if(route.request().method()==='GET')return json(route,state.rows);const body=route.request().postDataJSON();state.writes.push(body);state.rows=[{...trip,...body,id:body.requestId}];return json(route,state.rows[0],201)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandCenterOperations&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'trip-access',refreshToken:'trip-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();await page.locator('[data-portal-label="الرحلات"]').click();await expect(page.locator('#hl-center-operations')).toBeVisible();await expect(page.locator('#hl-center-operations').getByText('إضافة رحلة',{exact:true})).toBeVisible();return state;
}
async function newForm(page){const panel=page.locator('#hl-center-operations');await panel.getByText('إضافة رحلة',{exact:true}).click();return panel.locator('[data-center-trip-edit][data-trip-id=""]');}
async function fill(form){for(const[name,value]of Object.entries({title:'رحلة عسير',startsAt:'2031-02-03T09:00',endsAt:'2031-02-03T13:00',capacity:'6',price:'125.50',locationName:'موقع المركز',latitude:'18.2',longitude:'41.5'}))await form.locator(`[name=${name}]`).fill(value);}
test('center creates a saved trip with exact halalas and Riyadh dates',async({page})=>{
 const state=await setup(page),form=await newForm(page);await fill(form);await form.getByRole('button',{name:'حفظ الرحلة'}).click();await expect(page.locator('#hl-center-operations')).toContainText('تم حفظ الرحلة');expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({title:'رحلة عسير',type:'BOAT',startsAt:trip.startsAt,endsAt:trip.endsAt,capacity:6,pricePerSeatMinor:12550,locationName:'موقع المركز',latitude:18.2,longitude:41.5});expect(state.writes[0].requestId).toMatch(/^[0-9a-f-]{36}$/);expect(state.writes[0]).not.toHaveProperty('organizationId');expect(state.writes[0]).not.toHaveProperty('status');await expect(page.locator('[data-center-trip]')).toContainText('محفوظة — غير منشورة');
});
test('failed creation retains values and the same request identity for retry',async({page})=>{
 await setup(page);const requests=[];await page.route(/\/api\/v1\/center\/me\/trips$/,route=>{requests.push(route.request().postDataJSON());return json(route,{message:'تعذر الحفظ مؤقتًا'},503)});const form=await newForm(page);await fill(form);
 for(let attempt=0;attempt<2;attempt++){await form.getByRole('button',{name:'حفظ الرحلة'}).click();await expect(form.locator('[data-trip-feedback]')).toContainText('تعذر الحفظ');await expect(form.locator('[name=title]')).toHaveValue('رحلة عسير');await expect(form.locator('[type=submit]')).toBeEnabled();}expect(requests).toHaveLength(2);expect(requests[0].requestId).toBe(requests[1].requestId);
});
test('center edits saved trip using its revision and keeps failed edits',async({page})=>{
 await setup(page,[trip]);const article=page.locator('[data-center-trip="trip-edit"]');await article.getByText('تعديل الرحلة',{exact:true}).click();const form=article.locator('form');await expect(form.locator('[name=startsAt]')).toHaveValue('2031-02-03T09:00');await expect(form.locator('[name=price]')).toHaveValue('125.50');let body;await page.route('**/api/v1/center/me/trips/trip-edit',route=>{body=route.request().postDataJSON();return json(route,{message:'تغيرت الرحلة. أعد تحميلها قبل الحفظ.'},409)});await form.locator('[name=title]').fill('عنوان معدّل');await form.locator('[type=submit]').click();await expect(form.locator('[data-trip-feedback]')).toContainText('تغيرت الرحلة');await expect(form.locator('[name=title]')).toHaveValue('عنوان معدّل');expect(body.expectedUpdatedAt).toBe(trip.updatedAt);expect(body).not.toHaveProperty('requestId');
});
test('publishing requires confirmation and refreshes saved state',async({page})=>{
 const state=await setup(page,[trip]);let writes=0,body;await page.route('**/api/v1/center/me/trips/trip-edit/publish',route=>{writes++;body=route.request().postDataJSON();state.rows=[{...trip,status:'OPEN'}];return json(route,state.rows[0],201)});const button=page.locator('[data-center-trip-publish]');page.once('dialog',dialog=>dialog.dismiss());await button.click();expect(writes).toBe(0);page.once('dialog',dialog=>dialog.accept());await button.click();await expect(page.locator('#hl-center-operations')).toContainText('تم فتح الرحلة للحجز');expect(body).toEqual({expectedUpdatedAt:trip.updatedAt});await expect(page.locator('[data-center-trip-publish]')).toHaveCount(0);await expect(page.locator('[data-center-trip]')).toContainText('مفتوحة للحجز');
});
test('revoked center role cannot create a trip or retain its form',async({page})=>{
 const state=await setup(page),form=await newForm(page);await fill(form);state.active=false;await form.evaluate(node=>node.requestSubmit());await expect(page.locator('#hl-center-operations')).toHaveCount(0);expect(state.writes).toHaveLength(0);
});
test('revoked center role cannot publish a saved trip',async({page})=>{
 const state=await setup(page,[trip]);let writes=0;await page.route('**/api/v1/center/me/trips/trip-edit/publish',route=>{writes++;return json(route,{},201)});state.active=false;page.once('dialog',dialog=>dialog.accept());await page.locator('[data-center-trip-publish]').evaluate(node=>node.click());await expect(page.locator('#hl-center-operations')).toHaveCount(0);expect(writes).toBe(0);
});

test('center can delete an unused draft after confirmation',async({page})=>{
 const state=await setup(page,[trip]);let writes=0;
 await page.route('**/api/v1/center/me/trips/trip-edit',route=>{expect(route.request().method()).toBe('DELETE');expect(route.request().postDataJSON()).toEqual({expectedUpdatedAt:trip.updatedAt});writes++;state.rows=[];return json(route,{deleted:true})});
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-center-trip-delete]').click();expect(writes).toBe(0);
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-center-trip-delete]').click();await expect(page.locator('#hl-center-operations')).toContainText('تم حذف مسودة الرحلة');await expect(page.locator('[data-center-trip]')).toHaveCount(0);expect(writes).toBe(1);
});

