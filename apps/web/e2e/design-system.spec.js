import {test,expect} from '@playwright/test';

test('approved identity, fonts and button geometry survive blocked external fonts',async({page})=>{
  await page.setViewportSize({width:1536,height:864});
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  await page.route('https://fonts.gstatic.com/**',route=>route.abort());
  await page.route('**/api/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/themes/active')?{themeId:'ocean-horizon'}:[])}));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(window.HydrolandPublicUI));
  await page.locator('.hl-login-guest').click();
  const identity=await page.evaluate(async()=>{
    const loaded=await Promise.all([400,500,700,800,900].map(weight=>document.fonts.load(`${weight} 16px Tajawal`,'هيدرولاند')));
    await document.fonts.ready;
    const css=getComputedStyle(document.documentElement),button=getComputedStyle(document.querySelector('#home .primary-button'));
    const mark=new Image();mark.src='./assets/hydroland-mark-reference.webp';await mark.decode();
    return {fonts:loaded.map(faces=>faces.length),family:getComputedStyle(document.body).fontFamily,direction:getComputedStyle(document.body).direction,accent:css.getPropertyValue('--theme-accent').trim(),gold:css.getPropertyValue('--theme-gold').trim(),radius:parseFloat(button.borderRadius),markWidth:mark.naturalWidth,markBackground:getComputedStyle(document.querySelector('.brand-mark')).backgroundImage};
  });
  expect(identity.fonts.every(count=>count>0)).toBe(true);
  expect(identity.family).toContain('Tajawal');expect(identity.direction).toBe('rtl');
  expect(identity.accent.toLowerCase()).toBe('#00d4ff');expect(identity.gold.toLowerCase()).toBe('#f6c35e');
  expect(identity.radius).toBeGreaterThanOrEqual(10);expect(identity.markWidth).toBeGreaterThan(1000);
  expect(identity.markBackground).toContain('hydroland-mark-reference.webp');
  await page.locator('#home .ghost-button').click();
  const training=page.locator('[data-public-training-account]');
  const oceanButton=await training.evaluate(button=>getComputedStyle(button).backgroundImage);
  expect(await training.evaluate(button=>parseFloat(getComputedStyle(button).borderRadius))).toBeGreaterThanOrEqual(10);
  await page.getByRole('button',{name:'فتح الثيمات',exact:true}).click();
  await expect(page.locator('.theme-dialog [data-id]')).toHaveCount(10);
  await page.locator('.theme-dialog [data-id="national-day"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','national-day');
  expect(await training.evaluate(button=>getComputedStyle(button).backgroundImage)).not.toBe(oceanButton);
  await page.locator('.theme-dialog [data-id="ocean-horizon"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','ocean-horizon');
});
