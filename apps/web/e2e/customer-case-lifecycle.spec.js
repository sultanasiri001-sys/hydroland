import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';

test.use({ timezoneId: 'Asia/Riyadh' });

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
async function install(page, role = 'DIVER', language = 'ar') {
  const state = { writes: [], role, denyInbox: false, pendingList: null, listRequested: false, pendingResponse: null,
    record: { id: 'case-1', type: 'PAYMENT_ISSUE', status: 'OPEN', subject: 'PRIVATE-CASE-LIFECYCLE', description: 'تفاصيل حالة الدعم',
      assignedAccountId: null, dueAt: null, createdAt: '2026-11-19T06:00:00Z', updatedAt: '2026-11-19T06:00:00Z',
      interactions: [{ id: 'initial', actorType: 'CUSTOMER', message: 'الطلب الأصلي', createdAt: '2026-11-19T06:00:00Z' }], history: [] } };
  const profile = () => ({ id: role === 'ADMIN' ? 'admin-1' : 'customer-1', email: 'fixture@example.invalid', status: 'ACTIVE',
    roleAssignments: state.role ? [{ role: state.role, status: 'ACTIVE' }] : [], person: { firstName: 'سلطان', lastName: 'اختبار' } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/**', route => json(route, []));
  await page.route('**/api/v1/auth/google/config', route => json(route, { enabled: false }));
  await page.route(/\/api\/v1\/me$/, route => json(route, profile()));
  await page.route(/\/api\/v1\/customer-service\/cases\/mine$/, route => json(route, role === 'ADMIN' ? [] : [state.record]));
  await page.route(/\/api\/v1\/customer-service\/admin\/cases\?/, async route => {
    state.listRequested = true; if (state.pendingList) await state.pendingList;
    return state.denyInbox ? json(route, { message: 'Forbidden' }, 403) : json(route, { items: [state.record], total: 1, page: 1, pageSize: 20 });
  });
  await page.route(/\/api\/v1\/customer-service\/admin\/cases\/assignees$/, route => json(route, [
    { id: 'admin-1', displayName: 'مسؤول الدعم', email: 'admin@example.invalid' },
    { id: 'admin-2', displayName: 'المراجع الثاني', email: 'peer@example.invalid' },
  ]));
  await page.route(/\/api\/v1\/customer-service\/admin\/cases\/case-1$/, route => json(route, state.record));
  await page.route(/\/api\/v1\/customer-service\/admin\/cases\/case-1\/(assign|wait|escalate|resolve)$/, route => {
    const action = route.request().url().split('/').pop(), body = route.request().postDataJSON(); state.writes.push({ action, body });
    if (['assign', 'escalate'].includes(action)) { state.record.status = 'ASSIGNED'; state.record.assignedAccountId = body.assignedAccountId; if (body.dueAt) state.record.dueAt = body.dueAt; }
    if (action === 'wait') state.record.status = 'WAITING_CUSTOMER';
    if (action === 'resolve') state.record.status = 'RESOLVED';
    if (body.message) state.record.interactions.push({ id: 'staff-' + state.writes.length, actorType: 'STAFF', message: body.message, createdAt: new Date().toISOString() });
    return json(route, state.record, 201);
  });
  await page.route(/\/api\/v1\/customer-service\/cases\/case-1\/resolution-response$/, async route => {
    const body = route.request().postDataJSON(); state.writes.push({ action: 'response', body });
    if (state.pendingResponse) await state.pendingResponse;
    state.record.status = body.decision === 'ACCEPT' ? 'CLOSED' : 'ASSIGNED'; return json(route, state.record, 201);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandSupport && window.HydrolandProfile && window.HydrolandWorkspaceUI && window.HydrolandI18n));
  await page.evaluate(locale => window.HydrolandI18n.setLocale(locale), language);
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'case-access', refreshToken: 'case-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  if (role === 'ADMIN') {
    await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="admin"]').click();
    await page.locator('.hl-role-dashboard[data-role="admin"] [data-action-label="خدمة العملاء"]').click();
    await expect(page.locator('[data-support-admin]')).toBeVisible();
    await expect(page.locator('[data-support-admin-list]')).toContainText(state.record.subject);
  } else {
    await page.evaluate(() => window.HydrolandWorkspaceUI.show(document.querySelector('.hl-support')));
    await expect(page.locator('[data-support-list]')).toContainText(state.record.subject);
  }
  return state;
}
async function selectCase(page) {
  await page.locator('[data-support-select="case-1"]').click();
  await expect(page.locator('[data-support-admin-detail]')).toContainText('PRIVATE-CASE-LIFECYCLE');
  return page.locator('[data-support-action]');
}

