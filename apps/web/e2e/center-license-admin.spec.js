import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={active:true,rows:[{id:'review-one',subject:'رخصة عالم الغوص',referenceNumber:'REF-123',organization:{displayName:'عالم الغوص'},licenseIssuedAt:'2020-01-01',licenseExpiresAt:'2099-01-01',licenseReviewStatus:'PENDING',updatedAt:'2026-10-04T00:00:00.000Z'}]};
 await page.route('**/api/v1/**',route=>json(route,[]));
 await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'exec-account',email:'exec@example.invalid',status:'ACTIVE',person:{firstName:'إدارة',lastName:'عليا'},roleAssignments:state.active?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route('**/api/v1/admin/center-licenses',route=>json(route,state.rows));
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterLicenseAdmin));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'admin-test',refreshToken:'admin-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();
 await page.locator('[data-portal-label="الموافقات والطلبات"]').click();
 try{await expect(page.locator('[data-platform-license="review-one"]')).toBeVisible()}catch(error){console.log('LICENSE_VISIBILITY',await page.evaluate(()=>{const nodes=[];let node=document.querySelector('[data-platform-license="review-one"]');while(node){nodes.push({tag:node.tagName,id:node.id,classes:node.className,hidden:node.hidden,display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility});node=node.parentElement}return {nodes,workspace:{...document.body.dataset},role:window.HydrolandPortalAccess?.getCurrentRole?.()}}));throw error}return state;
}
for(const outcome of ['APPROVED','REJECTED'])test(`independent platform admin saves ${outcome} with reviewed revision`,async({page})=>{
 const state=await setup(page);let posted;
 await page.route('**/api/v1/admin/center-licenses/review-one/decision',route=>{posted=route.request().postDataJSON();state.rows=[];return json(route,{status:outcome},201)});
 const form=page.locator('[data-license-admin-decision]');await form.locator('[name=outcome]').selectOption(outcome);await form.locator('[name=reason]').fill('تمت مراجعة الملف');await form.locator('[name=confirmed]').check();await form.locator('[type=submit]').click();
 await expect(page.locator('[data-platform-license]')).toHaveCount(0);expect(posted).toEqual({outcome,reason:'تمت مراجعة الملف',expectedUpdatedAt:'2026-10-04T00:00:00.000Z'});
});
test('failed or stale decision keeps explanation for correction',async({page})=>{
 await setup(page);await page.route('**/api/v1/admin/center-licenses/review-one/decision',route=>json(route,{message:'تغير الطلب، حدّث الصفحة'},409));const form=page.locator('[data-license-admin-decision]');await form.locator('[name=outcome]').selectOption('REJECTED');await form.locator('[name=reason]').fill('المرفق غير واضح');await form.locator('[name=confirmed]').check();await form.locator('[type=submit]').click();await expect(form).toContainText('تغير الطلب');await expect(form.locator('[name=reason]')).toHaveValue('المرفق غير واضح');
});
test('revoked platform authority cannot send a decision or retain private rows',async({page})=>{
 const state=await setup(page);let writes=0;await page.route('**/api/v1/admin/center-licenses/review-one/decision',route=>{writes++;return json(route,{})});const form=page.locator('[data-license-admin-decision]');await form.locator('[name=outcome]').selectOption('APPROVED');await form.locator('[name=confirmed]').check();state.active=false;await form.evaluate(node=>node.requestSubmit());await expect(page.locator('[data-platform-license]')).toHaveCount(0);expect(writes).toBe(0);
});
test('admin clears license queue after logout and escapes submitted metadata',async({page})=>{
 const state=await setup(page);state.rows[0].subject='<img src=x onerror=alert(1)>';await page.locator('[data-license-admin-refresh]').click();await expect(page.locator('[data-platform-license]')).toContainText('<img src=x');await expect(page.locator('[data-platform-license] img')).toHaveCount(0);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-platform-license]')).toHaveCount(0);
});
