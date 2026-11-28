import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';

const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
const digest = 'a'.repeat(64), changed = 'b'.repeat(64), qrValue = 'hydroland:passport:' + 'c'.repeat(64);
async function install(page, options = {}) {
  const source = { kind: 'EQUIPMENT', displayName: options.name || 'معدة اختبار الجواز', identity: { assetCode: 'F01-001', serialNumber: 'F01-SERIAL' },
    stockStatus: 'AVAILABLE', evidence: { inspectionStatus: 'NOT_RECORDED', reviewed: false, evidenceComplete: false, nativeGate: { blocked: true, reviewRequired: false } }, operationalClearance: false };
  const state = { sourceKind: 'EQUIPMENT', sourceId: 'eq-f01', sourceDigest: digest, source, canManage: options.canManage !== false, passport: null, revisions: [], writes: [] };
  const profile = { id: 'center-f01', email: 'f01@example.invalid', status: 'ACTIVE', person: { firstName: 'مركز', lastName: 'الاختبار' }, roleAssignments: [{ role: 'DIVE_CENTER', status: 'ACTIVE' }] };
  const item = { resourceId: 'eq-f01', resourceName: source.displayName, assetCode: 'F01-001', serialNumber: 'F01-SERIAL', stockStatus: 'AVAILABLE', active: true };
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/me', route => json(route, profile));
  await page.route('**/api/v1/auth/google/config', route => json(route, { enabled: false }));
  await page.route('**/api/v1/me/diver-profile', route => json(route, { profile: null, equipment: [] }));
  await page.route('**/api/v1/center/me/overview', route => json(route, { center: { displayName: 'مركز الاختبار' }, metrics: {} }));
  await page.route('**/api/v1/center/me/equipment', route => json(route, [item]));
  await page.route('**/api/v1/asset-passports/sources/EQUIPMENT/eq-f01', route => json(route, state));
  await page.route('**/api/v1/asset-passports/sources/EQUIPMENT/eq-f01/*', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1), payload = route.request().postDataJSON();
    state.writes.push({ action, payload });
    if (options.failFirst && state.writes.length === 1) return json(route, { message: 'تعذر الحفظ مؤقتًا' }, 503);
    if (action === 'revoke') { state.passport.status = 'REVOKED'; state.passport.revocation = { reason: payload.reason }; state.revisions.forEach(revision => { revision.status = 'REVOKED'; }); }
    else {
      state.revisions.forEach(revision => { revision.status = 'SUPERSEDED'; });
      const version = (state.passport?.currentVersion ?? 0) + 1;
      state.passport = { id: 'passport-f01', currentVersion: version, status: 'ACTIVE' };
      state.revisions.unshift({ id: 'revision-' + version, version, issuedAt: '2026-11-28T12:00:00Z', sourceDigest: state.sourceDigest,
        sourceSnapshot: structuredClone(state.source), qrValue, status: 'CURRENT' });
    }
    return json(route, state, 201);
  });
  await page.route('**/api/v1/asset-passports/verify/*', route => json(route, { version: state.passport?.currentVersion, displayName: state.source.displayName,
    status: state.passport?.status === 'REVOKED' ? 'REVOKED' : 'CURRENT', currentEvidence: state.source.evidence, operationalClearance: false }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.HydrolandAuth && window.HydrolandProfile && window.HydrolandCenterEquipment && window.HydrolandAssetPassports);
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'f01-synthetic-access', refreshToken: 'f01-synthetic-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="center"]').click();
  await expect(page.locator('.hl-role-dashboard[data-role="center"]')).toBeVisible();
  if (await page.locator('.hl-role-dashboard [data-portal-menu]').isVisible()) await page.locator('.hl-role-dashboard [data-portal-menu]').click();
  await page.locator('[data-portal-label="المعدات والمخزون"]').click();
  return state;
}

