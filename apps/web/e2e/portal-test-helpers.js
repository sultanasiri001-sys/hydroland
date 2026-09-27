import {expect} from '@playwright/test';

export const openWorkspaceSwitcher=async page=>{
  await page.waitForFunction(()=>Boolean(window.HydrolandPortalFreshness));
  const dashboardSwitch=page.locator('.hl-role-dashboard [data-portal-switch]');
  if(await dashboardSwitch.isVisible().catch(()=>false))await dashboardSwitch.click();
  else await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
};

export const returnToDiverWorkspace=async page=>{
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="diver"]').click();
  await expect.poll(()=>page.evaluate(()=>window.HydrolandPortalAccess.getCurrentRole())).toBe('diver');
};
