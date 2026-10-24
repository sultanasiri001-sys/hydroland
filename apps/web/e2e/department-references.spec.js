import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';
const json = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
const codes = ['HR','TRAINING','MARINE_OPERATIONS','INVENTORY_LOGISTICS','FINANCE','SAFETY_COMPLIANCE_RISK','CUSTOMER_EXPERIENCE','MARKETING_GROWTH','TECHNOLOGY_CYBERSECURITY','FACILITIES_ASSETS_MAINTENANCE','ADMIN_AFFAIRS_RECORDS','EXECUTIVE_GOVERNANCE','RND_MARKET_INTELLIGENCE','LEGAL_CONTRACTS_INSURANCE'];
const snapshot = () => ({
  catalogVersion: 'isolated-v1', referenceOnly: true, canActivate: false, canonicalDepartmentCount: 14, recordedDepartmentCount: 14, effectivePolicyCount: 1, policiesWithRecordedReferences: 0, observedAt: new Date().toISOString(),
  departments: codes.map(code => ({ code, nameAr: code === 'HR' ? 'الموارد البشرية' : code === 'FINANCE' ? 'المالية' : code, unitRecorded: true, unitActive: true, authorityIds: ['GOV-1'], legalReferenceIds: ['LEG-1'], marineArchiveIds: code === 'HR' ? ['MAR-ARCH-1'] : [], hrSourceIds: code === 'HR' ? ['HR-1'] : [], policies: [{ category: 'FIXTURE', ruleKey: 'FIXTURE-CONTROL', labelAr: 'ضابط مشترك للاختبار', state: 'ENABLED', referencesRecorded: false }], canActivate: false })),
  authorities: [{ id: 'GOV-1', nameAr: 'جهة اختبار معزولة', recordedStatus: 'قيد الاستكمال', snapshotDate: '2026-09-17', scope: 'نطاق مرجعي تجريبي', routingStatus: 'PROPOSED_OWNER_ROUTING', sourceLibraryFileId: 'libfile_fixtureauthority' }],
  legalReferences: [{ id: 'LEG-1', titleAr: 'مرجع قانوني للاختبار', recordedStatus: 'Active', snapshotDate: '2026-09-16', url: 'https://example.invalid/official-reference', sourceLibraryFileId: 'libfile_fixturelegal' }],
  marineArchives: [{ id: 'MAR-ARCH-1', titleAr: 'ملف غوص محفوظ للاختبار', recordedStatus: 'الإصدار وقابلية الانطباق قيد التحقق', snapshotDate: '2026-10-24', sourceLibraryFileId: 'libfile_fixturemarine' }],
  hrSources: [{ id: 'HR-1', titleAr: 'مصدر موارد بشرية للاختبار', snapshotDate: '2026-10-23', url: 'https://example.invalid/hr-source', sourceLibraryFileId: 'libfile_fixturehr' }],
  hrControlCandidates: [{ ruleKey: 'HR-FIXTURE-001', labelAr: 'ضابط مرشح معزول', sourceIds: ['HR-1'], clauseReferences: ['مادة تجريبية'], evidenceSpecification: ['مواصفة دليل تجريبية وليست دليلًا فعليًا'], limitations: 'المراجعة القانونية معلقة', enabled: false, regulatoryRequirementId: null, legalApprovalReference: null }],
});
async function setup(page) {
  const state = { admin: true, reads: 0, writes: 0, data: snapshot(), delay: false, release: null, fail: false, authorizationGate: null };
  await page.route('**/api/v1/**', r => json(r, []));
  await page.route('**/auth/google/config', r => json(r, { enabled: false }));
  await page.route(/\/api\/v1\/me$/, async r => { if (state.authorizationGate) await state.authorizationGate; return json(r, { id: 'reference-browser-admin', status: 'ACTIVE', person: { firstName: 'إدارة', lastName: 'اختبار' }, roleAssignments: state.admin ? [{ role: 'ADMIN', status: 'ACTIVE' }] : [] }); });
  await page.route(/\/admin\/employees(?:\?.*)?$/, r => json(r, { initialized: true, departments: [], profiles: [], items: [], nextCursor: null, email: { enabled: false }, google: { enabled: false } }));
  await page.route(/\/admin\/employees\/compliance-controls(?:\?.*)?$/, r => json(r, { observedAt: new Date().toISOString(), controls: [], items: [], nextCursor: null }));
  await page.route(/\/admin\/department-references(?:\?.*)?$/, async r => {
    if (r.request().method() !== 'GET') state.writes++;
    state.reads++; const response = structuredClone(state.data);
    if (state.delay) await new Promise(resolve => { state.release = resolve; });
    return json(r, state.fail ? { message: 'تعذر تحميل المراجع مؤقتًا' } : response, state.fail ? 503 : 200);
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandDepartmentReferences && window.HydrolandProfile));
  await page.evaluate(async () => { window.HydrolandAuth.acceptSession({ accessToken: 'reference-fixture', refreshToken: 'reference-fixture-refresh' }, window.HydrolandAuth.beginAuthAttempt()); await window.HydrolandProfile.load(); });
  await openWorkspaceSwitcher(page); await page.locator('#role-dialog [data-role="admin"]').click(); await page.locator('[data-portal-label="إدارة الموظفين"]').click();
  await expect(page.locator('[data-staff-feedback]')).toContainText('تم تحميل'); expect(state.reads).toBe(0);
  return state;
}
const box = page => page.locator('[data-department-references]');
async function open(page) { await box(page).locator('summary').click(); await expect(page.locator('[data-reference-status]')).toContainText('وقت القراءة'); }

