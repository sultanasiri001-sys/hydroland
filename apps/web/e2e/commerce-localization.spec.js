import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const locale = (page, language) => page.evaluate(value => window.HydrolandI18n.setLocale(value), language);
const copy = (language, arabic, english) => language === 'ar' ? arabic : english;
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1536, height: 864 }];
const baseShift = () => ({ centerOrgUnitId: 'center-a', shift: { id: 'own-shift', status: 'OPEN', openingBalanceMinor: 100, currency: 'SAR' }, totals: { revenueMinor: 40, expenseMinor: 20, refundMinor: 0, adjustmentMinor: 0, expectedCashMinor: 120 }, entries: [{ id: 'entry', type: 'EXPENSE', amountMinor: 20, description: 'بحث' }], receivers: [{ accountId: 'receiver-b', name: 'المسؤول' }], handovers: [], closeSubmission: null });
const settlement = () => ({ id: 'settlement-a', providerSettlementId: 'SETTLEMENT-I18N', currency: 'SAR', grossAmountMinor: 12550, feeMinor: 100, taxMinor: 15, matchedLineCount: 1, mismatchedLineCount: 0, lines: [{ type: 'payment', netAmountMinor: 12435, amountMatches: true }], status: 'SUBMITTED', reviews: [] });

async function setup(page, language, role, respond) {
  const state = { active: true, calls: [], writes: [], respond };
  const roleEnum = { center: 'DIVE_CENTER', organization: 'ORGANIZATION', admin: 'ADMIN', boat: 'BOAT_OWNER' }[role];
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice('/api/v1'.length), method = request.method();
    if (path === '/auth/google/config') return json(route, { enabled: false });
    if (path === '/me') return json(route, { id: 'locale-user', email: 'locale@example.invalid', status: 'ACTIVE', person: { firstName: 'بحث', lastName: 'المسؤول' }, roleAssignments: state.active ? [{ role: roleEnum, status: 'ACTIVE' }] : [] });
    if (path === '/me/diver-profile') return json(route, { profile: null, equipment: [] });
    if (path === '/center/me/overview') return json(route, { center: { displayName: 'بحث' }, metrics: { newBookings: 0, tripsToday: 0, activeMembers: 1, totalTrips: 0 } });
    const result = await state.respond(path + url.search, method, request, state);
    if (!result) return json(route, []);
    state.calls.push({ path: path + url.search, method });
    if (!['GET', 'HEAD'].includes(method)) state.writes.push({ path, method, body: request.postDataJSON() });
    return json(route, result.body, result.status || 200);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandI18n && window.HydrolandAuth && window.HydrolandProfile && window.HydrolandCenterFinance && window.HydrolandStoreProvider && window.HydrolandOrganizations));
  await locale(page, language);
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'locale-fixture-access', refreshToken: 'locale-fixture-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  await openWorkspaceSwitcher(page);
  await page.locator('#role-dialog [data-role="' + role + '"]').click();
  await expect.poll(() => page.evaluate(() => window.HydrolandPortalAccess.getCurrentRole())).toBe(role);
  await expect(page.locator('[data-hl-locale-switch]:visible')).toHaveCount(1);
  await expect(page.locator('[data-hl-locale-switch]:visible')).toBeEnabled();
  return state;
}

