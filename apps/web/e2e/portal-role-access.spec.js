import { test, expect } from '@playwright/test';

const waitForRuntime=async page=>page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess));

const installApi=async page=>{
  const state={
    failMe:false,
    roles:[{id:'role-admin',role:'ADMIN',status:'ACTIVE',activeAt:'2026-09-25T00:00:00.000Z',updatedAt:'2026-09-25T00:00:00.000Z'}],
  };
  const profile=()=>({id:'portal-e2e',email:'portal-e2e@hydroland.test',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Portal',lastName:'E2E',phone:null,professional:null}});
  const authorized=request=>request.headers().authorization==='Bearer e2e-access';
  const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/,route=>{
    if(!authorized(route.request()))return json(route,{message:'Unauthorized'},401);
    if(state.failMe)return json(route,{message:'Role refresh unavailable'},503);
    return json(route,profile());
  });
  await page.route(/\/api\/v1\/credentials$/,route=>authorized(route.request())?json(route,[]):json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())?json(route,{profile:null,equipment:[]}):json(route,{message:'Unauthorized'},401));
  return state;
};

const seed=async page=>{
  const state=await installApi(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForRuntime(page);
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','e2e-access');
    sessionStorage.setItem('hl-refresh-token','e2e-refresh');
    window.HydrolandAuth.syncAuthUi();
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.roleAllowed('admin'))).toBe(true);
  return state;
};

test('revoked protected role is refreshed from /me and an already-open portal is closed',async({page})=>{
  const state=await seed(page);
  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#role-console')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('admin');

  state.roles=[];
  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await expect.poll(()=>page.locator('#role-dialog [data-role="admin"]').getAttribute('data-hl-role-allowed')).toBe('0');
  await expect(page.locator('#role-console')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');

  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#toast')).toContainText('هذا الدور غير نشط على حسابك');
  await expect(page.locator('#role-console')).toBeHidden();
});

test('protected portal navigation fails closed when authoritative role refresh is unavailable',async({page})=>{
  const state=await seed(page);
  expect(await page.evaluate(()=>window.HydrolandPortalAccess.roleAllowed('admin'))).toBe(true);
  state.failMe=true;

  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await expect.poll(()=>page.locator('#role-dialog [data-role="admin"]').getAttribute('data-hl-role-allowed')).toBe('0');
  expect(await page.evaluate(()=>window.HydrolandPortalAccess.roleAllowed('admin'))).toBe(false);

  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#toast')).toContainText('هذا الدور غير نشط على حسابك');
  await expect(page.locator('#role-console')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
});
