import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';
const json=(r,body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
async function setup(page){
 const state={admin:true,status:'ACTIVE',revision:'2026-10-22T10:00:00.000Z',writes:0,conflict:false,name:'موظف اختبار',queries:[],delay:false,release:null};
 await page.route('**/api/v1/**',r=>json(r,[]));
 await page.route('**/api/v1/auth/google/config',r=>json(r,{enabled:false}));
 await page.route(/\/api\/v1\/me$/,r=>json(r,{id:'accounts-admin',status:'ACTIVE',person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:state.admin?[{role:'ADMIN',status:'ACTIVE'}]:[]}));
 await page.route(/\/api\/v1\/admin\/accounts(?:\?.*)?$/,async r=>{
  const query=new URL(r.request().url()).searchParams;state.queries.push(query.toString());if(state.delay)await new Promise(resolve=>state.release=resolve);
  const own={id:'accounts-admin',email:'admin@example.invalid',status:'ACTIVE',emailVerifiedAt:'2026-01-01T00:00:00Z',updatedAt:state.revision,person:{firstName:'إدارة',lastName:'اختبار'},roleAssignments:[{role:'ADMIN',status:'ACTIVE'}],isCurrentAccount:true};
  const staff={id:'accounts-staff',email:'staff@example.invalid',status:state.status,emailVerifiedAt:'2026-01-01T00:00:00Z',updatedAt:state.revision,person:{firstName:state.name,lastName:''},roleAssignments:[{role:'STAFF',status:'ACTIVE'}],isCurrentAccount:false};
  return json(r,{items:query.has('cursor')?[staff]:[own,staff],nextCursor:query.has('cursor')?null:'accounts-page-2'});
 });
 await page.route('**/admin/accounts/accounts-staff/status',r=>{
  state.writes++;const body=r.request().postDataJSON();expect(body.reviewed).toBe(true);expect(body.reason).toBe('قرار حساب في بيئة اختبار معزولة');expect(body.expectedUpdatedAt).toBe(state.revision);
  if(state.conflict)return json(r,{message:'تغير الحساب'},409);
  state.status=body.status;state.revision='2026-10-22T10:0'+state.writes+':00.000Z';return json(r,{id:'accounts-staff',status:state.status,updatedAt:state.revision,sessionsRevoked:true});
 });
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.HydrolandAdminAccounts&&window.HydrolandAuth&&window.HydrolandProfile));
 await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'accounts-fixture',refreshToken:'accounts-fixture-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
 await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="admin"]').click();await page.locator('[data-portal-label="المستخدمون"]').click();await expect(page.locator('[data-admin-account="accounts-staff"]')).toBeVisible();return state;
}
const staff=page=>page.locator('[data-admin-account="accounts-staff"]');
async function review(page){const row=staff(page);await row.getByRole('textbox').fill('قرار حساب في بيئة اختبار معزولة');await row.getByRole('checkbox').check();return row;}
test('admin account suspension and reactivation persist with reviewed revisions; own account is protected',async({page})=>{
 const state=await setup(page);await expect(page.locator('[data-admin-account="accounts-admin"]')).toContainText('هذا حسابك الحالي');await expect(page.locator('[data-admin-account="accounts-admin"] form')).toHaveCount(0);
 await staff(page).getByRole('button',{name:'تعليق الحساب',exact:true}).click();expect(state.writes).toBe(0);
 await review(page);await staff(page).getByRole('button',{name:'تعليق الحساب',exact:true}).click();await expect(staff(page)).toContainText('حالة الحساب: معلق');expect(state.writes).toBe(1);
 await page.getByRole('button',{name:'تحديث الحسابات',exact:true}).click();await expect(staff(page)).toContainText('حالة الحساب: معلق');
 await review(page);await staff(page).getByRole('button',{name:'إعادة تفعيل الحساب',exact:true}).click();await expect(staff(page)).toContainText('حالة الحساب: نشط');await expect(page.locator('[data-accounts-feedback]')).toContainText('تسجيل دخول جديد');expect(state.writes).toBe(2);
});
test('stale status decision retains notes and revoked administrator cannot resubmit',async({page})=>{
 const state=await setup(page);state.conflict=true;await review(page);await staff(page).getByRole('button',{name:'تعليق الحساب',exact:true}).click();await expect(staff(page)).toContainText('تغير الحساب');await expect(staff(page).getByRole('textbox')).toHaveValue('قرار حساب في بيئة اختبار معزولة');state.admin=false;await staff(page).getByRole('button',{name:'تعليق الحساب',exact:true}).click();await expect(page.locator('[data-admin-account]')).toHaveCount(0);expect(state.writes).toBe(1);
});
test('search, cursor pagination, escaped names and mobile forms use the connected account screen',async({page})=>{
 const state=await setup(page);state.name='<img src=x onerror=alert(1)>';await page.getByRole('button',{name:'تحديث الحسابات',exact:true}).click();await expect(staff(page)).toContainText('<img src=x');await expect(staff(page).locator('img')).toHaveCount(0);
 await page.getByLabel('البحث بالاسم أو البريد').fill('موظف & اختبار');await page.getByRole('button',{name:'بحث الحسابات',exact:true}).click();await expect.poll(()=>state.queries.some(q=>new URLSearchParams(q).get('search')==='موظف & اختبار')).toBe(true);
 await expect(page.getByRole('button',{name:'الصفحة التالية',exact:true})).toBeEnabled();await page.getByRole('button',{name:'الصفحة التالية',exact:true}).click();await expect(page.getByRole('button',{name:'الصفحة التالية',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'الصفحة السابقة',exact:true})).toBeEnabled();
 await page.setViewportSize({width:390,height:844});expect(await staff(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.evaluate(()=>window.HydrolandAuth.terminateSession());await expect(page.locator('[data-admin-account]')).toHaveCount(0);await expect(page.locator('#hl-admin-accounts')).toBeHidden();
});
test('late private account response cannot repopulate a screen after navigation',async({page})=>{
 const state=await setup(page);state.delay=true;await page.getByRole('button',{name:'تحديث الحسابات',exact:true}).click();await expect.poll(()=>Boolean(state.release)).toBe(true);await page.locator('[data-portal-label="مركز القيادة والتحكم"]').click();const finished=page.waitForResponse(r=>/\/admin\/accounts/.test(r.url()));state.release();await finished;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await expect(page.locator('#hl-admin-accounts')).toBeHidden();await expect(page.locator('[data-admin-account]')).toHaveCount(0);
});
