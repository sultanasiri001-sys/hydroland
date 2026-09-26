import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});

const installProfileStubs=async page=>{
  await page.route(/\/api\/v1\/me$/,route=>json(route,{id:'auth-life',email:'life@hydroland.test',status:'ACTIVE',roleAssignments:[],person:{firstName:'Auth',lastName:'Life',phone:null,professional:null}}));
  await page.route(/\/api\/v1\/credentials$/,route=>json(route,[]));
  await page.route(/\/api\/v1\/me\/diver-profile$/,route=>json(route,{profile:null,equipment:[]}));
};

test('registration remains unauthenticated until email verification',async({page})=>{
  await page.route('**/api/v1/auth/register',route=>json(route,{email:'pending@hydroland.test',status:'PENDING_VERIFICATION',requiresEmailVerification:true},201));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth));
  await page.locator('.hl-login-secondary').click();
  const panel=page.locator('.hl-auth-panel');
  await expect(panel).toBeVisible();
  await panel.locator('input[name="email"]').fill('pending@hydroland.test');
  await panel.locator('input[name="password"]').fill('Hydroland-Start-123!');
  await panel.evaluate(form=>form.requestSubmit());
  await expect.poll(()=>page.evaluate(()=>({access:sessionStorage.getItem('hl-access-token'),refresh:sessionStorage.getItem('hl-refresh-token')}))).toEqual({access:null,refresh:null});
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});

test('email verification link creates the first authenticated session',async({page})=>{
  await installProfileStubs(page);
  let receivedToken='';
  await page.route('**/api/v1/auth/email-verification/confirm',async route=>{receivedToken=(await route.request().postDataJSON()).token;return json(route,{accessToken:'verified-access',refreshToken:'verified-refresh'});});
  await page.goto('/?verify_email=verify-e2e-token',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>sessionStorage.getItem('hl-refresh-token')==='verified-refresh');
  expect(receivedToken).toBe('verify-e2e-token');
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-access-token'))).toBe('verified-access');
  await expect.poll(()=>new URL(page.url()).searchParams.has('verify_email')).toBe(false);
});

test('password reset link posts the one-time token and keeps the user signed out',async({page})=>{
  let body=null;
  await page.route('**/api/v1/auth/password-reset/confirm',async route=>{body=await route.request().postDataJSON();return json(route,{passwordReset:true});});
  await page.goto('/?reset_token=reset-e2e-token',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth));
  const panel=page.locator('.hl-auth-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.hl-auth-email')).toBeHidden();
  await panel.locator('input[name="password"]').fill('Hydroland-Renew-456!');
  await panel.evaluate(form=>form.requestSubmit());
  await expect.poll(()=>body).toEqual({token:'reset-e2e-token',password:'Hydroland-Renew-456!'});
  await expect.poll(()=>new URL(page.url()).searchParams.has('reset_token')).toBe(false);
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  await expect(page.locator('.hl-login')).not.toHaveClass(/hidden/);
});

test('recovery controls request generic actions without creating a session',async({page})=>{
  const calls=[];
  await page.route('**/api/v1/auth/password-reset/request',async route=>{calls.push(['reset',await route.request().postDataJSON()]);return json(route,{accepted:true},202);});
  await page.route('**/api/v1/auth/email-verification/request',async route=>{calls.push(['verify',await route.request().postDataJSON()]);return json(route,{accepted:true},202);});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth));
  await page.locator('.hl-login-primary').click();
  const panel=page.locator('.hl-auth-panel');
  await panel.locator('input[name="email"]').fill('recovery@hydroland.test');
  await panel.locator('.hl-auth-forgot').click();
  await panel.locator('.hl-auth-resend').click();
  await expect.poll(()=>calls.length).toBe(2);
  expect(calls).toEqual([['reset',{email:'recovery@hydroland.test'}],['verify',{email:'recovery@hydroland.test'}]]);
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
});

test('MFA login step still gates token storage after recovery UI merge',async({page})=>{
  await page.route('**/api/v1/auth/login',route=>json(route,{mfaRequired:true,challengeToken:'mfa-e2e-challenge'}));
  await page.route('**/api/v1/auth/mfa/verify',async route=>{expect(await route.request().postDataJSON()).toEqual({challengeToken:'mfa-e2e-challenge',code:'123456'});return json(route,{accessToken:'mfa-access',refreshToken:'mfa-refresh'});});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('.hl-login-primary').click();
  const panel=page.locator('.hl-auth-panel');
  await panel.locator('input[name="email"]').fill('mfa@hydroland.test');
  await panel.locator('input[name="password"]').fill('Hydroland-Start-123!');
  await panel.evaluate(form=>form.requestSubmit());
  await expect(panel.locator('[data-mfa-field]')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
  await panel.locator('input[name="mfaCode"]').fill('123456');
  await panel.evaluate(form=>form.requestSubmit());
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBe('mfa-refresh');
});