test('existing equipment card issues, updates, verifies and revokes a versioned passport with a local QR', async ({ page }) => {
  const state = await install(page);
  await page.locator('[data-asset-passport-kind="EQUIPMENT"]').click();
  const dialog = page.locator('#hl-asset-passport'); await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('الأدلة غير مكتملة أو تحتاج مراجعة.');
  await dialog.locator('[data-passport-action="issue"]').click();
  await expect(dialog.locator('[data-passport-version="1"] svg')).toBeVisible();
  expect(state.writes[0].payload).toMatchObject({ expectedVersion: 0, sourceDigest: digest }); expect(state.writes[0].payload.requestId).toMatch(/^[a-f0-9-]{36}$/);
  await dialog.locator('[data-passport-action="verify"]').click();
  await expect(dialog.locator('[data-passport-verification]')).toContainText('المصدر مطابق للنسخة');
  await expect(dialog.locator('[data-passport-action="update"]')).toBeDisabled();
  state.sourceDigest = changed; state.source.identity.serialNumber = 'F01-UPDATED'; state.revisions[0].status = 'STALE';
  await dialog.locator('[data-passport-action="refresh"]').click();
  await expect(dialog).toContainText('F01-UPDATED'); await dialog.locator('[data-passport-action="update"]').click();
  await expect(dialog.locator('[data-passport-version]')).toHaveCount(2);
  await dialog.locator('[data-passport-version="1"] summary').click();
  await expect(dialog.locator('[data-passport-version="1"] details')).toContainText('F01-SERIAL');
  await expect(dialog.locator('[data-passport-version="1"] details')).not.toContainText('F01-UPDATED');
  expect(state.writes[1].payload).toMatchObject({ expectedVersion: 1, sourceDigest: changed });
  await dialog.locator('[data-passport-action="revoke"]').click(); await expect(dialog.locator('[data-passport-message]')).toHaveText('أدخل سبب الإبطال.'); expect(state.writes).toHaveLength(2);
  await dialog.locator('[data-passport-reason]').fill('تم استبدال الأصل'); await dialog.locator('[data-passport-action="revoke"]').click();
  await expect(dialog.locator('[data-passport-action="update"]')).toHaveCount(0);
  await expect(dialog.locator('[data-passport-action="revoke"]')).toHaveCount(0);
  expect(state.writes[2].payload).toMatchObject({ expectedVersion: 2, reason: 'تم استبدال الأصل' });
  expect(Object.keys(state.writes[2].payload).sort()).toEqual(['expectedVersion', 'reason', 'requestId']);
  await dialog.getByLabel('رمز QR المقروء').fill(qrValue); await dialog.getByRole('button', { name: 'تحقق من الرمز' }).click();
  await expect(dialog.locator('form [role="status"]')).toContainText('مبطل');
});

test('an uncertain write retries the identical command and the interface preserves escaped native data', async ({ page }) => {
  const state = await install(page, { failFirst: true, name: '<img src=x onerror="window.f01Xss=1">' });
  await page.locator('[data-asset-passport-kind="EQUIPMENT"]').click(); const dialog = page.locator('#hl-asset-passport');
  await expect(dialog).toContainText('<img src=x'); await expect(dialog.locator('img')).toHaveCount(0);
  await dialog.locator('[data-passport-action="issue"]').click(); await expect(dialog.locator('[data-passport-message]')).toContainText('تعذر الحفظ مؤقتًا');
  await dialog.locator('[data-passport-action="issue"]').click(); await expect(dialog.locator('[data-passport-version="1"]')).toBeVisible();
  expect(state.writes).toHaveLength(2); expect(state.writes[0]).toEqual(state.writes[1]); expect(await page.evaluate(() => window.f01Xss)).toBeUndefined();
});

test('read-only scope has no issue or revoke controls; logout clears in-flight passport responses', async ({ page }) => {
  await install(page, { canManage: false });
  await page.locator('[data-asset-passport-kind="EQUIPMENT"]').click(); const dialog = page.locator('#hl-asset-passport');
  await expect(dialog).toBeVisible(); await expect(dialog.locator('[data-passport-action="issue"]')).toHaveCount(0);
  await expect(dialog.locator('[data-passport-action="revoke"]')).toHaveCount(0);
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/v1/asset-passports/sources/EQUIPMENT/eq-f01', async route => { await gate; await json(route, { source: { displayName: 'LATE_PRIVATE_SOURCE' } }).catch(() => {}); });
  await dialog.locator('[data-passport-action="refresh"]').click();
  await page.evaluate(() => window.HydrolandAuth.terminateSession()); release();
  await expect(dialog).toHaveCount(0); await expect(page.getByText('LATE_PRIVATE_SOURCE')).toHaveCount(0);
});

test('mobile passport QR and controls fit the viewport and keyboard Escape restores the page', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 }); await install(page);
  await page.locator('[data-asset-passport-kind="EQUIPMENT"]').click(); const dialog = page.locator('#hl-asset-passport');
  await dialog.locator('[data-passport-action="issue"]').click(); await expect(dialog.locator('svg')).toBeVisible();
  const dimensions = await dialog.evaluate(node => ({ width: node.getBoundingClientRect().width, scroll: node.scrollWidth, client: node.clientWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(375); expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await dialog.screenshot({ path: testInfo.outputPath('f01-passport-mobile.png') });
  await dialog.locator('[data-passport-version="1"]').screenshot({ path: testInfo.outputPath('f01-passport-qr.png') });
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
