import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const incidentId = '11111111-1111-4111-8111-111111111111';
const incident = { id: incidentId, title: 'بلاغ اصطناعي <script>', description: 'وصف البلاغ الخاص بالمراجعة', severity: 'HIGH', status: 'OPEN', updatedAt: '2026-11-28T10:00:00.000Z', createdAt: '2026-11-28T09:00:00.000Z', reportedByAccountId: 'reporter', reportedBy: { person: { firstName: 'مبلّغ', lastName: 'مستقل' } } };
const candidates = [{ documentId: '22222222-2222-4222-8222-222222222222', code: 'SAF-CAPA', version: 2, contentHash: 'a'.repeat(64), referenceNumber: 'SYNTHETIC-CAPA-2' },
  { documentId: '33333333-3333-4333-8333-333333333333', code: 'SAF-EFFECTIVENESS-CLOSE', version: 3, contentHash: 'b'.repeat(64), referenceNumber: 'SYNTHETIC-EFFECTIVENESS-3', correctiveActionRef: 'SYNTHETIC-CAPA-2' }];
async function fixture(page) {
  const state = { incident: structuredClone(incident), writes: [], fail: false, contextUpdatedAt: incident.updatedAt, dialogs: [] };
  page.on('dialog', async d => { state.dialogs.push(d.message()); await d.dismiss(); });
  const profile = { id: 'independent-reviewer', email: 'synthetic-reviewer@example.invalid', status: 'ACTIVE', person: { firstName: 'مراجع', lastName: 'مستقل' }, roleAssignments: [{ role: 'ADMIN', status: 'ACTIVE' }] };
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/auth/google/config', route => json(route, { enabled: false }));
  await page.route(/\/api\/v1\/me$/, route => json(route, profile));
  await page.route('**/api/v1/me/diver-profile', route => json(route, { profile: null, equipment: [] }));
  await page.route('**/api/v1/safety/incidents/admin', route => json(route, [state.incident]));
  await page.route('**/api/v1/safety/incidents/admin/' + incidentId + '/closure-context', route => json(route, { incident: { id: incidentId, updatedAt: state.contextUpdatedAt }, candidates }));
  await page.route('**/api/v1/safety/incidents/admin/' + incidentId + '/status', route => {
    const body = route.request().postDataJSON(); state.writes.push(body);
    if (state.fail) return json(route, { message: 'فشل الحفظ الاصطناعي' }, 503);
    state.incident = { ...state.incident, status: body.status, updatedAt: '2026-11-28T10:00:01.000Z', resolutionNotes: body.resolutionNotes };
    return json(route, state.incident);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.HydrolandAuth && window.HydrolandProfile && window.HydrolandSafetyIncidents);
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'synthetic-reviewer-access', refreshToken: 'synthetic-reviewer-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="admin"]').click(); await page.locator('.hl-role-dashboard [data-action-label="مركز الحوادث"]').click();
  const card = page.locator('article[data-safety-incident-id="' + incidentId + '"]'); await expect(card).toBeVisible();
  return { state, card };
}
test('incident closure asks for explicit applicability and pins approved CAPA and independent effectiveness', async ({ page }) => {
  const { state, card } = await fixture(page); await expect(card.locator('[data-capa-required]')).toHaveValue('');
  await card.locator('[data-safety-incident-notes]').fill('نتيجة مراجعة مستقلة في اختبار اصطناعي'); await card.locator('[data-safety-incident-decision=CLOSED]').click();
  await expect.poll(() => state.dialogs.length).toBe(1); expect(state.writes).toHaveLength(0); expect(state.dialogs[0]).toContain('انطباق');
  await card.locator('[data-capa-required]').selectOption('yes'); await card.getByRole('button', { name: 'تحديث أدلة الإقفال', exact: true }).click();
  await expect(card.locator('[data-capa-document] option')).toHaveCount(2); await card.locator('[data-capa-document]').selectOption(candidates[0].documentId); await card.locator('[data-effectiveness-document]').selectOption(candidates[1].documentId);
  await card.locator('[data-safety-incident-decision=CLOSED]').click(); await expect(card.locator('.hl-si-state').first()).toHaveText('CLOSED');
  expect(state.writes[0]).toMatchObject({ expectedUpdatedAt: incident.updatedAt, status: 'CLOSED', capaRequired: true, capa: { documentId: candidates[0].documentId, version: 2, contentHash: candidates[0].contentHash }, effectiveness: { documentId: candidates[1].documentId, version: 3, contentHash: candidates[1].contentHash } });
  expect(state.writes[0]).not.toHaveProperty('applicabilityReason'); expect(await card.locator('script').count()).toBe(0);
});
test('incident decision retries keep identity and user inputs after failed persistence', async ({ page }) => {
  const { state, card } = await fixture(page); state.fail = true; await card.locator('[data-capa-required]').selectOption('no'); await card.locator('[data-safety-incident-notes]').fill('سبب مستقل واضح لعدم انطباق CAPA في الاختبار');
  for (let n = 1; n <= 2; n++) { await card.locator('[data-safety-incident-decision=RESOLVED]').click(); await expect.poll(() => state.dialogs.length).toBe(n); }
  expect(state.writes[0]).toEqual(state.writes[1]); await expect(card.locator('[data-safety-incident-notes]')).toHaveValue('سبب مستقل واضح لعدم انطباق CAPA في الاختبار');
  await card.locator('[data-safety-incident-notes]').fill('تصحيح مسّبب جديد من المراجع المستقل'); await card.locator('[data-safety-incident-decision=RESOLVED]').click(); await expect.poll(() => state.writes.length).toBe(3); expect(state.writes[2].requestId).not.toBe(state.writes[0].requestId);
});
test('stale incident evidence cannot be silently adopted and logout removes private review content', async ({ page }) => {
  const { state, card } = await fixture(page); state.contextUpdatedAt = '2026-11-28T10:00:02.000Z'; await card.locator('[data-capa-required]').selectOption('yes'); await card.getByRole('button', { name: 'تحديث أدلة الإقفال', exact: true }).click(); await expect(card).toContainText('تغير البلاغ'); await expect(card.locator('[data-capa-document] option')).toHaveCount(1);
  await page.evaluate(() => { sessionStorage.removeItem('hl-access-token'); sessionStorage.removeItem('hl-refresh-token'); window.HydrolandAuth.syncAuthUi(); document.dispatchEvent(new CustomEvent('hydroland:auth-changed')); });
  await expect(card).toHaveCount(0); await expect(page.locator('#hl-safety-incidents')).toBeHidden(); expect(state.writes).toHaveLength(0);
});
test('incident pack downloads the scoped JSON with an explicit internal-only boundary', async ({ page }) => {
  const { card } = await fixture(page); const pack = { protocol: 'HYDROLAND_INCIDENT_PACK_V1', scope: 'AUTHORIZED_ADMIN', contentDigest: 'c'.repeat(64), incident: { id: incidentId, status: 'OPEN' }, externalTransmission: 'NOT_IMPLEMENTED', externalDistressSent: false, operationalAuthority: false };
  await page.route('**/api/v1/safety/incidents/' + incidentId + '/pack', route => json(route, pack));
  const wait = page.waitForEvent('download'); await card.getByRole('button', { name: 'تنزيل حزمة البلاغ', exact: true }).click(); const download = await wait;
  expect(download.suggestedFilename()).toBe('HYDROLAND-Incident-' + incidentId + '.json'); expect(JSON.parse(await readFile(await download.path(), 'utf8'))).toEqual(pack);
});
