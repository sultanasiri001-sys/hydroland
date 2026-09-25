import { test, expect } from '@playwright/test';

const waitForApp = async page => {
  await page.waitForFunction(() => Boolean(window.HydrolandAuth && window.HydrolandPortalAccess));
};

const seedSession = async page => {
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    sessionStorage.setItem('hl-access-token','e2e-access');
    sessionStorage.setItem('hl-refresh-token','e2e-refresh');
    window.HydrolandAuth.syncAuthUi();
  });
};

test('logout is local-first and protected state stays cleared', async ({ page }) => {
  await page.route('**/api/v1/auth/logout', route => route.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await seedSession(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'admin',status:'ACTIVE'}]}};
    const node=document.createElement('section');
    node.className='hl-role-dashboard';
    document.body.appendChild(node);
  });

  await page.locator('#profile-open').click();
  await page.locator('[data-hl-action="logout"]').first().click({noWaitAfter:true});

  await page.waitForTimeout(50);
  const state=await page.evaluate(() => ({
    access:sessionStorage.getItem('hl-access-token'),
    refresh:sessionStorage.getItem('hl-refresh-token'),
    profile:Boolean(window.HydrolandProfileData),
    dashboard:Boolean(document.querySelector('.hl-role-dashboard')),
    loginHidden:document.querySelector('.hl-login')?.classList.contains('hidden')
  }));
  console.log('logout-state',JSON.stringify(state));
  expect(state).toEqual({access:null,refresh:null,profile:false,dashboard:false,loginHidden:false});
});

test('pageshow fails closed when the session is absent', async ({ page }) => {
  await seedSession(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'admin',status:'ACTIVE'}]}};
    sessionStorage.clear();
    const node=document.createElement('section');
    node.className='hl-role-dashboard';
    document.body.appendChild(node);
    window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
  expect(await page.evaluate(() => Boolean(window.HydrolandProfileData))).toBe(false);
});

test('expired refresh fails closed', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'expired'})}));
  await seedSession(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'admin',status:'ACTIVE'}]}};
    sessionStorage.removeItem('hl-access-token');
    return window.HydrolandAuth.authorizedFetch('/profile').catch(()=>null);
  });
  expect(await page.evaluate(() => sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  expect(await page.evaluate(() => Boolean(window.HydrolandProfileData))).toBe(false);
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});

test('unauthenticated runtime keeps the admin console closed', async ({ page }) => {
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    sessionStorage.clear();
    window.HydrolandAuth.syncAuthUi();
    window.HydrolandPortalAccess.clearProtectedPortal();
  });
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});
