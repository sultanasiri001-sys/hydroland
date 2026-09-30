import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const account = { id: 'membership-fixture', email: 'private@example.invalid', status: 'ACTIVE', roleAssignments: [{ role: 'DIVER', status: 'ACTIVE' }], person: { firstName: 'عضو', lastName: 'اختبار', professional: {} } };
const reference = 'hlm1.' + 'A'.repeat(140);
const card = () => ({ cardType: 'INTERNAL_ACCOUNT_REFERENCE', officialLicence: false, displayName: 'عضو اختبار', accountStatus: 'ACTIVE', roles: ['هواة الغوص'], reference, expiresAt: new Date(Date.now() + 300_000).toISOString() });
async function install(page, signedIn = true) {
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/auth/google/config', route => json(route, { enabled: false }));
  await page.route('**/api/v1/integrations/email/public-config', route => json(route, { enabled: true }));
  await page.route(/\/api\/v1\/me$/, route => json(route, account));
  await page.route(/\/api\/v1\/me\/diver-profile$/, route => json(route, { profile: {}, equipment: [] }));
  await page.route('**/api/v1/me/membership-pass', route => json(route, card()));
  await page.route('**/api/v1/me/membership-pass/verify', route => json(route, card()));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandMembership && window.HydrolandProfile && window.HydrolandWorkspaceUI));
  if (signedIn) await page.evaluate(async () => {
    window.HydrolandAuth.acceptSession({ accessToken: 'membership-fixture-access', refreshToken: 'membership-fixture-refresh' }, window.HydrolandAuth.beginAuthAttempt());
    await window.HydrolandProfile.load();
    window.HydrolandWorkspaceUI.show(document.querySelector('.hl-members'));
  });
}
const dialog = page => page.locator('#hl-membership-pass');
const open = async page => { await page.locator('[data-membership-action="qr"]').click(); await expect(dialog(page).locator('[data-pass-content]')).toBeVisible(); };
for (const [name, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
  test(`membership actions, real PNG download and private share on ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport); await install(page);
    await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__membershipShared = data; } }); });
    for (const action of ['qr', 'card', 'share']) {
      await page.locator(`[data-membership-action="${action}"]`).click();
      await expect(dialog(page).locator('[data-pass-content]')).toBeVisible();
      await expect(dialog(page)).toContainText('ليست رخصة غوص');
      await expect(dialog(page)).not.toContainText(account.email);
      await expect(dialog(page).locator('[data-pass-download]')).toBeDisabled();
      if (action === 'qr') {
        const bounds = await dialog(page).boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.width).toBeLessThanOrEqual(viewport.width); expect(bounds.y).toBeGreaterThanOrEqual(0);
        await dialog(page).screenshot({ path: testInfo.outputPath(`account-membership-${name}.png`) });
      }
      await dialog(page).locator('[data-pass-consent]').check();
      if (action === 'card') {
        const downloadPromise = page.waitForEvent('download'); await dialog(page).locator('[data-pass-download]').click();
        const file = await downloadPromise; const bytes = await readFile(await file.path());
        await file.saveAs(testInfo.outputPath(`account-membership-card-${name}.png`));
        expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); expect(bytes.readUInt32BE(16)).toBe(1080); expect(bytes.readUInt32BE(20)).toBe(680);
      }
      if (action === 'share') {
        await dialog(page).locator('[data-pass-share]').click();
        const shared = await page.evaluate(() => window.__membershipShared);
        expect(shared.url).toContain('/#membership-pass=hlm1.'); expect(JSON.stringify(shared)).not.toContain(account.email); expect(JSON.stringify(shared)).not.toContain('عضو اختبار');
      }
      await dialog(page).locator('[data-pass-close]').click(); await expect(dialog(page)).toHaveCount(0);
    }
  });
}
test('membership logout clears the prepared card and blocks late responses', async ({ page }) => {
  await install(page); let pending;
  await page.route('**/api/v1/me/membership-pass', route => { pending = route; });
  await page.locator('[data-membership-action="qr"]').click(); await expect.poll(() => Boolean(pending)).toBe(true);
  await page.evaluate(() => window.HydrolandAuth.terminateSession()); await json(pending, card());
  await expect(dialog(page)).toHaveCount(0); await expect(page.locator('[data-membership-action="qr"]')).toBeDisabled();
  expect(await page.evaluate(() => sessionStorage.getItem('membership-reference'))).toBeNull();
});
test('membership server failure permits retry without exposing stale data', async ({ page }) => {
  await install(page); let attempts = 0;
  await page.route('**/api/v1/me/membership-pass', route => ++attempts === 1 ? json(route, { message: 'unavailable' }, 503) : json(route, card()));
  await page.locator('[data-membership-action="qr"]').click(); await expect(dialog(page).locator('[data-pass-status]')).toContainText('تعذر');
  await expect(dialog(page).locator('[data-pass-content]')).toBeHidden(); await dialog(page).locator('[data-pass-retry]').click(); await expect(dialog(page).locator('[data-pass-content]')).toBeVisible();
});
test('native sharing cancellation is not reported as success', async ({ page }) => {
  await install(page); await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancelled', 'AbortError'); } }));
  await open(page); await dialog(page).locator('[data-pass-consent]').check(); await dialog(page).locator('[data-pass-share]').click();
  await expect(dialog(page).locator('[data-pass-status]')).toHaveText('تم إلغاء المشاركة.');
});
test('membership references expire and downloads become unavailable', async ({ page }) => {
  await install(page); await page.route('**/api/v1/me/membership-pass', route => json(route, { ...card(), expiresAt: new Date(Date.now() + 2000).toISOString() }));
  await open(page); await dialog(page).locator('[data-pass-consent]').check();
  await expect(dialog(page).locator('[data-pass-status]')).toContainText('انتهت صلاحية المرجع', { timeout: 6000 });
  await expect(dialog(page).locator('[data-pass-download]')).toBeDisabled(); await expect(dialog(page).locator('[data-pass-content]')).toBeHidden();
});
test('scanned membership reference uses protected POST and clears the URL fragment', async ({ page }) => {
  await install(page); let posted;
  await page.route('**/api/v1/me/membership-pass/verify', route => { posted = route.request().postDataJSON(); return json(route, card()); });
  await page.evaluate(ref => { location.hash = 'membership-pass=' + ref; }, reference);
  await expect(dialog(page).locator('[data-pass-content]')).toBeVisible(); expect(posted).toEqual({ reference });
  expect(new URL(page.url()).hash).toBe(''); await expect(dialog(page).locator('[data-pass-share]')).toBeHidden();
});
test('scanned references do not expose account details to guests or unauthorized members', async ({ page }) => {
  await install(page, false); let requests = 0;
  await page.route('**/api/v1/me/membership-pass/verify', route => { requests++; return json(route, { message: 'forbidden' }, 403); });
  await page.evaluate(ref => { location.hash = 'membership-pass=' + ref; }, reference);
  await expect(dialog(page).locator('[data-pass-status]')).toContainText('سجّل الدخول'); expect(requests).toBe(0);
  await dialog(page).locator('[data-pass-close]').click();
  await page.evaluate(() => window.HydrolandAuth.acceptSession({ accessToken: 'ordinary-member', refreshToken: 'ordinary-refresh' }, window.HydrolandAuth.beginAuthAttempt()));
  await page.evaluate(ref => { location.hash = 'membership-pass=' + ref; }, reference);
  await expect(dialog(page).locator('[data-pass-status]')).toContainText('ليست لديك صلاحية'); await expect(dialog(page)).not.toContainText('عضو اختبار');
});
