import { test, expect } from '@playwright/test';

const waitForProfileRuntime = async page => {
  await page.waitForFunction(() => Boolean(window.HydrolandAuth && window.HydrolandProfile && window.HydrolandPortalAccess));
};

const installProfileApi = async (page) => {
  const state = {
    profile: {
      id: 'account-e2e',
      email: 'profile-e2e@hydroland.test',
      status: 'ACTIVE',
      roleAssignments: [{ id: 'role-admin', role: 'ADMIN', status: 'ACTIVE', activeAt: null, updatedAt: '2026-09-25T00:00:00.000Z' }],
      person: {
        firstName: 'Sultan',
        lastName: 'Asiri',
        phone: null,
        professional: { headline: 'Rescue Diver', bio: null, regionCode: 'ASIR' },
      },
    },
    credentials: [],
    diver: {
      profile: {
        nationality: 'SA',
        primaryPhone: '0500000000',
        emergencyName: 'Emergency Contact',
        emergencyPhone: '0500000001',
        emergencyRelation: 'Friend',
        bloodType: 'O+',
        medicalFitnessStatus: 'UNKNOWN',
        medicalClearanceExpiresAt: null,
      },
      equipment: [],
    },
  };

  const requireAuth = request => request.headers().authorization === 'Bearer e2e-access';
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/\/api\/v1\/me$/, async route => {
    const request = route.request();
    if (!requireAuth(request)) return json(route, { message: 'Unauthorized' }, 401);
    if (request.method() === 'GET') return json(route, state.profile);
    if (request.method() === 'PATCH') {
      const input = request.postDataJSON();
      state.profile.person = {
        ...state.profile.person,
        firstName: input.firstName ?? state.profile.person.firstName,
        lastName: input.lastName ?? state.profile.person.lastName,
        professional: {
          ...(state.profile.person.professional || {}),
          headline: input.headline ?? state.profile.person.professional?.headline ?? null,
          bio: input.bio ?? state.profile.person.professional?.bio ?? null,
          regionCode: input.regionCode ?? state.profile.person.professional?.regionCode ?? null,
        },
      };
      return json(route, { id: state.profile.id, person: state.profile.person });
    }
    return json(route, { message: 'Method not allowed' }, 405);
  });

  await page.route(/\/api\/v1\/credentials$/, route => {
    if (!requireAuth(route.request())) return json(route, { message: 'Unauthorized' }, 401);
    return json(route, state.credentials);
  });

  await page.route(/\/api\/v1\/me\/diver-profile$/, async route => {
    const request = route.request();
    if (!requireAuth(request)) return json(route, { message: 'Unauthorized' }, 401);
    if (request.method() === 'GET') return json(route, state.diver);
    if (request.method() === 'PATCH') {
      state.diver.profile = { ...state.diver.profile, ...request.postDataJSON() };
      return json(route, state.diver);
    }
    return json(route, { message: 'Method not allowed' }, 405);
  });

  return state;
};

