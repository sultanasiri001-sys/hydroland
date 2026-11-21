import { test, expect } from '@playwright/test';
import { openWorkspaceSwitcher } from './portal-test-helpers.js';

const kinds = ['NATIONAL_LICENSE', 'PROFESSIONAL_LICENSE', 'MEDICAL_EXAM', 'LIABILITY_WAIVER'];
const titles = [
  'الرخصة الوطنية من الاتحاد السعودي للرياضات البحرية والغوص',
  'رخصة المدرب المهنية من منظمة الغوص',
  'الفحص الطبي',
  'إخلاء المسؤولية',
];
test('the instructor selects four independent files and reviews corrections from the dashboard', async ({
  page,
}) => {
  const records = new Map();
  const profile = {
    id: 'trainer-test',
    email: 'trainer@example.invalid',
    status: 'ACTIVE',
    person: { firstName: 'Trainer', lastName: 'Example' },
    roleAssignments: ['INSTRUCTOR', 'DIVE_CENTER', 'ADMIN'].map((role) => ({
      id: role,
      role,
      status: 'ACTIVE',
    })),
  };
  const center = {
    id: 'test-center',
    displayName: 'مركز تجريبي',
    kind: 'DIVE_CENTER',
    status: 'ACTIVE',
  };
  const fulfill = (route, json) => route.fulfill({ json });
  await page.route(/\/api\/v1\/me$/, (route) => fulfill(route, profile));
  await page.route(/\/api\/v1\/organizations\/mine$/, (route) =>
    fulfill(route, [
      {
        accountId: profile.id,
        organizationId: center.id,
        organization: center,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    ]),
  );
  await page.route(/\/api\/v1\/credentials$/, (route) => fulfill(route, []));
  await page.route(/\/api\/v1\/me\/diver-profile$/, (route) =>
    fulfill(route, { profile: null, equipment: [] }),
  );
  await page.route('**/api/v1/instructor-documents/**', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer trainer-ui-fixture');
    const [view, key, action] = new URL(route.request().url()).pathname
      .split('/instructor-documents/')[1]
      .split('/');
    if (action === 'upload') {
      const body = route.request().postDataJSON();
      expect(body.centerId).toBe(center.id);
      expect(body.originalName).toBe(key + '.pdf');
      expect(Buffer.from(body.base64, 'base64').toString()).toContain(key);
      const row = { id: key, kind: key, originalName: body.originalName, status: 'CENTER_PENDING' };
      records.set(key, row);
      return fulfill(route, row);
    }
    if (action === 'decision') {
      const row = records.get(key),
        data = route.request().postDataJSON();
      if (data.decision === 'RETURN') Object.assign(row, { status: 'RETURNED', reason: data.reason });
      else row.status = view === 'center' ? 'PLATFORM_PENDING' : 'APPROVED';
      return fulfill(route, row);
    }
    return fulfill(route, {
      centers: [center],
      records: [...records.values()].filter(
        (row) =>
          view === 'instructor' ||
          row.status === (view === 'center' ? 'CENTER_PENDING' : 'PLATFORM_PENDING'),
      ),
    });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.HydrolandInstructorDocuments && window.HydrolandProfile);
  await page.evaluate(async () => {
    sessionStorage.setItem('hl-access-token', 'trainer-ui-fixture');
    sessionStorage.setItem('hl-refresh-token', 'trainer-ui-refresh');
    window.HydrolandAuth.syncAuthUi();
    document.dispatchEvent(new CustomEvent('hydroland:auth-changed'));
    await window.HydrolandProfile.load();
  });
  async function open(role) {
    await openWorkspaceSwitcher(page);
    await page.locator('#role-dialog [data-role="' + role + '"]').click();
    await page
      .locator(
        '.hl-role-dashboard[data-role="' +
          role +
          '"] [data-action-label="' +
          (role === 'instructor' ? 'مستندات المدرب' : 'مراجعة مستندات المدربين') +
          '"]',
      )
      .click();
    await expect(page.locator('#hl-instructor-documents')).toBeVisible();
  }
  const panel = page.locator('#hl-instructor-documents');
  const slot = (kind) => panel.locator('[data-instructor-slot="' + kind + '"]');
  const review = (kind) => panel.locator('[data-instructor-review="' + kind + '"]');
  await open('instructor');
  await expect(panel.locator('input[type=file]')).toHaveCount(4);
  await expect(panel.locator('[data-instructor-slot] h3')).toHaveText(titles);
  for (const kind of kinds) {
    const input = slot(kind).locator('input[type=file]');
    expect(await input.evaluate((el) => el.multiple)).toBe(false);
    await input.setInputFiles({
      name: kind + '.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 ' + kind),
    });
  }
  for (const kind of kinds) {
    await slot(kind).getByRole('button', { name: 'رفع وإرسال للمركز' }).click();
    await expect(slot(kind)).toContainText('بانتظار مراجعة المركز');
    await expect(slot(kind)).toContainText(kind + '.pdf');
  }
  await open('center');
  await expect(panel.locator('[data-instructor-review]')).toHaveCount(4);
  await review(kinds[0]).getByRole('button', { name: 'موافقة وإحالة لهيدرولاند' }).click();
  await review(kinds[2]).getByRole('textbox').fill('أعد إرفاق الصفحة الثانية');
  await review(kinds[2]).getByRole('button', { name: 'إرجاع للتعديل' }).click();
  await expect(panel.locator('[data-instructor-review]')).toHaveCount(2);
  await open('admin');
  await expect(panel.locator('[data-instructor-review]')).toHaveCount(1);
  await review(kinds[0]).getByRole('button', { name: 'اعتماد نهائي' }).click();
  await expect(panel).toContainText('لا توجد مستندات بانتظار مراجعتك.');
  await open('instructor');
  await expect(slot(kinds[2])).toContainText('أعد إرفاق الصفحة الثانية');
  await expect(slot(kinds[0])).toContainText('معتمد');
  await expect(slot(kinds[1])).toContainText('بانتظار مراجعة المركز');
  await expect(slot(kinds[3])).toContainText('بانتظار مراجعة المركز');
});
