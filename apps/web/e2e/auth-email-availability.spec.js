import {test,expect} from '@playwright/test';

const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const install=async page=>{
  await page.route('**/api/v1/**',route=>json(route,[]));
  await page.route('**/api/v1/auth/google/config',route=>json(route,{enabled:false}));
};
const open=async(page,mode='register')=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandAuth));
  await page.locator('#visitor-auth-cta').click();
  await page.locator(mode==='register'?'.hl-login-secondary':'.hl-login-primary').click();
  return page.locator('.hl-auth-panel');
};

for(const [name,width,height] of [['mobile',390,844],['tablet',834,1112],['desktop',1440,1000]]){
  test('unavailable email blocks registration with a readable '+name+' notice',async({page},testInfo)=>{
    await page.setViewportSize({width,height});await install(page);
    await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:false}));
    let registrations=0;
    await page.route('**/api/v1/auth/register',route=>{registrations++;return json(route,{},201)});
    const panel=await open(page);
    await expect(panel.locator('.hl-auth-availability')).toContainText('إنشاء الحساب غير متاح مؤقتًا');
    await expect(panel.locator('.hl-auth-submit')).toBeDisabled();
    await panel.locator('[name="email"]').fill('pending@example.invalid');
    await panel.locator('[name="password"]').fill('Hydroland-Pending-123!');
    await panel.evaluate(form=>form.requestSubmit());
    expect(registrations).toBe(0);
    await expect(panel.locator('.hl-auth-note')).not.toContainText('سنرسل');
    expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
    const box=await panel.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    await page.screenshot({path:testInfo.outputPath('account-email-unavailable-'+name+'.png'),fullPage:true});
    await panel.locator('.hl-auth-cancel').click();
    await page.locator('.hl-login-primary').click();
    await expect(panel.locator('.hl-auth-forgot')).toBeDisabled();
    await expect(panel.locator('.hl-auth-resend')).toBeDisabled();
    await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.locator('.hl-login')).toBeHidden();
    await expect(page.locator('#home')).toBeVisible();
  });
}

test('availability lookup errors stay closed and retry enables registration',async({page})=>{
  await install(page);let lookups=0,registrations=0;
  await page.route('**/api/v1/integrations/email/public-config',route=>++lookups===1?route.abort('failed'):json(route,{enabled:true}));
  await page.route('**/api/v1/auth/register',route=>{registrations++;return json(route,{status:'PENDING_VERIFICATION',requiresEmailVerification:true},201)});
  const panel=await open(page);
  await expect(panel.locator('.hl-auth-availability')).toContainText('تعذر التحقق من خدمة البريد');
  await expect(panel.locator('.hl-auth-submit')).toBeDisabled();
  await panel.locator('.hl-auth-availability-retry').click();
  await expect(panel.locator('.hl-auth-availability')).toBeHidden();
  await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
  await panel.locator('[name="email"]').fill('retry@example.invalid');
  await panel.locator('[name="password"]').fill('Hydroland-Retry-123!');
  await panel.locator('.hl-auth-submit').click();
  await expect.poll(()=>registrations).toBe(1);
  await expect(panel).toBeHidden();
  expect(await page.evaluate(()=>sessionStorage.getItem('hl-refresh-token'))).toBeNull();
});

test('a pending lookup cannot enable submission or interfere with login MFA',async({page})=>{
  await install(page);let lookup;
  await page.route('**/api/v1/integrations/email/public-config',route=>{lookup=route});
  await page.route('**/api/v1/auth/login',route=>json(route,{mfaRequired:true,challengeToken:'availability-mfa'}));
  const panel=await open(page);
  await expect(panel.locator('.hl-auth-availability')).toContainText('جارٍ التحقق');
  await expect(panel.locator('.hl-auth-submit')).toBeDisabled();
  await panel.locator('.hl-auth-cancel').click();await page.locator('.hl-login-primary').click();
  await panel.locator('[name="email"]').fill('login@example.invalid');
  await panel.locator('[name="password"]').fill('Hydroland-Login-123!');
  await panel.locator('.hl-auth-submit').click();
  await expect(panel.locator('[data-mfa-field]')).toBeVisible();
  await json(lookup,{enabled:false});
  await expect(panel.locator('.hl-auth-availability')).toBeHidden();
  await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
  await expect(panel.locator('.hl-auth-submit')).toHaveText('تحقق من الرمز');
});

test('an existing reset link works even when new email delivery is unavailable',async({page})=>{
  await install(page);
  await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:false}));
  let resets=0;
  await page.route('**/api/v1/auth/password-reset/confirm',route=>{resets++;return json(route,{passwordReset:true})});
  await page.goto('/?reset_token=existing-email-link',{waitUntil:'domcontentloaded'});
  const panel=page.locator('.hl-auth-panel');
  await expect(panel).toBeVisible();await expect(panel.locator('.hl-auth-availability')).toBeHidden();
  await panel.locator('[name="password"]').fill('Hydroland-Reset-123!');
  await panel.locator('.hl-auth-submit').click();
  await expect.poll(()=>resets).toBe(1);
  expect(new URL(page.url()).searchParams.has('reset_token')).toBe(false);
});

test('restricted trial explains the limit and keeps rejected registration unauthenticated',async({page})=>{
  await page.setViewportSize({width:390,height:844});await install(page);
  await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:true,restricted:true}));
  await page.route('**/api/v1/auth/register',route=>json(route,{message:'إرسال البريد متاح حاليًا لحساب الاختبار المعتمد فقط. يمكنك الاستكشاف كزائر.'},403));
  const panel=await open(page);
  await expect(panel.locator('.hl-auth-availability')).toContainText('تجربة محدودة لحساب الاختبار المعتمد');
  await expect(panel.locator('.hl-auth-availability-retry')).toBeHidden();
  await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
  await panel.locator('[name="email"]').fill('other@example.invalid');
  await panel.locator('[name="password"]').fill('Hydroland-Trial-123!');
  await panel.locator('.hl-auth-submit').click();
  await expect(panel.locator('.hl-auth-status')).toContainText('لحساب الاختبار المعتمد فقط');
  await expect(panel.locator('[name="email"]')).toHaveValue('other@example.invalid');
  await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
  expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(false);
  const box=await panel.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(391);
  await panel.locator('.hl-auth-cancel').click();await page.locator('.hl-login-primary').click();
  await expect(panel.locator('.hl-auth-submit')).toBeEnabled();
  await expect(panel.locator('.hl-auth-availability')).toContainText('تجربة محدودة');
});

test('restricted trial permits the approved account through the normal verification flow',async({page})=>{
  await install(page);
  await page.route('**/api/v1/integrations/email/public-config',route=>json(route,{enabled:true,restricted:true}));
  let submitted;
  await page.route('**/api/v1/auth/register',route=>{submitted=route.request().postDataJSON();return json(route,{status:'PENDING_VERIFICATION',requiresEmailVerification:true},201)});
  const panel=await open(page);
  await panel.locator('[name="email"]').fill('approved@example.invalid');
  await panel.locator('[name="password"]').fill('Hydroland-Trial-123!');
  await panel.locator('.hl-auth-submit').click();
  await expect(panel).toBeHidden();
  expect(submitted.email).toBe('approved@example.invalid');
  expect(await page.evaluate(()=>window.HydrolandAuth.isAuthenticated())).toBe(false);
  await expect(page.locator('#toast')).toContainText('يلزم التحقق من البريد الإلكتروني');
});
