import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual public-shell handlers, not copies of their logic.
const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const shell = source.slice(0, source.indexOf('function openRole('));
function fixture(preference = false) {
  const state = { preference, calls: [], events: {}, hashes: [], media: [] };
  const classes = { add() {}, remove() {}, toggle() {} };
  const element = id => ({ id, classList: classes, dataset: {},
    addEventListener(name, callback) { state.events[`${id}:${name}`] = callback; },
    scrollIntoView(options) { state.calls.push({ id, ...options }); },
    focus() {}, querySelector() { return null; }, querySelectorAll() { return []; }
  });
  const input = element('search-input'); input.value = 'coral';
  const form = element('search-form'); form.querySelector = () => input;
  const target = element('test-target');
  const match = element('search-result'); match.textContent = 'coral'; match.closest = () => null;
  const nodes = new Map([['search-form', form], ['test-target', target], ['top-search', element('top-search')]]);
  const document = { body: { classList: classes }, head: { appendChild() {} },
    getElementById(id) { return nodes.get(id) ?? null; },
    createElement() { return element('style'); }, addEventListener() {}, querySelector() { return null; },
    querySelectorAll(selector) { return selector.startsWith('.trip-card,') ? [match] : []; }
  };
  const window = { addEventListener() {}, scrollTo(options) { state.calls.push({ id: 'window', ...options }); },
    matchMedia(query) { state.media.push(query); return { matches: state.preference }; }
  };
  const context = vm.createContext({ window, document, location: { hash: '' },
    history: { replaceState(_state, _title, hash) { state.hashes.push(hash); } },
    setTimeout() {}, clearTimeout() {}, sessionStorage: { removeItem() {} }, CustomEvent: class {} });
  vm.runInContext(shell, context);
  state.run = code => vm.runInContext(code, context); state.window = window;
  return state;
}
for (const [name, code, id, block] of [
  ['search result', "searchPage('coral')", 'search-result', 'center'],
  ['non-public navigation', "navigateTo('test-target')", 'test-target', 'start'],
  ['search opener', null, 'search-input', 'center'],
]) {
  test(`${name} reads reduced motion on every action and retains its target`, () => {
    const f = fixture();
    for (const [preference, behavior] of [[false, 'smooth'], [true, 'instant'], [false, 'smooth']]) {
      f.preference = preference;
      if (code) f.run(code); else f.events['top-search:click']();
      assert.deepEqual(f.calls.at(-1), { id, behavior, block });
      assert.equal(f.media.at(-1), '(prefers-reduced-motion: reduce)');
    }
    if (name === 'non-public navigation') assert.deepEqual(f.hashes, ['#test-target', '#test-target', '#test-target']);
  });
}
test('unknown or missing matchMedia support does not animate or throw', () => {
  const f = fixture(); delete f.window.matchMedia;
  f.run("searchPage('coral')"); assert.equal(f.calls.at(-1).behavior, 'instant');
  f.window.matchMedia = () => undefined;
  f.run("navigateTo('test-target')"); assert.equal(f.calls.at(-1).behavior, 'instant');
});
test('public page navigation keeps existing immediate viewport reset', () => {
  const f = fixture(); f.window.HydrolandPublicUI = { setView: () => true };
  f.run("navigateTo('test-target')");
  assert.deepEqual(f.calls, [{ id: 'window', top: 0, behavior: 'instant' }]);
});
test('missing target and empty search do not scroll', () => {
  const f = fixture(); assert.equal(f.run("navigateTo('missing')"), false);
  f.run("searchPage('')"); assert.deepEqual(f.calls, []);
});
