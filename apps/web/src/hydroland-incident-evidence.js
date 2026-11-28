(() => {
  const scope = window.HydrolandI18n?.createScope('incident-evidence', {
    'تنزيل حزمة البلاغ': 'Download incident pack', 'جارٍ تجهيز الحزمة…': 'Preparing incident pack…', 'تعذر تجهيز حزمة البلاغ.': 'Could not prepare the incident pack.',
    'انطباق الإجراء التصحيحي': 'Corrective action applicability', 'اختر بعد المراجعة': 'Choose after review', 'مطلوب مع إثبات الفعالية': 'Required with effectiveness evidence',
    'غير منطبق مع تسبيب مستقل': 'Not applicable with an independent reason', 'تحديث أدلة الإقفال': 'Refresh closure evidence',
    'الإجراء التصحيحي المعتمد': 'Approved corrective action', 'التحقق المستقل من الفعالية': 'Independent effectiveness verification', 'اختر المستند المعتمد': 'Choose approved document',
    'اربط الإجراء التصحيحي برقم هذا البلاغ، ثم اعتمد مستند التحقق المستقل من فعاليته من إدارة المستندات.': 'Bind the corrective action to this incident reference, then approve its independent effectiveness document through document management.',
    'رقم البلاغ: {0}': 'Incident reference: {0}', 'تم تحميل الأدلة المتاحة.': 'Available evidence loaded.', 'تعذر تحميل أدلة الإقفال.': 'Could not load closure evidence.',
    'تغير البلاغ؛ حدّث طابور المراجعة.': 'The incident changed. Refresh the review queue.', 'حدد انطباق الإجراء التصحيحي قبل الإقفال.': 'Choose corrective action applicability before closure.',
    'اختر الإجراء والتحقق من فعاليته من الأدلة المعتمدة.': 'Choose the corrective action and its effectiveness record from approved evidence.',
    'تغيرت الجلسة؛ أعد فتح البلاغ.': 'The session changed. Reopen the incident.'
  }) || { t: v => v, setText: (n, v, args = []) => { n.textContent = v.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? ''); } };
  const states = new WeakMap(), node = (tag, text) => { const n = document.createElement(tag); if (text) scope.setText(n, text); return n; };
  const request = async path => { const response = await window.HydrolandAuth.authorizedFetch(path); const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.message || scope.t('تعذر تحميل أدلة الإقفال.')); return body; };
  function mount(card, incident, options) {
    const state = { incident, options, candidates: [], requestId: crypto.randomUUID(), fingerprint: null };
    states.set(card, state); const current = () => card.isConnected && options.isCurrent() && window.HydrolandAuth?.isAuthenticated?.();
    const pack = node('button', 'تنزيل حزمة البلاغ'), feedback = node('p'); pack.type = 'button'; pack.dataset.incidentPack = incident.id; feedback.setAttribute('role', 'status');
    pack.onclick = async () => {
      if (!current()) return; pack.disabled = true; scope.setText(feedback, 'جارٍ تجهيز الحزمة…');
      try {
        const payload = await request('/safety/incidents/' + encodeURIComponent(incident.id) + '/pack'); if (!current()) return;
        if (payload?.protocol !== 'HYDROLAND_INCIDENT_PACK_V1' || !payload.contentDigest) throw new Error(scope.t('تعذر تجهيز حزمة البلاغ.'));
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const link = node('a'); link.href = url; link.download = 'HYDROLAND-Incident-' + String(incident.id).replace(/[^a-z0-9-]/gi, '') + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = '';
      } catch (error) { if (current()) feedback.textContent = error.message; } finally { if (current()) pack.disabled = false; }
    };
    card.append(pack, feedback);
    if (!options.admin) return;
    const section = node('div'); section.className = 'hl-si-form'; section.dataset.incidentClosureEvidence = '1';
    const ref = node('p'); scope.setText(ref, 'رقم البلاغ: {0}', [incident.id]); section.append(ref, node('p', 'اربط الإجراء التصحيحي برقم هذا البلاغ، ثم اعتمد مستند التحقق المستقل من فعاليته من إدارة المستندات.'));
    const label = node('label', 'انطباق الإجراء التصحيحي'), applicable = node('select'); applicable.dataset.capaRequired = '1';
    for (const [value, text] of [['', 'اختر بعد المراجعة'], ['yes', 'مطلوب مع إثبات الفعالية'], ['no', 'غير منطبق مع تسبيب مستقل']]) { const option = node('option', text); option.value = value; applicable.append(option); }
    label.append(applicable); section.append(label);
    const sources = node('div'); sources.className = 'hl-si-form'; sources.hidden = true; sources.style.display = 'none';
    const refresh = node('button', 'تحديث أدلة الإقفال'); refresh.type = 'button';
    const capaLabel = node('label', 'الإجراء التصحيحي المعتمد'), capa = node('select'); capa.dataset.capaDocument = '1'; capaLabel.append(capa);
    const effectivenessLabel = node('label', 'التحقق المستقل من الفعالية'), effectiveness = node('select'); effectiveness.dataset.effectivenessDocument = '1'; effectivenessLabel.append(effectiveness);
    sources.append(refresh, capaLabel, effectivenessLabel); section.append(sources); card.append(section);
    const fill = () => {
      for (const [select, code] of [[capa, 'SAF-CAPA'], [effectiveness, 'SAF-EFFECTIVENESS-CLOSE']]) {
        const saved = select.value; select.replaceChildren(); const empty = node('option', 'اختر المستند المعتمد'); empty.value = ''; select.append(empty);
        const chosen = state.candidates.find(d => d.documentId === capa.value);
        for (const d of state.candidates.filter(d => d.code === code && (code === 'SAF-CAPA' || !chosen || d.organizationId === chosen.organizationId && d.correctiveActionRef === chosen.referenceNumber))) { const option = node('option'); option.value = d.documentId; option.textContent = d.referenceNumber + ' · v' + d.version + (d.organizationName ? ' · ' + d.organizationName : ''); select.append(option); }
        if ([...select.options].some(o => o.value === saved)) select.value = saved;
      }
    };
    applicable.onchange = () => { sources.hidden = applicable.value !== 'yes'; sources.style.display = sources.hidden ? 'none' : 'grid'; }; capa.onchange = fill; fill();
    refresh.onclick = async () => {
      if (!current()) return; refresh.disabled = true;
      try {
        const context = await request('/safety/incidents/admin/' + encodeURIComponent(incident.id) + '/closure-context'); if (!current()) return;
        if (context?.incident?.updatedAt !== incident.updatedAt) throw new Error(scope.t('تغير البلاغ؛ حدّث طابور المراجعة.'));
        state.candidates = Array.isArray(context.candidates) ? context.candidates : []; fill(); scope.setText(feedback, 'تم تحميل الأدلة المتاحة.');
      } catch (error) { if (current()) feedback.textContent = error.message; } finally { if (current()) refresh.disabled = false; }
    };
    Object.assign(state, { applicable, capa, effectiveness });
  }
  function command(card, status, resolutionNotes) {
    const s = states.get(card); if (!s || !s.options.admin || !s.options.isCurrent() || !card.isConnected) throw new Error(scope.t('تغيرت الجلسة؛ أعد فتح البلاغ.'));
    const input = { expectedUpdatedAt: s.incident.updatedAt, status, ...(resolutionNotes.trim() ? { resolutionNotes } : {}) };
    if (status !== 'UNDER_REVIEW') {
      if (!s.applicable.value) throw new Error(scope.t('حدد انطباق الإجراء التصحيحي قبل الإقفال.'));
      input.capaRequired = s.applicable.value === 'yes';
      if (input.capaRequired) {
        const capa = s.candidates.find(d => d.documentId === s.capa.value && d.code === 'SAF-CAPA'), effectiveness = s.candidates.find(d => d.documentId === s.effectiveness.value && d.code === 'SAF-EFFECTIVENESS-CLOSE');
        if (!capa || !effectiveness) throw new Error(scope.t('اختر الإجراء والتحقق من فعاليته من الأدلة المعتمدة.'));
        const pin = d => ({ documentId: d.documentId, version: d.version, contentHash: d.contentHash }); input.capa = pin(capa); input.effectiveness = pin(effectiveness);
      } else input.applicabilityReason = resolutionNotes;
    }
    const fingerprint = JSON.stringify(input); if (s.fingerprint !== null && s.fingerprint !== fingerprint) s.requestId = crypto.randomUUID(); s.fingerprint = fingerprint;
    return { ...input, requestId: s.requestId };
  }
  window.HydrolandIncidentEvidence = Object.freeze({ mount, command });
})();
