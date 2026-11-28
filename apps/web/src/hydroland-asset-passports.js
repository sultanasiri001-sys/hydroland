(() => {
  if (window.HydrolandAssetPassports) return;
  const locale = window.HydrolandI18n?.createScope('asset-passports', {
    'جواز الأصل': 'Asset passport', 'إغلاق': 'Close', 'تحديث البيانات': 'Refresh data', 'جارٍ التحميل…': 'Loading…',
    'نسخة موثقة من بيانات الأصل؛ لا تمنح تصريح تشغيل أو اعتماد سلامة.': 'A recorded version of the asset data; it does not grant operational or safety clearance.',
    'إصدار النسخة الأولى': 'Issue first version', 'إصدار نسخة محدثة': 'Issue updated version', 'إبطال الجواز': 'Revoke passport',
    'سبب الإبطال': 'Revocation reason', 'سجل النسخ': 'Version history', 'لم يصدر جواز بعد.': 'No passport has been issued.',
    'المصدر مطابق للنسخة': 'Source matches this version', 'تغير المصدر؛ راجع البيانات الحالية': 'Source changed; review the current data',
    'استبدلت بنسخة أحدث': 'Superseded by a later version', 'مبطل': 'Revoked', 'النسخة': 'Version', 'فحص QR': 'Verify QR',
    'رمز QR المقروء': 'Scanned QR reference', 'تحقق من الرمز': 'Verify reference', 'التحقق متاح للمصرح لهم فقط.': 'Verification is available only to authorized accounts.',
    'تعذر تحميل الجواز.': 'Could not load the passport.', 'تعذر حفظ الإجراء.': 'Could not save the action.',
    'تم حفظ الإجراء.': 'Action saved.', 'أدخل سبب الإبطال.': 'Enter a revocation reason.', 'رمز جواز غير صالح.': 'Invalid passport reference.',
    'أدلة الأصل الحالية': 'Current native evidence', 'الأدلة غير مكتملة أو تحتاج مراجعة.': 'Evidence is incomplete or needs review.',
    'الأدلة المسجلة مكتملة.': 'Recorded evidence is complete.', 'حالة الفحص': 'Inspection status', 'انتهاء الصيانة': 'Service expiry',
    'غير مسجل': 'Not recorded', 'منتهي': 'Expired', 'المرفق ناقص': 'Attachment missing', 'غير مراجع': 'Not reviewed',
    'PASS': 'Pass', 'REVIEW': 'Review', 'FAIL': 'Fail', 'NOT_RECORDED': 'Not recorded',
    'VERIFIED': 'Verified', 'PENDING': 'Pending', 'RETURNED': 'Returned', 'REJECTED': 'Rejected',
    'OPERATIONS_PENDING': 'Operations review pending', 'PLATFORM_PENDING': 'Platform decision pending', 'ON_HOLD': 'On hold',
    'REGISTRATION': 'Registration', 'NAVIGATION_LICENSE': 'Navigation license', 'OPERATING_LICENSE': 'Operating license',
    'SAFETY_CERTIFICATE': 'Safety certificate', 'PERIODIC_INSPECTION': 'Periodic inspection', 'COMMUNICATIONS_LICENSE': 'Communications license',
    'رقم الأصل': 'Asset code', 'الرقم التسلسلي': 'Serial number', 'رمز الصنف': 'Item code', 'رقم التسجيل': 'Registration number',
    'رقم الهيكل': 'Hull number', 'سعة الركاب': 'Passenger capacity', 'حالة الأصل': 'Asset status',
    'أعد تحميل البيانات قبل محاولة جديدة.': 'Refresh the data before trying again.', 'النسخ القديمة تحتفظ بمصدرها وقت الإصدار.': 'Older versions retain their source at issuance.',
    'يعرض آخر 100 نسخة.': 'Showing the latest 100 versions.', 'رمز الجواز': 'Passport QR reference',
    'تعذر عرض QR؛ يبقى الرمز النصي متاحًا للتحقق.': 'QR rendering failed; the text reference remains available for verification.',
    'ضابط الأصل يمنع الاستخدام أو يتطلب مراجعة.': 'The native asset gate blocks use or requires review.',
    'بوابة الأصل الحالية': 'Current native asset gate', 'الجهة': 'Organization',
    'AVAILABLE': 'Available', 'CHECKED_OUT': 'Checked out', 'MAINTENANCE': 'Maintenance', 'QUARANTINED': 'Quarantined', 'RETIRED': 'Retired',
    'ACTIVE': 'Active', 'SUSPENDED': 'Suspended', 'OUT_OF_SERVICE': 'Out of service', 'DRAFT': 'Draft', 'UNASSIGNED': 'Unassigned',
    'الأصل غير مفعل.': 'The asset is inactive.',
    'بيانات النسخة عند الإصدار': 'Source data at issuance', 'أدلة النسخة عند الإصدار': 'Evidence at issuance',
    'مجتاز': 'Pass', 'للمراجعة': 'Review', 'غير مجتاز': 'Fail', 'معتمد': 'Verified', 'بانتظار المراجعة': 'Pending',
    'معاد للتعديل': 'Returned', 'مرفوض': 'Rejected', 'بانتظار العمليات': 'Operations review pending', 'بانتظار الإدارة': 'Platform decision pending', 'معلق': 'On hold',
    'تسجيل القارب': 'Registration', 'رخصة الملاحة': 'Navigation license', 'رخصة التشغيل': 'Operating license', 'شهادة السلامة': 'Safety certificate',
    'الفحص الدوري': 'Periodic inspection', 'رخصة الاتصالات': 'Communications license', 'متاح': 'Available', 'مصروف': 'Checked out', 'قيد الصيانة': 'Maintenance',
    'محجوز للفحص': 'Quarantined', 'مستبعد': 'Retired', 'نشط': 'Active', 'موقوف': 'Suspended', 'خارج الخدمة': 'Out of service', 'مسودة': 'Draft', 'غير منسوب': 'Unassigned',
  });
  const t = text => locale?.t(text) ?? text;
  const codes = { PASS: 'مجتاز', REVIEW: 'للمراجعة', FAIL: 'غير مجتاز', NOT_RECORDED: 'غير مسجل', VERIFIED: 'معتمد', PENDING: 'بانتظار المراجعة', RETURNED: 'معاد للتعديل', REJECTED: 'مرفوض',
    OPERATIONS_PENDING: 'بانتظار العمليات', PLATFORM_PENDING: 'بانتظار الإدارة', ON_HOLD: 'معلق', REGISTRATION: 'تسجيل القارب', NAVIGATION_LICENSE: 'رخصة الملاحة', OPERATING_LICENSE: 'رخصة التشغيل',
    SAFETY_CERTIFICATE: 'شهادة السلامة', PERIODIC_INSPECTION: 'الفحص الدوري', COMMUNICATIONS_LICENSE: 'رخصة الاتصالات', AVAILABLE: 'متاح', CHECKED_OUT: 'مصروف', MAINTENANCE: 'قيد الصيانة',
    QUARANTINED: 'محجوز للفحص', RETIRED: 'مستبعد', ACTIVE: 'نشط', SUSPENDED: 'موقوف', OUT_OF_SERVICE: 'خارج الخدمة', DRAFT: 'مسودة', UNASSIGNED: 'غير منسوب' };
  const codeLabel = value => t(codes[value] || value);
  const stateLabels = { CURRENT: 'المصدر مطابق للنسخة', STALE: 'تغير المصدر؛ راجع البيانات الحالية', SUPERSEDED: 'استبدلت بنسخة أحدث', REVOKED: 'مبطل' };
  const element = (tag, text, attrs = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  let dialog, body, message, view, source, sequence = 0, pending, opener, qrLoad;
  const auth = () => window.HydrolandAuth;
  const validSession = session => auth()?.isAuthenticated?.() && session === auth()?.getSessionVersion?.();
  const button = (label, action) => { const node = element('button', t(label), { type: 'button', 'data-passport-action': action }); return node; };
  function clear() {
    sequence++; view = source = pending = undefined;
    if (dialog) { dialog.close(); dialog.remove(); dialog = body = message = undefined; }
  }
  function ensure() {
    if (dialog) return;
    dialog = element('dialog', undefined, { id: 'hl-asset-passport', 'aria-labelledby': 'hl-asset-passport-title' });
    const style = element('style', '#hl-asset-passport{box-sizing:border-box;width:min(760px,calc(100vw - 24px));max-height:90vh;overflow:auto;border:1px solid #4b7183;border-radius:18px;padding:1.2rem;background:#082638;color:#edf7fc;font:inherit}#hl-asset-passport::backdrop{background:#00101bcc}#hl-asset-passport button,#hl-asset-passport input,#hl-asset-passport textarea{font:inherit;padding:.55rem .7rem;border-radius:8px;border:1px solid #6594aa;background:#10394e;color:#fff}#hl-asset-passport button{cursor:pointer;margin:.3rem}#hl-asset-passport button:disabled{opacity:.5;cursor:wait}#hl-asset-passport label{display:grid;gap:.4rem;margin:.7rem 0}#hl-asset-passport article{border-top:1px solid #416276;margin-top:1rem;padding-top:1rem}#hl-asset-passport code{overflow-wrap:anywhere;display:block;direction:ltr}#hl-asset-passport .hl-passport-qr{background:#fff;width:180px;padding:12px;margin:.8rem 0}#hl-asset-passport .hl-passport-qr svg{display:block;width:100%;height:auto}#hl-asset-passport dl{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}#hl-asset-passport dd{margin:0;overflow-wrap:anywhere}#hl-asset-passport [role=alert]{color:#ffd1ca}');
    const title = element('h2', t('جواز الأصل'), { id: 'hl-asset-passport-title' });
    const close = button('إغلاق', 'close'); close.addEventListener('click', () => { const target = opener; clear(); target?.focus(); });
    const note = element('p', t('نسخة موثقة من بيانات الأصل؛ لا تمنح تصريح تشغيل أو اعتماد سلامة.'));
    message = element('p', '', { role: 'status', 'data-passport-message': '' }); body = element('div', undefined, { 'data-passport-content': '' });
    dialog.append(style, close, title, note, message, body); document.body.append(dialog);
    dialog.addEventListener('cancel', clear);
  }
  async function request(path, options) {
    const response = await auth().authorizedFetch(path, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) { const error = new Error(typeof data?.message === 'string' ? data.message : t('تعذر حفظ الإجراء.')); error.status = response.status; throw error; }
    return data;
  }
  const path = () => '/asset-passports/sources/' + source.kind + '/' + encodeURIComponent(source.id);
  function sourceState(parent, value) {
    if (!value) return;
    const status = value.stockStatus || value.assetStatus;
    if (status) parent.append(element('p', t('حالة الأصل') + ': ' + codeLabel(status)));
    if (value.active === false) parent.append(element('p', t('الأصل غير مفعل.')));
    if (value.organizationStatus) parent.append(element('p', t('الجهة') + ': ' + codeLabel(value.organizationStatus)));
  }
  function evidence(parent, value, historical = false) {
    if (!value) return;
    const section = element('section', undefined, { 'data-passport-evidence': '' });
    section.append(element('h3', t(historical ? 'أدلة النسخة عند الإصدار' : 'أدلة الأصل الحالية')), element('p', t(value.evidenceComplete ? 'الأدلة المسجلة مكتملة.' : 'الأدلة غير مكتملة أو تحتاج مراجعة.')));
    if (value.inspectionStatus) {
      section.append(element('p', t('حالة الفحص') + ': ' + codeLabel(value.inspectionStatus) + (value.reviewed ? '' : ' · ' + t('غير مراجع'))));
      section.append(element('p', t('انتهاء الصيانة') + ': ' + (value.serviceExpiresAt ? new Date(value.serviceExpiresAt).toLocaleString() : t('غير مسجل')) + (value.serviceExpired ? ' · ' + t('منتهي') : '')));
    }
    if (value.nativeGate?.blocked || value.nativeGate?.reviewRequired) section.append(element('p', t('ضابط الأصل يمنع الاستخدام أو يتطلب مراجعة.')));
    if (value.nativeReadiness && value.nativeReadiness.status !== 'READY') section.append(element('p', t('ضابط الأصل يمنع الاستخدام أو يتطلب مراجعة.')));
    for (const doc of value.documents || []) section.append(element('p', codeLabel(doc.documentType) + ': ' + codeLabel(doc.status) + (doc.expired ? ' · ' + t('منتهي') : '') + (!doc.hasFile ? ' · ' + t('المرفق ناقص') : '')));
    parent.append(section);
  }
  async function qr(container, value, live) {
    try {
      if (!window.HydrolandPassportQR) {
        qrLoad ||= new Promise((resolve, reject) => { const script = element('script', undefined, { src: '/vendor/asset-passport-qr.js' }); script.onload = resolve; script.onerror = () => { script.remove(); qrLoad = undefined; reject(new Error('QR')); }; document.head.append(script); });
        await qrLoad;
      }
      if (!live()) return;
      const image = window.HydrolandPassportQR.render(value); image.setAttribute('role', 'img'); image.setAttribute('aria-label', t('رمز الجواز')); container.append(image);
    } catch { if (live()) container.textContent = t('تعذر عرض QR؛ يبقى الرمز النصي متاحًا للتحقق.'); }
  }
  async function verify(reference, target) {
    const token = reference.trim().replace(/^hydroland:passport:/, '');
    if (!/^[0-9a-f]{64}$/.test(token)) { target.textContent = t('رمز جواز غير صالح.'); return; }
    const current = sequence, session = auth()?.getSessionVersion?.(); target.textContent = t('جارٍ التحميل…');
    try {
      const result = await request('/asset-passports/verify/' + token);
      if (sequence !== current || !validSession(session) || !target.isConnected) return;
      target.replaceChildren(element('strong', result.displayName), element('p', t(stateLabels[result.status] || result.status)));
      sourceState(target, result.sourceState);
      evidence(target, result.currentEvidence);
    } catch (error) { if (sequence === current && validSession(session) && target.isConnected) target.textContent = error.message; }
  }
  function render() {
    body.replaceChildren();
    body.append(element('h3', view.source.displayName));
    const details = element('dl');
    const labels = { assetCode: 'رقم الأصل', serialNumber: 'الرقم التسلسلي', sku: 'رمز الصنف', registrationNumber: 'رقم التسجيل', hullNumber: 'رقم الهيكل', passengerCapacity: 'سعة الركاب' };
    for (const [key, label] of Object.entries(labels)) if (view.source.identity[key] != null) details.append(element('dt', t(label)), element('dd', String(view.source.identity[key])));
    body.append(details); sourceState(body, view.source); evidence(body, view.source.evidence);
    const refresh = button('تحديث البيانات', 'refresh'); refresh.addEventListener('click', () => void load()); body.append(refresh);
    if (view.canManage && view.passport?.status !== 'REVOKED') {
      const action = view.passport ? 'update' : 'issue', submit = button(view.passport ? 'إصدار نسخة محدثة' : 'إصدار النسخة الأولى', action);
      submit.disabled = Boolean(view.revisions[0]?.sourceDigest === view.sourceDigest); submit.addEventListener('click', () => void mutate(action, submit)); body.append(submit);
      if (view.passport) {
        const label = element('label', t('سبب الإبطال')); const reason = element('textarea', undefined, { maxlength: '1000', rows: '2', 'data-passport-reason': '' }); label.append(reason); body.append(label);
        const revoke = button('إبطال الجواز', 'revoke'); revoke.addEventListener('click', () => void mutate('revoke', revoke)); body.append(revoke);
      }
    }
    if (view.passport?.revocation) body.append(element('p', t('مبطل') + ': ' + view.passport.revocation.reason));
    body.append(element('h3', t('سجل النسخ')), element('p', t('النسخ القديمة تحتفظ بمصدرها وقت الإصدار.')));
    if (!view.revisions.length) body.append(element('p', t('لم يصدر جواز بعد.')));
    for (const revision of view.revisions) {
      const article = element('article', undefined, { 'data-passport-version': String(revision.version) });
      article.append(element('h4', t('النسخة') + ' ' + revision.version + ' · ' + new Date(revision.issuedAt).toLocaleString()), element('p', t(stateLabels[revision.status] || revision.status)));
      const historical = element('details'); historical.append(element('summary', t('بيانات النسخة عند الإصدار')), element('p', revision.sourceSnapshot.displayName));
      const recordedIdentity = element('dl');
      for (const [key, label] of Object.entries(labels)) if (revision.sourceSnapshot.identity?.[key] != null) recordedIdentity.append(element('dt', t(label)), element('dd', String(revision.sourceSnapshot.identity[key])));
      historical.append(recordedIdentity); sourceState(historical, revision.sourceSnapshot); evidence(historical, revision.sourceSnapshot.evidence, true); article.append(historical);
      const preview = element('div', undefined, { class: 'hl-passport-qr' }), reference = element('code', revision.qrValue);
      article.append(preview, reference);
      const current = sequence, session = auth()?.getSessionVersion?.(); void qr(preview, revision.qrValue, () => sequence === current && validSession(session) && preview.isConnected);
      const check = button('فحص QR', 'verify'), result = element('div', undefined, { role: 'status', 'data-passport-verification': '' });
      check.addEventListener('click', () => void verify(revision.qrValue, result)); article.append(check, result); body.append(article);
    }
    if (view.historyTruncated) body.append(element('p', t('يعرض آخر 100 نسخة.')));
    const form = element('form'), label = element('label', t('رمز QR المقروء')), input = element('input', undefined, { required: '', maxlength: '100', autocomplete: 'off', name: 'reference' });
    label.append(input); const submit = element('button', t('تحقق من الرمز'), { type: 'submit' }), result = element('div', undefined, { role: 'status' });
    form.append(label, submit, element('p', t('التحقق متاح للمصرح لهم فقط.')), result);
    form.addEventListener('submit', event => { event.preventDefault(); void verify(input.value, result); }); body.append(form);
  }
  async function load() {
    const current = ++sequence, session = auth()?.getSessionVersion?.(); pending = undefined; body.replaceChildren(); message.textContent = t('جارٍ التحميل…');
    try {
      const result = await request(path());
      if (current !== sequence || !validSession(session)) return;
      view = result; message.textContent = ''; render();
    } catch (error) { if (current === sequence && validSession(session)) { message.textContent = error.message || t('تعذر تحميل الجواز.'); const retry = button('تحديث البيانات', 'refresh'); retry.addEventListener('click', () => void load()); body.append(retry); } }
  }
  async function mutate(action, clicked) {
    if (!view?.canManage || dialog.dataset.busy) return;
    const reason = body.querySelector('[data-passport-reason]')?.value.trim();
    if (action === 'revoke' && !reason) { message.textContent = t('أدخل سبب الإبطال.'); return; }
    const data = { expectedVersion: view.passport?.currentVersion ?? 0, ...(action === 'revoke' ? { reason } : { sourceDigest: view.sourceDigest }) };
    const key = action + JSON.stringify(data); if (pending?.key !== key) pending = { key, payload: { ...data, requestId: crypto.randomUUID() } };
    const current = sequence, session = auth()?.getSessionVersion?.(), url = path() + '/' + action, payload = pending.payload;
    dialog.dataset.busy = 'true'; const actions = [...body.querySelectorAll('button')]; const disabled = actions.map(node => node.disabled); actions.forEach(node => { node.disabled = true; });
    try {
      const result = await request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (current !== sequence || !validSession(session)) return;
      view = result; pending = undefined; message.textContent = t('تم حفظ الإجراء.'); render();
    } catch (error) {
      if (current !== sequence || !validSession(session)) return;
      message.textContent = error.message;
      if (error.status === 409) { pending = undefined; message.textContent += ' ' + t('أعد تحميل البيانات قبل محاولة جديدة.'); }
      if ([401, 403, 404].includes(error.status)) { body.replaceChildren(); view = undefined; }
    } finally {
      if (dialog && current === sequence) { delete dialog.dataset.busy; actions.forEach((node, i) => { if (node.isConnected) node.disabled = disabled[i]; }); }
      if (clicked.isConnected) clicked.focus();
    }
  }
  async function open(kind, id, trigger) {
    if (!auth()?.isAuthenticated?.() || !['EQUIPMENT', 'MARINE'].includes(kind) || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(id)) return;
    clear(); opener = trigger || document.activeElement; source = { kind, id }; ensure(); dialog.showModal(); await load();
  }
  document.addEventListener('click', event => { const trigger = event.target.closest?.('[data-asset-passport-kind]'); if (trigger && !trigger.disabled) void open(trigger.dataset.assetPassportKind, trigger.dataset.assetPassportId, trigger); });
  for (const event of ['hydroland:session-cleared', 'hydroland:portal-cleared', 'hydroland:role-changed', 'hydroland:auth-changed']) document.addEventListener(event, clear);
  window.HydrolandAssetPassports = Object.freeze({ open, clear });
})();
