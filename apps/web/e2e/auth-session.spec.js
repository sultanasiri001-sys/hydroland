import { test, expect } from '@playwright/test';

const waitForAuth = async page => {
  await page.waitForFunction(() => Boolean(window.HydrolandAuth));
};

const waitForPortal = async page => {
  await page.waitForFunction(() => Boolean(window.HydrolandPortalAccess));
};

const waitForApp = async page => {
  await Promise.all([waitForAuth(page),waitForPortal(page)]);
};

const seedAuthenticatedSession = async page => {
  await page.addInitScript(() => {
    sessionStorage.setItem('hl-access-token','e2e-access');
    sessionStorage.setItem('hl-refresh-token','e2e-refresh');
  });
};

test('logout purges tokens, profile data and protected portal state', async ({ page }) => {
  await seedAuthenticatedSession(page);
  await page.route('**/api/v1/auth/logout', route => route.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    const el=document.createElement('div');el.className='hl-role-dashboard';el.textContent='protected';document.body.appendChild(el);
  });
  await page.locator('#profile-dialog').evaluate(el => el.showModal());
  const logoutButton=page.locator('[data-hl-action="logout"]');
  await expect(logoutButton).toBeVisible();
  await expect(logoutButton).toBeEnabled();
  const box=await logoutButton.boundingBox();
  expect(box).not.toBeNull();
  const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {tag:el?.tagName||null,action:el?.closest?.('[data-hl-action]')?.getAttribute('data-hl-action')||null,id:el?.id||null,cls:el?.className||null}}, {x:box.x+box.width/2,y:box.y+box.height/2});
  console.log('LOGOUT_HIT_TARGET',JSON.stringify({box,hit}));
  await page.evaluate(()=>{window.__logoutClickTrace=[];document.addEventListener('click',event=>{window.__logoutClickTrace.push({tag:event.target?.tagName||null,action:event.target?.closest?.('[data-hl-action]')?.getAttribute('data-hl-action')||null,id:event.target?.id||null,phase:event.eventPhase,defaultPrevented:event.defaultPrevented})},true)});
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.mouse.click(box.x+box.width/2,box.y+box.height/2)
  ]);
  await waitForAuth(page);
  const trace=await page.evaluate(()=>window.__logoutClickTrace||[]);
  console.log('LOGOUT_CLICK_TRACE',JSON.stringify(trace));
  expect(hit.action,'pointer center must resolve to logout control').toBe('logout');
  expect(trace.some(item=>item.action==='logout'),'browser click must reach logout control').toBeTruthy();
  expect(await page.evaluate(() => sessionStorage.getItem('hl-access-token'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  expect(await page.evaluate(() => window.HydrolandProfileData)).toBeUndefined();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
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

test('unauthenticated user cannot render admin portal shell', async ({ request }) => {
  const response=await request.get('/');
  expect(response.status()).toBe(200);
  const html=await response.text();
  expect(html).not.toContain('hl-role-dashboard');
  expect(html).toContain('id="role-console"');
  expect(html).toMatch(/id="role-console"[^>]*hidden/);
});
