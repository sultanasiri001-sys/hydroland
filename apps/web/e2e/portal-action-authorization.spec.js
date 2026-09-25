import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const setupAdmin=async page=>{
  const state={roles:[{id:'role-admin-action',role:'ADMIN',status:'ACTIVE'}],fail:false};
  const authed=request=>request.headers().authorization==='Bearer portal-action-access';
  await page.route(/\/api\/v1\/me$/,route=>{
    if(!authed(route.request()))return json(route,{message:'Unauthorized'},401);
    if(state.fail)return json(route,{message:'Unavailable'},503);
    return json(route,{id:'portal-action-user',email:'action@hydroland.test',status:'ACTIVE',roleAssignments:state.roles,person:{firstName:'Action',lastName:'Guard',phone:null,professional:null}});
  });
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess&&window.HydrolandPortalFreshness&&window.HydrolandRoleTasks));
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','portal-action-access');
    sessionStorage.setItem('hl-refresh-token','portal-action-refresh');
    window.HydrolandAuth.syncAuthUi();
    await window.HydrolandProfile.load();
  });
  await page.locator('#role-switch').click();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('admin');
  await expect(page.locator('#role-console')).toBeVisible();
  await expect(page.locator('.hl-role-dashboard[data-role="admin"]')).toBeVisible();
  return state;
};

const expectClosed=async page=>{
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect.poll(()=>new URL(page.url()).hash).not.toBe('#safety');
};

test('role dashboard action reauthorizes and blocks navigation after live role revocation',async({page})=>{
  const state=await setupAdmin(page);
  await page.evaluate(()=>history.replaceState(null,'','#home'));
  state.roles=[];
  const dashboard=page.locator('.hl-role-dashboard[data-role="admin"]');
  await dashboard.getByRole('button',{name:'مركز الحوادث'}).click();
  await expectClosed(page);
});

test('top role-console task reauthorizes and blocks navigation after live role revocation',async({page})=>{
  const state=await setupAdmin(page);
  await page.evaluate(()=>history.replaceState(null,'','#home'));
  state.roles=[];
  const task=page.locator('#role-console-tasks button').filter({hasText:'مركز السلامة والحوادث'});
  await expect(task).toBeEnabled();
  await task.click();
  await expectClosed(page);
});