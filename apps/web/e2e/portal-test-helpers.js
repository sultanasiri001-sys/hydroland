import {expect} from '@playwright/test';

// Fresh authorization can remove the protected dashboard between the visibility
// probe and a real click. Retarget only when that control actually disappeared;
// covered, disabled, or otherwise still-present controls remain test failures.
const clickWhilePresent=async locator=>{
  if(!await locator.isVisible().catch(()=>false))return false;
  try{await locator.click({timeout:1500});return true;}
  catch(error){
    if(error.name!=='TimeoutError'||await locator.isVisible().catch(()=>false))throw error;
    return false;
  }
};

export const openWorkspaceSwitcher=async page=>{
  await page.waitForFunction(()=>Boolean(window.HydrolandPortalFreshness));
  const portalMenu=page.locator('.hl-role-dashboard [data-portal-menu]');
  const dashboardSwitch=page.locator('.hl-role-dashboard [data-portal-switch]');
  if(!await dashboardSwitch.isVisible().catch(()=>false))await clickWhilePresent(portalMenu);
  if(!await clickWhilePresent(dashboardSwitch)){
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
