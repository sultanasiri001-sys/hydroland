import { test, expect } from '@playwright/test';

const waitForApp = async page => {
  await page.waitForFunction(() => Boolean(window.HydrolandAuth && window.HydrolandPortalAccess && window.HydrolandProfile));
};

const installStableProfileApi = async page => {
  const json = (route, body) => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  await page.route(/\/api\/v1\/me$/, route => json(route, {
    id:'auth-e2e',email:'auth-e2e@hydroland.test',status:'ACTIVE',roleAssignments:[],
    person:{firstName:'Auth',lastName:'E2E',phone:null,professional:null}
  }));
  await page.route(/\/api\/v1\/credentials$/, route => json(route, []));
  await page.route(/\/api\/v1\/me\/diver-profile$/, route => json(route, {profile:null,equipment:[]}));
};

const seedSession = async page => {
  await installStableProfileApi(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.evaluate(() => {
    sessionStorage.setItem('hl-access-token','e2e-access');
    sessionStorage.setItem('hl-refresh-token','e2e-refresh');
    window.HydrolandAuth.syncAuthUi();
  });
};

test('registration remains unauthenticated until email verification', async ({ page }) => {
  await installStableProfileApi(page);
  let registrationPayload=null;
  await page.route('**/api/v1/auth/register', async route => {
    registrationPayload=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({
      email:'new-user@hydroland.test',status:'PENDING_VERIFICATION',requiresEmailVerification:true
    })});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  await page.locator('.hl-login-secondary').click();
  const panel=page.locator('.hl-auth-panel');
  await expect(panel).toBeVisible();
  await panel.locator('input[name="email"]').fill('new-user@hydroland.test');
  await panel.locator('input[name="password"]').fill('Hydroland-Registration-2026!');
  await panel.evaluate(form=>form.requestSubmit());
  await expect.poll(()=>registrationPayload).toEqual({email:'new-user@hydroland.test',password:'Hydroland-Registration-2026!'});
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
  await expect(panel).toBeHidden();
  await expect(page.locator('#toast')).toContainText('يلزم التحقق من البريد الإلكتروني قبل تسجيل الدخول');
  const session=await page.evaluate(()=>({
    access:sessionStorage.getItem('hl-access-token'),
    refresh:sessionStorage.getItem('hl-refresh-token'),
    authenticated:window.HydrolandAuth.isAuthenticated()
  }));
  expect(session).toEqual({access:null,refresh:null,authenticated:false});
});

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
  const logoutButton=page.locator('#profile-dialog [data-hl-action="logout"]');
  await expect(logoutButton).toBeVisible();
  const clickState=await logoutButton.evaluate(button => {
    button.click();
    return {
      disabled:button.disabled,
      access:sessionStorage.getItem('hl-access-token'),
      refresh:sessionStorage.getItem('hl-refresh-token'),
      dialogOpen:document.getElementById('profile-dialog')?.open,
      profile:Boolean(window.HydrolandProfileData),
      dashboard:Boolean(document.querySelector('.hl-role-dashboard')),
      loginHidden:document.querySelector('.hl-login')?.classList.contains('hidden')
    };
  });
  expect(clickState).toEqual({
    disabled:true,
    access:null,
    refresh:null,
    dialogOpen:false,
    profile:false,
    dashboard:false,
    loginHidden:false
  });

  await page.waitForTimeout(250);
  const settledState=await page.evaluate(() => ({
    profile:Boolean(window.HydrolandProfileData),
    dashboard:Boolean(document.querySelector('.hl-role-dashboard')),
    loginHidden:document.querySelector('.hl-login')?.classList.contains('hidden')
  }));
  console.log('logout settled state', JSON.stringify(settledState));
  expect(settledState).toEqual({profile:false,dashboard:false,loginHidden:false});
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
  await page.route('**/api/v1/profile', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'expired'})}));
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
  await installStableProfileApi(page);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForApp(page);
  const state=await page.evaluate(() => {
    sessionStorage.clear();
    window.HydrolandAuth.syncAuthUi();
    window.HydrolandPortalAccess.clearProtectedPortal();
    return {
      profile:Boolean(window.HydrolandProfileData),
      dashboard:Boolean(document.querySelector('.hl-role-dashboard')),
      loginHidden:document.querySelector('.hl-login')?.classList.contains('hidden')
    };
  });
  expect(state).toEqual({profile:false,dashboard:false,loginHidden:false});
  await expect(page.locator('#role-console')).toBeHidden();
  await expect(page.locator('.hl-role-dashboard')).toHaveCount(0);
});


test('late-loaded role dashboard replays the current authorized role', async ({ page }) => {
  await seedSession(page);
  await page.evaluate(() => {
    window.HydrolandProfileData={profile:{roles:[{role:'ADMIN',status:'ACTIVE'}]}};
    const adminButton=document.querySelector('#role-dialog [data-role="admin"]');
    adminButton?.click();
  });
  await page.waitForFunction(() => window.HydrolandPortalAccess?.getCurrentRole?.()==='admin');
  await expect(page.locator('.hl-role-dashboard[data-role="admin"]')).toBeVisible();
});
