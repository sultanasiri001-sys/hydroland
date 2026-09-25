import { test, expect } from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('portal role navigation denies inactive roles, replays authorized late-loaded role, and clears on session loss',async({page})=>{
  let activeRole='DIVER';
  let releaseRoleScript;let roleScriptRequested=false;
  const roleScriptGate=new Promise(resolve=>{releaseRoleScript=resolve});
  await page.route(/hydroland-role-dashboards\.js$/,async route=>{roleScriptRequested=true;await roleScriptGate;await route.continue()});
  const profile=()=>({id:'portal-user-e2e',email:'portal@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'role-e2e',role:activeRole,status:'ACTIVE',activeAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],person:{firstName:'Portal',lastName:'User',phone:null,professional:null}});
  const requireAuth=request=>request.headers().authorization==='Bearer portal-e2e-access';
  await page.route(/\/api\/v1\/me$/,route=>requireAuth(route.request())?json(route,profile()):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>requireAuth(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>requireAuth(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess));
  await expect.poll(()=>roleScriptRequested).toBe(true);
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','portal-e2e-access');sessionStorage.setItem('hl-refresh-token','portal-e2e-refresh');window.HydrolandAuth.syncAuthUi();await window.HydrolandProfile.load()});

  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#toast')).toContainText('هذا الدور غير نشط');
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await page.locator('#close-dialog').click();

  activeRole='ADMIN';
  await page.evaluate(async()=>{await window.HydrolandProfile.load()});
  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#role-console')).toBeVisible();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);

  releaseRoleScript();
  const adminDashboard=page.locator('.hl-role-dashboard[data-role="admin"]');
  await expect(adminDashboard).toBeVisible();
  await expect(adminDashboard).toContainText('مركز القيادة والإدارة الرئيسية');
  const incidents=adminDashboard.locator('button').filter({hasText:'مركز الحوادث'});await expect(incidents).toBeEnabled();await incidents.click();
  await expect(page).toHaveURL(/#safety$/);

  await page.evaluate(()=>{window.HydrolandAuth.terminateSession()});
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('#role-console')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
});
