import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

test('a service opened during slow feature loading stays selected after bootstrap',async({page})=>{
  const json=(route,body)=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  await page.route('**/api/v1/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/me'))return json(route,{id:'bootstrap-user',status:'ACTIVE',email:'bootstrap@hydroland.test',roleAssignments:[{id:'boat-role',role:'BOAT_OWNER',status:'ACTIVE'}],person:{firstName:'حساب',lastName:'الاختبار',professional:null}});
    if(path.endsWith('/me/diver-profile'))return json(route,{profile:null,equipment:[]});
    if(path.endsWith('/themes/active'))return json(route,{themeId:'ocean-horizon'});
    if(path.endsWith('/maps/public-config'))return json(route,{enabled:false,status:'NOT_SELECTED'});
    if(path.endsWith('/weather/public-config'))return json(route,{configured:false,status:'NOT_SELECTED'});
    return json(route,[]);
  });
  let releaseStore;
  const storeBlocked=new Promise(resolve=>{releaseStore=resolve});
  await page.route('**/hydroland-store.js',async route=>{await storeBlocked;await route.continue()});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandProfile&&window.HydrolandMarineDocuments&&window.HydrolandPortalFreshness));
  try{
    await page.evaluate(async()=>{
      sessionStorage.setItem('hl-access-token','bootstrap-access');
      sessionStorage.setItem('hl-refresh-token','bootstrap-refresh');
      window.HydrolandAuth.syncAuthUi();
      document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
      await window.HydrolandProfile.load();
    });
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="boat"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','boat');
    const board=page.locator('.hl-role-dashboard[data-role="boat"]');
    await board.locator('[data-action-label="المستندات والتراخيص"]').click();
    await expect(page.locator('#hl-marine-documents')).toBeVisible();
    await expect(board.locator('.hl-portal-content')).toBeHidden();
  }finally{releaseStore()}
  await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI));
  await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-view','service');
  await expect(page.locator('#hl-marine-documents')).toBeVisible();
  await expect(page.locator('.hl-role-dashboard .hl-portal-content')).toBeHidden();
});
