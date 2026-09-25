import { test, expect } from '@playwright/test';

test('Google sign-in stays sessionless until HYDROLAND MFA succeeds', async ({page})=>{
  let googlePayload=null,mfaPayload=null;
  await page.addInitScript(()=>{
    window.google={accounts:{id:{
      initialize(config){window.__hydrolandGoogleCallback=config.callback},
      renderButton(node){const button=document.createElement('button');button.type='button';button.dataset.googleMock='1';button.textContent='Sign in with Google';button.addEventListener('click',()=>window.__hydrolandGoogleCallback?.({credential:'google-e2e-id-token-credential-abcdefghijklmnopqrstuvwxyz-0123456789'}));node.appendChild(button)}
    }}};
  });
  await page.route('**/api/v1/auth/google/config',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,clientId:'google-e2e-client.apps.googleusercontent.com'})}));
  await page.route('**/api/v1/auth/google',route=>{googlePayload=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({mfaRequired:true,challengeToken:'google-mfa-challenge-token-abcdefghijklmnopqrstuvwxyz-123456'})})});
  await page.route('**/api/v1/auth/mfa/verify',route=>{mfaPayload=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({accessToken:'google-mfa-access',refreshToken:'google-mfa-refresh'})})});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth&&window.HydrolandGoogleAuth));
  const googleButton=page.locator('[data-google-mock]');
  await expect(googleButton).toBeVisible();
  await googleButton.click();
  await expect.poll(()=>googlePayload).toEqual({credential:'google-e2e-id-token-credential-abcdefghijklmnopqrstuvwxyz-0123456789'});
  await expect(page.locator('#hl-google-mfa-dialog')).toBeVisible();
  expect(await page.evaluate(()=>({access:sessionStorage.getItem('hl-access-token'),refresh:sessionStorage.getItem('hl-refresh-token'),persistedChallenge:Object.keys(sessionStorage).some(key=>/google|challenge|mfa/i.test(key))}))).toEqual({access:null,refresh:null,persistedChallenge:false});
  await page.locator('#hl-google-mfa-dialog input[name="code"]').fill('123456');
  await page.locator('#hl-google-mfa-dialog form').evaluate(form=>form.requestSubmit());
  await expect.poll(()=>mfaPayload).toEqual({challengeToken:'google-mfa-challenge-token-abcdefghijklmnopqrstuvwxyz-123456',code:'123456'});
  await expect(page.locator('.hl-login')).toHaveClass(/hidden/);
  expect(await page.evaluate(()=>({access:sessionStorage.getItem('hl-access-token'),refresh:sessionStorage.getItem('hl-refresh-token'),authenticated:window.HydrolandAuth.isAuthenticated()}))).toEqual({access:'google-mfa-access',refresh:'google-mfa-refresh',authenticated:true});
});
