import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

test('visitor gets the approved public view and no account-only modules',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandWorkspaceUI&&window.HydrolandPublicUI&&document.querySelector('.hl-support')));
  await page.locator('.hl-login-guest').click();

  await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','visitor');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#trips')).toBeVisible();
  await page.locator('#home .ghost-button').click();
  await expect(page).toHaveURL(/#training$/);
  await expect(page.locator('#training')).toBeVisible();
  await expect(page.locator('#home')).toBeHidden();
  await expect(page.locator('#role-switch')).toBeHidden();
  for(const selector of ['.hl-finance','.hl-training','.hl-members','.hl-logistics','.hl-procurement','.hl-safety-center','.hl-admin','#hl-documents','#hl-marine-documents'])
    await expect(page.locator(selector)).toBeHidden();
  await page.locator('#navigation a[href="#community"]').click();
  await expect(page.locator('.hl-support [data-support-form]')).toBeHidden();
  await expect(page.locator('.hl-support-guest-gate')).toBeVisible();
  await expect(page.locator('#top-notifications')).toBeHidden();
  await expect(page.locator('#top-messages')).toBeHidden();
  await expect(page.locator('.mobile-nav [data-hl-action="messages"]')).toBeHidden();
});

test('admin workspace opens as the first full-width view with private alerts and messages',async({page})=>{
  const authorized=request=>request.headers().authorization==='Bearer approved-workspace-access';
  await page.route(/\/api\/v1\/me$/,route=>authorized(route.request())
    ?json(route,{id:'approved-ui-admin',email:'admin@hydroland.test',status:'ACTIVE',roleAssignments:[{id:'admin-role',role:'ADMIN',status:'ACTIVE'}],person:{firstName:'مشرف',lastName:'اختبار',professional:null}})
    :json(route,{message:'Unauthorized'},401));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>authorized(route.request())
    ?json(route,{profile:null,equipment:[]})
    :json(route,{message:'Unauthorized'},401));

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandWorkspaceUI));
  await page.evaluate(async()=>{
    sessionStorage.setItem('hl-access-token','approved-workspace-access');
    sessionStorage.setItem('hl-refresh-token','approved-workspace-refresh');
    window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="admin"]').click();

  const dashboard=page.locator('.hl-role-dashboard[data-role="admin"]');
  await expect(dashboard).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-hl-workspace-role','admin');
  expect(await page.evaluate(()=>document.querySelector('#main')?.firstElementChild?.classList.contains('hl-role-dashboard'))).toBe(true);
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(dashboard.locator('[data-portal-notifications]')).toBeVisible();
  await expect(dashboard.locator('[data-portal-messages]')).toBeVisible();
  await expect(dashboard.locator('[data-portal-switch]')).toBeVisible();
  await expect(dashboard.locator('.hl-insight-cards article').filter({hasText:'الجهات الخارجية · مؤجل'}).getByRole('button')).toBeDisabled();

  await dashboard.locator('[data-portal-switch]').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
});
