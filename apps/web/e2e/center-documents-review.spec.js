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
 await expect(card).toContainText('منتهية الصلاحية');await expect(card).toContainText('مقبولة بالمراجعة الداخلية');await expect(card.locator('[data-license-attachment]')).toHaveCount(0);
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

async function chooseLicenseFile(form){
 await form.locator('[name="file"]').setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});
 await expect(form.locator('fieldset')).toBeVisible();
 await form.locator('[name="issuedAt"]').fill('2025-01-01');await form.locator('[name="expiresAt"]').fill('2030-01-01');
 await form.locator('[name="confirmed"]').check();
}
test('center saves confirmed fields and file in one scoped request',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[],units:[{id:'unit-a',nameAr:'وحدة المركز'}]};let created;
 await page.route('**/api/v1/center/me/licenses/save',route=>{expect(route.request().headers()['content-type']).toBe('application/json');created=route.request().postDataJSON();state.body.licenses.push({id:'new-license',status:'DRAFT',...created,licenseAssetId:'saved-file',licenseIssuedAt:created.issuedAt,licenseExpiresAt:created.expiresAt});return json(route,{id:'new-license',status:'DRAFT'},201)});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();await expect(page.locator('[data-license-create]')).toBeVisible();
 const form=page.locator('[data-license-create]');await chooseLicenseFile(form);await form.locator('[name="referenceNumber"]').fill('LIC-NEW-1');await form.locator('[name="subject"]').fill('رخصة المركز الجديدة');
 const before=state.refreshes;await form.locator('[type="submit"]').click();
 await expect(page.locator('[data-license-attachment="new-license"]')).toBeVisible();
 expect(created).toEqual({referenceNumber:'LIC-NEW-1',subject:'رخصة المركز الجديدة',type:'LICENSE',unitId:'unit-a',issuedAt:'2025-01-01',expiresAt:'2030-01-01',mimeType:'application/pdf',base64:Buffer.from('%PDF-fixture').toString('base64')});expect(state.refreshes).toBeGreaterThan(before);
});
test('renewal creates a separate draft without replacing the old license',async({page})=>{
 const state=await install(page);state.body={assets:[],units:[],licenses:[{id:'old-license',subject:'الرخصة الأصلية',referenceNumber:'OLD-1',type:'LICENSE',status:'REGISTERED',licenseAssetId:'old-asset'}]};let renewed;
 await page.route('**/api/v1/center/me/licenses/old-license/renew',route=>{renewed=route.request().postDataJSON();state.body.licenses.push({id:'renewed-license',status:'DRAFT',type:'LICENSE',...renewed});return json(route,{id:'renewed-license',status:'DRAFT'},201)});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();await page.locator('[data-center-license="old-license"] summary').click();
 const form=page.locator('[data-license-renew="old-license"]');await form.locator('[name="referenceNumber"]').fill('NEW-2');await form.locator('[type="submit"]').click();
 await expect(page.locator('[data-license-attachment="renewed-license"]')).toBeVisible();await expect(page.locator('[data-license-download="old-license"]')).toBeVisible();
 expect(renewed).toEqual({referenceNumber:'NEW-2',subject:'الرخصة الأصلية'});
});
test('duplicate reference error preserves draft form for correction',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[],units:[{id:'unit-a',nameAr:'المركز'}]};await page.route('**/api/v1/center/me/licenses/save',route=>json(route,{message:'Duplicate reference'},409));
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();await expect(page.locator('[data-license-create]')).toBeVisible();
 const form=page.locator('[data-license-create]');await chooseLicenseFile(form);await form.locator('[name="referenceNumber"]').fill('DUPLICATE');await form.locator('[name="subject"]').fill('رخصة');await form.locator('[type="submit"]').click();
 await expect(form.locator('[data-license-feedback]')).toContainText('الرقم المرجعي مستخدم');await expect(form.locator('[name="referenceNumber"]')).toHaveValue('DUPLICATE');expect(await form.locator('[name="file"]').evaluate(node=>node.files[0].name)).toBe('license.pdf');await expect(form.locator('[type="submit"]')).toBeEnabled();
});
test('license creation rechecks revoked center role before sending a write',async({page})=>{
 const state=await install(page);state.body={assets:[],licenses:[],units:[{id:'unit-a',nameAr:'المركز'}]};let writes=0;await page.route('**/api/v1/center/me/licenses/save',route=>{writes++;return json(route,{})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();await expect(page.locator('[data-license-create]')).toBeVisible();const form=page.locator('[data-license-create]');await chooseLicenseFile(form);
 await form.locator('[name="referenceNumber"]').fill('REF');await form.locator('[name="subject"]').fill('رخصة');state.active=false;await form.locator('[type="submit"]').click();
 await expect(page.locator('#hl-center-documents')).toHaveCount(0);expect(writes).toBe(0);
});

test('license registration, routing and reviewer assignment use scoped actions in order',async({page})=>{
 const state=await install(page),calls=[];const row={id:'review-license',subject:'رخصة للمراجعة',status:'DRAFT',licenseAssetId:'asset',reviewUnits:[{id:'review-unit',nameAr:'وحدة المراجعة'}],routings:[]};state.body={assets:[],units:[],licenses:[row]};
 await page.route('**/api/v1/center/me/licenses/review-license/register',route=>{calls.push('register');row.status='REGISTERED';return json(route,{status:'REGISTERED'})});
 await page.route('**/api/v1/center/me/licenses/review-license/reviews',route=>{calls.push(route.request().postDataJSON());row.routings=[{id:'review-one',reviewerOptions:[{id:'reviewer',name:'المراجع المستقل'}],canDecide:false,unitName:'وحدة المراجعة'}];return json(route,{id:'review-one'},201)});
 await page.route('**/api/v1/center/me/license-reviews/review-one/assign',route=>{calls.push(route.request().postDataJSON());row.routings[0].reviewerName='المراجع المستقل';return json(route,{id:'review-one'})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();
 await page.locator('[data-license-review-action="register"] button').click();await expect(page.locator('[data-license-attachment]')).toHaveCount(0);
 await page.locator('[data-license-review-action="route"] button').click();await page.locator('[data-license-review-action="assign"] button').click();
 await expect(page.locator('[data-license-review="review-one"]')).toContainText('المراجع: المراجع المستقل');await expect(page.locator('[data-license-review-action="decide"]')).toHaveCount(0);
 expect(calls).toEqual(['register',{toUnitId:'review-unit'},{assigneeAccountId:'reviewer'}]);
});
for(const decision of ['APPROVE','REJECT'])test(`assigned license reviewer records ${decision} and loses final-decision controls`,async({page})=>{
 const state=await install(page);const review={id:'assigned',canDecide:true,reviewerName:'مراجع',reviewerOptions:[],unitName:'المراجعة'};state.body={assets:[],licenses:[{id:'reviewed',status:'REGISTERED',routings:[review]}]};let posted;
 await page.route('**/api/v1/center/me/license-reviews/assigned/decision',route=>{posted=route.request().postDataJSON();review.decision=posted.decision;return json(route,{decision})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const form=page.locator('[data-license-review-action="decide"]');await form.locator('select').selectOption(decision);await form.locator('button').click();
 await expect(page.locator('[data-license-review="assigned"]')).toContainText(decision==='APPROVE'?'قبول داخلي':'رفض داخلي');await expect(page.locator('[data-license-review-action="decide"]')).toHaveCount(0);expect(posted).toEqual({decision});
});
for(const action of ['register','route','assign','decide'])test(`license ${action} refreshes revoked access before writing`,async({page})=>{
 const state=await install(page);const row={id:'guarded',status:action==='register'?'DRAFT':'REGISTERED',licenseAssetId:'asset',reviewUnits:[{id:'review-unit',nameAr:'المراجعة'}],routings:action==='assign'||action==='decide'?[{id:'pending',canDecide:true,reviewerOptions:[{id:'reviewer',name:'مراجع'}]}]:[]};state.body={assets:[],licenses:[row]};let writes=0;
 await page.route(/\/api\/v1\/center\/me\/(?:licenses|license-reviews)\//,route=>{writes++;return json(route,{})});
 await page.locator('[data-portal-label="المستندات والتراخيص"]').click();const form=page.locator(`[data-license-review-action="${action}"]`);await expect(form).toBeVisible();if(action==='decide')await form.locator('select').selectOption('APPROVE');const before=state.refreshes;state.active=false;
 // Positive flow covers clicks. Native submit avoids scroll/focus refresh removing the form before this authorization test can submit it.
 await form.evaluate(node=>node.requestSubmit());
 await expect(page.locator('#hl-center-documents')).toHaveCount(0);expect(writes).toBe(0);expect(state.refreshes).toBeGreaterThan(before);
});
