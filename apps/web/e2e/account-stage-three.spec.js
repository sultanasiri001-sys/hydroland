import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const account={id:'stage-three',email:'account@hydroland.test',status:'ACTIVE',roleAssignments:[{role:'DIVER',status:'ACTIVE'}],person:{firstName:'سلطان',lastName:'عسيري',professional:{headline:'هواة الغوص',regionCode:'عسير'}}};
const install=async(page,{credentials=[]}={})=>{
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
  await page.route(/\/api\/v1\/me$/,route=>json(route,account));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,credentials));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:{nationality:'SA',primaryPhone:'0500000000',emergencyName:'جهة اتصال اختبار',medicalFitnessStatus:'UNKNOWN'},equipment:[]}));
  await page.route('**/api/v1/auth/mfa/status',route=>json(route,{enabled:false,recoveryCodesRemaining:0}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandProfile&&window.HydrolandPublicUI));
};
const seed=async page=>{
  await page.evaluate(async()=>{
    window.HydrolandAuth.acceptSession({accessToken:'account-access',refreshToken:'account-refresh'},window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
  });
  await expect.poll(()=>page.evaluate(()=>window.HydrolandProfileData?.profile?.id)).toBe('stage-three');
};
const session=page=>page.evaluate(()=>({access:sessionStorage.getItem('hl-access-token'),refresh:sessionStorage.getItem('hl-refresh-token')}));
const signedOut={access:null,refresh:null};
const openLogin=async page=>{await page.locator('#visitor-auth-cta').click();await page.locator('.hl-login-primary').click();};

test('late refresh success cannot restore a session after logout',async({page})=>{
  await install(page);await seed(page);
  let pending;
  await page.route('**/api/v1/auth/refresh',route=>{pending=route;});
  await page.evaluate(()=>{window.__refreshSettled=false;window.HydrolandAuth.refreshSession().catch(()=>{}).finally(()=>window.__refreshSettled=true);});
  await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.locator('#profile-open').click();
  await page.locator('[data-hl-action="logout"]').click();
  expect(await session(page)).toEqual(signedOut);
  await json(pending,{accessToken:'late-access',refreshToken:'late-refresh'});
  await page.waitForFunction(()=>window.__refreshSettled);
  expect(await session(page)).toEqual(signedOut);
  expect(await page.evaluate(()=>Boolean(window.HydrolandProfileData))).toBe(false);
});

test('old refresh failure cannot clear a newer authenticated session',async({page})=>{
  await install(page);await seed(page);let pending;
  await page.route('**/api/v1/auth/refresh',route=>{pending=route;});
  await page.evaluate(()=>{window.__refreshSettled=false;window.HydrolandAuth.refreshSession().catch(()=>{}).finally(()=>window.__refreshSettled=true);});
  await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.evaluate(()=>{window.HydrolandAuth.terminateSession();window.HydrolandAuth.acceptSession({accessToken:'new-access',refreshToken:'new-refresh'},window.HydrolandAuth.beginAuthAttempt());});
  await json(pending,{message:'Expired'},401);await page.waitForFunction(()=>window.__refreshSettled);
  expect(await session(page)).toEqual({access:'new-access',refresh:'new-refresh'});
});

test('cancelled sign-in ignores the pending success and erases the password',async({page})=>{
  await install(page);let pending;
  await page.route('**/api/v1/auth/login',route=>{pending=route;});
  await openLogin(page);
  await page.locator('.hl-auth-panel [name="email"]').fill('account@hydroland.test');
  await page.locator('.hl-auth-panel [name="password"]').fill('Hydroland-Test-2026!');
  await page.locator('.hl-auth-submit').click();await expect.poll(()=>Boolean(pending)).toBe(true);
  await page.keyboard.press('Escape');
  await json(pending,{accessToken:'cancelled-access',refreshToken:'cancelled-refresh'});
  await expect(page.locator('.hl-auth-panel')).not.toHaveAttribute('aria-busy');
  expect(await session(page)).toEqual(signedOut);
  await expect(page.locator('.hl-auth-panel [name="password"]')).toHaveValue('');
  await expect(page.locator('.hl-login')).toBeHidden();
});

test('invalid session responses show a persistent error and allow a safe retry',async({page})=>{
  await install(page);let calls=0;
  await page.route('**/api/v1/auth/login',route=>json(route,++calls===1?{accessToken:'missing-refresh'}:{accessToken:'retry-access',refreshToken:'retry-refresh'}));
  await openLogin(page);
  await page.locator('.hl-auth-panel [name="email"]').fill('account@hydroland.test');
  await page.locator('.hl-auth-panel [name="password"]').fill('Hydroland-Test-2026!');
  await page.locator('.hl-auth-submit').click();
  await expect(page.locator('.hl-auth-status')).toContainText('استجابة الجلسة غير صالحة');
  expect(await session(page)).toEqual(signedOut);
  await expect(page.locator('.hl-auth-panel [name="email"]')).toHaveValue('account@hydroland.test');
  await page.locator('.hl-auth-submit').click();await expect(page.locator('.hl-login')).toBeHidden();
  expect(await session(page)).toEqual({access:'retry-access',refresh:'retry-refresh'});
});

test('session expiry closes account editors and clears visible personal information',async({page})=>{
  await install(page);await seed(page);
  await page.locator('#profile-open').click();
  await page.locator('#profile-dialog [data-hl-action="settings"]').last().click();
  await expect(page.locator('#hl-profile-editor [name="firstName"]')).toHaveValue('سلطان');
  await page.route('**/api/v1/expired-account',route=>json(route,{message:'Expired'},401));
  await page.route('**/api/v1/auth/refresh',route=>json(route,{message:'Expired'},401));
  await page.evaluate(()=>window.HydrolandAuth.authorizedFetch('/expired-account').catch(()=>{}));
  expect(await session(page)).toEqual(signedOut);
  await expect(page.locator('#hl-profile-editor')).toHaveCount(0);
  await expect(page.locator('#profile-dialog')).not.toBeVisible();
  await expect(page.locator('.hl-profile-dashboard')).not.toContainText('سلطان');
  await expect(page.locator('.hl-login')).toBeVisible();
});

test('a new sign-in re-enables logout without reloading the page',async({page})=>{
  await install(page);await seed(page);
  await page.locator('#profile-open').click();await page.locator('[data-hl-action="logout"]').click();
  await page.route('**/api/v1/auth/login',route=>json(route,{accessToken:'new-access',refreshToken:'new-refresh'}));
  await page.locator('.hl-login-primary').click();
  await page.locator('.hl-auth-panel [name="email"]').fill('account@hydroland.test');
  await page.locator('.hl-auth-panel [name="password"]').fill('Hydroland-Test-2026!');
  await page.locator('.hl-auth-submit').click();
  await expect(page.locator('.hl-login')).toBeHidden();
  await page.locator('#profile-open').click();await expect(page.locator('[data-hl-action="logout"]')).toBeEnabled();
  await page.locator('[data-hl-action="logout"]').click();expect(await session(page)).toEqual(signedOut);
});

test('MFA setup blocks repeated submissions while awaiting its response',async({page})=>{
  await install(page);await seed(page);let pending,requests=0;
  await page.route('**/api/v1/auth/mfa/totp/setup',route=>{requests++;pending=route;});
  await page.locator('#profile-open').click();await page.locator('[data-hl-action="mfa-settings"]').click();
  const start=page.locator('[data-mfa-action="start"]');await start.click();
  await expect(start).toBeDisabled();expect(requests).toBe(1);
  await json(pending,{secret:'TESTONLY2FASECRET'});
  await expect(page.locator('[data-mfa-confirm-code]')).toBeVisible();
});

test('credential titles render as text, never as markup',async({page})=>{
  const title='<b data-account-injection>نص شهادة</b>';
  await install(page,{credentials:[{id:'safe-credential',issuer:'جهة اختبار',title,verificationStatus:'UNVERIFIED',documents:[]}]});await seed(page);
  await page.locator('#navigation [data-hl-action="certs"]').click();
  await expect(page.locator('.hl-certificates')).toContainText(title);
  await expect(page.locator('[data-account-injection]')).toHaveCount(0);
});

for(const viewport of [{name:'desktop',width:1536,height:864},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
  test(`account screens use the shared identity and fit ${viewport.name}`,async({page},testInfo)=>{
    await page.setViewportSize(viewport);await install(page);
    const capture=async name=>{
      const widths=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
      expect(widths.content).toBeLessThanOrEqual(widths.viewport+1);
      await page.screenshot({path:testInfo.outputPath(`account-${name}-${viewport.name}.png`)});
    };
    await openLogin(page);await capture('login');
    await page.locator('.hl-auth-cancel').click();await page.locator('.hl-login-secondary').click();await capture('register');
    await page.keyboard.press('Escape');await seed(page);
    await page.locator('#profile-open').click();await capture('profile');
    // Open diver data first: its style must not depend on having opened general settings.
    await page.locator('#profile-dialog [data-hl-action="diver-profile"]').click();
    const editor=page.locator('#hl-diver-editor');await expect(editor).toBeVisible();
    const geometry=await editor.evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,viewport:innerHeight,display:getComputedStyle(el.querySelector('form')).display}));
    expect(geometry.display).toBe('grid');expect(geometry.top).toBeGreaterThanOrEqual(0);expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
    await capture('diver-profile');await editor.locator('[data-diver-cancel]').click();
    await page.locator('#profile-dialog [data-hl-action="settings"]').last().click();await capture('settings');
    await page.locator('[data-profile-cancel]').click();await page.locator('#close-profile').click();
    if(viewport.width<=760)await page.locator('#menu').click();
    await page.locator('#navigation [data-hl-action="certs"]').click();await capture('documents');
    await page.locator('.hl-certificates .hl-member-actions button').first().click();await capture('credential');
    await page.locator('[data-credential-cancel]').click();
    await page.locator('#profile-open').click();await page.locator('[data-hl-action="mfa-settings"]').click();
    await expect(page.locator('[data-mfa-action="start"]')).toBeVisible();await capture('security');
    await page.locator('[data-mfa-close]').click();
    await page.evaluate(()=>window.HydrolandAuth.terminateSession());
    await page.goto('/?reset_token=visual-reset-fixture',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.hl-auth-panel')).toBeVisible();await capture('reset');
  });
}
