import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = name => readFile(new URL('../src/' + name, import.meta.url), 'utf8');
const [engine, availability, bookings] = await Promise.all(['hydroland-i18n.js', 'hydroland-booking-availability.js', 'hydroland-bookings.js'].map(read));
function element() {
  const attributes = {};
  return { isConnected: true, dataset: {}, disabled: false, firstChild: null,
    set textContent(value) { this.firstChild = { nodeType: 3, nodeValue: String(value), isConnected: true }; },
    get textContent() { return this.firstChild?.nodeValue || ''; },
    setAttribute(key, value) { attributes[key] = String(value); }, getAttribute(key) { return attributes[key] ?? null; },
  };
}
function fixture() {
  const state = { trips: [], buttons: [], fetches: 0 };
  const document = { documentElement: {}, querySelectorAll: query => query === '[data-book]' ? state.buttons : [], querySelector: query => query.startsWith('script[') ? {} : null, getElementById: () => null, addEventListener() {}, dispatchEvent() {} };
  const window = { location: { hostname: 'localhost', href: 'http://localhost/' }, addEventListener() {}, dispatchEvent() {}, HydrolandAuth: { isAuthenticated: () => false, getSessionVersion: () => 1 } };
  const context = vm.createContext({ document, window, URL, URLSearchParams, CustomEvent: class {}, setTimeout: () => 0,
    sessionStorage: { getItem: () => null }, fetch: async () => { state.fetches++; return { ok: true, status: 200, json: async () => structuredClone(state.trips) }; },
  });
  vm.runInContext(engine, context); vm.runInContext(availability, context);
  return { state, context, i18n: window.HydrolandI18n, api: window.HydrolandBookingAvailability, window };
}
const ready = extra => ({ id: 'trip-a', title: 'تحتاج اعتماد السلامة', startsAt: '2099-12-01T00:00:00Z', capacity: 4, remainingSeats: 3, price: { configured: true }, safety: { decision: 'ALLOWED' }, ...extra });

test('actual availability gate keeps every authored decision and empty availability in both languages', () => {
  const { api, i18n } = fixture();
  const cases = [
    [null, 'غير متاحة', 'Unavailable'],
    [ready({ price: { configured: false } }), 'السعر لم يُعتمد بعد', 'Price not yet approved'],
    [ready({ remainingSeats: 0 }), 'مكتملة السعة', 'Fully booked'],
    [ready({ safety: { decision: 'DEFERRED' } }), 'مؤجلة بقرار السلامة', 'Postponed by the safety decision'],
    [ready({ safety: { decision: 'REVIEW' } }), 'تحتاج اعتماد السلامة', 'Safety approval required'],
    [ready({ weather: { evaluation: { blocking: true, decision: 'DEFERRED' } } }), 'مؤجلة بسبب الطقس', 'Postponed due to weather'],
    [ready({ weather: { evaluation: { blocking: true, decision: 'REVIEW_REQUIRED' } } }), 'تحتاج مراجعة الطقس', 'Weather review required'],
    [ready({ weather: { evaluation: { blocking: true, decision: 'UNAVAILABLE' } } }), 'بيانات الطقس غير متاحة', 'Weather data unavailable'],
    [ready({ weather: { evaluation: { blocking: true, decision: 'OTHER' } } }), 'غير متاحة بسبب الطقس', 'Unavailable due to weather'],
    [ready({ startsAt: '2000-01-01T00:00:00Z' }), 'بدأت الرحلة', 'Trip started'],
    [ready(), '', ''],
    [ready({ remainingSeats: 0, bookingPolicy: { capacityLimit: 'REVIEW' } }), '', ''],
    [ready({ safety: { decision: 'REVIEW' }, bookingPolicy: { safetyApproval: 'DISABLED' } }), '', ''],
  ];
  for (const [trip, arabic, english] of cases) {
    const before = JSON.stringify(trip); i18n.setLocale('ar'); const descriptor = api.explainMessage(trip);
    assert.equal(api.explain(trip), arabic); assert.equal(String(descriptor), arabic);
    i18n.setLocale('en'); assert.equal(api.explain(trip), english); assert.equal(String(descriptor), english);
    assert.equal(JSON.stringify(trip), before); if (!arabic) assert.equal(descriptor, '');
  }
});

test('availability text and title change live without refetching or altering disabled and route state', async () => {
  const { state, api, i18n } = fixture();
  const button = element(); button.dataset.tripId = 'trip-a'; state.buttons = [button];
  state.trips = [ready({ safety: { decision: 'REVIEW' } })]; await api.refresh();
  assert.equal(button.disabled, true); assert.equal(button.getAttribute('aria-disabled'), 'true');
  assert.equal(button.textContent, 'تحتاج اعتماد السلامة'); assert.equal(button.getAttribute('title'), 'تحتاج اعتماد السلامة');
  let fetches = state.fetches; i18n.setLocale('en');
  assert.equal(button.textContent, 'Safety approval required'); assert.equal(button.getAttribute('title'), 'Safety approval required');
  assert.equal(button.disabled, true); assert.equal(button.dataset.tripId, 'trip-a'); assert.equal(state.fetches, fetches);
  state.trips = [ready({ weather: { snapshot: { waveHeightM: 0.5 } } })]; await api.refresh();
  assert.equal(button.disabled, false); assert.equal(button.getAttribute('aria-disabled'), 'false'); assert.equal(button.textContent, 'Book now');
  assert.equal(button.getAttribute('title'), '3 of 4 remaining · Waves 0.5 m'); fetches = state.fetches; i18n.setLocale('ar');
  assert.equal(button.textContent, 'احجز الآن'); assert.equal(button.getAttribute('title'), 'متبقي 3 من 4 · الموج 0.5م'); assert.equal(state.fetches, fetches);
});

test('cross-module trip messages bind authored labels while equal-valued operator text stays opaque', async () => {
  const { context, api, i18n, window } = fixture(); vm.runInContext(bookings, context); await Promise.resolve();
  const consumer = i18n.createScope('commerce-consumer', { 'تسمية': 'Label' }), type = element(), reason = element(), operatorText = element();
  const originalTypeLabel = window.HydrolandBookings.tripTypeLabel('SHORE_DIVE');
  consumer.setMessage(type, window.HydrolandBookings.tripTypeMessage('SHORE_DIVE'));
  consumer.setMessage(reason, api.explainMessage(ready({ safety: { decision: 'REVIEW' } })));
  consumer.setMessage(operatorText, 'تحتاج اعتماد السلامة'); i18n.setLocale('en');
  assert.equal(type.textContent, 'Shore dive'); assert.equal(reason.textContent, 'Safety approval required');
  assert.equal(operatorText.textContent, 'تحتاج اعتماد السلامة'); assert.equal(window.HydrolandBookings.tripTypeLabel('SHORE_DIVE'), originalTypeLabel);
  i18n.setLocale('ar'); assert.equal(type.textContent, 'غوص شاطئي'); assert.equal(reason.textContent, 'تحتاج اعتماد السلامة');
});

test('commerce source keeps keyword operands separate after authored-text migration', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../../docs/D11_LOCALIZATION_BATCHES.json', import.meta.url), 'utf8'));
  const paths = [...manifest.batches['commerce-and-centers'], 'apps/web/src/hydroland-support.js'];
  for (const path of paths) {
    const source = await readFile(new URL('../../../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(?:return|throw|else|new|yield|typeof|void)(?:uiLocale|locale|L|localError)\b/, path);
  }
});
