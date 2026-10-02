import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const profile={id:'focused-center',email:'focused@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'مركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
async function fixture(page,kind){
 const state={active:true,refreshes:0,reads:0,lookupCodes:[]};
 await page.route('**/api/v1/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/v1/me'){state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})}
   if(path==='/api/v1/me/diver-profile')return json(route,{profile:null,equipment:[]});
   if(path==='/api/v1/center/me/overview')return json(route,{center:{displayName:'مركز'},metrics:{}});
   if(path==='/api/v1/center/me/equipment')return json(route,[{resourceId:'eq',resourceName:'معدة',stockStatus:'AVAILABLE'}]);
   if(path.startsWith('/api/v1/center/me/equipment/lookup/')){state.lookupCodes.push(decodeURIComponent(path.split('/').pop()));return json(route,{resourceId:'found',resourceName:'نتيجة البحث',stockStatus:'AVAILABLE'})}
   if(path==='/api/v1/center/me/equipment/eq/history'){state.reads++;return json(route,[{movementType:'CHECK_IN'}])}
   if(path==='/api/v1/center/me/trips')return json(route,[{id:'trip',title:'رحلة',status:'OPEN',_count:{bookings:1}}]);
   if(path==='/api/v1/center/me/trips/trip/bookings'){state.reads++;return json(route,[{id:'book',status:'CONFIRMED',seats:1,account:{person:{firstName:'عميل'}},participants:[]}])}
   return json(route,[]);
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterEquipment&&window.HydrolandCenterOperations));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'focused-access',refreshToken:'focused-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
 await page.locator(kind==='equipment'?'[data-portal-label="المعدات والمخزون"]':'[data-portal-label="الرحلات"]').click();
 await expect(page.locator(kind==='equipment'?'[data-equipment-history-button]':'[data-center-bookings]')).toBeVisible();
 return state;
}
test('center equipment sensitive read refreshes role and fails closed after revocation',async({page})=>{const state=await fixture(page,'equipment');const panel=page.locator('#hl-center-equipment');const before=state.refreshes;await panel.locator('[data-equipment-history-button]').click();await expect(panel.locator('[data-equipment-history]')).toContainText('CHECK_IN');expect(state.refreshes).toBeGreaterThan(before);state.active=false;await panel.locator('[data-equipment-history-button]').click();await expect(panel).toHaveCount(0)});
test('center booking identities refresh role and fail closed after revocation',async({page})=>{const state=await fixture(page,'operations');const panel=page.locator('#hl-center-operations');const before=state.refreshes;await panel.locator('[data-center-bookings]').click();await expect(panel.locator('[data-center-booking="book"]')).toContainText('عميل');expect(state.refreshes).toBeGreaterThan(before);state.active=false;await panel.locator('[data-center-bookings]').click();await expect(panel).toHaveCount(0)});

for(const kind of ['equipment','operations']){
 test(`center ${kind} binds exactly one sensitive action after each workspace recreation`,async({page})=>{
   const state=await fixture(page,kind),panel=page.locator(`#hl-center-${kind}`);
   for(let cycle=0;cycle<3;cycle++){
     await page.evaluate(async kind=>{document.dispatchEvent(new CustomEvent('hydroland:portal-cleared'));await (kind==='equipment'?window.HydrolandCenterEquipment:window.HydrolandCenterOperations).open()},kind);
     await expect(panel).toHaveCount(1);
     const reads=state.reads,refreshes=state.refreshes;
     await panel.locator(kind==='equipment'?'[data-equipment-history-button]':'[data-center-bookings]').click();
     await expect(panel.locator(kind==='equipment'?'[data-equipment-history]':'[data-center-booking="book"]')).toContainText(kind==='equipment'?'CHECK_IN':'عميل');
     expect(state.reads).toBe(reads+1);expect(state.refreshes).toBeGreaterThan(refreshes);
   }
 });
 test(`center ${kind} discards authorization from a removed workspace`,async({page})=>{
   const state=await fixture(page,kind),panel=page.locator(`#hl-center-${kind}`);
   let release,intercepted=0;
   const gate=new Promise(resolve=>{release=resolve});
   await page.route(/\/api\/v1\/me$/,async route=>{intercepted++;await gate;await json(route,profile)});
   await panel.locator(kind==='equipment'?'[data-equipment-history-button]':'[data-center-bookings]').click();
   await expect.poll(()=>intercepted).toBeGreaterThan(0);
   const reads=state.reads;
   await page.evaluate(async kind=>{
     document.dispatchEvent(new CustomEvent('hydroland:portal-cleared'));
     window.HydrolandProfileData={profile:{id:'replacement-view',roles:[{role:'DIVE_CENTER',status:'ACTIVE'}]}};
     await (kind==='equipment'?window.HydrolandCenterEquipment:window.HydrolandCenterOperations).open();
   },kind);
   const finished=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/me');
   release();const response=await finished;await response.finished();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   expect(await page.evaluate(()=>window.HydrolandProfileData?.profile?.id)).toBe('replacement-view');
   expect(state.reads).toBe(reads);
   await expect(panel).toBeVisible();
   await expect(panel).not.toContainText(kind==='equipment'?'CHECK_IN':'عميل');
 });
}

test('center equipment captures lookup input before asynchronous authorization',async({page})=>{
 const state=await fixture(page,'equipment'),panel=page.locator('#hl-center-equipment');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await panel.locator('[data-equipment-lookup] input').fill('ASSET / 123');
 const refreshes=state.refreshes;
 await panel.locator('[data-equipment-lookup] button').click();
 await expect(panel.locator('[data-center-equipment-id="found"]')).toContainText('نتيجة البحث');
 expect(state.lookupCodes).toEqual(['ASSET / 123']);expect(state.refreshes).toBeGreaterThan(refreshes);expect(errors).toEqual([]);
});