for (const language of ['ar', 'en']) test.describe('Customer cases in ' + language, () => {
const copy = (arabic, english) => language === 'en' ? english : arabic;

test('admin opens the operating inbox and assigns an explicit deadline by named owner', async ({ page }) => {
  const state = await install(page, 'ADMIN', language), form = await selectCase(page);
  await expect(form.locator('[name="assignedAccountId"]')).toContainText('مسؤول الدعم');
  await form.locator('[name="assignedAccountId"]').selectOption('admin-1');
  await form.locator('[name="dueAt"]').fill('2031-03-10T15:30');
  await form.locator('[type="submit"]').click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].action).toBe('assign'); expect(state.writes[0].body.assignedAccountId).toBe('admin-1');
  expect(state.writes[0].body.dueAt).toBe('2031-03-10T12:30:00.000Z');
  await expect(page.locator('[data-support-admin-detail]')).toContainText(copy('المسؤول: مسؤول الدعم', 'Owner: مسؤول الدعم'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('admin can request information, escalate and resolve only the assigned case through existing controls', async ({ page }) => {
  const state = await install(page, 'ADMIN', language); state.record.status = 'ASSIGNED'; state.record.assignedAccountId = 'admin-1'; state.record.dueAt = '2031-03-10T12:30:00.000Z';
  let form = await selectCase(page);
  await form.locator('[name="action"]').selectOption('WAIT'); await form.locator('[name="message"]').fill('نحتاج مرجع الحجز'); await form.locator('[type="submit"]').click();
  await expect(page.locator('[data-support-admin-detail]')).toContainText(copy('بانتظار رد العميل', 'Awaiting customer response'));
  form = page.locator('[data-support-action]'); await expect(form).toBeVisible();
  await form.locator('[name="action"]').selectOption('ESCALATE'); await form.locator('[name="assignedAccountId"]').selectOption('admin-2'); await form.locator('[name="message"]').fill('تصعيد للمتابعة'); await form.locator('[type="submit"]').click();
  await expect.poll(() => state.record.assignedAccountId).toBe('admin-2');
  await expect(page.locator('[data-support-admin-detail]')).toContainText(copy('المسؤول: المراجع الثاني', 'Owner: المراجع الثاني'));
  await expect(page.locator('[data-support-action] [name="action"] option[value="RESOLVE"]')).toHaveCount(0);
  state.record.assignedAccountId = 'admin-1'; await page.locator('[data-support-admin-refresh]').click(); form = await selectCase(page);
  await form.locator('[name="action"]').selectOption('RESOLVE'); await form.locator('[name="message"]').fill('تم التحقق من المرجع وتقديم الحل'); await form.locator('[type="submit"]').click();
  await expect(page.locator('[data-support-admin-detail]')).toContainText(copy('يبقى الحل بانتظار قبول العميل أو اعتراضه', "The resolution awaits the customer's acceptance or objection"));
  await expect(page.locator('[data-support-action]')).toHaveCount(0);
  expect(state.writes.map(row => row.action)).toEqual(['wait', 'escalate', 'resolve']);
});

for (const decision of ['ACCEPT', 'OBJECT']) test(`requester explicitly submits ${decision} with the resolution message`, async ({ page }) => {
  const state = await install(page, 'DIVER', language); state.record.status = 'RESOLVED'; state.record.assignedAccountId = 'admin-1';
  await page.locator('[data-support-refresh]').click(); await page.locator('[data-support-case="case-1"] summary').click();
  const form = page.locator('[data-support-resolution]'); await form.locator('[name="message"]').fill(decision === 'ACCEPT' ? 'أقبل المعالجة' : 'لم يعالج الحل طلبي');
  await form.locator(`[value="${decision}"]`).click(); await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body).toEqual({ decision, message: decision === 'ACCEPT' ? 'أقبل المعالجة' : 'لم يعالج الحل طلبي' });
  await expect(page.locator('[data-support-case="case-1"]')).toContainText(decision === 'ACCEPT' ? copy('مغلقة', 'Closed') : copy('مسندة', 'Assigned'));
  await expect(page.locator('[data-support-resolution]')).toHaveCount(0);
  if (decision === 'ACCEPT') await expect(page.locator('[data-support-reply]')).toHaveCount(0);
});

test('revoked admin role clears private inbox before a queued write can run', async ({ page }) => {
  const state = await install(page, 'ADMIN', language), form = await selectCase(page);
  await form.locator('[name="assignedAccountId"]').selectOption('admin-1'); await form.locator('[name="dueAt"]').fill('2031-03-10T15:30');
  state.role = null; await form.locator('[type="submit"]').click();
  await expect(page.locator('[data-support-admin]')).toBeHidden();
  await expect(page.locator('[data-support-admin-detail]')).not.toContainText('PRIVATE-CASE'); expect(state.writes).toHaveLength(0);
});

test('forbidden inbox refresh removes old customer content and presents recovery feedback', async ({ page }) => {
  const state = await install(page, 'ADMIN', language); await selectCase(page); state.denyInbox = true;
  await page.locator('[data-support-admin-refresh]').click(); await expect(page.locator('[data-support-admin]')).toBeHidden();
  await expect(page.locator('[data-support-admin-detail]')).not.toContainText('PRIVATE-CASE');
  await expect(page.locator('[data-support-message]')).toContainText(copy('تغيرت صلاحية', 'permission has changed'));
});

test('late inbox response after logout cannot restore ticket data or staff controls', async ({ page }) => {
  const state = await install(page, 'ADMIN', language); let release; state.pendingList = new Promise(resolve => { release = resolve; }); state.listRequested = false;
  await page.locator('[data-support-admin-refresh]').click(); await expect.poll(() => state.listRequested).toBe(true);
  await page.evaluate(() => window.HydrolandAuth.terminateSession()); release();
  await expect(page.locator('[data-support-admin]')).toBeHidden(); await expect(page.locator('[data-support-admin-list]')).not.toContainText('PRIVATE-CASE');
  await expect(page.locator('[data-support-inbox]')).toBeHidden();
});

test('old resolution response cannot overwrite the next account draft', async ({ page }) => {
  const state = await install(page, 'DIVER', language); state.record.status = 'RESOLVED'; await page.locator('[data-support-refresh]').click();
  await page.locator('[data-support-case="case-1"] summary').click(); let release; state.pendingResponse = new Promise(resolve => { release = resolve; });
  await page.locator('[data-support-resolution] [name="message"]').fill('قرار الحساب السابق'); await page.locator('[data-support-resolution] [value="ACCEPT"]').click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.evaluate(() => { window.HydrolandAuth.terminateSession(); window.HydrolandAuth.acceptSession({ accessToken: 'new-customer', refreshToken: 'new-refresh' }, window.HydrolandAuth.beginAuthAttempt()); });
  await page.evaluate(() => window.HydrolandWorkspaceUI.show(document.querySelector('.hl-support')));
  await page.locator('[data-support-form] input').fill('مسودة الحساب الجديد'); release();
  await expect(page.locator('[data-support-form] input')).toHaveValue('مسودة الحساب الجديد');
  await expect(page.locator('[data-support-message]')).not.toContainText('قرار الحساب السابق');
});

});


test('support locale roundtrip retains the customer draft, source labels and selected command', async ({ page }) => {
  const state = await install(page, 'ADMIN', 'ar');
  state.record.status = 'ASSIGNED'; state.record.assignedAccountId = 'admin-1'; state.record.dueAt = '2031-03-10T12:30:00.000Z';
  state.record.subject = 'بحث'; state.record.description = '<img id="opaque-description"> نص المستخدم';
  await page.locator('[data-support-select="case-1"]').click();
  const form = page.locator('[data-support-action]');
  await form.locator('[name="action"]').selectOption('WAIT');
  const message = form.locator('[name="message"]'); await message.fill('بحث <مسودة العميل>'); await message.focus();
  const formIdentity = await form.evaluate(node => { window.supportLocaleForm = node; return Boolean(node); }); expect(formIdentity).toBe(true);
  await page.evaluate(() => window.HydrolandI18n.setLocale('en'));
  await expect(message).toBeFocused(); await expect(message).toHaveValue('بحث <مسودة العميل>');
  await expect(form.locator('[name="action"]')).toHaveValue('WAIT');
  await expect(page.locator('[data-support-admin-detail] h4')).toHaveText('بحث');
  await expect(page.locator('#opaque-description')).toHaveCount(0);
  await expect(form.locator('[type="submit"]')).toHaveText('Save action');
  await expect(page.locator('#language')).toBeDisabled();
  expect(await form.evaluate(node => node === window.supportLocaleForm)).toBe(true); expect(state.writes).toEqual([]);
  await page.evaluate(() => window.HydrolandI18n.setLocale('ar'));
  await expect(message).toBeFocused(); await expect(message).toHaveValue('بحث <مسودة العميل>');
  await expect(form.locator('[type="submit"]')).toHaveText('حفظ الإجراء');
});