for (const language of ['ar', 'en']) {
  for (const viewport of viewports) test(`${language}: cash handover retains exact inputs and authorization at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const state = await setup(page, language, 'center', path => {
      if (path === '/finance/mine/centers') return { body: [{ id: 'center-a', name: 'بحث', organizationName: 'الجهة' }] };
      if (path.endsWith('/workspace')) return { body: baseShift() };
      if (path.endsWith('/settlement-imports')) return { body: [settlement()] };
      if (path.startsWith('/finance/')) return { body: [] };
      return null;
    });
    const entry = page.locator('[data-portal-label="ورديات المحاسب"]');
    if (!await entry.isVisible()) await page.locator('.hl-role-dashboard [data-portal-menu]').click();
    await entry.click();
    const panel = page.locator('#hl-center-finance'), form = panel.locator('[data-finance-operation=handover]');
    await expect(form).toBeVisible();
    await expect(panel).toContainText('SETTLEMENT-I18N');
    await form.locator('[name=receiver]').selectOption('receiver-b');
    await form.locator('[name=actualCash]').fill('١٫٢٥');
    const reason = form.locator('[name=varianceReason]'); await reason.fill('سبب عربي مؤلف من العميل'); await reason.focus();
    const calls = state.calls.length;
    for (const current of [language === 'ar' ? 'en' : 'ar', language]) {
      await locale(page, current);
      await expect(reason).toBeFocused(); await expect(reason).toHaveValue('سبب عربي مؤلف من العميل');
      await expect(form.locator('[name=actualCash]')).toHaveValue('١٫٢٥'); await expect(form.locator('[name=receiver]')).toHaveValue('receiver-b');
      await expect(form.locator('button')).toHaveText(copy(current, 'إرسال طلب التسليم', 'Send handover request'));
      await expect(panel).toContainText('المسؤول'); expect(state.calls.length).toBe(calls);
    }
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`portal-commerce-finance-${language}-${viewport.width}.png`), fullPage: true });
    // Use keyboard submission after the locale changes; the real authorization guard runs.
    await reason.press('Tab'); await page.keyboard.press('Enter');
    await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0]).toEqual({ path: '/finance/shifts/own-shift/handover', method: 'POST', body: { toAccountantId: 'receiver-b', actualCashMinor: 125, varianceReason: 'سبب عربي مؤلف من العميل' } });
    const status = panel.locator('[data-finance-status]');
    await expect(status).toHaveText(copy(language, 'تم إرسال طلب التسليم.', 'Handover request sent.'));
    await locale(page, language === 'ar' ? 'en' : 'ar');
    await expect(status).toHaveText(copy(language === 'ar' ? 'en' : 'ar', 'تم إرسال طلب التسليم.', 'Handover request sent.'));
    state.active = false; await panel.locator('[data-finance-refresh]').click();
    await expect(panel).toHaveCount(0); expect(state.writes).toHaveLength(1);
    await locale(page, language); await expect(panel).toHaveCount(0);
  });

  test(`${language}: offer labels, draft, failed retry identity and opaque server errors`, async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const state = await setup(page, language, 'center', (path, method, request, current) => {
      if (path === '/store/provider/catalog') return { body: { organization: { id: 'org', displayName: 'بحث' }, products: [], courses: [] } };
      if (path === '/store/provider/products' && method === 'POST') return { status: 503, body: current.serverBody || {} };
      return null;
    });
    await page.evaluate(() => window.HydrolandStoreProvider.open());
    const form = page.locator('[data-offer-form][data-type=products][data-id=""]');
    await form.locator('..').locator('summary').click();
    for (const [name, value] of Object.entries({ nameAr: 'حفظ العرض', sku: 'SKU-I18N', price: '125.50', stockQuantity: '2', description: 'بحث <img src=x onerror=1>' })) await form.locator(`[name=${name}]`).fill(value);
    await form.locator('[name=kind]').selectOption('SERVICE'); await form.locator('[name=status]').selectOption('ACTIVE');
    const name = form.locator('[name=nameAr]'); await name.focus();
    const requestId = await form.getAttribute('data-request-id'), calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(name).toBeFocused(); await expect(name).toHaveValue('حفظ العرض');
      await expect(form.getByLabel(copy(current, 'اسم العرض', 'Offer name'), { exact: true })).toHaveValue('حفظ العرض');
      await expect(form.locator('[name=kind]')).toHaveValue('SERVICE'); await expect(form.locator('[name=status]')).toHaveValue('ACTIVE');
      await expect(form.locator('[name=description]')).toHaveValue('بحث <img src=x onerror=1>'); expect(state.calls.length).toBe(calls);
    }
    await form.locator('[type=submit]').click();
    await expect(form.locator('[data-offer-feedback]')).toHaveText(copy(language, 'تعذر تنفيذ الإجراء.', 'Could not complete the action.'));
    await locale(page, language === 'ar' ? 'en' : 'ar');
    await expect(form.locator('[data-offer-feedback]')).toHaveText(copy(language === 'ar' ? 'en' : 'ar', 'تعذر تنفيذ الإجراء.', 'Could not complete the action.'));
    state.serverBody = { message: 'حفظ العرض' }; await form.locator('[type=submit]').click();
    await expect(form.locator('[data-offer-feedback]')).toHaveText('حفظ العرض');
    await locale(page, language); await expect(form.locator('[data-offer-feedback]')).toHaveText('حفظ العرض');
    expect(state.writes).toHaveLength(2); expect(state.writes[1]).toEqual(state.writes[0]);
    expect(state.writes[0].body).toEqual({ description: 'بحث <img src=x onerror=1>', priceMinor: 12550, status: 'ACTIVE', requestId, nameAr: 'حفظ العرض', sku: 'SKU-I18N', kind: 'SERVICE', stockQuantity: 2 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    state.active = false; await form.locator('[type=submit]').click();
    await expect(page.locator('.hl-store-provider')).toBeHidden(); expect(state.writes).toHaveLength(2);
  });

  test(`${language}: organization declaration and requester objection keep scoped canonical payloads`, async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const record = { id: 'case-1', subject: 'بحث', description: '<img src=x onerror=1>', type: 'SUPPORT', status: 'RESOLVED', canRespondToResolution: true, createdAt: '2026-11-19T00:00:00Z', interactions: [] };
    const membership = { role: 'OWNER', status: 'ACTIVE', organization: { id: 'org-1', displayName: 'بحث', kind: 'COMPANY', status: 'ACTIVE' } };
    const state = await setup(page, language, 'organization', (path, method) => {
      if (path === '/organizations/mine') return { body: [membership] };
      if (path.endsWith('/financial-profile')) return { body: { currency: 'SAR', taxStatus: 'UNDECLARED', registrationStatus: 'UNDECLARED', revision: method === 'PATCH' ? 1 : 0 } };
      if (path.endsWith('/resolution-response')) { record.status = 'ASSIGNED'; record.canRespondToResolution = false; return { body: record }; }
      if (path.startsWith('/organizations/org-1/requests')) return { body: { items: [record], page: 1, totalPages: 1 } };
      return null;
    });
    await page.evaluate(() => window.HydrolandOrganizations.open());
    await page.locator('[data-org-financial-open]').click();
    const form = page.locator('[data-org-financial-form]'), tax = form.locator('[name=taxStatus]');
    await tax.selectOption('EXEMPT'); await form.locator('[name=registrationStatus]').selectOption('IN_PROGRESS'); await tax.focus();
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(tax).toBeFocused(); await expect(tax).toHaveValue('EXEMPT');
      await expect(form.locator('[name=registrationStatus]')).toHaveValue('IN_PROGRESS');
      await expect(form.locator('[name=currency]')).toHaveValue('الريال السعودي (SAR)');
      await expect(tax.locator('option[value=EXEMPT]')).toHaveText(copy(current, 'معفاة من الضرائب بحسب الإقرار', 'Tax exempt as declared'));
    }
    await form.locator('[type=submit]').click(); await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].body).toEqual({ currency: 'SAR', taxStatus: 'EXEMPT', registrationStatus: 'IN_PROGRESS', expectedRevision: 0 });
    await page.locator('[data-org-requests-open]').click();
    const response = page.locator('[data-org-case-response]'), message = response.locator('[name=message]');
    await message.fill('اعتراض العميل بنفس نصه'); await message.focus();
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(message).toBeFocused(); await expect(message).toHaveValue('اعتراض العميل بنفس نصه');
      expect(await response.locator('button').evaluateAll(nodes => nodes.map(node => node.value))).toEqual(['ACCEPT', 'OBJECT']);
      await expect(page.locator('[data-org-case-id] strong')).toHaveText('بحث'); await expect(page.locator('[data-org-case-id] img')).toHaveCount(0);
    }
    await response.locator('[value=OBJECT]').click(); await expect.poll(() => state.writes.length).toBe(2);
    expect(state.writes[1]).toEqual({ path: '/organizations/org-1/requests/case-1/resolution-response', method: 'POST', body: { message: 'اعتراض العميل بنفس نصه', decision: 'OBJECT' } });
    await expect(response).toHaveCount(0);
    membership.role = 'بحث'; membership.organization.status = 'بحث';
    await page.evaluate(() => window.HydrolandOrganizations.refresh()); await locale(page, 'en');
    await expect(page.locator('[data-org-id="org-1"] .hl-org-status')).toHaveText('بحث');
    await expect(page.locator('[data-org-id="org-1"]')).not.toContainText('Search');
    await page.evaluate(() => window.HydrolandAuth.terminateSession()); await locale(page, language === 'ar' ? 'en' : 'ar');
    await expect(page.locator('[data-org-case-id]')).toHaveCount(0); await expect(form).toBeHidden();
  });

  test(`${language}: booking cancellation preserves state token, reason and financial acknowledgement`, async ({ page }) => {
    const booking = { id: 'booking-1', customerName: 'بحث', status: 'PENDING', seats: 1, trip: { title: 'تأكيد الحجز', status: 'OPEN' } };
    const state = await setup(page, language, 'center', (path, method) => {
      if (path.endsWith('/booking-1/actions')) { booking.status = 'CANCELLED'; return { body: {} }; }
      if (path.endsWith('/bookings/booking-1')) return { body: { booking, stateToken: 'opaque-state', participants: [{ fullName: 'بحث', eligibilityStatus: 'ELIGIBLE' }], financial: [{ status: 'CAPTURED', amountMinor: 12550, currency: 'SAR', count: 1 }], blockers: ['SAFETY_APPROVAL'], actions: booking.status === 'PENDING' ? ['CANCEL'] : [], requiredAmountMinor: 12550, paymentSatisfied: true } };
      if (path.startsWith('/center/me/bookings?')) return { body: { items: [booking], counts: [{ status: booking.status, count: 1, seats: 1 }], page: 1, totalPages: 1, total: 1 } };
      return null;
    });
    await page.evaluate(() => window.HydrolandCenterBookings.open()); await page.locator('[data-booking-open]').click();
    const form = page.locator('[data-booking-action=CANCEL]'), reason = form.locator('[name=reason]');
    await reason.fill('أريد إلغاء الحجز مع متابعة مالية'); await form.locator('[name=financialAcknowledged]').check(); await reason.focus();
    const requestId = await form.getAttribute('data-request-id');
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(reason).toBeFocused(); await expect(reason).toHaveValue('أريد إلغاء الحجز مع متابعة مالية');
      await expect(form.locator('[name=financialAcknowledged]')).toBeChecked(); await expect(form).toHaveAttribute('data-state', 'opaque-state');
      await expect(form.locator('h4')).toHaveText(copy(current, 'إلغاء الحجز', 'Cancel booking')); await expect(page.locator('[data-booking-detail]')).toContainText('125.50 SAR');
      await expect(page.locator('[data-booking-list]')).toContainText(copy(current, 'بانتظار التأكيد: 1 حجز / 1 مقعد', 'Awaiting confirmation: 1 bookings / 1 seats'));
    }
    await form.locator('[type=submit]').click(); await expect.poll(() => state.writes.length).toBe(1);
    expect(state.writes[0].body).toEqual({ action: 'CANCEL', requestId, expectedState: 'opaque-state', reason: 'أريد إلغاء الحجز مع متابعة مالية', financialAcknowledged: true });
    const notice = page.locator('[data-booking-list] [role=status]'); await expect(notice).toContainText(copy(language, 'تم حفظ إلغاء الحجز.', 'Booking cancellation saved.'));
    await locale(page, language === 'ar' ? 'en' : 'ar'); await expect(notice).toContainText(copy(language === 'ar' ? 'en' : 'ar', 'تم حفظ إلغاء الحجز.', 'Booking cancellation saved.'));
  });

  test(`${language}: marine summaries bind raw opaque parameters exactly once while local labels stay live`, async ({ page }) => {
    const opaque = 'A&B <b>نص</b>', equalKey = 'تحديث الحجوزات';
    const trip = { id: 'trip-a', organizationId: 'org-a', title: opaque, status: 'OPEN', startsAt: '2099-12-01T00:00:00Z', endsAt: '2099-12-01T01:00:00Z', price: { pricePerSeatMinor: 12550, currency: 'SAR' }, capacity: 10, location: { locationName: opaque } };
    const state = await setup(page, language, 'boat', (path, method, request, current) => {
      if (path === '/organizations/mine') return { body: [{ status: 'ACTIVE', role: 'OWNER', organization: { id: 'org-a', displayName: opaque, status: 'ACTIVE', kind: 'MARINE_OPERATOR' } }] };
      if (path === '/marine-operations/trips/mine') return { body: [trip] };
      if (path.endsWith('/bookings/booking-a')) return { body: { booking: { id: 'booking-a', status: 'CONFIRMED', seats: 2, trip }, participants: [{ fullName: opaque, eligibilityStatus: 'ELIGIBLE' }], blockers: [], paymentSatisfied: true, requiredAmountMinor: 12550 } };
      if (path.startsWith('/marine-operations/trips/trip-a/bookings?')) {
        if (current.failure === 'malformed') return { body: {} };
        if (current.failure === 'provider') return { status: 503, body: { message: 'استجابة الحجوزات غير مكتملة.' } };
        return { body: { items: [{ id: 'booking-a', status: 'CONFIRMED', customerName: opaque, seats: 2, createdAt: '2026-11-19T00:00:00Z' }], counts: [{ status: 'CONFIRMED', count: 1, seats: 2 }, { status: opaque, count: 2, seats: 3 }, { status: equalKey, count: 3, seats: 4 }], total: 1, page: 1, totalPages: 1 } };
      }
      return null;
    });
    await page.waitForFunction(() => Boolean(window.HydrolandMarineTrips));
    await page.evaluate(() => window.HydrolandMarineTrips.open());
    await page.locator('[data-mt-bookings]').click(); await page.locator('[data-mt-booking-open]').click();
    const panel = page.locator('[data-mt-bookings-view]'), input = panel.locator('[name=q]'), select = panel.locator('[data-mt-booking-status]');
    await expect(panel.locator('[data-mt-booking-detail]')).toBeVisible();
    await input.fill(opaque); await select.selectOption('CONFIRMED'); await input.focus();
    const calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(input).toBeFocused(); await expect(input).toHaveValue(opaque); await expect(select).toHaveValue('CONFIRMED');
      await expect(panel).toContainText(copy(current, 'مؤكد: 1 حجز / 2 مقعد', 'Confirmed: 1 bookings / 2 seats'));
      await expect(panel).toContainText(opaque + copy(current, ': 2 حجز / 3 مقعد', ': 2 bookings / 3 seats'));
      await expect(panel).toContainText(equalKey + copy(current, ': 3 حجز / 4 مقعد', ': 3 bookings / 4 seats'));
      await expect(select.locator('option[value=ALL]')).toHaveText(copy(current, 'كل الحالات', 'All statuses'));
      await expect(select.locator('option[value=CONFIRMED]')).toHaveText(copy(current, 'مؤكد', 'Confirmed'));
      await expect(panel.locator('[data-mt-booking-detail]')).toContainText(copy(current, 'الحالة: مؤكد', 'Status: Confirmed'));
      await expect(page.locator('.hl-mt-price')).toHaveText(copy(current, '125.50 ر.س للمقعد', 'SAR 125.50 per seat'));
      await expect(page.locator('[data-mt-trip=trip-a] > .hl-mt-row strong')).toHaveText(opaque);
      await expect(panel.locator('[data-mt-booking=booking-a] strong')).toHaveText(opaque);
      await expect(panel.locator('b, img')).toHaveCount(0); await expect(panel).not.toContainText('&amp;'); expect(state.calls.length).toBe(calls);
    }
    state.failure = 'malformed'; await panel.locator('[data-mt-bookings-refresh]').click();
    const error = panel.locator('[role=alert]'); await expect(error).toHaveText(copy(language, 'استجابة الحجوزات غير مكتملة.', 'The booking response is incomplete.'));
    for (const current of ['en', 'ar']) { await locale(page, current); await expect(error).toHaveText(copy(current, 'استجابة الحجوزات غير مكتملة.', 'The booking response is incomplete.')); }
    state.failure = 'provider'; await panel.locator('[data-mt-bookings-refresh]').click();
    await expect(error).toHaveText('استجابة الحجوزات غير مكتملة.'); await locale(page, 'en'); await expect(error).toHaveText('استجابة الحجوزات غير مكتملة.');
    expect(state.writes).toHaveLength(0);
  });

  test(`${language}: reports bind authored table headers while retaining names, dates and separate currencies`, async ({ page }) => {
    const state = await setup(page, language, 'center', path => path.startsWith('/center/me/reports?') ? { body: { center: { displayName: 'الحالة' }, period: { from: '2026-11-01', to: '2026-11-19' }, trips: [{ status: 'OPEN', count: 1, capacity: 10 }], bookings: [{ status: 'CONFIRMED', count: 1, seats: 2 }], payments: [{ status: 'CAPTURED', currency: 'SAR', count: 1, amountMinor: 12550 }, { status: 'AUTHORIZED', currency: 'USD', count: 1, amountMinor: 20000 }] } } : null);
    await page.evaluate(() => window.HydrolandCenterReports.open());
    const panel = page.locator('#hl-center-reports'), from = panel.locator('[name=from]'); await from.fill('2026-11-03'); await from.focus();
    const calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(from).toBeFocused(); await expect(from).toHaveValue('2026-11-03');
      await expect(panel.locator('[data-center-report-result] h3').first()).toHaveText('الحالة');
      await expect(panel.locator('th').first()).toHaveText(copy(current, 'الحالة', 'Status')); await expect(panel.locator('caption').first()).toHaveText(copy(current, 'الرحلات', 'Trips'));
      await expect(panel).toContainText('125.50'); await expect(panel).toContainText('20000'); await expect(panel).toContainText('USD'); expect(state.calls.length).toBe(calls);
    }
    expect(state.writes).toEqual([]);
  });

  test(`${language}: readiness descriptions are bilingual and never become a payment operation`, async ({ page }) => {
    const state = await setup(page, language, 'admin', path => path.startsWith('/health/integrations/') ? { body: { integration: path.endsWith('payment') ? 'PAYMENT_PSP' : 'BANKING_SETTLEMENT', status: 'SANDBOX', productionReady: false, sandboxReady: true, provider: 'MOYASAR', checks: { lifecycleOperational: true, providerConfigured: true, credentialsConfigured: true, webhookConfigured: true, publicWebOriginConfigured: true } } } : null);
    await page.evaluate(() => window.HydrolandPaymentReadiness.reload());
    const panel = page.locator('[data-payment-readiness]'), card = panel.locator('[data-readiness-kind=payment]');
    // Readiness is also verified below its admin controller, independent of the shell tab.
    await expect(card.locator('strong')).toHaveText(copy(language, 'إعدادات الاختبار مكتملة', 'Test configuration complete'));
    const calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(card.locator('h4')).toHaveText(copy(current, 'مزود الدفع', 'Payment provider'));
      await expect(card.locator('li').first()).toHaveText(copy(current, 'تفعيل الربط: مكتمل', 'Enable connection: Complete')); expect(state.calls.length).toBe(calls);
    }
    expect(state.writes).toEqual([]); expect(state.calls.every(call => call.method === 'GET')).toBe(true);
    await page.evaluate(() => window.HydrolandAuth.terminateSession()); await locale(page, language === 'ar' ? 'en' : 'ar');
    await expect(panel.locator('[data-readiness-kind]')).toHaveCount(0);
  });
}

for (const language of ['ar', 'en']) {
  test(`${language}: customer pagination ARIA changes without changing search values or route keys`, async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const state = await setup(page, language, 'center', path => path.startsWith('/center/me/customers?') ? { body: { items: [], page: 1, total: 21, totalPages: 2 } } : null);
    await page.evaluate(() => window.HydrolandCenterCustomers.open());
    const panel = page.locator('#hl-center-customers'), input = panel.locator('[name=q]'); await input.fill('بحث'); await input.focus();
    const calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(input).toBeFocused(); await expect(input).toHaveValue('بحث');
      await expect(panel.locator('.hl-customer-pager')).toHaveAttribute('aria-label', copy(current, 'صفحات العملاء', 'Customer pages'));
      await expect(panel.locator('[data-customer-page]').first()).toHaveAttribute('data-customer-page', 'list'); expect(state.calls.length).toBe(calls);
    }
    expect(state.writes).toEqual([]);
  });

  test(`${language}: warehouse accessible names retain source actions and unsaved fields`, async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    const state = await setup(page, language, 'admin', path => {
      if (path.startsWith('/admin/employees')) return { body: { initialized: true, departments: [], profiles: [], items: [], nextCursor: null, email: { enabled: false }, google: { enabled: false } } };
      if (path === '/admin/warehouse-locations') return { body: { schemaVersion: 1, policy: 'WAREHOUSE_LOCATION_REGISTER_V1', items: [], hasMore: false } };
      return null;
    });
    const entry = page.locator('[data-portal-label="إدارة الموظفين"]');
    if (!await entry.isVisible()) await page.locator('.hl-role-dashboard [data-portal-menu]').click();
    await entry.click(); await page.locator('[data-warehouse-locations] > summary').click();
    const form = page.locator('[data-warehouse-create]'), title = form.locator('[name=title]');
    await expect(form).toBeVisible(); await title.fill('اسم الموقع'); await title.focus();
    const calls = state.calls.length;
    for (const current of ['en', 'ar', language]) {
      await locale(page, current); await expect(title).toBeFocused(); await expect(title).toHaveValue('اسم الموقع');
      await expect(title).toHaveAttribute('aria-label', copy(current, 'إنشاء اسم الموقع', 'Create location name'));
      await expect(form.locator('[name=locationDescription]')).toHaveAttribute('aria-label', copy(current, 'إنشاء وصف الموقع', 'Create location description'));
      await expect(page.locator('[data-warehouse-edit] [name=title]')).toHaveAttribute('aria-label', copy(current, 'تعديل اسم الموقع', 'Edit location name'));
      await expect(form.locator('[name=code]')).toHaveAttribute('name', 'code'); expect(state.calls.length).toBe(calls);
    }
    expect(state.writes).toEqual([]);
  });
}
