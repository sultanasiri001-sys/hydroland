import {test,expect} from '@playwright/test';
import {openWorkspaceSwitcher} from './portal-test-helpers.js';

test('Arabic shell menu and role dialog expose their names and dismissal state',async({page})=>{
  const compact=page.viewportSize().width<=760;
  await page.route('**/api/v1/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify([])}));
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.HydrolandWorkspaceUI));
  const menu=page.locator('#menu');
  if(compact)await expect(menu).toHaveAccessibleName('فتح القائمة');
  else await expect(menu).toHaveAttribute('aria-label','فتح القائمة');
  if(!compact)await expect(menu).toBeHidden();
  for(let i=0;compact&&i<2;i++){
    await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');
    // The accepted drawer overlays its trigger; activate the focused trigger by keyboard.
    await expect(menu).toBeFocused();await page.keyboard.press('Enter');await expect(menu).toHaveAttribute('aria-expanded','false');
    await menu.click();
    await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
  }
  if(compact){await menu.click();await page.mouse.click(5,400);await expect(menu).toHaveAttribute('aria-expanded','false')}
  if(compact)await menu.click();await page.locator('#navigation a[href="#trips"]').click();
  await expect(menu).toHaveAttribute('aria-expanded','false');
  if(compact)await expect(menu).toBeFocused();
});

test('managed training navigation resets menu ARIA after opening a service',async({page})=>{
  const compact=page.viewportSize().width<=760;
  await page.route('**/api/v1/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const body=path.endsWith('/me')?{id:'menu-review',status:'ACTIVE',roleAssignments:[{role:'INSTRUCTOR',status:'ACTIVE'}],person:{firstName:'اختبار'}}:path.endsWith('/me/diver-profile')?{profile:null,equipment:[]}:[];
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/');await page.waitForFunction(()=>Boolean(window.HydrolandPortalFreshness&&window.HydrolandProfile));
  await page.evaluate(async()=>{sessionStorage.setItem('hl-access-token','menu-test');sessionStorage.setItem('hl-refresh-token','menu-refresh');window.HydrolandAuth.syncAuthUi();document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));await window.HydrolandProfile.load()});
  await openWorkspaceSwitcher(page);
  const dialog=page.getByRole('dialog',{name:'اختر نوع الحساب',exact:true});
  await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'إغلاق',exact:true}).click();await expect(dialog).toBeHidden();
  await openWorkspaceSwitcher(page);await page.locator('#role-dialog [data-role="instructor"]').click();
  const board=page.locator('.hl-role-dashboard[data-role="instructor"]'),menu=board.locator('[data-portal-menu]');
  await expect(board).toBeVisible();await expect(menu).toHaveAttribute('aria-controls','hl-portal-navigation');
  for(let i=0;i<2;i++){
    if(compact){await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true')}else await expect(menu).toBeHidden();
    await board.locator('.hl-portal-nav-item',{hasText:'الجدول الزمني'}).click();
    await expect(page.locator('.hl-training')).toBeVisible();await expect(menu).toHaveAttribute('aria-expanded','false');
    await board.locator('[data-portal-home]').click();
    if(compact){
      await menu.click();
      await board.locator('.hl-portal-nav-item').first().click();
      await expect(menu).toHaveAttribute('aria-expanded','false');
      await expect(menu).toBeFocused();
    }
  }
});
