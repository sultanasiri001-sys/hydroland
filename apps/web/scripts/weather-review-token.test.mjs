import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Runtime DOM contract test, not a substitute for browser/layout acceptance.
test('weather admin submits the displayed revision, handles conflicts, and disables legacy approval', async () => {
  const listeners = new Map(), states = {}, requests = [];
  let item = { id: 'offline-trip', title: 'Offline', startsAt: '2037-01-01', location: { locationName: 'A', latitude: 0, longitude: 0 }, weatherReview: { status: 'PENDING', decisionToken: 'a'.repeat(64), requiresRefresh: false, snapshot: { windSpeedKph: null } } };
  let promptResult = 'Offline review', conflict = false;
  const button = () => ({ events: {}, addEventListener(event, fn) { this.events[event] = fn; } });
  const holder = { html: '', cards: [], set innerHTML(html) {
    this.html = html;
    this.cards = [...html.matchAll(/<article[^>]*data-weather-trip="([^"]*)"[^>]*data-weather-token="([^"]*)"/g)].map(match => ({ dataset: { weatherTrip: match[1], weatherToken: match[2] }, buttons: {}, querySelector(selector) { return this.buttons[selector] ??= button(); } }));
  }, get innerHTML() { return this.html; }, querySelectorAll() { return this.cards; } };
  const panel = { hidden: true, dataset: {}, innerHTML: '', querySelector(selector) { if (selector === '[data-weather-trips]') return holder; return states[selector] ??= button(); } };
  const document = { getElementById: () => ({ insertAdjacentElement() {} }), createElement: () => panel, addEventListener: (name, fn) => listeners.set(name, fn) };
  const window = { location: { hostname: 'localhost' }, HydrolandAuth: { apiBase: 'http://127.0.0.1/api/v1', getAccessToken: () => 'offline-token' }, HydrolandPortalAccess: { getCurrentRole: () => 'admin' }, prompt: () => promptResult, dispatchEvent() {} };
  const fetch = async (url, input = {}) => {
    assert.equal(new URL(url).hostname, '127.0.0.1');
    if (url.endsWith('/decision')) {
      requests.push(JSON.parse(input.body));
      if (conflict) { item.weatherReview = { ...item.weatherReview, status: 'PENDING', decisionToken: 'c'.repeat(64) }; return { ok: false, json: async () => ({ message: 'Stale weather revision' }) }; }
      item.weatherReview = { ...item.weatherReview, status: 'APPROVED', decisionToken: 'b'.repeat(64) };
      return { ok: true, json: async () => ({ review: item.weatherReview }) };
    }
    if (url.endsWith('/trips/admin')) return { ok: true, json: async () => [item] };
    if (url.endsWith('/weather-gate')) return { ok: true, json: async () => ({ enabled: true, mode: 'ENFORCE', provider: 'STORMGLASS' }) };
    throw new Error('Unexpected fixture request: ' + url);
  };
  const source = fs.readFileSync(new URL('../src/hydroland-weather-admin.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window, document, fetch, CustomEvent: class { constructor(name, details) { this.name = name; this.detail = details; } } });
  const settled = () => new Promise(resolve => setImmediate(resolve));
  await settled();
  assert.match(holder.html, /الرياح —/);
  assert.equal(holder.cards[0].dataset.weatherToken, 'a'.repeat(64));
  await holder.cards[0].buttons['[data-weather-approve]'].events.click();
  assert.deepEqual(requests[0], { status: 'APPROVED', notes: 'Offline review', expectedReview: 'a'.repeat(64) });
  assert.equal(holder.cards[0].dataset.weatherToken, 'b'.repeat(64));
  promptResult = null;
  await holder.cards[0].buttons['[data-weather-reject]'].events.click();
  assert.equal(requests.length, 1, 'cancelled prompt sends no decision');
  promptResult = 'Recheck'; conflict = true;
  await holder.cards[0].buttons['[data-weather-approve]'].events.click();
  assert.equal(requests[1].expectedReview, 'b'.repeat(64));
  assert.equal(states['[data-weather-state]'].textContent, 'Stale weather revision');
  assert.equal(holder.cards[0].dataset.weatherToken, 'c'.repeat(64), 'conflict reloads the current displayed revision');
  item.weatherReview = { ...item.weatherReview, requiresRefresh: true, decisionToken: null };
  listeners.get('hydroland:trip-location-changed')(); await settled();
  assert.match(holder.html, /يلزم تحديث التوقع/);
  assert.match(holder.html, /data-weather-approve disabled/);
  assert.match(holder.html, /data-weather-reject disabled/);
});