const seedAuthenticatedProfile = async (page) => {
  const state = await installProfileApi(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForProfileRuntime(page);
  await page.evaluate(async () => {
    sessionStorage.setItem('hl-access-token', 'e2e-access');
    sessionStorage.setItem('hl-refresh-token', 'e2e-refresh');
    window.HydrolandAuth.syncAuthUi();
    await window.HydrolandProfile.load();
  });
  await expect.poll(() => page.evaluate(() => window.HydrolandProfileData?.profile?.person?.firstName)).toBe('Sultan');
  return state;
};

test('profile settings save, reload persistence and real roleAssignments mapping work in the browser', async ({ page }) => {
  await seedAuthenticatedProfile(page);

  expect(await page.evaluate(() => window.HydrolandProfileData?.profile?.roles?.[0]?.role)).toBe('ADMIN');

  await page.locator('#profile-open').click();
  const profileDialog = page.locator('#profile-dialog');
  await expect(profileDialog).toBeVisible();
  await profileDialog.locator('[data-hl-action="settings"]').last().click();

  const editor = page.locator('#hl-profile-editor');
  await expect(editor).toBeVisible();
  await expect(editor.locator('[name="firstName"]')).toHaveValue('Sultan');
  await expect(editor.locator('[name="lastName"]')).toHaveValue('Asiri');
  await expect(editor.locator('[name="headline"]')).toHaveValue('Rescue Diver');
  await expect(editor.locator('[name="regionCode"]')).toHaveValue('ASIR');

  await editor.locator('[name="firstName"]').fill('Sultan Updated');
  await editor.locator('[name="lastName"]').fill('Asiri Updated');
  await editor.locator('[name="headline"]').fill('Profile E2E');
  await editor.locator('[name="regionCode"]').fill('ASIR-E2E');
  await editor.locator('button[type="submit"]').click();
  await expect(editor).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.HydrolandProfileData?.profile?.person?.firstName)).toBe('Sultan Updated');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForProfileRuntime(page);
  await expect.poll(() => page.evaluate(() => window.HydrolandProfileData?.profile?.person?.firstName)).toBe('Sultan Updated');

  await page.locator('#profile-open').click();
  const reloadedDialog = page.locator('#profile-dialog');
  await reloadedDialog.locator('[data-hl-action="settings"]').last().click();
  await expect(page.locator('#hl-profile-editor [name="firstName"]')).toHaveValue('Sultan Updated');
  await expect(page.locator('#hl-profile-editor [name="headline"]')).toHaveValue('Profile E2E');
  await page.locator('#hl-profile-editor [data-profile-cancel]').click();
  await page.locator('#close-profile').click();

  await page.locator('#role-switch').click();
  await expect(page.locator('#role-dialog')).toBeVisible();
  await page.locator('#role-dialog [data-role="admin"]').click();
  await expect(page.locator('#role-console')).toBeVisible();
  await expect(page.locator('#role-console-title')).toHaveText('لوحة الإدارة الرئيسية');
});

test('diver profile editor loads, saves and reopens with persisted values', async ({ page }) => {
  await seedAuthenticatedProfile(page);

  await page.locator('#profile-open').click();
  const profileDialog = page.locator('#profile-dialog');
  await profileDialog.locator('[data-hl-action="diver-profile"]').click();
  const editor = page.locator('#hl-diver-editor');
  await expect(editor).toBeVisible();
  await expect(editor.locator('[name="nationality"]')).toHaveValue('SA');
  await expect(editor.locator('[name="primaryPhone"]')).toHaveValue('0500000000');

  await editor.locator('[name="primaryPhone"]').fill('0555555555');
  await editor.locator('[name="emergencyName"]').fill('Updated Emergency');
  await editor.locator('[name="emergencyPhone"]').fill('0566666666');
  await editor.locator('[name="medicalFitnessStatus"]').selectOption('FIT');
  await editor.locator('button[type="submit"]').click();
  await expect(editor).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.HydrolandProfileData?.diverProfile?.primaryPhone)).toBe('0555555555');

  await profileDialog.locator('[data-hl-action="diver-profile"]').click();
  await expect(page.locator('#hl-diver-editor [name="primaryPhone"]')).toHaveValue('0555555555');
  await expect(page.locator('#hl-diver-editor [name="emergencyName"]')).toHaveValue('Updated Emergency');
  await expect(page.locator('#hl-diver-editor [name="medicalFitnessStatus"]')).toHaveValue('FIT');
});

test('unauthenticated account settings stay guarded in the browser', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForProfileRuntime(page);
  const unauthState = await page.evaluate(() => {
    sessionStorage.clear();
    window.HydrolandAuth.syncAuthUi();
    return {
      profile:Boolean(window.HydrolandProfileData),
      loginHidden:document.querySelector('.hl-login')?.classList.contains('hidden')
    };
  });

  expect(unauthState).toEqual({profile:false,loginHidden:false});
  await page.locator('#profile-dialog [data-hl-action="settings"]').last().dispatchEvent('click');
  await expect(page.locator('#toast')).toContainText('سجل الدخول أولًا لفتح بيانات الحساب');
  await expect(page.locator('#hl-profile-editor')).toHaveCount(0);
});
