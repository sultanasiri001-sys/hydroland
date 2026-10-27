import { test, expect } from '@playwright/test';

const enter = async page => {
  await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandPublicUI && window.HydrolandAuth && window.HydrolandTraining && document.querySelector('.hl-training')));
  await page.evaluate(() => {
    window.__scrollCalls = [];
    Element.prototype.scrollIntoView = function(options) { window.__scrollCalls.push({ id: this.id, className: this.className, ...options }); };
  });
};
const calls = page => page.evaluate(() => window.__scrollCalls);
const clear = page => page.evaluate(() => { window.__scrollCalls = []; });

test('cart respects live reduced-motion changes without reloading', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => window.HydrolandPublicUI.navigate('store'));
  for (const [reducedMotion, behavior] of [['no-preference','smooth'], ['reduce','instant'], ['no-preference','smooth']]) {
    await page.emulateMedia({ reducedMotion }); await clear(page);
    await page.locator('.hl-cart').click();
    expect(await calls(page)).toEqual([expect.objectContaining({ className: expect.stringContaining('hl-store-cart'), behavior, block: 'center' })]);
  }
});

test('workspace navigation and training use current preference and retain guest gate', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => window.HydrolandPublicUI.navigate('training'));
  await clear(page);
  await page.locator('[data-public-training-account]').click();
  await expect(page.locator('.hl-login')).toBeVisible();
  expect(await calls(page)).toEqual([]);
  await page.locator('.hl-login-guest').click();
  // Only the auth boundary is stubbed; execute the production navigation and click handlers.
  await page.evaluate(() => { window.HydrolandAuth.isAuthenticated = () => true; });
  for (const [reducedMotion, behavior] of [['reduce','instant'], ['no-preference','smooth'], ['reduce','instant']]) {
    await page.emulateMedia({ reducedMotion }); await clear(page);
    await page.evaluate(() => window.HydrolandPublicUI.navigate('store'));
    expect(await calls(page)).toEqual([expect.objectContaining({ id: 'store', behavior, block: 'start' })]);
    await clear(page);
    await page.evaluate(() => document.querySelector('[data-public-training-account]').click());
    expect(await calls(page)).toEqual([expect.objectContaining({ className: expect.stringContaining('hl-training'), behavior, block: 'start' })]);
  }
});

test('missing matchMedia defaults to non-animated cart and workspace scrolling', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => {
    window.HydrolandPublicUI.navigate('store');
    window.matchMedia = undefined;
    window.HydrolandAuth.isAuthenticated = () => true;
    window.__scrollCalls = [];
    document.querySelector('.hl-cart').click();
    window.HydrolandPublicUI.navigate('store');
    document.querySelector('[data-public-training-account]').click();
  });
  expect((await calls(page)).map(call => [call.behavior, call.block])).toEqual([['instant','center'], ['instant','start'], ['instant','start']]);
});
