import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const setup=async page=>{
  const state={fail:false,roles:[{id:'role-admin-e2e',role:'ADMIN',status:'ACTIVE'}]};
  const authed=request=>request.headers().authorization==='Bearer portal-access-e2e';
  await page.route(/\/api\/v1\/me$/,route=>{
    if(!authed(route.request()))return json(route,{message:'Unauthorized'},401);
    if(state.fail)return json(route,{message:'Unavailable'},503);
    return json(route,{id:'portal-access-user',email:'portal@hydroland.test',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Portal',lastName:'Access',phone:null,professional:null}});
  });
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess&&window.HydrolandPortalFreshness));
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','portal-access-e2e');
    sessionStorage.setItem('hl-refresh-token','portal-refresh-e2e');
    window.HydrolandAuth.syncAuthUi();
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.roleAllowed('admin'))).toBe(true);
  return state;
};

const expectDenied=async page=>{
  const button=page.locator('#role-dialog [data-role="admin"]');
  await expect(button).toHaveAttribute('data-hl-role-allowed','0');
  await expect(button).toHaveAttribute('aria-disabled','true');
  await expect(button).toBeDisabled();
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard[data-role="admin"]')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
};

test('revoked protected role closes an already-open portal in the same session',async({page})=>{
  const state=await setup(page);
  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('admin');
  state.roles=[];
  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await expectDenied(page);
});

test('protected portal fails closed when authoritative role refresh is unavailable',async({page})=>{
  const state=await setup(page);
  state.fail=true;
  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await expectDenied(page);
});