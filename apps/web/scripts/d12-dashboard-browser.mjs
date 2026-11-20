import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createStaticServer } from './serve.mjs';

export async function verifyDashboard({base,email,password,centerName}) {
  const server = createStaticServer();
  await new Promise((resolve,reject) => server.once('error',reject).listen(4197,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.D12_BROWSER_PATH ? {executablePath:process.env.D12_BROWSER_PATH} : {});
    const page = await browser.newPage({viewport:{width:1280,height:850}});
    await page.addInitScript(url => { window.HYDROLAND_API_BASE = url.replace(/\/$/, ''); },base);
    await page.goto('http://127.0.0.1:4197/');
    await page.waitForFunction(() => window.HydrolandAuth && document.querySelector('[data-d12-panel]'));
    await page.evaluate(async ({email,password,base}) => {
      const auth = window.HydrolandAuth;
      const attempt = auth.beginAuthAttempt();
      const response = await fetch(new URL('auth/login',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      if (!response.ok) throw Error('Fixture login failed');
      auth.acceptSession(await response.json(),attempt);
    },{email,password,base});
    await page.evaluate(() => window.HydrolandPortalFreshness.openRoleSwitcher());
    await page.locator('#role-dialog [data-role="admin"]').click();
    const settings = page.locator('.hl-role-dashboard [data-action-label="إعدادات المنصة"]');
    const approvals = page.locator('.hl-role-dashboard [data-action-label="الاعتمادات"]');
    await (await settings.count() ? settings.first() : approvals.first()).click();
    const panel = page.locator('[data-d12-panel]');
    await panel.waitFor({state:'visible'});
    await panel.locator('select').selectOption({label:centerName});
    await panel.locator('input[type=date]').nth(0).fill('2026-10-02');
    await panel.locator('input[type=date]').nth(1).fill('2026-10-02');
    await panel.locator('button[type=submit]').click();
    await panel.locator('dl').waitFor();
    const content = await panel.locator('dl').textContent();
    for (const value of ['125.01 SAR','3.10 USD','34.50 SAR']) assert(content.includes(value),value);
    await page.evaluate(() => window.HydrolandAuth.logout());
    assert.equal(await panel.locator('dl').count(),0);
    assert.equal(await panel.isVisible(),false);
    console.log('PASS browser: real owner session, admin navigation, organization and dates, reconciled amounts, logout clears panel');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
