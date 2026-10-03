import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const payload={assets:[{id:'asset-a',kind:'LICENSE_SCAN',mimeType:'application/pdf',byteSize:2048,createdAt:'2026-10-02T00:00:00Z'}],licenses:[{id:'license-a',type:'LICENSE',referenceNumber:'LIC-001',subject:'ترخيص المركز',status:'ACTIVE',updatedAt:'2026-10-02T00:00:00Z'}]};
async function install(page){
 const state={active:true,status:200,body:payload,reads:0,refreshes:0};
 const profile={id:'center-doc-review',email:'center-doc@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});
 await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
 await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز المستندات'},metrics:{newBookings:0,tripsToday:0,activeMembers:1,totalTrips:0}}));
 await page.route('**/api/v1/center/me/documents',route=>{state.reads++;return json(route,state.body,state.status)});
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterDocuments));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'doc-access',refreshToken:'doc-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
 await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();return state;
}
test('center documents sidebar renders scoped assets and licenses, not generic documents',async({page})=>{
 await install(page);const dash=page.locator('.hl-role-dashboard[data-role="center"]');
 await dash.locator('[data-portal-label="المستندات والتراخيص"]').click();
 const panel=page.locator('#hl-center-documents');await expect(panel).toBeVisible();
 await expect(panel.locator('[data-center-license="license-a"]')).toContainText('LIC-001');
 await expect(panel.locator('[data-center-asset="asset-a"]')).toContainText('LICENSE_SCAN');
 await expect(page.locator('#hl-documents')).not.toBeVisible();
});
test('center documents distinguishes denied, malformed and valid empty responses',async({page})=>{
 const state=await install(page);state.status=403;state.body={message:'Forbidden'};
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const panel=page.locator('#hl-center-documents');
 await expect(panel.locator('[role="alert"]')).toContainText('لا تملك صلاحية');
 state.status=200;state.body={assets:[],licenses:null};await panel.locator('[data-center-documents-retry]').click();
 await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
 state.body={assets:[],licenses:[]};await panel.locator('[data-center-documents-retry]').click();
 await expect(panel).toContainText('لا توجد تراخيص');await expect(panel).toContainText('لا توجد ملفات');
});
test('center documents escapes service text and clears on logout',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[{id:'x',subject:'<img src=x onerror="window.docXss=1">',type:'LICENSE',status:'ACTIVE'}]};
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const panel=page.locator('#hl-center-documents');
 await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.docXss)).toBeUndefined();
 await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(panel).toHaveCount(0);
});
test('center documents discards pending data after role revocation',async({page})=>{
 const state=await install(page);let pending;await page.route('**/api/v1/center/me/documents',route=>{pending=route});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();await expect.poll(()=>Boolean(pending)).toBe(true);
 state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()});
 await json(pending,payload);await expect(page.locator('#hl-center-documents')).toHaveCount(0);await expect(page.locator('[data-center-license="license-a"]')).toHaveCount(0);
});
test('center documents refreshes role before exposing scoped licenses and assets',async({page})=>{
 const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(()=>window.HydrolandCenterDocuments.open());await expect(page.locator('#hl-center-documents')).toHaveCount(0);expect(state.refreshes).toBeGreaterThan(before);expect(state.reads).toBe(0);await expect(page.getByText('LIC-001')).toHaveCount(0);
});

test('draft license upload reauthorizes, sends file and dates, then refreshes linked record',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[{id:'draft-license',subject:'رخصة مسودة',type:'LICENSE',status:'DRAFT',routings:[]}]};
 let uploaded;
 await page.route('**/api/v1/center/me/licenses/draft-license/attachment',route=>{
   uploaded=route.request().postDataJSON();state.body.licenses[0]={...state.body.licenses[0],licenseAssetId:'linked',licenseIssuedAt:'2025-01-01',licenseExpiresAt:'2030-01-01'};
   return json(route,{id:'draft-license',licenseAssetId:'linked'});
 });
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();
 const form=page.locator('[data-license-attachment="draft-license"]');
 await form.locator('[name="issuedAt"]').fill('2025-01-01');await form.locator('[name="expiresAt"]').fill('2030-01-01');
 await form.locator('[type="file"]').setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});
 const before=state.refreshes;await form.locator('[type="submit"]').click();
 await expect(page.locator('[data-license-download="draft-license"]')).toBeVisible();
 expect(uploaded).toEqual({mimeType:'application/pdf',base64:Buffer.from('%PDF-fixture').toString('base64'),issuedAt:'2025-01-01',expiresAt:'2030-01-01'});expect(state.refreshes).toBeGreaterThan(before);
});
test('registered license shows expired validity and internal review separately and locks upload',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[{id:'reviewed',subject:'رخصة',type:'LICENSE',status:'REGISTERED',licenseAssetId:'asset',licenseIssuedAt:'2020-01-01',licenseExpiresAt:'2021-01-01',routings:[{decision:'APPROVE'}]}]};
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const card=page.locator('[data-center-license="reviewed"]');
 await expect(card).toContainText('منتهية الصلاحية');await expect(card).toContainText('مقبولة بالمراجعة الداخلية');await expect(card.locator('form')).toHaveCount(0);
 await expect(page.locator('#hl-center-documents')).toContainText('لا تمثل تحققًا من الجهة المصدرة');
});
test('license download is revoked before requesting private bytes',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[{id:'private',status:'REGISTERED',licenseAssetId:'asset'}]};let downloads=0;
 await page.route('**/api/v1/center/me/licenses/private/attachment',route=>{downloads++;return json(route,{})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();
 await expect(page.locator('[data-license-download="private"]')).toBeVisible();state.active=false;
 await page.locator('[data-license-download="private"]').click();await expect(page.locator('#hl-center-documents')).toHaveCount(0);expect(downloads).toBe(0);
});
test('license upload cannot write after role revocation',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[{id:'private',status:'DRAFT'}]};let writes=0;
 await page.route('**/api/v1/center/me/licenses/private/attachment',route=>{writes++;return json(route,{})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const form=page.locator('[data-license-attachment="private"]');
 await form.locator('[name="issuedAt"]').fill('2025-01-01');await form.locator('[name="expiresAt"]').fill('2030-01-01');
 await form.locator('[type="file"]').setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});state.active=false;
 await form.locator('[type="submit"]').click();await expect(page.locator('#hl-center-documents')).toHaveCount(0);expect(writes).toBe(0);
});
