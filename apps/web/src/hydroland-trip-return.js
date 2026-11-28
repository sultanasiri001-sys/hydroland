(() => {
  const translations = {
    'حصر العودة والمساعدة': 'Return and assistance accountability', 'تحديث الحصر': 'Refresh roster',
    'حدد حالة كل مشارك وعضو طاقم. تُحفظ التصحيحات مع السبب، ولا يكتمل إقفال الرحلة مع وجود شخص يحتاج مساعدة.': 'Record every participant and crew member. Corrections retain their reason. A trip cannot complete while anyone needs assistance.',
    'اختر الحالة': 'Choose status', 'عاد': 'Returned', 'لم يصعد': 'Did not board', 'يحتاج مساعدة': 'Needs assistance', 'تم تسليمه لجهة مساعدة': 'Transferred to assistance',
    'مشارك': 'Participant', 'طاقم': 'Crew', 'مرجع البلاغ عند التسليم': 'Incident reference for transfer', 'مرجع تسليم المسؤولية': 'Responsibility handover reference',
    'وقت الحصر الفعلي': 'Actual accountability time', 'سبب التسجيل أو التصحيح': 'Reason for recording or correction', 'حفظ الحصر': 'Save accountability',
    'جارٍ تحميل الحصر…': 'Loading accountability…', 'تعذر تحميل الحصر.': 'Could not load accountability.', 'تعذر حفظ الحصر.': 'Could not save accountability.',
    'جارٍ حفظ الحصر…': 'Saving accountability…', 'تم حفظ الحصر.': 'Accountability saved.', 'لا يبدأ تسجيل العودة قبل موعد بداية الرحلة.': 'Return recording opens at the trip start time.',
    'لا توجد أسماء مسجلة للحصر.': 'No roster entries are recorded.', 'اختر حالة كل شخص قبل الحفظ.': 'Choose every person’s status before saving.',
    'تسجيل الحاجة للمساعدة ينشئ بلاغًا داخليًا فقط؛ لا يرسل استغاثة إلى جهة خارجية.': 'Recording an assistance need creates an internal incident only. It does not send a distress message to an external agency.',
    'تغيرت قائمة الرحلة منذ آخر حصر؛ راجع جميع الأسماء.': 'The trip roster changed after the last record. Review every name.',
    'حالات تحتاج مساعدة: {0}': 'People needing assistance: {0}', 'مرجع البلاغ: {0}': 'Incident reference: {0}',
    'سجل سابق في حصر هذه الرحلة': 'Retained from earlier trip accountability',
    'حصر العودة مستقل عن حضور الغوص؛ لا ينشئ تسجيل العودة سجل غوص.': 'Return accountability is separate from diving attendance. Recording a return does not create a dive log.'
  };
  const scope = window.HydrolandI18n?.createScope('trip-return', translations) || { t: v => v, setText: (n, v, args = []) => { n.textContent = v.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? ''); } };
  const labels = { RETURNED: 'عاد', NOT_BOARDED: 'لم يصعد', ASSISTANCE_REQUIRED: 'يحتاج مساعدة', TRANSFERRED: 'تم تسليمه لجهة مساعدة' };
  const node = (tag, text) => { const n = document.createElement(tag); if (text) scope.setText(n, text); return n; };
  const localizedTime = value => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
  function mount(host, options) {
    let epoch = 0, busy = false, data, requestId = crypto.randomUUID(), lastFingerprint = null;
    const valid = generation => host.isConnected && epoch === generation && options.isCurrent();
    const request = async (method, body) => {
      const response = await window.HydrolandAuth.authorizedFetch('/trips/return-accountability/' + encodeURIComponent(options.tripId), { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json().catch(() => null); if (!response.ok) throw new Error(result?.message || scope.t(method === 'GET' ? 'تعذر تحميل الحصر.' : 'تعذر حفظ الحصر.')); return result;
    };
    const load = async () => {
      if (busy) return; const generation = ++epoch; host.replaceChildren(node('p', 'جارٍ تحميل الحصر…'));
      try {
        if (!(await options.authorize()) || !valid(generation)) return;
        const next = await request('GET'); if (!valid(generation)) return;
        if (!Array.isArray(next?.roster) || !next.stateToken) throw new Error(scope.t('تعذر تحميل الحصر.'));
        data = next; requestId = crypto.randomUUID(); lastFingerprint = null; render(generation);
      } catch (error) { if (valid(generation)) { host.replaceChildren(); const p = node('p'); p.setAttribute('role', 'alert'); p.textContent = error.message; host.append(p); const retry = node('button', 'تحديث الحصر'); retry.type = 'button'; retry.onclick = () => void load(); host.append(retry); } }
    };
    function render(generation) {
      host.replaceChildren(); host.dataset.tripReturn = '1';
      const style = document.createElement('style'); style.textContent = '[data-trip-return]{min-width:0;overflow-wrap:anywhere;border-top:1px solid rgba(255,255,255,.2);margin-top:1rem;padding-top:1rem}[data-trip-return-form]{display:grid;gap:.7rem}[data-trip-return-form] fieldset{min-width:0;margin:0;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:.65rem}[data-trip-return-form] legend{max-width:100%;overflow-wrap:anywhere}[data-trip-return-form] label{display:grid;gap:.3rem}[data-trip-return-form] label[hidden]{display:none}[data-trip-return-form] input,[data-trip-return-form] select,[data-trip-return-form] textarea{min-width:0;width:100%;box-sizing:border-box;padding:.65rem;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:#142c3a;color:#fff}[data-trip-return-form] textarea{min-height:90px;resize:vertical}'; host.append(style);
      const title = node('h5', 'حصر العودة والمساعدة'), refresh = node('button', 'تحديث الحصر'); refresh.type = 'button'; refresh.onclick = () => void load();
      host.append(title, refresh, node('p', 'حدد حالة كل مشارك وعضو طاقم. تُحفظ التصحيحات مع السبب، ولا يكتمل إقفال الرحلة مع وجود شخص يحتاج مساعدة.'), node('p', 'حصر العودة مستقل عن حضور الغوص؛ لا ينشئ تسجيل العودة سجل غوص.'));
      if (data.saved && !data.saved.sourceCurrent) host.append(node('p', 'تغيرت قائمة الرحلة منذ آخر حصر؛ راجع جميع الأسماء.'));
      if (!data.roster.length) { host.append(node('p', 'لا توجد أسماء مسجلة للحصر.')); return; }
      if (!data.canRecord) { host.append(node('p', 'لا يبدأ تسجيل العودة قبل موعد بداية الرحلة.')); return; }
      const form = node('form'); form.dataset.tripReturnForm = '1'; const fields = [];
      for (const person of data.roster) {
        const row = node('fieldset'), legend = node('legend'); legend.append(document.createTextNode(person.name + ' · '), node('span', person.kind === 'CREW' ? 'طاقم' : 'مشارك')); row.append(legend); if (person.historical) row.append(node('small', 'سجل سابق في حصر هذه الرحلة'));
        const select = node('select'); select.required = true; select.name = 'return-' + person.kind + '-' + person.id; select.setAttribute('aria-label', person.name);
        const empty = node('option', 'اختر الحالة'); empty.value = ''; select.append(empty);
        for (const [value, label] of Object.entries(labels)) { const option = node('option', label); option.value = value; select.append(option); }
        const saved = data.saved?.entries.find(e => e.kind === person.kind && e.id === person.id); select.value = saved?.status || '';
        const incidentLabel = node('label', 'مرجع البلاغ عند التسليم'), incident = node('input'); incident.value = saved?.incidentId || ''; incident.maxLength = 36; incidentLabel.append(incident);
        const handoverLabel = node('label', 'مرجع تسليم المسؤولية'), handover = node('input'); handover.value = saved?.handoverReference || ''; handover.maxLength = 240; handoverLabel.append(handover);
        const toggle = () => { incidentLabel.hidden = handoverLabel.hidden = select.value !== 'TRANSFERRED'; incident.required = handover.required = select.value === 'TRANSFERRED'; }; select.onchange = toggle; toggle();
        row.append(select, incidentLabel, handoverLabel); form.append(row); fields.push({ person, select, incident, handover, saved });
      }
      const timeLabel = node('label', 'وقت الحصر الفعلي'), time = node('input'); time.name = 'observedAt'; time.type = 'datetime-local'; time.step = '1'; time.required = true; time.value = localizedTime(new Date()); timeLabel.append(time);
      const reasonLabel = node('label', 'سبب التسجيل أو التصحيح'), reason = node('textarea'); reason.name = 'reason'; reason.minLength = 10; reason.maxLength = 2000; reason.required = true; reasonLabel.append(reason);
      const submit = node('button', 'حفظ الحصر'); submit.type = 'submit'; const feedback = node('p'); feedback.dataset.tripReturnFeedback = '1'; feedback.setAttribute('role', 'status');
      form.append(timeLabel, reasonLabel, node('p', 'تسجيل الحاجة للمساعدة ينشئ بلاغًا داخليًا فقط؛ لا يرسل استغاثة إلى جهة خارجية.'), submit, feedback); host.append(form);
      form.onsubmit = async event => {
        event.preventDefault(); if (busy || !valid(generation)) return;
        if (fields.some(f => !f.select.value)) { scope.setText(feedback, 'اختر حالة كل شخص قبل الحفظ.'); return; }
        const entries = fields.map(f => ({ kind: f.person.kind, id: f.person.id, status: f.select.value,
          ...(f.select.value === 'TRANSFERRED' ? { incidentId: f.incident.value.trim(), handoverReference: f.handover.value.trim() } : f.select.value === 'ASSISTANCE_REQUIRED' && f.saved?.incidentId ? { incidentId: f.saved.incidentId } : {}) }));
        const input = { expectedRevision: data.revision, expectedState: data.stateToken, observedAt: new Date(time.value).toISOString(), reason: reason.value, entries };
        const fingerprint = JSON.stringify(input); if (lastFingerprint !== null && lastFingerprint !== fingerprint) requestId = crypto.randomUUID(); lastFingerprint = fingerprint;
        busy = true; submit.disabled = refresh.disabled = true; scope.setText(feedback, 'جارٍ حفظ الحصر…');
        try {
          if (!(await options.authorize()) || !valid(generation)) return;
          const result = await request('POST', { ...input, requestId }); if (!valid(generation)) return;
          scope.setText(feedback, 'تم حفظ الحصر.'); busy = false; await load();
          if (host.isConnected && options.isCurrent()) { const status = node('p'); status.setAttribute('role', 'status'); scope.setText(status, 'حالات تحتاج مساعدة: {0}', [String(result.counts.assistanceRequired)]); host.append(status); }
        } catch (error) { if (valid(generation)) feedback.textContent = error.message; }
        finally { busy = false; if (valid(generation)) submit.disabled = refresh.disabled = false; }
      };
    }
    void load(); return { reload: load };
  }
  window.HydrolandTripReturn = Object.freeze({ mount });
})();
