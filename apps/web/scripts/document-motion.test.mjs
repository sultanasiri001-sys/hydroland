import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute production callback definitions rather than a reimplementation.
const source = readFileSync(new URL('../src/hydroland-documents.js', import.meta.url), 'utf8');
const helper = source.split('\n').find(line => line.trim().startsWith('const documentScrollBehavior='));
const listHandler = source.slice(source.indexOf("  panel.querySelector('[data-doc-list]')?.addEventListener"), source.indexOf('  const connectDocumentButtons='));
const connect = source.split('\n').find(line => line.trim().startsWith('const connectDocumentButtons='));
function fixture() {
  const result = { reduced: false, calls: [], fields: [], refreshes: 0, notes: [] };
  const document = { id: 'doc-1', templateId: 'template-1', payload: { summary: 'Synthetic report' } };
  const state = { loading: false, documents: [document], editing: null };
  const select = {}, title = {}, cancel = { hidden: true };
  const form = { scrollIntoView(options) { result.calls.push({ target: 'form', ...options }); } };
  const panel = { hidden: true, scrollIntoView(options) { result.calls.push({ target: 'panel', ...options }); }, querySelector(selector) {
    return ({ '[data-doc-list]': { addEventListener(name, callback) { assert.equal(name, 'click'); result.edit = callback; } }, '[data-doc-template]': select, '[data-doc-form-title]': title, '[data-doc-cancel]': cancel, '[data-doc-form]': form })[selector];
  } };
  const window = { matchMedia: () => ({ matches: result.reduced }) };
  const context = vm.createContext({ window, panel, state, context: () => ({ generation: 1, session: 1, orgId: 'org-1' }), current: () => true, renderFields: payload => result.fields.push(payload), refresh: () => result.refreshes++, note: message => result.notes.push(message) });
  vm.runInContext([helper, listHandler, connect, 'this.connect=connectDocumentButtons;'].join('\n'), context);
  const button = { dataset: { docAction: 'edit' }, disabled: false, closest: () => ({ dataset: { documentId: 'doc-1' } }) };
  const event = { target: { closest: () => button } };
  const legacyButton = { textContent: 'رفع الوثائق', dataset: {}, disabled: true, title: 'old', removeAttribute(name) { result.removed = name; }, addEventListener(name, callback) { assert.equal(name, 'click'); result.bound = (result.bound || 0) + 1; result.open = callback; } };
  return { result, state, document, panel, select, title, cancel, window, button, event, legacyButton, connect: () => context.connect({ querySelectorAll: () => [legacyButton] }) };
}
test('edit callback dynamically respects preference while preserving draft, fields and control state', async () => {
  const f = fixture();
  for (const [reduced, behavior] of [[false, 'smooth'], [true, 'instant'], [false, 'smooth']]) {
    f.result.reduced = reduced; await f.result.edit(f.event);
    assert.deepEqual(f.result.calls.at(-1), { target: 'form', behavior, block: 'center' });
    assert.equal(f.state.editing, f.document); assert.equal(f.select.value, 'template-1'); assert.equal(f.select.disabled, true);
    assert.equal(f.title.textContent, 'تعديل المسودة'); assert.equal(f.cancel.hidden, false);
    assert.equal(f.result.fields.at(-1), f.document.payload); assert.equal(f.button.disabled, false);
  }
  assert.deepEqual(f.result.notes, []);
});
test('connected opener dynamically respects preference and retains refresh and display', () => {
  const f = fixture(); f.connect();
  for (const [reduced, behavior] of [[true, 'instant'], [false, 'smooth'], [true, 'instant']]) {
    f.panel.hidden = true; f.result.reduced = reduced; f.result.open();
    assert.equal(f.panel.hidden, false); assert.deepEqual(f.result.calls.at(-1), { target: 'panel', behavior, block: 'start' });
  }
  assert.equal(f.result.refreshes, 3); assert.equal(f.legacyButton.disabled, false);
});
test('repeated button discovery binds once and unrelated labels remain untouched', () => {
  const f = fixture(); f.connect(); f.connect(); assert.equal(f.result.bound, 1);
  const g = fixture(); g.legacyButton.textContent = 'Unrelated'; g.connect(); assert.equal(g.result.bound, undefined); assert.equal(g.legacyButton.disabled, true);
});
test('missing or unrecognized matchMedia result falls back to instant for both handlers', async () => {
  const f = fixture(); f.window.matchMedia = undefined; f.connect(); f.result.open(); await f.result.edit(f.event);
  assert.ok(f.result.calls.every(call => call.behavior === 'instant'));
  f.window.matchMedia = () => null; await f.result.edit(f.event); assert.equal(f.result.calls.at(-1).behavior, 'instant');
});
for (const [name, mutate] of [['disabled button', f => { f.button.disabled = true; }], ['loading documents', f => { f.state.loading = true; }], ['missing document', f => { f.state.documents = []; }], ['unsupported action', f => { f.button.dataset.docAction = 'unrecognized'; }]]) {
  test(`${name} does not enter editor or scroll`, async () => {
    const f = fixture(); mutate(f); await f.result.edit(f.event);
    assert.deepEqual(f.result.calls, []); assert.deepEqual(f.result.fields, []); assert.equal(f.state.editing, null);
  });
}
test('source retains exactly two motion-sensitive calls and no hard-coded smooth call', () => {
  assert.equal((source.match(/behavior:documentScrollBehavior\(\)/g) || []).length, 2);
  assert.doesNotMatch(source, /behavior:\s*['"]smooth['"]/);
});