test('department source discovery is lazy, read only and separate from approval', async ({ page }) => {
  const state = await setup(page); await open(page);
  await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(14);
  await expect(page.locator('[data-reference-detail]')).toContainText('لم يُثبت متطلب معتمد');
  await expect(page.locator('[data-reference-detail]')).toContainText('ربط المصدر بالإدارة مقترح');
  await expect(page.locator('[data-reference-detail]')).toContainText('ملف غوص محفوظ للاختبار');
  await expect(page.locator('[data-reference-detail] a[href*="libfile_fixturemarine"]')).toHaveCount(1);
  await expect(page.locator('[data-reference-detail]')).toContainText('مفعّل تشغيليًا');
  await expect(page.locator('[data-reference-detail]')).toContainText('ربط المتطلب ونسخته وأدلته ومرجع اعتماده غير مكتمل');
  expect(state.writes).toBe(0);
  await page.getByRole('button', { name: 'فتح مسار مراجعة ضوابط الموارد البشرية', exact: true }).click();
  await expect(page.locator('[data-hr-control-review]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-hr-control-request] [name=regulatoryRequirementId]')).toHaveValue('');
  await expect(page.locator('[data-hr-control-request] [name=legalApprovalReference]')).toHaveValue(''); expect(state.writes).toBe(0);
  await page.getByLabel('إدارة المراجع').selectOption('FINANCE');
  await expect(page.locator('[data-reference-detail]')).toContainText('المالية');
  await expect(page.locator('[data-reference-detail]')).not.toContainText('مواصفة دليل تجريبية');
});
test('late source data cannot reappear after leaving the department workspace', async ({ page }) => {
  const state = await setup(page); await open(page); state.delay = true;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect.poll(() => typeof state.release).toBe('function');
  await page.locator('[data-portal-label="مركز القيادة والتحكم"]').click();
  const completed = page.waitForResponse(r => /\/department-references$/.test(r.url())); state.release(); await completed;
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(0);
});
test('fresh authorization loss prevents a private reference read', async ({ page }) => {
  const state = await setup(page); let release; state.authorizationGate = new Promise(resolve => { release = resolve; }); state.admin = false;
  try { await box(page).locator('summary').click(); } finally { state.authorizationGate = null; release(); }
  await expect(page.locator('#hl-admin-employees')).toBeHidden(); await expect(page.locator('[data-reference-detail]')).toBeEmpty(); expect(state.reads).toBe(0);
});
test('untrusted reference text remains text and non-HTTPS source links are rejected', async ({ page }) => {
  const state = await setup(page); state.data.legalReferences[0].titleAr = '<img src=x onerror=alert(1)>'; state.data.legalReferences[0].url = 'javascript:alert(1)';
  await open(page); await expect(page.locator('[data-reference-detail]')).toContainText('<img src=x');
  await expect(page.locator('[data-reference-detail] img,[data-reference-detail] svg')).toHaveCount(0);
  await expect(page.locator('[data-reference-detail] a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator('[data-reference-detail] a[href*="chatgpt.com/library"]').first()).toHaveAttribute('rel', 'noopener noreferrer');
});
test('failed and malformed refreshes remove stale reference claims', async ({ page }) => {
  const state = await setup(page); await open(page); state.fail = true;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect(page.locator('[data-reference-status]')).toContainText('مؤقتًا');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); await expect(page.getByLabel('إدارة المراجع')).toBeDisabled();
  state.fail = false; state.data.referenceOnly = false;
  await page.getByRole('button', { name: 'تحديث المراجع', exact: true }).click(); await expect(page.locator('[data-reference-status]')).toContainText('غير مكتملة');
  await expect(page.locator('[data-reference-detail]')).toBeEmpty(); expect(state.writes).toBe(0);
});
test('mobile reference discovery fits the workspace and logout clears its content', async ({ page }) => {
  const state = await setup(page); await open(page); await page.setViewportSize({ width: 390, height: 844 });
  expect(await box(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.evaluate(() => window.HydrolandAuth.terminateSession()); await expect(page.locator('[data-reference-detail]')).toBeEmpty();
  await expect(page.getByLabel('إدارة المراجع').locator('option')).toHaveCount(0); expect(state.writes).toBe(0);
});
