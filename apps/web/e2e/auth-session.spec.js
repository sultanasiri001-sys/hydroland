import { test, expect } from '@playwright/test';

const waitForApp = async page => {
  await page.waitForFunction(() => window.HydrolandAuth && window.HydrolandPortalAccess);
};

const seedAuthenticatedSession = async page => {
  await page.addInitScript(() => {
    sessionStorage.setItem('hl-access-token','e2e-access');
    sessionStorage.setItem('hl-refresh-token','e2e-refresh');
  });
};

test('logout purges tokens, profile data and protected portal state', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    const el=document.createElement('div');el.className='hl-role-dashboard';el.textContent='protected';document.body.appendChild(el);
  });
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}).catch(()=>null),
    page.evaluate(() => { window.HydrolandAuth.logout(); }).catch(()=>null)
  ]);
  await waitForApp(page);
  expect(await page.evaluate(() => sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  expect(await page.evaluate(() => window.HydrolandProfileData)).toBeUndefined();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
});

test('back-forward cache/pageshow cannot restore protected state after session removal', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    sessionStorage.clear();
    const el=document.createElement('div');el.className='hl-role-dashboard';el.textContent='stale';document.body.appendChild(el);
    window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  expect(await page.evaluate(() => window.HydrolandProfileData)).toBeUndefined();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});

test('expired refresh fails closed and returns to login without protected data', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'expired'})}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    sessionStorage.removeItem('hl-access-token');
    return window.HydrolandAuth.authorizedFetch('/profile').catch(()=>null);
  });
  expect(await page.evaluate(() => sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  expect(await page.evaluate(() => window.HydrolandProfileData)).toBeUndefined();
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});

test('unauthenticated user cannot render admin portal shell', async ({ page }) => {
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  expect(await page.evaluate(() => window.HydrolandPortalAccess.roleAllowed('admin'))).toBe(false);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('hydroland:role-changed',{detail:{role:'admin'}})));
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
});
