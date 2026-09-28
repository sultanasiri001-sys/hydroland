import {expect} from '@playwright/test';

export const openWorkspaceSwitcher=async page=>{
  await page.waitForFunction(()=>Boolean(window.HydrolandPortalFreshness));
  const dashboardSwitch=page.locator('.hl-role-dashboard [data-portal-switch]');
  if(await dashboardSwitch.isVisible().catch(()=>false)){
    await dashboardSwitch.click();
  }else{
    const roleSwitch=page.locator('#role-switch');
    if(!await roleSwitch.isVisible().catch(()=>false)){
      const menu=page.locator('#menu');
      const sidebar=page.locator('.sidebar');
      if(await menu.isVisible().catch(()=>false)){
        await menu.click();
        await expect(sidebar).toHaveClass(/open/);
        await expect(sidebar).toBeVisible();
      }
    }
    await expect(roleSwitch).toBeVisible();
    await roleSwitch.click();
  }
  await expect(page.locator('#role-dialog')).toBeVisible();
};

export const returnToDiverWorkspace=async page=>{
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="diver"]').click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
};