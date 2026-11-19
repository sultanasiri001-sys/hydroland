// Actual engine and feature modules, with isolated synthetic API responses.
export function participantErrorLocaleScenarios(createWindow, modules, assert) {
  const pause = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setTimeout(resolve, 0)); };
  const cases = [];
  function fixture(markup, role, initial) {
    const runtime = createWindow('<!doctype html><html lang="ar" dir="rtl"><body><main id="main">' + markup + '</main><div id="toast"></div></body></html>');
    const w = runtime.window, d = w.document, state = { active: true, session: 1, calls: [], response: { status: 503, body: {} } };
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; };
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.HydrolandAuth = { isAuthenticated: () => state.active, getSessionVersion: () => state.session, authorizedFetch: async (path, options = {}) => {
      state.calls.push({ path, options }); const answer = typeof state.response === 'function' ? state.response(path, options) : state.response;
      return { ok: answer.status < 400, status: answer.status, json: async () => answer.body };
    } };
    w.HydrolandPortalAccess = { getCurrentRole: () => role, roleAllowed: value => state.active && value === role, authorizeRole: async () => state.active };
    w.HydrolandWorkspaceUI = { show: node => { node.hidden = false; } };
    w.eval(modules['hydroland-i18n.js']); w.HydrolandI18n.setLocale(initial);
    return { w, d, state, load: name => w.eval(modules['hydroland-' + name + '.js']), close: () => runtime.close?.(), revoke() { state.active = false; state.session++; d.dispatchEvent(new w.CustomEvent('hydroland:session-cleared')); d.dispatchEvent(new w.CustomEvent('hydroland:auth-changed')); } };
  }
  function roundtrip(f, node, arabic, english) {
    const requests = f.state.calls.length;
    for (const language of ['en', 'ar', 'en']) { f.w.HydrolandI18n.setLocale(language); assert.equal(node.textContent, language === 'en' ? english : arabic); assert.equal(f.state.calls.length, requests); }
  }
  for (const initial of ['ar', 'en']) {
    cases.push({ name: initial + ': participant request errors keep formatted authored identity and opaque server text', run: async () => {
      const f = fixture('', 'diver', initial);
      try {
        f.load('booking-participants'); await f.w.HydrolandBookingParticipants.open('booking-a');
        const body = f.d.querySelector('[data-participants-body]');
        roundtrip(f, body.querySelector('.hl-account-error'), 'تعذر تنفيذ الطلب (503)', 'The request could not be completed (503)');
        f.state.response = { status: 503, body: { message: 'سجّل الدخول أولًا' } }; await f.w.HydrolandBookingParticipants.open('booking-a');
        roundtrip(f, body.querySelector('.hl-account-error'), 'سجّل الدخول أولًا', 'سجّل الدخول أولًا');
        const opaque = 'A&B <b>نص</b>'; f.state.response = { status: 503, body: { message: opaque } }; await f.w.HydrolandBookingParticipants.open('booking-a');
        roundtrip(f, body.querySelector('.hl-account-error'), opaque, opaque); assert.equal(body.querySelector('b'), null);
        assert.ok(f.state.calls.every(call => call.options.method === 'GET'));
      } finally { f.close(); }
    } });
    cases.push({ name: initial + ': safety validation and forbidden errors remain live without changing status or revocation behavior', run: async () => {
      const f = fixture('', 'center', initial);
      try {
        f.state.response = { status: 200, body: {} }; f.load('center-safety'); await f.w.HydrolandCenterSafety.open();
        const panel = f.d.querySelector('#hl-center-safety'), input = panel.querySelector('[name=q]'); input.value = 'A&B <بحث>'; input.focus();
        roundtrip(f, panel.querySelector('[role=alert]'), 'استجابة سجلات السلامة غير مكتملة. أعد المحاولة.', 'Safety records response is incomplete. Try again.');
        assert.equal(input.value, 'A&B <بحث>'); assert.equal(f.d.activeElement, input);
        panel.querySelector('[data-safety-compose]').textContent = 'Synthetic private draft'; panel.querySelector('section[data-safety-detail]').textContent = 'Synthetic private details';
        f.state.response = { status: 403, body: { message: 'opaque denied response' } }; await f.w.HydrolandCenterSafety.open();
        assert.equal(panel.querySelector('[data-safety-compose]').textContent, ''); assert.equal(panel.querySelector('section[data-safety-detail]').textContent, '');
        roundtrip(f, panel.querySelector('[role=alert]'), 'لا تملك صلاحية سلامة هذا المركز.', 'You do not have safety permissions for this center.');
        const provider = 'استجابة سجلات السلامة غير مكتملة. أعد المحاولة.';
        f.state.response = { status: 503, body: { message: provider } }; await f.w.HydrolandCenterSafety.open();
        roundtrip(f, panel.querySelector('[role=alert]'), provider, provider);
        f.revoke(); f.w.HydrolandI18n.setLocale('ar'); assert.equal(f.d.querySelector('#hl-center-safety'), null);
        assert.ok(f.state.calls.every(call => !call.options.method || call.options.method === 'GET'));
      } finally { f.close(); }
    } });
    cases.push({ name: initial + ': certificate loading feedback retains authored identity while filter values and provider text stay opaque', run: async () => {
      const f = fixture('<section class="hl-admin"><div class="hl-admin__grid"></div></section>', 'admin', initial);
      try {
        f.load('training-certificate-admin'); await pause();
        const panel = f.d.querySelector('.hl-training-certificate-review'), status = panel.querySelector('[data-training-certificate-state]'), filter = panel.querySelector('[data-training-certificate-filter]');
        filter.focus(); roundtrip(f, status, 'تعذر تحميل طلبات شهادات التدريب.', 'Could not load training certificate requests.');
        assert.equal(filter.value, 'RECOMMENDED'); assert.equal(f.d.activeElement, filter);
        const provider = 'تعذر تحميل طلبات شهادات التدريب.'; f.state.response = { status: 503, body: { message: provider } }; await f.w.HydrolandTrainingCertificateAdmin.reload();
        roundtrip(f, status, provider, provider); f.revoke(); f.w.HydrolandI18n.setLocale('ar'); assert.equal(panel.hidden, true); assert.equal(status.textContent, '');
        assert.ok(f.state.calls.every(call => !call.options.method || call.options.method === 'GET'));
      } finally { f.close(); }
    } });
    cases.push({ name: initial + ': safety conflict feedback keeps its binding, draft and disabled submit after the refresh action is appended', run: async () => {
      const f = fixture('', 'center', initial), opaque = 'A&B <فحص>', trip = { id: 'trip-a', title: opaque, status: 'OPEN', startsAt: '2099-12-01T00:00:00Z' };
      try {
        f.state.response = (path, options) => {
          if (options.method === 'POST') return { status: 409, body: {} };
          if (path.includes('/trips?')) return { status: 200, body: { items: [trip], page: 1, totalPages: 1 } };
          if (path.endsWith('/trips/trip-a')) return { status: 200, body: { trip, stateToken: 'opaque-state', incidentStateToken: 'opaque-incident-state', checklistItems: [{ key: 'credential_check', label: opaque }], canAssess: true } };
          return { status: 200, body: { checklists: [], incidents: [] } };
        };
        f.load('center-safety'); await f.w.HydrolandCenterSafety.open();
        f.d.querySelector('[data-safety-new=checklist]').click(); await pause(); f.d.querySelector('[data-safety-trip-select]').click(); await pause();
        const form = f.d.querySelector('[data-safety-submit]'), notes = form.elements.notes, checked = form.elements.credential_check;
        notes.value = opaque; checked.checked = true; notes.focus();
        for (const language of ['en', 'ar', initial]) {
          f.w.HydrolandI18n.setLocale(language); assert.equal(notes.value, opaque); assert.equal(checked.checked, true); assert.equal(f.d.activeElement, notes);
          assert.equal(form.querySelector('legend').textContent, language === 'en' ? 'Checklist items' : 'بنود الفحص');
        }
        form.dispatchEvent(new f.w.Event('submit', { bubbles: true, cancelable: true })); await pause();
        const feedback = form.querySelector('[data-safety-feedback]'), submit = form.querySelector('[type=submit]'), refresh = feedback.querySelector('[data-safety-trip-refresh]');
        assert.ok(refresh); assert.equal(submit.disabled, true); assert.equal(form.dataset.stale, 'true');
        const requests = f.state.calls.length;
        for (const language of ['en', 'ar', 'en']) {
          f.w.HydrolandI18n.setLocale(language);
          assert.equal(feedback.firstChild.textContent, language === 'en' ? 'Could not load safety data.' : 'تعذر تحميل بيانات السلامة.');
          assert.equal(refresh.textContent, language === 'en' ? 'Refresh trip details' : 'تحديث بيانات الرحلة');
          assert.equal(notes.value, opaque); assert.equal(checked.checked, true); assert.equal(submit.disabled, true); assert.equal(f.state.calls.length, requests);
        }
        const writes = f.state.calls.filter(call => call.options.method === 'POST'); assert.equal(writes.length, 1);
        const payload = JSON.parse(writes[0].options.body); assert.equal(payload.expectedState, 'opaque-state'); assert.equal(payload.items.credential_check, true); assert.equal(payload.notes, opaque); assert.ok(typeof payload.requestId === 'string');
        f.revoke(); f.w.HydrolandI18n.setLocale('ar'); assert.equal(f.d.querySelector('#hl-center-safety'), null);
      } finally { f.close(); }
    } });
  }
  return cases;
}
