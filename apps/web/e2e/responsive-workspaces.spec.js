import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const viewports=[
  {name:'mobile',width:390,height:844},
  {name:'tablet',width:768,height:1024},
  {name:'desktop',width:1440,height:900}
];

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const expectNoPageOverflow=async page=>{
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
};

const mockVisitorApi=async page=>{
  await page.route('**/api/v1/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/me/diver-profile'))return json(route,{profile:null,equipment:[]});
    if(url.pathname.endsWith('/me'))return json(route,{id:'responsive-visitor',roles:[]});
    return json(route,[]);
  });
};

const setupAuthenticatedWorkspaces=async page=>{
  const authorized=request=>request.headers().authorization==='Bearer responsive-workspace-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())
    ?json(route,{id:'responsive-workspace-user',email:'responsive@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'responsive-admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'اختبار',lastName:'التجاوب',professional:null}})
    :json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())
    ?json(route,{profile:null,equipment:[]})
    :json(route,{message:'Unauthorized'},401));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPortalAccess&&window.HydrolandWorkspaceUI));
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','responsive-workspace-access');
    sessionStorage.setItem('hl-refresh-token','responsive-workspace-refresh');
    window.HydrolandAuth.syncAuthUi();
    document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
};

for(const viewport of viewports){
  test(`visitor layout is usable without page overflow on ${viewport.name}`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await mockVisitorApi(page);
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandWorkspaceUI));

    const entry=page.locator('.hl-login');
    await expect(entry).toBeVisible();
    await expect(entry).toHaveAttribute('aria-modal','true');
    await expect(page.locator('.sidebar')).toHaveAttribute('aria-hidden','true');
    await expect(page.locator('.shell')).toHaveAttribute('aria-hidden','true');

    await entry.locator('.hl-login-guest').click();
    await expect(entry).toHaveClass(/hidden/);
    await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','visitor');
    await expect(page.locator('.hl-visitor-routebar')).toBeVisible();
    await expect(page.locator('#visitor-auth-cta')).toBeVisible();
    await expect(page.locator('.sidebar')).not.toHaveAttribute('aria-hidden','true');
    await expect(page.locator('.shell')).not.toHaveAttribute('aria-hidden','true');
    await expectNoPageOverflow(page);
  });

  test(`diver and protected workspace layouts stay responsive on ${viewport.name}`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await setupAuthenticatedWorkspaces(page);

    await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','diver');
    await expectNoPageOverflow(page);

    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="admin"]').click();
    await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('admin');
    const dashboard=page.locator('.hl-role-dashboard[data-role="admin"]');
    await expect(dashboard).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','admin');
    await expectNoPageOverflow(page);

    const box=await dashboard.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.width).toBeLessThanOrEqual(viewport.width+2);
  });
}
