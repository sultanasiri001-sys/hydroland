import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

for (const filename of ['hydroland-experience.js', 'hydroland-public-discovery.js']) {
  const source = readFileSync(new URL(`../src/${filename}`, import.meta.url), 'utf8');
  const helper = source.match(/const publicScrollBehavior=.*?;/)?.[0];
  test(`${filename}: live preference changes and absent API use safe scrolling`, () => {
    assert.ok(helper);
    let reduced = false;
    const window = { matchMedia: query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return { matches: reduced }; } };
    const context = vm.createContext({ window });
    vm.runInContext(`${helper};this.behavior=publicScrollBehavior`, context);
    assert.equal(context.behavior(), 'smooth');
    reduced = true; assert.equal(context.behavior(), 'instant');
    reduced = false; assert.equal(context.behavior(), 'smooth');
    window.matchMedia = undefined; assert.equal(context.behavior(), 'instant');
    window.matchMedia = () => null; assert.equal(context.behavior(), 'instant');
  });
  test(`${filename}: every animated call uses the evaluated preference`, () => {
    assert.doesNotMatch(source, /behavior:\s*['"]smooth['"]/);
    const expected = filename === 'hydroland-experience.js' ? 1 : 2;
    assert.equal((source.match(/behavior:publicScrollBehavior\(\)/g) || []).length, expected);
  });
}

const experience = readFileSync(new URL('../src/hydroland-experience.js', import.meta.url), 'utf8');
const discovery = readFileSync(new URL('../src/hydroland-public-discovery.js', import.meta.url), 'utf8');
function fixture() {
  const state = { reduced: false, authenticated: true, publicPage: false, calls: [], shown: [], hashes: [], authClicks: 0, reloads: 0, sidebarCloses: 0 };
  const target = id => ({ id, scrollIntoView(options) { state.calls.push({ id, ...options }); } });
  const cart = target('cart'), store = target('store'), training = target('training');
  const window = {
    matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return { matches: state.reduced }; },
    scrollTo(options) { state.calls.push({ id: 'window', ...options }); },
    HydrolandWorkspaceUI: { show(node) { state.shown.push(node?.id); } },
    HydrolandTraining: { reload() { state.reloads++; } },
  };
  const document = {
    getElementById(id) { return id === 'visitor-auth-cta' ? { click() { state.authClicks++; } } : id === 'store' ? store : null; },
    querySelector(selector) { return selector === '.hl-store-cart' ? cart : selector === '.hl-training' ? training : selector === '.sidebar' ? { classList: { remove(name) { assert.equal(name, 'open'); state.sidebarCloses++; } } } : null; },
  };
  const toolbar = { querySelector(selector) { assert.equal(selector, '.hl-cart'); return { addEventListener(event, handler) { assert.equal(event, 'click'); state.cartClick = handler; } }; } };
  const context = vm.createContext({ window, document, toolbar, auth: () => state.authenticated, setView: () => state.publicPage, history: { pushState(a, b, hash) { state.hashes.push(hash); } } });
  const helper = discovery.match(/const publicScrollBehavior=.*?;/)[0];
  const navigate = discovery.split('\n').find(line => line.trim().startsWith('const navigate='));
  const trainingHandler = discovery.split('\n').find(line => line.trim().startsWith('const openTraining='));
  const cartHandler = experience.split('\n').find(line => line.trim().startsWith("toolbar.querySelector('.hl-cart').addEventListener"));
  assert.ok(navigate && trainingHandler && cartHandler);
  vm.runInContext([helper, navigate, trainingHandler, cartHandler, 'this.navigate=navigate;this.openTraining=openTraining;'].join('\n'), context);
  return { state, context, window, document };
}
for (const [name, invoke, id, block] of [
  ['cart', f => f.state.cartClick(), 'cart', 'center'],
  ['workspace navigation', f => f.context.navigate('store'), 'store', 'start'],
  ['training', f => f.context.openTraining(), 'training', 'start'],
]) {
  test(`${name}: actual handler preserves target and alignment through preference changes`, () => {
    const f = fixture();
    for (const [reduced, behavior] of [[false, 'smooth'], [true, 'instant'], [false, 'smooth']]) {
      f.state.reduced = reduced; invoke(f);
      assert.deepEqual(f.state.calls.at(-1), { id, block, behavior });
    }
    f.window.matchMedia = undefined; invoke(f);
    assert.equal(f.state.calls.at(-1).behavior, 'instant');
    if (id === 'store') { assert.deepEqual(f.state.hashes, Array(4).fill('#store')); assert.equal(f.state.sidebarCloses, 4); }
    if (id === 'training') assert.equal(f.state.reloads, 4);
  });
}
test('guest training keeps authentication gate without scrolling or loading private workspace', () => {
  const f = fixture(); f.state.authenticated = false; f.context.openTraining();
  assert.equal(f.state.authClicks, 1); assert.equal(f.state.reloads, 0);
  assert.deepEqual(f.state.shown, []); assert.deepEqual(f.state.calls, []);
});
test('public navigation preserves immediate reset and closes sidebar', () => {
  const f = fixture(); f.state.publicPage = true; f.context.navigate('store');
  assert.deepEqual(f.state.calls, [{ id: 'window', top: 0, behavior: 'instant' }]);
  assert.deepEqual(f.state.hashes, ['#store']); assert.equal(f.state.sidebarCloses, 1);
});
test('absent targets remain optional and do not throw', () => {
  const f = fixture(); f.document.getElementById = () => null; f.document.querySelector = () => null;
  assert.doesNotThrow(() => f.context.navigate('missing'));
  assert.doesNotThrow(() => f.context.openTraining()); assert.doesNotThrow(() => f.state.cartClick());
  assert.deepEqual(f.state.calls, []);
});
