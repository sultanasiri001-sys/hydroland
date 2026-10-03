import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const sample={checklists:[{id:'center-check',decision:'GO',notes:'فحص المركز',updatedAt:'2026-10-02T00:00:00Z',trip:{title:'رحلة المركز الخاصة'}}],incidents:[{id:'center-incident',title:'بلاغ المركز',severity:'LOW',status:'OPEN',createdAt:'2026-10-02T00:00:00Z',trip:{title:'رحلة المركز الخاصة'}}]};
const install=async page=>{
  const state={active:true,status:200,body:sample,reads:0,refreshes:0};
  const profile={id:'center-safety-review',email:'center-review@example.invalid',status:'ACTIVE',person:{firstName:'مدير',lastName:'المركز'},roleAssignments:[{role:'DIVE_CENTER',status:'ACTIVE'}]};
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>{state.refreshes++;return json(route,{...profile,roleAssignments:state.active?profile.roleAssignments:[]})});
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.route('**/api/v1/center/me/overview',route=>json(route,{center:{displayName:'مركز نطاق الاختبار'},metrics:{newBookings:1,tripsToday:2,activeMembers:3,totalTrips:4}}));
  await page.route('**/api/v1/center/me/safety',route=>{state.reads++;return json(route,state.body,state.status)});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandCenterSafety));
  await page.evaluate(async()=>{window.HydrolandAuth.acceptSession({accessToken:'center-review-access',refreshToken:'center-review-refresh'},window.HydrolandAuth.beginAuthAttempt());await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="center"]').click();
  await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();
  return state;
};
const quick=page=>page.locator('.hl-command [data-action-label="تقارير السلامة"]');

for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
  test(`center safety quick action, secondary action and sidebar use the scoped records on ${viewport.name}`,async({page})=>{
    await page.setViewportSize(viewport);await install(page);
    const dashboard=page.locator('.hl-role-dashboard[data-role="center"]');
    await expect(dashboard.locator('[data-center-name]')).toHaveText('مركز نطاق الاختبار');
    await expect(dashboard.locator('.hl-role-tile').nth(2)).toContainText('أعضاء نشطون');
    await expect(dashboard.locator('.hl-role-tile').nth(3)).toContainText('إجمالي الرحلات');
    await page.evaluate(()=>window.HydrolandProfile.load());
    await expect(dashboard.locator('[data-center-name]')).toHaveText('مركز نطاق الاختبار');
    await expect(quick(page)).toBeEnabled();await quick(page).click();
    const panel=page.locator('#hl-center-safety');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-center-checklist="center-check"]')).toContainText('رحلة المركز الخاصة');
    await expect(panel.locator('[data-center-incident="center-incident"]')).toContainText('بلاغ المركز');
    await expect(panel).not.toContainText('Invalid Date');
    await dashboard.locator('[data-portal-home]').click();
    await dashboard.locator('.hl-safety-board [data-action-label="تقارير السلامة"]').click();
    await expect(panel).toBeVisible();
    await dashboard.locator('[data-portal-home]').click();
    if(viewport.name==='mobile')await dashboard.locator('[data-portal-menu]').click();
    await dashboard.locator('[data-portal-label="السلامة"]').click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-center-checklist]')).toHaveCount(1);
  });
}

test('center safety exposes denied and malformed responses as errors, not empty success',async({page})=>{
  const state=await install(page);state.status=403;state.body={message:'Forbidden'};
  await quick(page).click();const panel=page.locator('#hl-center-safety');
  await expect(panel.locator('[role="alert"]')).toContainText('لا تملك صلاحية');
  await expect(panel.locator('[data-center-incident]')).toHaveCount(0);
  state.status=200;state.body={checklists:[],incidents:null};
  await panel.locator('[data-center-safety-retry]').click();
  await expect(panel.locator('[role="alert"]')).toContainText('غير مكتملة');
  state.body={checklists:[],incidents:[]};
  await panel.locator('[data-center-safety-retry]').click();
  await expect(panel).toContainText('لا توجد قوائم فحص');
  await expect(panel.locator('[role="alert"]')).toHaveCount(0);
});

test('center safety escapes service data rather than interpreting markup',async({page})=>{
  const state=await install(page);state.body={checklists:[],incidents:[{id:'markup',title:'<img src=x onerror="window.reviewXss=1">',severity:'LOW',status:'OPEN',createdAt:null}]};
  await quick(page).click();const panel=page.locator('#hl-center-safety');
  await expect(panel).toContainText('<img src=x');await expect(panel.locator('img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.reviewXss)).toBeUndefined();
});

test('center safety discards older overlapping results',async({page})=>{
  await install(page);const pending=[];
  await page.route('**/api/v1/center/me/safety',route=>{pending.push(route)});
  await quick(page).click();await expect.poll(()=>pending.length).toBe(1);
  await page.evaluate(()=>{void window.HydrolandCenterSafety.open()});
  await expect.poll(()=>pending.length).toBe(2);
  await json(pending[1],{checklists:[],incidents:[{id:'new',title:'السجل الأحدث',severity:'LOW',status:'OPEN'}]});
  await expect(page.locator('#hl-center-safety')).toContainText('السجل الأحدث');
  await json(pending[0],sample);
  await expect(page.locator('#hl-center-safety [data-center-incident="new"]')).toHaveCount(1);
  await expect(page.locator('#hl-center-safety [data-center-incident="center-incident"]')).toHaveCount(0);
});

for(const reason of ['logout','revocation']){
  test(`center safety clears private data and discards pending results after ${reason}`,async({page})=>{
    const state=await install(page);let pending;
    await page.route('**/api/v1/center/me/safety',route=>{pending=route});
    await quick(page).click();await expect.poll(()=>Boolean(pending)).toBe(true);
    if(reason==='logout')await page.evaluate(()=>window.HydrolandAuth.terminateSession());
    else{state.active=false;await page.evaluate(async()=>{await window.HydrolandPortalAccess.refreshPortalAccess();window.HydrolandPortalFreshness.enforce()})}
    await json(pending,sample);
    await expect(page.locator('#hl-center-safety')).toHaveCount(0);
    await expect(page.locator('[data-center-incident="center-incident"]')).toHaveCount(0);
  });
}

test('center safety refreshes role before exposing scoped safety records',async({page})=>{
  const state=await install(page),before=state.refreshes;state.active=false;await page.evaluate(()=>window.HydrolandCenterSafety.open());await expect(page.locator('#hl-center-safety')).toHaveCount(0);expect(state.refreshes).toBeGreaterThan(before);expect(state.reads).toBe(0);await expect(page.getByText('بلاغ المركز')).toHaveCount(0);
});
