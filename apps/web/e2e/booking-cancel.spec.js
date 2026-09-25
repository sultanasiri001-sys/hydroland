import { test, expect } from '@playwright/test';

test('my bookings uses canonical DELETE cancellation and refreshes cancelled state', async ({ page }) => {
  let bookingStatus = 'PENDING';
  let cancelMethod = null;
  let cancelPath = null;
  let tripRefreshes = 0;
  const startsAt = new Date(Date.now() + 86_400_000).toISOString();

  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/\/api\/v1\/trips$/, route => {
    tripRefreshes += 1;
    return json(route, [{
      id: 'trip-booking-e2e', title: 'رحلة جزيرة سمر', status: 'OPEN', startsAt,
      capacity: 10, bookedSeats: bookingStatus === 'CANCELLED' ? 0 : 1,
      remainingSeats: bookingStatus === 'CANCELLED' ? 10 : 9,
      safety: { decision: 'ALLOWED' }, weather: { evaluation: { blocking: false } }
    }]);
  });

  await page.route(/\/api\/v1\/trips\/bookings\/mine$/, route => json(route, [{
    id: 'booking-e2e', tripId: 'trip-booking-e2e', accountId: 'account-e2e',
    status: bookingStatus, seats: 1, createdAt: new Date().toISOString(),
    trip: { id: 'trip-booking-e2e', title: 'رحلة جزيرة سمر', startsAt, status: 'OPEN' }
  }]));

  await page.route(/\/api\/v1\/trips\/bookings\/booking-e2e$/, route => {
    cancelMethod = route.request().method();
    cancelPath = new URL(route.request().url()).pathname;
    if (cancelMethod !== 'DELETE') return json(route, { message: 'Wrong cancellation method' }, 405);
    bookingStatus = 'CANCELLED';
    return json(route, { id: 'booking-e2e', status: bookingStatus, seats: 1, tripId: 'trip-booking-e2e' });
  });

  await page.route(/\/api\/v1\/me$/, route => json(route, { id: 'account-e2e', email: 'booking@hydroland.test', status: 'ACTIVE', roleAssignments: [], person: { firstName: 'Booking', lastName: 'E2E', professional: null } }));
  await page.route(/\/api\/v1\/credentials$/, route => json(route, []));
  await page.route(/\/api\/v1\/me\/diver-profile$/, route => json(route, { profile: null, equipment: [] }));

  await page.addInitScript(() => {
    sessionStorage.setItem('hl-access-token', 'e2e-access');
    sessionStorage.setItem('hl-refresh-token', 'e2e-refresh');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandAccountCenter && window.HydrolandBookingAvailability));
  await page.evaluate(() => {
    window.__bookingCancelledEvents = 0;
    window.addEventListener('hydroland:booking-cancelled', () => { window.__bookingCancelledEvents += 1; });
    window.HydrolandAccountCenter.openBookings();
  });

  const dialog = page.locator('#hl-bookings-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-cancel-booking]')).toBeVisible();
  const refreshesBeforeCancel = tripRefreshes;
  await dialog.locator('[data-cancel-booking]').click();

  await expect.poll(() => cancelMethod).toBe('DELETE');
  expect(cancelPath).toBe('/api/v1/trips/bookings/booking-e2e');
  await expect.poll(() => page.evaluate(() => window.__bookingCancelledEvents)).toBe(1);
  await expect.poll(() => tripRefreshes).toBeGreaterThan(refreshesBeforeCancel);
  await expect(dialog.locator('.hl-status.cancelled')).toHaveText('CANCELLED');
  await expect(dialog.locator('[data-cancel-booking]')).toHaveCount(0);
});
