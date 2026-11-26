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
  // This fixture extracts callbacks from their module closure. Supply the
  // display-only adapter dependency without changing the motion assertions.
  const uiLocale = {
    t: source => source,
    message: (source, values = []) => String(source).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? '')),
    setMessage: (node, value) => { if (node) node.textContent = String(value ?? ''); },
  };
  const context = vm.createContext({ window, panel, state, uiLocale, context: () => ({ generation: 1, session: 1, orgId: 'org-1' }), current: () => true, renderFields: payload => result.fields.push(payload), refresh: () => result.refreshes++, note: message => result.notes.push(message) });
  vm.runInContext([helper, listHandler, connect, 'this.connect=connectDocumentButtons;'].join('\n'), context);
  const button = { dataset: { docAction: 'edit' }, disabled: false, closest: () => ({ dataset: { documentId: 'doc-1' } }) };
  const event = { target: { closest: selector => selector === 'button[data-doc-attachment-download]' ? null : button } };
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
function scopedOpenerFixture() {
  const result = {reduced:false, session:1, calls:[], pending:null};
  const state = {orgId:null}, target = {dataset:{documentId:'doc-1'},focus(options){result.calls.push({kind:'focus',...options});},scrollIntoView(options){result.calls.push({kind:'scroll',...options});}};
  const panel = {hidden:true,querySelector:()=>({focus(){}}),querySelectorAll:()=>[target]};
  const window = {HydrolandAuth:{isAuthenticated:()=>true},matchMedia:()=>({matches:result.reduced})};
  const refresh = async organizationId => {state.orgId=organizationId;if(result.pending)await result.pending;};
  const opener = source.slice(source.indexOf('  window.HydrolandDocuments='),source.lastIndexOf('})();'));
  const context = vm.createContext({window,panel,state,refresh,session:()=>result.session,uiLocale:{message:value=>value},note:()=>{}});
  vm.runInContext([helper,'let requestedDocumentGeneration=0;',opener].join('\n'),context);
  return {result,state,panel,open:window.HydrolandDocuments.open};
}
test('scoped document opener respects live motion preference and focuses only the requested document',async()=>{
  const f=scopedOpenerFixture();
  for(const [reduced,behavior]of [[false,'smooth'],[true,'instant']]){
    f.result.reduced=reduced;await f.open({organizationId:'org-1',documentId:'doc-1'});
    assert.deepEqual(f.result.calls.at(-2),{kind:'focus',preventScroll:true});
    assert.deepEqual(f.result.calls.at(-1),{kind:'scroll',behavior,block:'nearest'});
  }
  f.result.calls=[];await f.open({organizationId:'org-1',documentId:'missing'});assert.deepEqual(f.result.calls,[]);
});
for(const boundary of ['session','organization'])test(`scoped document opener discards late focus after a ${boundary} change`,async()=>{
  const f=scopedOpenerFixture();let release;f.result.pending=new Promise(resolve=>{release=resolve;});
  const opening=f.open({organizationId:'org-1',documentId:'doc-1'});
  if(boundary==='session')f.result.session++;else f.state.orgId='org-2';
  release();await opening;assert.deepEqual(f.result.calls,[]);
});
test('source retains exactly three motion-sensitive calls and no hard-coded smooth call', () => {
  assert.equal((source.match(/behavior:documentScrollBehavior\(\)/g) || []).length, 3);
  assert.doesNotMatch(source, /behavior:\s*['"]smooth['"]/);
});
