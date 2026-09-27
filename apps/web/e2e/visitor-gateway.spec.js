import { test, expect } from '@playwright/test';

test('visitor can explore public sections and return to the sign-up entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/v1/')) return route.continue();
    const body = url.pathname.endsWith('/me/diver-profile')
      ? { profile: null, equipment: [] }
      : url.pathname.endsWith('/me')
        ? { id: 'visitor-e2e-account', roles: [] }
        : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandAuth && window.HydrolandMessages));

  const entry = page.locator('.hl-login');
  await expect(entry).toHaveAttribute('role', 'dialog');
  await expect(entry).toHaveAttribute('aria-modal', 'true');
  await expect(entry.getByRole('heading', { name: 'بوابتك إلى البحر الأحمر' })).toBeVisible();
  await expect(entry.locator('.hl-login-guest')).toBeVisible();

  await entry.locator('.hl-login-guest').click();
  await expect(entry).toHaveClass(/hidden/);
  expect(await page.evaluate(() => ({
    guest: window.HydrolandAuth.isGuestMode(),
    authenticated: window.HydrolandAuth.isAuthenticated(),
    access: document.body.classList.contains('hl-visitor-mode')
  }))).toEqual({ guest: true, authenticated: false, access: true });
  await expect(page.locator('#visitor-auth-cta')).toBeVisible();
  await expect(page.locator('#top-notifications')).toBeHidden();
  await expect(page.locator('#top-messages')).toBeHidden();
  await expect(page.locator('.mobile-nav [data-visitor-auth-control="messages"]')).toBeHidden();

  await page.locator('.hl-visitor-routebar [data-visitor-target="trips"]').click();
  await expect(page).toHaveURL(/#trips$/);
  await expect(page.locator('.nav-item[href="#trips"]').first()).toHaveClass(/active/);

  await page.locator('#visitor-auth-cta').click();
  await expect(entry).not.toHaveClass(/hidden/);
  await entry.locator('.hl-login-secondary').click();
  await expect(entry.locator('.hl-auth-panel')).toBeVisible();
  await expect(entry.locator('.hl-auth-panel input[name="email"]')).toBeFocused();
});
